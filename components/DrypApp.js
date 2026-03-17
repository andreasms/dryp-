'use client'
import { useState, useEffect, useRef } from 'react'
import { createBatch, getBatches, updateBatchStatus } from '@/lib/db/batches'
import { createLot, getActiveLots, decrementLotQty } from '@/lib/db/lots'
import { getBatchLotUsage, createBatchLotUsage } from '@/lib/db/batchLotUsage'
import { recordMovement } from '@/lib/db/movements'
import { appendEvent } from '@/lib/db/batchEvents'
import { createHaccpLog, getHaccpLogs, updateHaccpLog, deleteHaccpLog } from '@/lib/db/haccpLogs'
import { getWikiPages, createWikiPage, updateWikiPage, deleteWikiPage } from '@/lib/db/wikiPages'
import { getTeamMessages, sendTeamMessage } from '@/lib/db/teamMessages'
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '@/lib/db/customers'
import { getOrders, createOrder, updateOrder, deleteOrder } from '@/lib/db/orders'

const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6)
const today=()=>new Date().toISOString().slice(0,10)
const fk=n=>n?`${Number(n).toLocaleString("da-DK")} kr`:"—"
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)}
// Stock helper: prefer SQL-derived stock for raw materials, fall back to JSON qty
const getStock=(item,rawStock)=>item.cat==="Råvare"&&rawStock[item.id]!=null?rawStock[item.id].qty:item.qty

// ═══ THEME — bigger fonts, better readability ═══
const T={bg:"#0f1a0b",card:"#1a2814",card2:"#1f3318",input:"#0d150a",brd:"#2d4a22",brdL:"#1f3318",acc:"#a8d870",accD:"rgba(168,216,112,0.15)",accDD:"rgba(168,216,112,0.08)",txt:"#e8f0d8",mid:"rgba(232,240,216,0.65)",dim:"rgba(232,240,216,0.35)",red:"#e85454",warn:"#e8b854",ok:"#54c878",fm:"'JetBrains Mono','SF Mono',monospace",fs:13.5}
const statusDa={planned:"Planlagt",in_progress:"I gang",completed:"Afsluttet",failed:"Fejlet",recalled:"Tilbagekaldt"}
const statusC={planned:T.acc,in_progress:T.warn,completed:T.ok,failed:T.red,recalled:T.red}

// ═══ UI COMPONENTS ═══
const Plus=({s=13,c="currentColor"})=><svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"><line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/></svg>

const Tip=({text})=>{
  const[open,setOpen]=useState(false)
  const[pos,setPos]=useState({bottom:0,left:0})
  const ref=useRef(null)
  const btnRef=useRef(null)
  useEffect(()=>{if(!open)return;const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};document.addEventListener('click',h);return()=>document.removeEventListener('click',h)},[open])
  useEffect(()=>{if(!open)return;const h=()=>setOpen(false);window.addEventListener('scroll',h,true);return()=>window.removeEventListener('scroll',h,true)},[open])
  const toggle=e=>{e.stopPropagation();if(!open&&btnRef.current){const r=btnRef.current.getBoundingClientRect();setPos({bottom:window.innerHeight-r.top+8,left:Math.min(Math.max(r.left+r.width/2,140),window.innerWidth-140)})}setOpen(o=>!o)}
  return<span ref={ref} style={{position:"relative",display:"inline-flex",marginLeft:6}}>
    <button ref={btnRef} onClick={toggle} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:20,height:20,borderRadius:"50%",border:`1.5px solid ${open?T.acc:T.dim}`,fontSize:11,fontWeight:700,color:open?T.acc:T.dim,background:open?T.accD:"transparent",cursor:"pointer",lineHeight:1}}>?</button>
    {open&&<div style={{position:"fixed",bottom:pos.bottom,left:pos.left,transform:"translateX(-50%)",background:T.card,border:`1px solid ${T.brd}`,borderRadius:10,padding:"12px 16px",fontSize:13,color:T.txt,minWidth:260,maxWidth:360,zIndex:9999,lineHeight:1.6,boxShadow:"0 12px 40px rgba(0,0,0,.6)",whiteSpace:"normal"}}>{text}<div style={{position:"absolute",bottom:-6,left:"50%",transform:"translateX(-50%) rotate(45deg)",width:12,height:12,background:T.card,borderRight:`1px solid ${T.brd}`,borderBottom:`1px solid ${T.brd}`}}/></div>}
  </span>
}

const Badge=({children,c=T.acc,bg})=><span style={{display:"inline-flex",fontSize:11,fontWeight:600,letterSpacing:".03em",textTransform:"uppercase",color:c,background:bg||`${c}22`,padding:"3px 10px",borderRadius:99,whiteSpace:"nowrap",border:"none"}}>{children}</span>
const Btn=({children,primary,danger,small,disabled,style,...p})=><button {...p} style={{display:"inline-flex",alignItems:"center",gap:6,padding:small?"5px 12px":"8px 16px",minHeight:small?32:undefined,borderRadius:8,fontSize:small?12:13,fontWeight:600,background:danger?T.red:primary?T.acc:T.accD,color:danger?"#fff":primary?T.bg:T.txt,border:primary||danger?"none":`1px solid ${T.acc}44`,opacity:disabled?.4:1,cursor:disabled?"not-allowed":"pointer",transition:"all .15s",...style}} disabled={disabled}>{children}</button>
const Card=({children,style,onClick})=><div onClick={onClick} style={{background:T.card,border:`1px solid ${T.brdL}`,borderRadius:12,padding:18,cursor:onClick?"pointer":"default",...style}}>{children}</div>
const Field=({label,children,tip})=><div style={{marginBottom:14}}><label style={{display:"flex",alignItems:"center",fontSize:11,fontWeight:600,color:T.mid,letterSpacing:".05em",textTransform:"uppercase",marginBottom:5}}>{label}{tip&&<Tip text={tip}/>}</label>{children}</div>
const Modal=({title,onClose,children,wide})=><div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3,padding:20}} onClick={onClose}><div className="fade-in" onClick={e=>e.stopPropagation()} style={{background:T.card,border:`1px solid ${T.brd}`,borderRadius:16,width:"100%",maxWidth:wide?760:480,maxHeight:"88vh",overflow:"auto",padding:28}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}><h3 style={{fontSize:18,fontWeight:700}}>{title}</h3><button onClick={onClose} aria-label="Luk" title="Luk" style={{background:"none",color:T.dim,fontSize:18,cursor:"pointer",padding:4}}>✕</button></div>{children}</div></div>
const Stat=({label,value,sub,c=T.acc,tip})=><Card style={{flex:"1 1 140px",minWidth:140}}><div style={{display:"flex",alignItems:"center",fontSize:11,color:T.dim,letterSpacing:".06em",textTransform:"uppercase",marginBottom:8}}>{label}{tip&&<Tip text={tip}/>}</div><div style={{fontSize:24,fontWeight:700,color:c,lineHeight:1,fontFamily:T.fm}}>{value}</div>{sub&&<div style={{fontSize:12,color:T.mid,marginTop:6}}>{sub}</div>}</Card>
const Empty=({text,action,onAction})=><div style={{textAlign:"center",padding:60,color:T.dim}}><div style={{fontSize:14,marginBottom:16}}>{text}</div>{action&&<Btn primary onClick={onAction}><Plus s={12} c={T.bg}/> {action}</Btn>}</div>
const Dot=({s})=><span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:s==="ok"?T.ok:s==="warn"?T.warn:T.red,boxShadow:`0 0 6px ${s==="ok"?T.ok:s==="warn"?T.warn:T.red}44`}}/>
const Tabs=({tabs,active,onChange,right})=><div style={{display:"flex",gap:0,borderBottom:`1px solid ${T.brdL}`,marginBottom:18,alignItems:"flex-end"}}>{tabs.map(([id,l])=><button key={id} onClick={()=>onChange(id)} style={{padding:"10px 18px",fontSize:13,fontWeight:active===id?600:400,color:active===id?T.acc:T.dim,background:"none",borderBottom:active===id?`2px solid ${T.acc}`:"2px solid transparent",cursor:"pointer"}}>{l}</button>)}<div style={{flex:1}}/>{right}</div>
const Check=({checked,onChange,label})=><label style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer",fontSize:13}}><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} style={{width:16,height:16,accentColor:T.acc}}/>{label}</label>
const SH=({title,desc,tip,children})=><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}><div><div style={{fontSize:15,fontWeight:600,marginBottom:desc?4:0}}>{title}</div>{desc&&<div style={{display:"flex",alignItems:"center",fontSize:12,color:T.dim}}>{desc}{tip&&<Tip text={tip}/>}</div>}</div><div style={{display:"flex",gap:8}}>{children}</div></div>

// ═══ MAIN APP ═══
export default function DrypApp({data,update,save,user,onLogout,supabase,saveError,onDismissSaveError}){
  const[page,setPage]=useState("dashboard")
  const[batchNav,setBatchNav]=useState(null)
  const[sb,setSb]=useState(typeof window!=='undefined'?window.innerWidth>900:true)
  const[isMobile,setIsMobile]=useState(typeof window!=='undefined'?window.innerWidth<=768:false)
  useEffect(()=>{const h=()=>{setSb(window.innerWidth>900);setIsMobile(window.innerWidth<=768)};window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h)},[])
  // SQL-derived stock levels for raw materials
  const[rawStock,setRawStock]=useState({})
  const rmIds=(data.inventory||[]).filter(i=>i.cat==="Råvare"||i.cat==="Emballage").map(i=>i.id).join(",")
  const refreshStock=()=>{
    if(!supabase||!rmIds){setRawStock({});return}
    const ids=(data.inventory||[]).filter(i=>i.cat==="Råvare"||i.cat==="Emballage").map(i=>i.id)
    supabase.from("stock_levels").select("item_id,current_qty").in("item_id",ids)
      .then(({data:rows})=>{
        if(!rows)return
        const m={}
        rows.forEach(r=>{const prev=m[r.item_id];if(!prev)m[r.item_id]={qty:r.current_qty||0};else prev.qty+=(r.current_qty||0)})
        setRawStock(m)
      }).catch(()=>{})
  }
  useEffect(()=>{refreshStock()},[supabase,rmIds])

  const nav=[
    {id:"_hd",l:"PRODUKTION",hd:true},
    {id:"dashboard",l:"Overblik",i:"◻"},
    {id:"recipes",l:"Opskrifter",i:"◉"},
    {id:"production",l:"Produktion",i:"⬡"},
    {id:"batches",l:"Batches",i:"⬢"},
    {id:"_hd2",l:"KVALITET & LAGER",hd:true},
    {id:"haccp",l:"HACCP Logs",i:"✓"},
    {id:"inventory",l:"Lager",i:"▦"},
    {id:"planning",l:"Indkøbsplan",i:"◇"},
    {id:"_hd3",l:"SALG & KOMMUNIKATION",hd:true},
    {id:"customers",l:"Kunder & Ordrer",i:"◎"},
    {id:"economy",l:"Økonomi",i:"◈"},
    {id:"mail",l:"Mail",i:"✉"},
    {id:"_hd4",l:"TEAM",hd:true},
    {id:"documents",l:"Dokumenter",i:"▤"},
    {id:"team",l:"Team & Wiki",i:"☰"},
    {id:"settings",l:"Indstillinger",i:"⚙"},
  ]
  const Pg={dashboard:Dashboard,production:Production,recipes:Recipes,haccp:HACCPLogs,batches:Batches,customers:Customers,inventory:Inventory,planning:Planning,economy:Economy,mail:Mail,documents:Documents,team:Team,settings:Settings}[page]||Dashboard
  const userName=user?.email?.split('@')[0]||'Bruger'

  useEffect(()=>{if(!saveError)return;const t=setTimeout(()=>onDismissSaveError?.(),8000);return()=>clearTimeout(t)},[saveError,onDismissSaveError])

  return<div style={{display:"flex",height:"100vh",overflow:"hidden",fontSize:T.fs,color:T.txt}}>
    {saveError&&<div style={{position:"fixed",top:0,left:0,right:0,zIndex:9999,background:"#5c1a1a",borderBottom:"2px solid #a33",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}} onClick={onDismissSaveError}>
      <div><div style={{color:"#fdd",fontSize:13,fontWeight:600}}>Ændringen blev ikke gemt</div><div style={{color:"#c99",fontSize:11,marginTop:2}}>{saveError}</div></div>
      <button aria-label="Luk" title="Luk" style={{color:"#c99",fontSize:16,cursor:"pointer",background:"none",padding:"4px 8px"}}>✕</button>
    </div>}
    <div style={{width:sb?220:0,minWidth:sb?220:0,background:T.card,borderRight:`1px solid ${T.brdL}`,display:"flex",flexDirection:"column",transition:"width .25s ease, min-width .25s ease",overflow:"hidden",position:isMobile?"fixed":"relative",zIndex:100,height:"100%"}}>
      <div style={{padding:"20px 16px 8px"}}><div style={{fontFamily:"'Archivo Black',sans-serif",fontSize:20,color:T.acc,letterSpacing:".12em"}}>DRYP</div><div style={{fontSize:9,color:T.dim,letterSpacing:".15em",textTransform:"uppercase",marginTop:2}}>Skagen · DK</div></div>
      <nav style={{padding:"10px 8px",flex:1,overflow:"auto"}}>
        {nav.map(n=>n.hd?<div key={n.id} style={{fontSize:9,fontWeight:700,color:T.dim,letterSpacing:".12em",padding:"16px 10px 4px",opacity:.6}}>{n.l}</div>:
        <button key={n.id} onClick={()=>{setPage(n.id);if(isMobile)setSb(false)}} style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"8px 12px",borderRadius:7,marginBottom:2,background:page===n.id?T.accD:"transparent",color:page===n.id?T.acc:T.mid,fontSize:12.5,fontWeight:page===n.id?600:400,textAlign:"left",cursor:"pointer"}}><span style={{width:16,textAlign:"center",fontSize:12,opacity:page===n.id?1:.4}}>{n.i}</span>{n.l}</button>)}
      </nav>
      <div style={{padding:"12px 16px",borderTop:`1px solid ${T.brdL}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:28,height:28,borderRadius:"50%",background:T.accD,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:T.acc}}>{userName.charAt(0).toUpperCase()}</div><div style={{fontSize:12}}>{userName}</div></div>
        <button onClick={onLogout} style={{background:T.card2,color:T.dim,fontSize:10,cursor:"pointer",padding:"4px 10px",borderRadius:6,border:`1px solid ${T.brdL}`}}>Log ud</button>
      </div>
    </div>
    {sb&&isMobile&&<div onClick={()=>setSb(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:99}}/>}
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:T.bg}}>
      <header style={{display:"flex",alignItems:"center",gap:12,padding:"12px 20px",borderBottom:`1px solid ${T.brdL}`,background:T.card,flexShrink:0}}>
        {!sb&&<button onClick={()=>setSb(true)} aria-label="Menu" title="Menu" style={{background:"none",color:T.mid,fontSize:18,cursor:"pointer"}}>☰</button>}
        <h1 style={{fontSize:16,fontWeight:600}}>{nav.find(n=>n.id===page)?.l}</h1>
        <div style={{flex:1}}/>
        <div style={{fontSize:11,color:T.dim,fontFamily:T.fm}}>{new Date().toLocaleDateString("da-DK",{weekday:"long",day:"numeric",month:"long"})}</div>
      </header>
      <main style={{flex:1,overflow:"auto",padding:22}} className="fade-in" key={page}><Pg data={data} update={update} save={save} user={user} supabase={supabase} setPage={setPage} batchNav={batchNav} setBatchNav={setBatchNav} rawStock={rawStock} refreshStock={refreshStock}/></main>
    </div>
  </div>
}

// ═══ DASHBOARD — cleaner, priority-focused ═══
function Dashboard({data,supabase,setPage,setBatchNav,rawStock={}}){
  const mo=today().slice(0,7);const prods=data.productions.filter(p=>p.date?.startsWith(mo))
  const low=data.inventory.filter(i=>getStock(i,rawStock)<i.min)
  const ccpOk=prods.filter(p=>p.ccp1Ok&&p.ccp2Ok).length
  const[openDevs,setOpenDevs]=useState([])
  const[sqlBatches,setSqlBatches]=useState(null)
  const[sqlOrders,setSqlOrders]=useState([])
  useEffect(()=>{if(!supabase)return;getBatches(supabase).then(rows=>{if(rows)setSqlBatches(rows)}).catch(()=>{});getOrders(supabase).then(setSqlOrders).catch(()=>{});getHaccpLogs(supabase,{category:"deviations"}).then(rows=>{const open=(rows||[]).filter(r=>{const p=r.payload||{};const closed=p.devStatus==="closed"||(p.devStatus==null&&!!p.closedDate);return!closed});setOpenDevs(open)}).catch(()=>{})},[supabase])
  const rev=sqlOrders.filter(o=>o.order_date?.startsWith(mo)).reduce((s,o)=>s+(parseFloat(o.price)||0)*(parseInt(o.qty)||0),0)
  const pendingOrders=sqlOrders.filter(o=>!["leveret","fakturaklar","faktureret"].includes(o.status))
  const activeBatches=(sqlBatches||[]).filter(b=>b.status==="in_progress")
  const plannedCount=(sqlBatches||[]).filter(b=>b.status==="planned").length
  return<div style={{maxWidth:1100}}>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:24}}>
      <Stat label="Batches i gang" value={sqlBatches?activeBatches.length:"—"} c={activeBatches.length>0?T.warn:T.dim} sub={sqlBatches!=null?`${plannedCount} planlagt · ${sqlBatches.length} total`:"Indlæser..."} tip="Batches med status 'I gang' — aktiv produktion akkurat nu."/>
      <Stat label="Omsætning" value={fk(rev)} c={rev>0?T.ok:T.dim} sub="Denne måned" tip="Samlet ordreværdi for indeværende måned"/>
      <Stat label="CCP status" value={prods.length?`${Math.round(ccpOk/prods.length*100)}%`:"—"} c={ccpOk===prods.length&&prods.length>0?T.ok:T.warn} sub={`${ccpOk}/${prods.length} godkendt`} tip="Andel produktioner med godkendt CCP1 (temperatur) og CCP2 (forsegling)"/>
      <Stat label="Lager-alarm" value={low.length} c={low.length>0?T.red:T.ok} sub={low.length?low.map(i=>i.name).join(", "):"Alt over minimum"} tip="Varer under minimumsbeholdning"/>
    </div>

    <div style={{marginBottom:20}}>
      <div style={{fontSize:10,fontWeight:700,color:T.dim,letterSpacing:".1em",textTransform:"uppercase",marginBottom:8}}>Hurtige handlinger</div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <Btn primary onClick={()=>setPage("production")}>Start produktion</Btn>
        <Btn onClick={()=>setPage("inventory")}>Opret råvare-lot</Btn>
        <Btn onClick={()=>setPage("batches")}>Se alle batches{activeBatches.length>0&&<span style={{marginLeft:6,background:T.warn,color:"#000",borderRadius:9,padding:"1px 6px",fontSize:10,fontWeight:700}}>{activeBatches.length}</span>}</Btn>
        <Btn onClick={()=>setPage("inventory")}>Se lagerbeholdning{low.length>0&&<span style={{marginLeft:6,background:T.red,color:"#fff",borderRadius:9,padding:"1px 6px",fontSize:10,fontWeight:700}}>{low.length}</span>}</Btn>
      </div>
    </div>

    {sqlBatches&&activeBatches.length>0&&<div style={{marginBottom:20}}>
      <div style={{fontSize:10,fontWeight:700,color:T.dim,letterSpacing:".1em",textTransform:"uppercase",marginBottom:8}}>Batches i gang</div>
      {activeBatches.map(b=><Card key={b.id} style={{marginBottom:6,padding:"10px 14px",borderLeft:`4px solid ${T.warn}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:14,fontWeight:600}}>{b.batch_number}</div>
            <div style={{fontSize:12,color:T.dim}}>{b.recipe_snapshot?.name||b.recipe_id||"—"}{b.started_at&&<span style={{marginLeft:8}}>Startet {new Date(b.started_at).toLocaleString("da-DK",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</span>}</div>
          </div>
          <Btn small onClick={()=>{setBatchNav({batchId:b.batch_number});setPage("batches")}} style={{color:T.acc,borderColor:T.acc}}>Åbn batch →</Btn>
        </div>
      </Card>)}
    </div>}

    {(low.length>0||openDevs.length>0||pendingOrders.length>0)&&<Card style={{marginBottom:20,borderLeft:`4px solid ${T.warn}`,background:T.accDD}}>
      <div style={{fontSize:14,fontWeight:600,color:T.warn,marginBottom:10}}>⚡ Kræver opmærksomhed</div>
      {low.length>0&&<div style={{fontSize:13,marginBottom:6,color:T.txt,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span>🔴 <strong>{low.length} lagervare{low.length>1?"r":""}</strong> under minimum: {low.map(i=>i.name).join(", ")}</span>
        <Btn small onClick={()=>setPage("inventory")}>Se lager</Btn>
      </div>}
      {openDevs.length>0&&<div style={{fontSize:13,marginBottom:6,color:T.txt,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span>⚠️ <strong>{openDevs.length} åben{openDevs.length>1?"e":""} afvigelse{openDevs.length>1?"r":""}</strong> i HACCP</span>
        <Btn small onClick={()=>setPage("haccp")}>Se afvigelser</Btn>
      </div>}
      {pendingOrders.length>0&&<div style={{fontSize:13,color:T.txt,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span>📦 <strong>{pendingOrders.length} ordre{pendingOrders.length>1?"r":""}</strong> afventer levering</span>
        <Btn small onClick={()=>setPage("customers")}>Se ordrer</Btn>
      </div>}
    </Card>}

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <Card><div style={{fontSize:13,fontWeight:600,marginBottom:12}}>Aktive produkter</div>{(data.recipes||[]).filter(r=>r.active).length===0?<div style={{color:T.dim,fontSize:13,lineHeight:1.6}}>Ingen opskrifter endnu.<br/><Btn small onClick={()=>setPage("recipes")} style={{marginTop:8}}>Opret en opskrift</Btn></div>:(data.recipes||[]).filter(r=>r.active).map(r=>{
        const rawCost=(r.bom||[]).filter(b=>{const inv=data.inventory.find(x=>x.id===b.itemId);return inv?.cat==="Råvare"}).reduce((s,b)=>{const inv=data.inventory.find(x=>x.id===b.itemId);return s+(inv?.costPer||0)*b.qty},0)
        return<div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${T.brdL}`,fontSize:13}}><span>{r.name}</span><div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:11,color:T.dim,fontFamily:T.fm}}>Råvare: {rawCost.toFixed(0)} kr</span><Badge c={T.ok}>Aktiv</Badge></div></div>})}</Card>
      <Card><div style={{fontSize:13,fontWeight:600,marginBottom:12}}>Seneste produktioner</div>{data.productions.length===0?<div style={{color:T.dim,fontSize:13,lineHeight:1.6}}>Ingen produktioner registreret endnu.<br/><Btn small onClick={()=>setPage("production")} style={{marginTop:8}}>Start en produktion</Btn></div>:[...data.productions].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,5).map(p=><div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${T.brdL}`}}><div><span style={{fontSize:13,fontWeight:500}}>{p.batchId}</span><span style={{fontSize:12,color:T.dim,marginLeft:8}}>{p.recipeName} · {p.date}</span></div><div style={{display:"flex",gap:5}}><Badge c={p.ccp1Ok?T.ok:T.red}>CCP1</Badge><Badge c={p.ccp2Ok?T.ok:T.red}>CCP2</Badge></div></div>)}</Card>
    </div>
  </div>
}

// ═══ RECIPES — split BOM into Råvarer + Emballage, cost calculator ═══
function Recipes({data,update}){
  const[show,setShow]=useState(false);const[form,setForm]=useState({});const[calcQty,setCalcQty]=useState(50)
  const rawItems=data.inventory.filter(i=>i.cat==="Råvare")
  const packItems=data.inventory.filter(i=>i.cat!=="Råvare")
  const newR=()=>{setForm({id:uid(),name:"",size:"250ml",active:true,rawBom:[],packBom:[],steps:[""],infusionTemp:"",infusionTime:"",shelfLifeDays:90});setShow(true)}
  // Migrate old bom format to rawBom/packBom
  const migrateBom=(r)=>{
    if(r.rawBom||r.packBom)return r
    const raw=[];const pack=[]
    ;(r.bom||[]).forEach(b=>{const inv=data.inventory.find(x=>x.id===b.itemId);if(inv?.cat==="Råvare")raw.push(b);else pack.push(b)})
    return{...r,rawBom:raw,packBom:pack}
  }
  const costRaw=(r)=>{const m=migrateBom(r);return(m.rawBom||[]).reduce((s,b)=>{const inv=data.inventory.find(x=>x.id===b.itemId);return s+(inv?.costPer||0)*b.qty},0)}
  const costPack=(r)=>{const m=migrateBom(r);return(m.packBom||[]).reduce((s,b)=>{const inv=data.inventory.find(x=>x.id===b.itemId);return s+(inv?.costPer||0)*b.qty},0)}
  const doSave=()=>{const combined=[...(form.rawBom||[]),...(form.packBom||[])];update("recipes",prev=>[{...form,bom:combined},...(prev||[]).filter(r=>r.id!==form.id)]);setShow(false)}

  return<div style={{maxWidth:1000}}>
    <SH title="Opskrifter" desc="Produktopskrifter med råvarer, emballage og procestrin" tip="Opskrifter definerer hvad der indgår i hvert produkt. Råvarer og emballage vises separat. Kostprisen beregnes automatisk."><Btn primary onClick={newR}><Plus s={12} c={T.bg}/> Ny opskrift</Btn></SH>

    {/* Cost calculator */}
    <Card style={{marginBottom:20,background:T.accDD,border:`1px solid ${T.acc}33`}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}><div style={{fontSize:14,fontWeight:600}}>Råvarekalkulator</div><Tip text="Beregn råvareomkostning for et givet antal flasker. Emballage er IKKE medregnet her — se den fulde kostpris i Økonomi."/></div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}><span style={{fontSize:13,color:T.mid}}>Antal flasker:</span><input type="number" value={calcQty} onChange={e=>setCalcQty(parseInt(e.target.value)||0)} style={{width:80,textAlign:"center"}}/></div>
      <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>{(data.recipes||[]).filter(r=>r.active).map(r=>{const raw=costRaw(r)*calcQty;return<div key={r.id} style={{flex:"1 1 200px",background:T.card,borderRadius:8,padding:12,border:`1px solid ${T.brdL}`}}><div style={{fontSize:13,fontWeight:600,marginBottom:4}}>{r.name}</div><div style={{fontSize:20,fontWeight:700,fontFamily:T.fm,color:T.acc}}>{fk(Math.round(raw))}</div><div style={{fontSize:11,color:T.dim}}>= {costRaw(r).toFixed(1)} kr/flaske × {calcQty}</div></div>})}</div>
    </Card>

    {(data.recipes||[]).map(r=>{const m=migrateBom(r);return<Card key={r.id} style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><div style={{fontSize:15,fontWeight:600}}>{r.name}</div><div style={{fontSize:12,color:T.dim}}>{r.size} · Holdbarhed: {r.shelfLifeDays}d</div></div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{textAlign:"right",marginRight:8}}><div style={{fontSize:11,color:T.dim}}>Råvare: <span style={{color:T.warn,fontFamily:T.fm}}>{costRaw(r).toFixed(1)} kr</span></div><div style={{fontSize:11,color:T.dim}}>Emballage: <span style={{color:T.mid,fontFamily:T.fm}}>{costPack(r).toFixed(1)} kr</span></div></div>
          <Badge c={r.active?T.ok:T.dim}>{r.active?"Aktiv":"Inaktiv"}</Badge>
          <Btn small onClick={()=>{setForm(migrateBom(r));setShow(true)}}>Rediger opskrift</Btn>
          <Btn small danger onClick={()=>{if(confirm(`Slet "${r.name}"?`))update("recipes",prev=>prev.filter(x=>x.id!==r.id))}}>Slet</Btn>
        </div>
      </div>
      <div style={{display:"flex",gap:20,marginTop:10}}>
        <div><div style={{fontSize:10,fontWeight:700,color:T.acc,letterSpacing:".08em",marginBottom:4}}>RÅVARER</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{(m.rawBom||[]).map((b,i)=>{const inv=data.inventory.find(x=>x.id===b.itemId);return<span key={i} style={{fontSize:12,color:T.mid,background:T.input,padding:"3px 8px",borderRadius:5}}>{inv?.name||b.itemId}: {b.qty} {b.unit}</span>})}{(m.rawBom||[]).length===0&&<span style={{fontSize:12,color:T.dim}}>Ingen</span>}</div></div>
        <div><div style={{fontSize:10,fontWeight:700,color:T.mid,letterSpacing:".08em",marginBottom:4}}>EMBALLAGE</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{(m.packBom||[]).map((b,i)=>{const inv=data.inventory.find(x=>x.id===b.itemId);return<span key={i} style={{fontSize:12,color:T.mid,background:T.input,padding:"3px 8px",borderRadius:5}}>{inv?.name||b.itemId}: {b.qty} {b.unit}</span>})}{(m.packBom||[]).length===0&&<span style={{fontSize:12,color:T.dim}}>Ingen</span>}</div></div>
      </div>
    </Card>})}

    {show&&<Modal title={form.name||"Ny opskrift"} onClose={()=>setShow(false)} wide>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0 16px"}}>
        <Field label="Produktnavn"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field>
        <Field label="Størrelse"><input value={form.size} onChange={e=>setForm({...form,size:e.target.value})}/></Field>
        <Field label="Holdbarhed (dage)"><input type="number" value={form.shelfLifeDays} onChange={e=>setForm({...form,shelfLifeDays:parseInt(e.target.value)||90})}/></Field>
        <Field label="Infusionstemperatur"><input value={form.infusionTemp} onChange={e=>setForm({...form,infusionTemp:e.target.value})}/></Field>
        <Field label="Infusionstid"><input value={form.infusionTime} onChange={e=>setForm({...form,infusionTime:e.target.value})}/></Field>
        <Field label=""><div style={{marginTop:18}}><Check checked={form.active} onChange={v=>setForm({...form,active:v})} label="Aktiv"/></div></Field>
      </div>

      {/* RÅVARER BOM */}
      <div style={{borderTop:`1px solid ${T.brdL}`,marginTop:10,paddingTop:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:12,fontWeight:700,color:T.acc,letterSpacing:".06em"}}>RÅVARER</span><Btn small onClick={()=>setForm({...form,rawBom:[...(form.rawBom||[]),{itemId:rawItems[0]?.id||"",qty:1,unit:rawItems[0]?.unit||"L"}]})}><Plus s={10}/> Råvare</Btn></div>
        {(form.rawBom||[]).map((b,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:6,alignItems:"center"}}>
          <select value={b.itemId} onChange={e=>{const bom=[...form.rawBom];bom[i]={...bom[i],itemId:e.target.value,unit:data.inventory.find(x=>x.id===e.target.value)?.unit||"L"};setForm({...form,rawBom:bom})}} style={{flex:2}}>{rawItems.map(inv=><option key={inv.id} value={inv.id}>{inv.name}</option>)}<option value="">— Tilføj ny i Lager —</option></select>
          <input type="number" step=".01" value={b.qty} onChange={e=>{const bom=[...form.rawBom];bom[i]={...bom[i],qty:parseFloat(e.target.value)||0};setForm({...form,rawBom:bom})}} style={{flex:1}}/>
          <span style={{fontSize:11,color:T.dim,width:30}}>{b.unit}</span>
          <Btn small danger onClick={()=>setForm({...form,rawBom:form.rawBom.filter((_,j)=>j!==i)})}>Fjern</Btn>
        </div>)}
      </div>

      {/* EMBALLAGE BOM */}
      <div style={{borderTop:`1px solid ${T.brdL}`,marginTop:10,paddingTop:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:12,fontWeight:700,color:T.mid,letterSpacing:".06em"}}>EMBALLAGE</span><Btn small onClick={()=>setForm({...form,packBom:[...(form.packBom||[]),{itemId:packItems[0]?.id||"",qty:1,unit:packItems[0]?.unit||"stk"}]})}><Plus s={10}/> Emballage</Btn></div>
        {(form.packBom||[]).map((b,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:6,alignItems:"center"}}>
          <select value={b.itemId} onChange={e=>{const bom=[...form.packBom];bom[i]={...bom[i],itemId:e.target.value,unit:data.inventory.find(x=>x.id===e.target.value)?.unit||"stk"};setForm({...form,packBom:bom})}} style={{flex:2}}>{packItems.map(inv=><option key={inv.id} value={inv.id}>{inv.name}</option>)}</select>
          <input type="number" step=".01" value={b.qty} onChange={e=>{const bom=[...form.packBom];bom[i]={...bom[i],qty:parseFloat(e.target.value)||0};setForm({...form,packBom:bom})}} style={{flex:1}}/>
          <span style={{fontSize:11,color:T.dim,width:30}}>{b.unit}</span>
          <Btn small danger onClick={()=>setForm({...form,packBom:form.packBom.filter((_,j)=>j!==i)})}>Fjern</Btn>
        </div>)}
      </div>

      {/* PROCESTRIN */}
      <div style={{borderTop:`1px solid ${T.brdL}`,marginTop:16,paddingTop:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:12,fontWeight:700,color:T.acc,letterSpacing:".06em"}}>PROCESTRIN</span><Btn small onClick={()=>setForm({...form,steps:[...(form.steps||[]),""]})}>< Plus s={10}/> Trin</Btn></div>
        {(form.steps||[]).map((s,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:6,alignItems:"center"}}>
          <span style={{fontSize:11,color:T.dim,width:22,textAlign:"right"}}>{i+1}.</span>
          <input value={s} onChange={e=>{const steps=[...form.steps];steps[i]=e.target.value;setForm({...form,steps})}} style={{flex:1}}/>
          <Btn small danger onClick={()=>setForm({...form,steps:form.steps.filter((_,j)=>j!==i)})}>Fjern</Btn>
        </div>)}
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}><Btn onClick={()=>setShow(false)}>Annuller</Btn><Btn primary onClick={doSave}>✓ Gem opskrift</Btn></div>
    </Modal>}
  </div>
}

// ═══ PRODUCTION ═══
function Production({data,update,supabase,setPage,setBatchNav}){
  const[show,setShow]=useState(false);const[form,setForm]=useState({});const[exp,setExp]=useState(null);const[saving,setSaving]=useState(false);const[batchErr,setBatchErr]=useState(null)
  const recipes=(data.recipes||[]).filter(r=>r.active)
  const startNew=()=>{const r=recipes[0];setForm({id:uid(),recipeId:r?.id||"",recipeName:r?.name||"",batchId:`DRYP-${today().replace(/-/g,"").slice(2)}-${String(data.productions.length+1).padStart(3,"0")}`,date:today(),operator:"Andreas",rapsolieQty:"",rapsolieLot:"",dildQty:"",volume:"",bottles250:"",bottles500:"",ccp1TempStart:"",ccp1TempEnd:"",infusionTime:r?.infusionTime||"",ccp1Ok:false,ccp2Visual:false,ccp2Ok:false,cleaningDone:false,hygieneDone:false,tempStorage:"",notes:""});setShow(true)}
  const doSave=async()=>{setSaving(true);setBatchErr(null);try{update("productions",prev=>[form,...prev.filter(p=>p.id!==form.id)]);if(!data.batches.find(b=>b.id===form.batchId))update("batches",prev=>[{id:form.batchId,created:form.date,recipeId:form.recipeId,recipeName:form.recipeName,rapsolieOrigin:"Dansk",status:"produceret",bestBefore:addDays(form.date,recipes.find(r=>r.id===form.recipeId)?.shelfLifeDays||90),notes:"",gtin:"",gs1Note:""},...prev]);const{data:{user}}=await supabase.auth.getUser();await createBatch(supabase,{user_id:user.id,batch_number:form.batchId,recipe_id:form.recipeId,recipe_snapshot:recipes.find(r=>r.id===form.recipeId)||{},status:"planned",planned_date:form.date,operator:form.operator,planned_qty:(parseInt(form.bottles250)||0)+(parseInt(form.bottles500)||0)});setShow(false)}catch(err){console.error("[DRYP] createBatch failed:",err);setBatchErr(err.message||"Batch kunne ikke oprettes i databasen")}finally{setSaving(false)}}
  return<div style={{maxWidth:960}}>
    <SH title="Produktionslog" desc="Registrer produktioner med HACCP CCP1+CCP2" tip="Hver produktion logges med temperaturkontrol (CCP1: infusion) og forseglingskontrol (CCP2). Opretter automatisk en batch."><Btn primary onClick={startNew}><Plus s={12} c={T.bg}/> Ny produktion</Btn></SH>
    {data.productions.length===0?<Empty text="Ingen produktioner endnu" action="Start produktion" onAction={startNew}/>:
      [...data.productions].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(p=><Card key={p.id} onClick={()=>setExp(exp===p.id?null:p.id)} style={{marginBottom:10,cursor:"pointer"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:14,fontWeight:600}}>{p.batchId}</div><div style={{fontSize:12,color:T.dim}}>{p.recipeName||"—"} · {p.date} · {p.operator||""}</div></div><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:12,fontFamily:T.fm,color:T.mid}}>{p.volume||"—"}L</span><Badge c={p.ccp1Ok?T.ok:T.red}>CCP1</Badge><Badge c={p.ccp2Ok?T.ok:T.red}>CCP2</Badge></div></div>
        {exp===p.id&&<div className="fade-in" style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${T.brdL}`,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"6px 20px",fontSize:12}}>
          {[["Rapsolie",`${p.rapsolieQty||"—"}L`],["Lot",p.rapsolieLot],["Dild",`${p.dildQty||"—"}kg`],["CCP1 start",`${p.ccp1TempStart||"—"}°C`],["CCP1 slut",`${p.ccp1TempEnd||"—"}°C`],["Tid",p.infusionTime],["250ml",p.bottles250],["500ml",p.bottles500],["Lagertemp",`${p.tempStorage||"—"}°C`]].map(([k,v])=><div key={k}><span style={{color:T.dim}}>{k}:</span> <span style={{color:T.txt}}>{v||"—"}</span></div>)}
          {p.notes&&<div style={{gridColumn:"1/-1",color:T.dim,fontStyle:"italic",marginTop:4}}>{p.notes}</div>}
          <div style={{gridColumn:"1/-1",marginTop:8,display:"flex",gap:8}}><Btn small onClick={e=>{e.stopPropagation();setForm(p);setShow(true)}}>Rediger</Btn><Btn small danger onClick={e=>{e.stopPropagation();if(confirm("Slet?"))update("productions",prev=>prev.filter(x=>x.id!==p.id))}}>Slet</Btn>{p.batchId&&setBatchNav&&<Btn small onClick={e=>{e.stopPropagation();setBatchNav({batchId:p.batchId});setPage("batches")}} style={{color:T.acc,borderColor:T.acc}}>Gå til batch →</Btn>}</div>
        </div>}
      </Card>)}
    {show&&<Modal title={`Produktion · ${form.batchId}`} onClose={()=>setShow(false)} wide>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0 14px"}}>
        <Field label="Opskrift"><select value={form.recipeId} onChange={e=>{const r=recipes.find(x=>x.id===e.target.value);setForm({...form,recipeId:e.target.value,recipeName:r?.name||""})}}>{recipes.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
        <Field label="Batch-nr." tip="Unikt batch-ID for sporbarhed"><input value={form.batchId} onChange={e=>setForm({...form,batchId:e.target.value})}/></Field>
        <Field label="Dato"><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></Field>
        <Field label="Operatør"><input value={form.operator} onChange={e=>setForm({...form,operator:e.target.value})}/></Field>
        <Field label="Rapsolie (L)"><input type="number" step=".1" value={form.rapsolieQty} onChange={e=>setForm({...form,rapsolieQty:e.target.value})}/></Field>
        <Field label="Rapsolie lot"><input value={form.rapsolieLot} onChange={e=>setForm({...form,rapsolieLot:e.target.value})}/></Field>
        <div style={{gridColumn:"1/-1",borderBottom:`1px solid ${T.brdL}`,margin:"6px 0 14px",paddingBottom:4}}><span style={{fontSize:11,fontWeight:700,color:T.warn}}>⚠ CCP1 — INFUSION</span><Tip text="Kritisk kontrolpunkt 1: Temperatur skal overvåges under infusion. Dokumentér start- og sluttemperatur."/></div>
        <Field label="Temp start (°C)"><input type="number" value={form.ccp1TempStart} onChange={e=>setForm({...form,ccp1TempStart:e.target.value})}/></Field>
        <Field label="Temp slut (°C)"><input type="number" value={form.ccp1TempEnd} onChange={e=>setForm({...form,ccp1TempEnd:e.target.value})}/></Field>
        <Field label="Infusionstid"><input value={form.infusionTime} onChange={e=>setForm({...form,infusionTime:e.target.value})}/></Field>
        <Field label=""><div style={{marginTop:18}}><Check checked={form.ccp1Ok} onChange={v=>setForm({...form,ccp1Ok:v})} label="CCP1 Godkendt"/></div></Field>
        <div style={{gridColumn:"1/-1",borderBottom:`1px solid ${T.brdL}`,margin:"6px 0 14px",paddingBottom:4}}><span style={{fontSize:11,fontWeight:700,color:T.warn}}>⚠ CCP2 — FORSEGLING</span><Tip text="Kritisk kontrolpunkt 2: Visuel kontrol af alle flasker. Utætte flasker kasseres."/></div>
        <Field label=""><Check checked={form.ccp2Visual} onChange={v=>setForm({...form,ccp2Visual:v})} label="Visuel kontrol OK"/></Field>
        <Field label=""><Check checked={form.ccp2Ok} onChange={v=>setForm({...form,ccp2Ok:v})} label="CCP2 Godkendt"/></Field>
        <div style={{gridColumn:"1/-1",borderBottom:`1px solid ${T.brdL}`,margin:"6px 0 14px",paddingBottom:4}}><span style={{fontSize:11,fontWeight:700,color:T.acc}}>OUTPUT</span></div>
        <Field label="Total volumen (L)"><input type="number" step=".1" value={form.volume} onChange={e=>setForm({...form,volume:e.target.value})}/></Field>
        <Field label="Antal 250ml"><input type="number" value={form.bottles250} onChange={e=>setForm({...form,bottles250:e.target.value})}/></Field>
        <Field label="Antal 500ml"><input type="number" value={form.bottles500} onChange={e=>setForm({...form,bottles500:e.target.value})}/></Field>
        <Field label="Lagertemp (°C)"><input type="number" step=".1" value={form.tempStorage} onChange={e=>setForm({...form,tempStorage:e.target.value})}/></Field>
        <Field label=""><div style={{marginTop:18}}><Check checked={form.cleaningDone} onChange={v=>setForm({...form,cleaningDone:v})} label="Rengøring udført"/></div></Field>
        <Field label=""><div style={{marginTop:18}}><Check checked={form.hygieneDone} onChange={v=>setForm({...form,hygieneDone:v})} label="Hygiejne godkendt"/></div></Field>
        <div style={{gridColumn:"1/-1"}}><Field label="Noter"><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></Field></div>
      </div>
      {batchErr&&<div style={{background:"#5c1a1a",border:"1px solid #a33",borderRadius:6,padding:"8px 12px",marginBottom:8,fontSize:12,color:"#fdd"}}>{batchErr}</div>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={()=>setShow(false)}>Annuller</Btn><Btn primary onClick={doSave} disabled={saving}>{saving?"Gemmer...":"✓ Gem produktion"}</Btn></div>
    </Modal>}
  </div>
}

// ═══ BATCHES with GS1 ═══
function Batches({data,update,supabase,batchNav,setBatchNav,refreshStock}){
  const[show,setShow]=useState(false);const[form,setForm]=useState({})
  const[showGs1,setShowGs1]=useState(false)
  const[sqlBatches,setSqlBatches]=useState(null)
  const[selectedId,setSelectedId]=useState(null)
  const[acting,setActing]=useState(false)
  const[activeLots,setActiveLots]=useState([])
  const[lotUsage,setLotUsage]=useState([])
  const[newLot,setNewLot]=useState({lotId:"",qtyUsed:""})
  const[savingLot,setSavingLot]=useState(false)
  const[actualQty,setActualQty]=useState("")
  const[qtyStatus,setQtyStatus]=useState("")
  const[processLoss,setProcessLoss]=useState("")
  const[lossNotes,setLossNotes]=useState("")
  const[showLotModal,setShowLotModal]=useState(false)
  const[lotItemId,setLotItemId]=useState("")
  const[completionErr,setCompletionErr]=useState("")
  // Batchlog-skabelon fields
  const[blanchTemp,setBlanchTemp]=useState("")
  const[blanchTime,setBlanchTime]=useState("")
  const[oilTemp,setOilTemp]=useState("")
  const[filtrationOk,setFiltrationOk]=useState(false)
  const[bestBefore,setBestBefore]=useState("")
  const[sensory,setSensory]=useState({color:"",taste:"",smell:"",approved:false})
  const[opConfirmed,setOpConfirmed]=useState(false)

  const refresh=()=>{if(!supabase)return;getBatches(supabase).then(rows=>{if(rows&&rows.length>0)setSqlBatches(rows)}).catch(()=>{})}
  useEffect(()=>{refresh()},[supabase])

  useEffect(()=>{
    if(!batchNav?.batchId||!sqlBatches)return
    const match=sqlBatches.find(b=>b.batch_number===batchNav.batchId)
    if(match){setSelectedId(match.id)}
    if(setBatchNav)setBatchNav(null)
  },[batchNav,sqlBatches])

  useEffect(()=>{
    if(!supabase||!selectedId)return
    const sel=sqlBatches?.find(b=>b.id===selectedId)
    setActualQty(sel?.actual_qty??'')
    setProcessLoss(sel?.process_loss_qty??'')
    setLossNotes(sel?.loss_notes??'')
    setBlanchTemp(sel?.blanching_temp??'')
    setBlanchTime(sel?.blanching_time_secs??'')
    setOilTemp(sel?.oil_temp??'')
    setFiltrationOk(!!sel?.filtration_ok)
    setBestBefore(sel?.best_before??'')
    setSensory(sel?.sensory_eval||{color:"",taste:"",smell:"",approved:false})
    setOpConfirmed(!!sel?.operator_confirmed)
    getActiveLots(supabase).then(setActiveLots).catch(()=>{})
    getBatchLotUsage(supabase,selectedId).then(setLotUsage).catch(()=>{})
  },[supabase,selectedId])

  const batches=sqlBatches||data.batches
  const isSql=!!sqlBatches
  const selected=selectedId?sqlBatches?.find(b=>b.id===selectedId):null

  const doAction=async(status,extras)=>{
    if(!supabase||!selectedId)return
    setActing(true)
    try{await updateBatchStatus(supabase,selectedId,status,extras);refresh();setSelectedId(null)}
    catch(err){console.error("[DRYP] updateBatchStatus failed:",err)}
    finally{setActing(false)}
  }

  const tryComplete=async()=>{
    setCompletionErr("")
    const bom=selected?.recipe_snapshot?.bom||[]
    const rawItems=bom.filter(b=>{const inv=data.inventory.find(i=>i.id===b.itemId);return inv&&inv.cat==="Råvare"})
    const missingItems=rawItems.filter(b=>!lotUsage.some(lu=>lu.item_id===b.itemId))
    if(missingItems.length>0){const names=missingItems.map(b=>{const inv=data.inventory.find(i=>i.id===b.itemId);return inv?.name||b.itemId}).join(", ");setCompletionErr(`Registrér råvareforbrug for: ${names}`);return}
    const qty=parseInt(actualQty)||selected?.actual_qty
    if(!qty){setCompletionErr("Angiv faktisk output før afslutning");return}
    const loss=parseFloat(processLoss)||0
    if(loss<0){setCompletionErr("Proces-spild kan ikke være negativt");return}
    // Batchlog-skabelon validation (SOP-03 compliance)
    const missing=[]
    if(!parseFloat(blanchTemp))missing.push("Blancheringstemperatur")
    if(!parseFloat(oilTemp))missing.push("Olietemperatur ved blend")
    if(!filtrationOk)missing.push("Filtrering godkendt")
    if(!bestBefore)missing.push("Best-before dato")
    if(!sensory.approved)missing.push("Sensorisk evaluering godkendt")
    if(!opConfirmed)missing.push("Operatørbekræftelse")
    if(missing.length>0){setCompletionErr(`Udfyld før afslutning: ${missing.join(", ")}`);return}
    setActing(true)
    try{
      // 1. Record produce movement BEFORE marking batch completed — only saleable output
      const{data:{user:u}}=await supabase.auth.getUser()
      await recordMovement(supabase,{user_id:u.id,item_id:selected.recipe_id,batch_id:selectedId,movement_type:"produce",qty,unit:"stk",reference:selected.batch_number,notes:loss>0?`Batch afsluttet (spild: ${loss})`:"Batch afsluttet"})
      // 2. Now safe to mark completed — include process loss + batchlog fields
      await updateBatchStatus(supabase,selectedId,"completed",{completed_at:new Date().toISOString(),actual_qty:qty,process_loss_qty:loss||null,loss_notes:lossNotes.trim()||null,blanching_temp:parseFloat(blanchTemp)||null,blanching_time_secs:parseInt(blanchTime)||null,oil_temp:parseFloat(oilTemp)||null,filtration_ok:filtrationOk,best_before:bestBefore||null,sensory_eval:sensory,operator_confirmed:opConfirmed})
      // 3. Event is non-critical — log failure but don't block
      try{await appendEvent(supabase,{batch_id:selectedId,user_id:u.id,event_type:"completed",payload:{actual_qty:qty,process_loss_qty:loss,unit:"stk"},created_by:u.email||u.id})}catch(evErr){console.error("[DRYP] batch event failed (non-critical):",evErr)}
      refresh();if(refreshStock)refreshStock();setSelectedId(null)
    }catch(err){
      console.error("[DRYP] tryComplete failed:",err)
      setCompletionErr("Afslutning fejlede: "+(err.message||"Ukendt fejl")+". Batchen er IKKE afsluttet — prøv igen.")
    }finally{setActing(false)}
  }

  const saveActualQty=async(val)=>{
    const n=parseInt(val)
    if(!n||n===(selected?.actual_qty))return
    setQtyStatus("Gemmer...")
    try{await updateBatchStatus(supabase,selectedId,selected.status,{actual_qty:n});setQtyStatus("Gemt ✓");setTimeout(()=>setQtyStatus(""),2000)}
    catch(err){console.error("[DRYP] saveActualQty failed:",err);setQtyStatus("Fejl");setTimeout(()=>setQtyStatus(""),3000)}
  }

  const saveBatchField=async(updates)=>{
    if(!supabase||!selectedId||selected?.status==="completed")return
    try{await updateBatchStatus(supabase,selectedId,selected.status,updates);refresh()}
    catch(err){console.error("[DRYP] saveBatchField failed:",err)}
  }

  const addLotUsage=async()=>{
    const lot=activeLots.find(l=>l.id===newLot.lotId)
    if(!lot||!newLot.qtyUsed)return
    const qty=parseFloat(newLot.qtyUsed)
    setSavingLot(true)
    try{
      const{data:{user}}=await supabase.auth.getUser()
      await createBatchLotUsage(supabase,{batch_id:selectedId,lot_id:lot.id,item_id:lot.item_id,qty_used:qty,unit:lot.unit})
      await decrementLotQty(supabase,lot.id,qty)
      await recordMovement(supabase,{user_id:user.id,item_id:lot.item_id,lot_id:lot.id,batch_id:selectedId,movement_type:"consumption",qty:-qty,unit:lot.unit,reference:selectedId,created_by:user.email})
      const[usage,lots]=await Promise.all([getBatchLotUsage(supabase,selectedId),getActiveLots(supabase)])
      setLotUsage(usage);setActiveLots(lots);setNewLot({lotId:"",qtyUsed:""})
      if(refreshStock)refreshStock()
    }catch(err){console.error("[DRYP] addLotUsage failed:",err)}
    finally{setSavingLot(false)}
  }

  return<div style={{maxWidth:960}}>
    <SH title="Batches" desc="Klik på en batch for at se detaljer, starte eller afslutte produktion" tip="Hver batch repræsenterer én produktionskørsel. Start en batch, registrér råvarer, og afslut den når produktionen er godkendt."><Btn primary onClick={()=>{setForm({id:`DRYP-${today().replace(/-/g,"").slice(2)}-${String(data.batches.length+1).padStart(3,"0")}`,created:today(),recipeName:"",rapsolieOrigin:"Dansk",status:"produceret",bestBefore:"",notes:"",gtin:"",gs1Note:""});setShow(true)}}><Plus s={12} c={T.bg}/> Ny batch</Btn></SH>

    <div style={{marginBottom:14}}>
      <button onClick={()=>setShowGs1(!showGs1)} style={{background:"none",fontSize:12,color:T.dim,cursor:"pointer",display:"flex",alignItems:"center",gap:6,padding:"4px 0"}}>
        <span style={{fontSize:10}}>{showGs1?"▼":"▶"}</span> GS1 / Stregkode-info
      </button>
      {showGs1&&<div style={{marginTop:8,padding:"12px 14px",background:T.accDD,borderRadius:10,border:`1px solid ${T.acc}33`,fontSize:12,color:T.mid,lineHeight:1.6}}>Når I får GS1 Danmark-medlemskab tildeles I et firma-præfiks (typisk 5790xxxxxxx). Hvert produkt får et GTIN-13 nummer som kan printes som EAN-stregkode. Udfyld GTIN-feltet på batches for at koble produktion til stregkoder.</div>}
    </div>

    {batches.length===0
      ?<Empty text="Ingen batches endnu" action="Opret batch manuelt" onAction={()=>{setForm({id:`DRYP-${today().replace(/-/g,"").slice(2)}-001`,created:today(),recipeName:"",rapsolieOrigin:"Dansk",status:"produceret",bestBefore:"",notes:"",gtin:"",gs1Note:""});setShow(true)}}/>
      :[...batches].sort((a,b)=>((isSql?b.planned_date:b.created)||"").localeCompare((isSql?a.planned_date:a.created)||"")).map(b=>{
        const bStatusC=statusC[b.status]||{produceret:T.acc,lagret:T.warn,frigivet:T.ok,afsluttet:T.dim}[b.status]||T.dim
        const bStatusL=statusDa[b.status]||b.status
        return<Card key={b.id||b.batch_number} onClick={isSql?()=>setSelectedId(b.id):undefined} style={{marginBottom:8,padding:14,cursor:isSql?"pointer":"default",borderLeft:isSql?`4px solid ${b.status==="in_progress"?T.warn:b.status==="planned"?T.acc:b.status==="completed"?T.ok:T.brd}`:`4px solid ${T.brd}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:14,fontWeight:600}}>{isSql?b.batch_number:b.id}</div>
              <div style={{fontSize:12,color:T.dim}}>{isSql?(b.recipe_snapshot?.name||b.recipe_id||"—"):(b.recipeName||"—")} · {isSql?b.planned_date:b.created}{!isSql&&b.bestBefore&&` · Holdbar til: ${b.bestBefore}`}</div>
              {isSql&&b.operator&&<div style={{fontSize:11,color:T.mid,marginTop:2}}>Operatør: {b.operator}{b.planned_qty?` · Planlagt: ${b.planned_qty} stk`:""}</div>}
              {!isSql&&b.gtin&&<div style={{fontSize:11,color:T.acc,fontFamily:T.fm,marginTop:2}}>GTIN: {b.gtin}</div>}
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <Badge c={bStatusC}>{bStatusL}</Badge>
              {!isSql&&<><Btn small onClick={e=>{e.stopPropagation();setForm({...b,gtin:b.gtin||"",gs1Note:b.gs1Note||""});setShow(true)}}>Rediger</Btn><Btn small danger onClick={e=>{e.stopPropagation();if(confirm("Slet?"))update("batches",prev=>prev.filter(x=>x.id!==b.id))}}>Slet</Btn></>}
              {isSql&&<Btn small onClick={e=>{e.stopPropagation();setSelectedId(b.id)}}>{b.status==="planned"?"Start":"Åbn"}</Btn>}
            </div>
          </div>
        </Card>
      })}

    {selected&&<Modal title={`Batch · ${selected.batch_number}`} onClose={()=>{setSelectedId(null);setCompletionErr("")}} wide>

      {/* ─── 1. OVERBLIK ─── */}
      <div style={{fontSize:10,fontWeight:700,color:T.dim,textTransform:"uppercase",letterSpacing:".1em",marginBottom:12}}>1 · Overblik</div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{fontSize:18,fontWeight:700,fontFamily:T.fm}}>{selected.batch_number}</div>
        <Badge c={statusC[selected.status]||T.dim}>{statusDa[selected.status]||selected.status}</Badge>
        <Tip text="Planlagt: Batch oprettet, produktion ikke startet.\nI gang: Produktion kører — registrér råvarer og faktisk antal nedenfor.\nAfsluttet: Produktion godkendt og lukket."/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px 24px",fontSize:12,marginBottom:22}}>
        {[["Opskrift",selected.recipe_snapshot?.name||selected.recipe_id||"—"],["Operatør",selected.operator||"—"],["Planlagt antal",selected.planned_qty?`${selected.planned_qty} stk`:"—"],["Planlagt dato",selected.planned_date||"—"]].map(([k,v])=><div key={k}><div style={{fontSize:10,color:T.dim,textTransform:"uppercase",letterSpacing:".05em",marginBottom:3}}>{k}</div><div style={{fontWeight:500}}>{v}</div></div>)}
      </div>

      {/* ─── NÆSTE SKRIDT ─── */}
      {(()=>{
        const s=selected.status
        const rawBom=(selected.recipe_snapshot?.bom||[]).filter(b=>{const inv=data.inventory.find(i=>i.id===b.itemId);return inv&&inv.cat==="Råvare"})
        const missingRaw=rawBom.filter(b=>!lotUsage.some(lu=>(lu.item_id||lu.lots?.item_id)===b.itemId))
        const allRawCovered=missingRaw.length===0
        const hasQty=!!(selected.actual_qty||parseInt(actualQty))
        const nsStyle=(bc)=>({background:T.accDD,borderLeft:`3px solid ${bc}`,borderRadius:8,padding:"12px 16px",marginBottom:18})
        const nsLabel=<div style={{fontSize:10,fontWeight:700,color:T.dim,textTransform:"uppercase",letterSpacing:".08em",marginBottom:3}}>Næste skridt</div>
        if(s==="planned")return<div style={{...nsStyle(T.acc),display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>{nsLabel}<div style={{fontSize:13,color:T.txt,fontWeight:500}}>Start produktion af denne batch</div></div>
          <Btn primary disabled={acting} onClick={()=>doAction("in_progress",{started_at:new Date().toISOString()})}>▶ Start batch</Btn>
        </div>
        if(s==="in_progress"&&!allRawCovered)return<div style={nsStyle(T.warn)}>
          {nsLabel}<div style={{fontSize:13,color:T.txt,fontWeight:500}}>Registrér råvarer ({missingRaw.length} mangler) — se sektion 3 nedenfor</div>
        </div>
        if(s==="in_progress"&&allRawCovered&&!hasQty)return<div style={nsStyle(T.warn)}>
          {nsLabel}<div style={{fontSize:13,color:T.txt,fontWeight:500}}>Angiv faktisk produceret antal</div>
        </div>
        if(s==="in_progress"&&allRawCovered&&hasQty)return<div style={{...nsStyle(T.ok),display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>{nsLabel}<div style={{fontSize:13,color:T.txt,fontWeight:500}}>Batch klar til afslutning</div></div>
          <Btn primary disabled={acting} onClick={tryComplete}>✓ Afslut batch</Btn>
        </div>
        if(s==="completed")return<div style={nsStyle(T.ok)}>
          <div style={{fontSize:13,color:T.ok,fontWeight:500}}>✓ Batch er afsluttet{selected.completed_at&&<span style={{color:T.dim,fontWeight:400,marginLeft:8,fontSize:11}}>{selected.completed_at.slice(0,10)}</span>}</div>
          <div style={{fontSize:12,color:T.mid,marginTop:6}}>Output: {selected.actual_qty||"—"} stk{selected.process_loss_qty>0&&<span style={{color:T.warn,marginLeft:10}}>Spild: {selected.process_loss_qty} stk</span>}{selected.loss_notes&&<span style={{color:T.dim,marginLeft:10}}>({selected.loss_notes})</span>}</div>
        </div>
        return null
      })()}

      {completionErr&&<div style={{background:"#3a1c1c",border:`1px solid ${T.red}`,borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#ff9b9b"}}>{completionErr}</div>}

      {/* ─── 2. PRODUKTION ─── */}
      <div style={{borderTop:`1px solid ${T.brdL}`,paddingTop:16,marginBottom:22}}>
        <div style={{fontSize:10,fontWeight:700,color:T.dim,textTransform:"uppercase",letterSpacing:".1em",marginBottom:14}}>2 · Produktion</div>

        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center"}}>
            <div style={{fontSize:11,fontWeight:600,color:T.mid}}>Faktisk output</div>
            <Tip text="Antal salgbare færdigvarer. Kun dette antal tilføjes lageret. Udfyldes inden du afslutter batchen."/>
          </div>
          <input type="number" min="0" value={actualQty} onChange={e=>setActualQty(e.target.value)} onBlur={e=>saveActualQty(e.target.value)} placeholder="antal" style={{width:90}} disabled={selected.status==="completed"}/>
          <span style={{fontSize:12,color:T.dim}}>stk</span>
          {qtyStatus&&<span style={{fontSize:11,color:qtyStatus==="Fejl"?T.red:qtyStatus==="Gemmer..."?T.dim:T.ok,marginLeft:4,fontWeight:500}}>{qtyStatus}</span>}
        </div>

        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center"}}>
            <div style={{fontSize:11,fontWeight:600,color:T.mid}}>Proces-spild</div>
            <Tip text="Antal enheder tabt i produktion — f.eks. flasker der ikke kunne fyldes pga. rest i udstyr, spild ved aftapning, kasserede enheder. Angives i samme enhed som output (stk)."/>
          </div>
          <input type="number" min="0" value={processLoss} onChange={e=>setProcessLoss(e.target.value)} placeholder="0" style={{width:90}} disabled={selected.status==="completed"}/>
          <span style={{fontSize:12,color:T.dim}}>stk</span>
        </div>

        {selected.status!=="completed"&&(parseFloat(processLoss)||0)>0&&<div style={{marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{fontSize:11,fontWeight:600,color:T.mid}}>Note om spild</div>
          </div>
          <input value={lossNotes} onChange={e=>setLossNotes(e.target.value)} placeholder="f.eks. spild ved aftapning, kasserede flasker" style={{width:"100%",maxWidth:400,marginTop:4}} disabled={selected.status==="completed"}/>
        </div>}

        {(()=>{
          const out=parseInt(actualQty)||0;const loss=parseFloat(processLoss)||0;const planned=selected.planned_qty||0
          if(selected.status==="completed"||!planned||!out)return null
          const total=out+loss;const diff=Math.abs(total-planned)/planned
          if(diff<=0.2)return null
          return<div style={{background:`${T.warn}15`,border:`1px solid ${T.warn}44`,borderRadius:8,padding:"8px 12px",fontSize:12,color:T.warn,marginTop:4}}>
            ⚠ Output ({out} stk) + spild ({loss} stk) = {total} stk — afviger mere end 20% fra planlagt ({planned} stk). Tjek at tallene stemmer.
          </div>
        })()}
      </div>

      {/* ─── 3. PRODUKTIONSPARAMETRE (SOP-03 batchlog) ─── */}
      <div style={{borderTop:`1px solid ${T.brdL}`,paddingTop:16,marginBottom:22}}>
        <div style={{display:"flex",alignItems:"center",marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:700,color:T.dim,textTransform:"uppercase",letterSpacing:".1em"}}>3 · Produktionsparametre</div>
          <Tip text="Kritiske produktionsparametre jf. SOP-03 (Blanch-Blend-Filter-Fyld). Alle felter markeret med * er påkrævet før batch kan afsluttes."/>
        </div>

        {selected.status==="completed"
          ?<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px 24px",fontSize:12,marginBottom:12}}>
            {[["Blanchering",`${selected.blanching_temp||"—"}°C${selected.blanching_time_secs?` / ${selected.blanching_time_secs} sek`:""}`],["Olietemperatur",`${selected.oil_temp||"—"}°C`],["Filtrering",selected.filtration_ok?"Godkendt ✓":"—"],["Best-before",selected.best_before||"—"],["Sensorisk",selected.sensory_eval?.approved?"Godkendt ✓":"—"],["Operatør bekræftet",selected.operator_confirmed?"Ja ✓":"—"]].map(([k,v])=><div key={k}><div style={{fontSize:10,color:T.dim,textTransform:"uppercase",letterSpacing:".05em",marginBottom:3}}>{k}</div><div style={{fontWeight:500}}>{v}</div></div>)}
            {selected.sensory_eval&&(selected.sensory_eval.color||selected.sensory_eval.taste||selected.sensory_eval.smell)&&<div style={{gridColumn:"1/-1",fontSize:12,color:T.mid,marginTop:4}}>
              {selected.sensory_eval.color&&<span>Farve: {selected.sensory_eval.color}</span>}
              {selected.sensory_eval.taste&&<span style={{marginLeft:12}}>Smag: {selected.sensory_eval.taste}</span>}
              {selected.sensory_eval.smell&&<span style={{marginLeft:12}}>Lugt: {selected.sensory_eval.smell}</span>}
            </div>}
          </div>

          :<>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0 16px",marginBottom:8}}>
              <Field label="Blancheringstemperatur (°C) *" tip="CCP-1: Temp ≥ 95°C i minimum 15 sek. Sikrer inaktivering af patogener."><input type="number" step=".1" value={blanchTemp} onChange={e=>setBlanchTemp(e.target.value)} onBlur={()=>saveBatchField({blanching_temp:parseFloat(blanchTemp)||null})} placeholder="f.eks. 97"/></Field>
              <Field label="Blancheringstid (sek)" tip="Anbefalet 15–30 sek. Soft-krav — batch kan afsluttes uden."><input type="number" value={blanchTime} onChange={e=>setBlanchTime(e.target.value)} onBlur={()=>saveBatchField({blanching_time_secs:parseInt(blanchTime)||null})} placeholder="f.eks. 20"/></Field>
              <Field label="Olietemperatur ved blend (°C) *" tip="CCP-2: 80–85°C. Reducerer mikrobiel belastning."><input type="number" step=".1" value={oilTemp} onChange={e=>setOilTemp(e.target.value)} onBlur={()=>saveBatchField({oil_temp:parseFloat(oilTemp)||null})} placeholder="f.eks. 83"/></Field>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px",marginBottom:8}}>
              <Field label="Best-before dato *" tip="Holdbarhedsdato for dette batch. Påføres etiket."><input type="date" value={bestBefore} onChange={e=>{setBestBefore(e.target.value);saveBatchField({best_before:e.target.value||null})}}/></Field>
              <div style={{display:"flex",alignItems:"flex-end",paddingBottom:18}}>
                <Check checked={filtrationOk} onChange={v=>{setFiltrationOk(v);saveBatchField({filtration_ok:v})}} label="Filtrering godkendt (ingen synlige partikler) *"/>
              </div>
            </div>

            <div style={{background:T.input,borderRadius:8,padding:"12px 14px",marginBottom:12,border:`1px solid ${sensory.approved?`${T.ok}44`:T.brdL}`}}>
              <div style={{fontSize:11,fontWeight:700,color:T.mid,textTransform:"uppercase",letterSpacing:".05em",marginBottom:10}}>Sensorisk evaluering *</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0 12px",marginBottom:8}}>
                <Field label="Farve"><input value={sensory.color} onChange={e=>{const s={...sensory,color:e.target.value};setSensory(s)}} onBlur={()=>saveBatchField({sensory_eval:sensory})} placeholder="f.eks. dyb grøn"/></Field>
                <Field label="Smag"><input value={sensory.taste} onChange={e=>{const s={...sensory,taste:e.target.value};setSensory(s)}} onBlur={()=>saveBatchField({sensory_eval:sensory})} placeholder="f.eks. frisk, ren"/></Field>
                <Field label="Lugt"><input value={sensory.smell} onChange={e=>{const s={...sensory,smell:e.target.value};setSensory(s)}} onBlur={()=>saveBatchField({sensory_eval:sensory})} placeholder="f.eks. OK"/></Field>
              </div>
              <Check checked={sensory.approved} onChange={v=>{const s={...sensory,approved:v};setSensory(s);saveBatchField({sensory_eval:s})}} label="Sensorisk godkendt"/>
            </div>

            <div style={{background:T.accDD,borderRadius:8,padding:"10px 14px",border:`1px solid ${opConfirmed?`${T.ok}44`:`${T.warn}44`}`}}>
              <Check checked={opConfirmed} onChange={v=>{setOpConfirmed(v);saveBatchField({operator_confirmed:v})}} label="Jeg bekræfter at alle parametre er korrekt registreret *"/>
            </div>

            {!parseInt(blanchTime)&&parseFloat(blanchTemp)>0&&<div style={{fontSize:11,color:T.warn,marginTop:8}}>Blancheringstid er ikke udfyldt — anbefalet 15–30 sek.</div>}
          </>
        }
      </div>

      {/* ─── 4. SPORBARHED — per BOM item ─── */}
      <div style={{borderTop:`1px solid ${T.brdL}`,paddingTop:16,marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:700,color:T.dim,textTransform:"uppercase",letterSpacing:".1em"}}>4 · Sporbarhed</div>
          <Tip text="Sporbarhed dokumenterer hvilke råvarelots der gik ind i denne batch. Påkrævet ved fødevarekontrol og tilbagekaldelser."/>
        </div>

        {(()=>{
          const rawBom=(selected.recipe_snapshot?.bom||[]).filter(b=>{const inv=data.inventory.find(i=>i.id===b.itemId);return inv&&inv.cat==="Råvare"})
          if(rawBom.length===0)return<div style={{fontSize:12,color:T.dim,marginBottom:10}}>Ingen råvarer i opskriften</div>
          return rawBom.map(b=>{
            const inv=data.inventory.find(i=>i.id===b.itemId)
            const itemUsage=lotUsage.filter(u=>(u.item_id||u.lots?.item_id)===b.itemId)
            const usedTotal=itemUsage.reduce((s,u)=>s+(parseFloat(u.qty_used)||0),0)
            const hasUsage=itemUsage.length>0
            const openLotFor=()=>{if(selected.status!=="in_progress")return;setLotItemId(b.itemId);setNewLot({lotId:"",qtyUsed:""});setShowLotModal(true)}
            return<div key={b.itemId} onClick={openLotFor} style={{marginBottom:12,padding:"10px 12px",background:T.input,borderRadius:8,border:`1px solid ${hasUsage?`${T.ok}44`:`${T.warn}44`}`,cursor:selected.status==="in_progress"?"pointer":"default"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:hasUsage?8:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:12,fontWeight:700,color:hasUsage?T.ok:T.warn,background:hasUsage?`${T.ok}22`:`${T.warn}22`,width:26,height:26,borderRadius:7,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{hasUsage?"✓":"⚠"}</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:600}}>{inv?.name||b.itemId}</div>
                    <div style={{fontSize:11,color:T.dim}}>Behov: {b.qty} {b.unit}{usedTotal>0&&<span style={{color:T.acc,marginLeft:8}}>Registreret: {usedTotal} {b.unit}</span>}</div>
                  </div>
                </div>
                {selected.status==="in_progress"&&<Btn small primary onClick={e=>{e.stopPropagation();openLotFor()}}>+ Registrér</Btn>}
              </div>
              {itemUsage.length>0&&<div style={{paddingTop:6,borderTop:`1px solid ${T.brdL}`}}>
                {itemUsage.map(u=><div key={u.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12,padding:"3px 0"}}>
                  <span style={{fontWeight:500,color:T.mid}}>{u.lots?.lot_number||u.lot_id}{u.lots?.expiry_date&&<span style={{color:T.dim,marginLeft:6,fontSize:11}}>Udløb: {u.lots.expiry_date}</span>}{u.lots?.supplier&&<span style={{color:T.dim,marginLeft:6,fontSize:11}}>({u.lots.supplier})</span>}</span>
                  <span style={{fontFamily:T.fm,color:T.acc}}>{u.qty_used} {u.unit}</span>
                </div>)}
              </div>}
            </div>
          })
        })()}
      </div>

      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <Btn onClick={()=>setSelectedId(null)}>Luk</Btn>
      </div>
    </Modal>}
    {showLotModal&&selected&&(()=>{const lotInv=data.inventory.find(i=>i.id===lotItemId);return<Modal title={lotInv?`Registrér forbrug · ${lotInv.name}`:"Registrér råvareforbrug"} onClose={()=>setShowLotModal(false)}>
      {!lotItemId&&<Field label="Råvare">
        <select value={lotItemId} onChange={e=>{setLotItemId(e.target.value);setNewLot({lotId:"",qtyUsed:""})}}>
          <option value="">Vælg råvare...</option>
          {(selected.recipe_snapshot?.bom||[]).map(b=>{const inv=data.inventory.find(i=>i.id===b.itemId);return inv?<option key={b.itemId} value={b.itemId}>{inv.name} ({inv.unit})</option>:null})}
        </select>
      </Field>}
      <Field label="Lot">
        <select value={newLot.lotId} onChange={e=>setNewLot({...newLot,lotId:e.target.value})} disabled={!lotItemId}>
          <option value="">Vælg lot...</option>
          {activeLots.filter(l=>l.item_id===lotItemId).map(l=><option key={l.id} value={l.id}>{l.lot_number} · {l.qty_remaining} {l.unit} tilbage</option>)}
        </select>
      </Field>
      <Field label={`Mængde brugt${activeLots.find(l=>l.id===newLot.lotId)?.unit?` (${activeLots.find(l=>l.id===newLot.lotId).unit})`:""}`}>
        <input type="number" step=".01" min="0" value={newLot.qtyUsed} onChange={e=>setNewLot({...newLot,qtyUsed:e.target.value})} placeholder="0.00"/>
      </Field>
      {activeLots.filter(l=>l.item_id===lotItemId).length===0&&lotItemId&&<div style={{fontSize:12,color:T.warn,marginBottom:12,padding:"8px 12px",background:T.input,borderRadius:8}}>Ingen aktive lots for denne råvare. Opret et lot under Lager først.</div>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn onClick={()=>setShowLotModal(false)}>Annuller</Btn>
        <Btn primary disabled={savingLot||!newLot.lotId||!newLot.qtyUsed} onClick={async()=>{await addLotUsage();setShowLotModal(false)}}>{savingLot?"Gemmer...":"✓ Registrér"}</Btn>
      </div>
    </Modal>})()}
    {show&&<Modal title={`Batch · ${form.id}`} onClose={()=>setShow(false)}>
      <Field label="Batch-nr."><input value={form.id} onChange={e=>setForm({...form,id:e.target.value})}/></Field>
      <Field label="Oprettet"><input type="date" value={form.created} onChange={e=>setForm({...form,created:e.target.value})}/></Field>
      <Field label="Rapsolie-oprindelse"><select value={form.rapsolieOrigin} onChange={e=>setForm({...form,rapsolieOrigin:e.target.value})}><option>Dansk</option><option>EU</option></select></Field>
      <Field label="Holdbar til"><input type="date" value={form.bestBefore} onChange={e=>setForm({...form,bestBefore:e.target.value})}/></Field>
      <Field label="Status"><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="produceret">Produceret</option><option value="lagret">Lagret</option><option value="frigivet">Frigivet</option><option value="afsluttet">Afsluttet</option></select></Field>
      <div style={{borderTop:`1px solid ${T.brdL}`,margin:"8px 0 14px",paddingTop:12}}><span style={{fontSize:11,fontWeight:700,color:T.acc}}>GS1 / STREGKODE</span></div>
      <Field label="GTIN-13" tip="13-cifret EAN-kode fra GS1 Danmark. Udfyldes når I har fået tildelt numre."><input value={form.gtin} onChange={e=>setForm({...form,gtin:e.target.value})} placeholder="5790000000000" maxLength={13}/></Field>
      <Field label="GS1 noter"><input value={form.gs1Note} onChange={e=>setForm({...form,gs1Note:e.target.value})} placeholder="Evt. noter om stregkode"/></Field>
      <Field label="Noter"><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></Field>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={()=>setShow(false)}>Annuller</Btn><Btn primary onClick={()=>{update("batches",prev=>[form,...prev.filter(b=>b.id!==form.id)]);setShow(false)}}>✓ Gem</Btn></div>
    </Modal>}
  </div>
}

// ═══ HACCP — Supabase-backed egenkontrol with history ═══
function HACCPLogs({data,update,supabase,user}){
  const[tab,setTab]=useState("cleaning")
  const[show,setShow]=useState(false)
  const[form,setForm]=useState({})
  const[period,setPeriod]=useState("today")
  const[weekOffset,setWeekOffset]=useState(0)
  const[sqlLogs,setSqlLogs]=useState([])
  const[loading,setLoading]=useState(false)
  const[saving,setSaving]=useState(false)
  const[devBatches,setDevBatches]=useState([])
  const[devErr,setDevErr]=useState("")
  useEffect(()=>{if(supabase)getBatches(supabase).then(setDevBatches).catch(()=>{})},[supabase])

  const tabs=[["cleaning","Rengøring"],["temps","Temperatur"],["receiving","Modtagelse"],["deviations","Afvigelser"],["maintenance","Vedligehold"]]
  const tabLabel=Object.fromEntries(tabs)
  const tipMap={cleaning:"Daglig rengøringslog — dokumenterer at udstyr og lokaler er rengjort.",temps:"Temperaturlog for køleudstyr — registreres dagligt.",receiving:"Modtagekontrol af råvarer — temperatur og emballage ved levering.",deviations:"Afvigelser fra normal procedure — kræver korrigerende handling.",maintenance:"Forebyggende vedligehold af udstyr."}

  // Week helpers
  const getMonday=(offset=0)=>{const d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7)+(offset*7));return d.toISOString().slice(0,10)}
  const getSunday=(offset=0)=>{const m=new Date(getMonday(offset));m.setDate(m.getDate()+6);return m.toISOString().slice(0,10)}
  const weekNum=(dateStr)=>{const d=new Date(dateStr);d.setHours(0,0,0,0);d.setDate(d.getDate()+3-(d.getDay()+6)%7);const y=new Date(d.getFullYear(),0,4);return Math.round(((d-y)/864e5+y.getDay()+6)/7)}

  // Date range for current view
  const dateRange=()=>{
    if(period==="today")return{from:today(),to:today()}
    if(period==="week")return{from:getMonday(0),to:getSunday(0)}
    return{from:getMonday(weekOffset),to:getSunday(weekOffset)}
  }

  // Normalize legacy JSON entry to unified shape
  const normalizeLegacy=(entry,category)=>{
    const{id,date,operator,notes,...rest}=entry
    return{id,log_date:date,operator,category,payload:rest,notes:notes||"",source:"legacy"}
  }

  // Normalize Supabase entry
  const normalizeSql=(entry)=>({...entry,source:"supabase"})

  // Merge legacy + Supabase, filter by period and tab
  const getMergedEntries=()=>{
    const{from,to}=dateRange()
    const sqlIds=new Set(sqlLogs.map(l=>l.id))

    // Legacy entries for the active tab, filtered by date range
    const legacy=(data.haccp?.[tab]||[])
      .map(e=>normalizeLegacy(e,tab))
      .filter(e=>e.log_date>=from&&e.log_date<=to)
      .filter(e=>!sqlIds.has(e.id))

    // Supabase entries filtered by tab
    const sql=sqlLogs.filter(l=>l.category===tab).map(normalizeSql)

    return[...sql,...legacy].sort((a,b)=>(b.log_date||"").localeCompare(a.log_date||"")||(b.created_at||"").localeCompare(a.created_at||""))
  }

  // For history "all categories" grouped view
  const getMergedAll=()=>{
    const{from,to}=dateRange()
    const sqlIds=new Set(sqlLogs.map(l=>l.id))

    const legacy=tabs.flatMap(([cat])=>
      (data.haccp?.[cat]||[]).map(e=>normalizeLegacy(e,cat))
    ).filter(e=>e.log_date>=from&&e.log_date<=to).filter(e=>!sqlIds.has(e.id))

    const sql=sqlLogs.map(normalizeSql)
    return[...sql,...legacy].sort((a,b)=>(b.log_date||"").localeCompare(a.log_date||"")||(b.created_at||"").localeCompare(a.created_at||""))
  }

  // Fetch from Supabase
  const refresh=async()=>{
    if(!supabase)return
    setLoading(true)
    try{
      const{from,to}=dateRange()
      const rows=await getHaccpLogs(supabase,{from,to})
      setSqlLogs(rows||[])
    }catch(err){console.error("[DRYP] getHaccpLogs failed:",err)}
    setLoading(false)
  }
  useEffect(()=>{refresh()},[supabase,period,weekOffset])

  // Extract payload fields for form
  const payloadFields={
    cleaning:["area","product","disinfected","ok"],
    temps:["time","fridge1","fridge2","prodRoom","withinLimits","action"],
    receiving:["supplier","item","qty","temp","packagingOk","approved"],
    deviations:["devNumber","description","processStep","batchId","batchNumber","immediateAction","rootCause","corrective","preventive","responsible","devStatus","closedDate"],
    maintenance:["equipment","checkType","status","action","nextCheck"]
  }

  const newE=async()=>{
    const ex={cleaning:{area:"",product:"",disinfected:false,ok:false},temps:{time:"08:00",fridge1:"",fridge2:"",prodRoom:"",withinLimits:false,action:""},receiving:{supplier:"",item:"",qty:"",temp:"",packagingOk:false,approved:false},deviations:{devNumber:"",description:"",processStep:"",batchId:"",batchNumber:"",immediateAction:"",rootCause:"",corrective:"",preventive:"",responsible:user?.email?.split("@")[0]||"",devStatus:"open",closedDate:null},maintenance:{equipment:"",checkType:"",status:"OK",action:"",nextCheck:""}}
    // Generate DEV number for new deviations
    if(tab==="deviations"&&supabase){
      try{
        const year=new Date().getFullYear()
        const{data:rows}=await supabase.from("haccp_logs").select("payload").eq("category","deviations")
        const nums=(rows||[]).map(r=>{const dn=r.payload?.devNumber;if(!dn||!dn.startsWith(`DEV-${year}-`))return 0;return parseInt(dn.split("-")[2])||0})
        const next=(nums.length>0?Math.max(...nums):0)+1
        ex.deviations.devNumber=`DEV-${year}-${String(next).padStart(3,"0")}`
      }catch(e){console.error("[DRYP] DEV number gen failed:",e)}
    }
    setForm({_isNew:true,date:today(),operator:user?.email?.split("@")[0]||"",notes:"",...ex[tab]})
    setDevErr("")
    setShow(true)
  }

  const editEntry=(entry)=>{
    const flat={_isNew:false,_sqlId:entry.source==="supabase"?entry.id:null,_source:entry.source,date:entry.log_date,operator:entry.operator||"",notes:entry.notes||"",...entry.payload}
    setForm(flat)
    setShow(true)
  }

  const doSave=async()=>{
    if(!supabase)return
    setDevErr("")
    // Deviation-specific validation
    if(tab==="deviations"){
      if(!form.description?.trim()){setDevErr("Beskrivelse er påkrævet");return}
      if(form.devStatus==="closed"&&!form.closedDate){setDevErr("Angiv lukkedato for at lukke afvigelsen");return}
    }
    setSaving(true)
    try{
      const fields=payloadFields[tab]||[]
      const payload={}
      fields.forEach(f=>{if(form[f]!==undefined)payload[f]=form[f]})
      // Enforce closure logic
      if(tab==="deviations"){
        if(payload.devStatus==="open")payload.closedDate=null
      }
      const{data:{user:u}}=await supabase.auth.getUser()

      if(form._isNew){
        await createHaccpLog(supabase,{user_id:u.id,category:tab,log_date:form.date,operator:form.operator,payload,notes:form.notes||""})
      }else if(form._sqlId){
        await updateHaccpLog(supabase,form._sqlId,{category:tab,log_date:form.date,operator:form.operator,payload,notes:form.notes||""})
      }
      setShow(false)
      await refresh()
    }catch(err){console.error("[DRYP] HACCP save failed:",err);alert("Fejl: "+err.message)}
    setSaving(false)
  }

  const doDelete=async(entry)=>{
    if(!confirm("Slet denne log?"))return
    if(entry.source==="supabase"){
      try{await deleteHaccpLog(supabase,entry.id);await refresh()}
      catch(err){console.error("[DRYP] HACCP delete failed:",err)}
    }
  }

  // Can this entry be edited/deleted?
  const canEdit=(entry)=>{
    if(entry.source==="legacy")return false
    if(period==="today")return true
    if(period==="week")return entry.log_date===today()
    return false
  }

  // Render a single entry row
  const renderRow=(e,showCat=false)=>{
    const p=e.payload||{}
    const cat=e.category
    const editable=canEdit(e)
    return<Card key={e.id+(e.source||"")} style={{marginBottom:6,padding:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span style={{fontFamily:T.fm,fontSize:12,color:T.dim}}>{e.log_date}</span>
          {showCat&&<Badge c={T.acc}>{tabLabel[cat]||cat}</Badge>}
          {e.operator&&<span style={{fontSize:11,color:T.mid}}>{e.operator}</span>}
          {cat==="cleaning"&&<span>{p.area||"—"}</span>}
          {cat==="temps"&&<span>K1:{p.fridge1||"—"}° K2:{p.fridge2||"—"}°{p.prodRoom?` Lok:${p.prodRoom}°`:""}</span>}
          {cat==="receiving"&&<span>{p.item||"—"} {p.supplier?`← ${p.supplier}`:""}{p.temp?` ${p.temp}°C`:""}</span>}
          {cat==="deviations"&&<><span style={{fontFamily:T.fm,fontSize:11,color:T.warn}}>{p.devNumber||e.log_date}</span><span style={{color:T.red}}>{(p.description||"—").slice(0,50)}</span>{p.responsible&&<span style={{fontSize:11,color:T.dim}}>({p.responsible})</span>}{p.batchNumber&&<span style={{fontSize:11,color:T.mid}}>Batch: {p.batchNumber}</span>}</>}
          {cat==="maintenance"&&<span>{p.equipment||"—"}</span>}
          {e.source==="legacy"&&<span style={{fontSize:9,color:T.dim,background:T.accDD,padding:"1px 6px",borderRadius:4}}>arkiv</span>}
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {cat==="cleaning"&&<Dot s={p.ok?"ok":"warn"}/>}
          {cat==="temps"&&<Dot s={p.withinLimits?"ok":"warn"}/>}
          {cat==="receiving"&&<Dot s={p.approved?"ok":"warn"}/>}
          {cat==="deviations"&&(()=>{const closed=p.devStatus==="closed"||(p.devStatus==null&&!!p.closedDate);return<Badge c={closed?T.ok:T.red}>{closed?"Lukket":"Åben"}</Badge>})()}
          {cat==="maintenance"&&<Badge c={p.status==="OK"?T.ok:T.warn}>{p.status||"—"}</Badge>}
          {editable&&<Btn small onClick={()=>editEntry(e)}>Rediger</Btn>}
          {editable&&<Btn small danger onClick={()=>doDelete(e)}>Slet</Btn>}
        </div>
      </div>
      {e.notes&&<div style={{fontSize:12,color:T.dim,marginTop:4,fontStyle:"italic"}}>{e.notes}</div>}
    </Card>
  }

  // Group entries by date for history view
  const groupByDate=(entries)=>{
    const groups={}
    entries.forEach(e=>{const d=e.log_date||"ukendt";if(!groups[d])groups[d]=[];groups[d].push(e)})
    return Object.entries(groups).sort((a,b)=>b[0].localeCompare(a[0]))
  }

  const exportCsv=()=>{
    const all=getMergedAll()
    if(all.length===0)return
    const pks=new Set()
    all.forEach(e=>Object.keys(e.payload||{}).forEach(k=>pks.add(k)))
    const pkList=[...pks].sort()
    const fixed=["Dato","Kategori","Operatør","Noter","Kilde","Oprettet"]
    const headers=[...fixed,...pkList]
    const fmt=v=>{
      if(v==null)return""
      if(v===true)return"Ja"
      if(v===false)return"Nej"
      if(Array.isArray(v))return v.join("; ")
      if(typeof v==="object")return JSON.stringify(v)
      return String(v)
    }
    const esc=v=>{const s=fmt(v).replace(/"/g,'""');return'"'+s+'"'}
    const rows=all.map(e=>{
      const p=e.payload||{}
      const base=[e.log_date||"",tabLabel[e.category]||e.category||"",e.operator||"",(e.notes||"").replace(/\n/g," "),e.source==="supabase"?"Supabase":"Arkiv",e.created_at||""]
      const dyn=pkList.map(k=>p[k])
      return[...base,...dyn].map(esc).join(",")
    })
    const csv="\uFEFF"+[headers.map(esc).join(","),...rows].join("\n")
    const monday=getMonday(weekOffset)
    const wk=weekNum(monday)
    const yr=monday.slice(0,4)
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8"})
    const url=URL.createObjectURL(blob)
    const a=document.createElement("a");a.href=url;a.download="haccp-uge-"+wk+"-"+yr+".csv"
    document.body.appendChild(a);a.click();document.body.removeChild(a)
    setTimeout(()=>URL.revokeObjectURL(url),1000)
  }

  const entries=getMergedEntries()
  const isHistory=period==="history"

  return<div style={{maxWidth:960}}>
    <SH title="HACCP Logs" desc="Egenkontrol-dokumentation" tip={tipMap[tab]}>
      {period==="today"&&<Btn primary onClick={newE}><Plus s={12} c={T.bg}/> Ny log</Btn>}
    </SH>

    {/* Period selector */}
    <div style={{display:"flex",gap:0,marginBottom:16}}>
      {[["today","I dag"],["week","Denne uge"],["history","Historik"]].map(([id,l])=>
        <button key={id} onClick={()=>{setPeriod(id);if(id==="history")setWeekOffset(0)}} style={{padding:"7px 16px",fontSize:12,fontWeight:period===id?600:400,color:period===id?T.bg:T.mid,background:period===id?T.acc:"transparent",border:`1px solid ${period===id?T.acc:T.brd}`,borderRadius:id==="today"?"6px 0 0 6px":id==="history"?"0 6px 6px 0":"0",cursor:"pointer"}}>{l}</button>
      )}
    </div>

    {/* Week navigator for history */}
    {isHistory&&<div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
      <button onClick={()=>setWeekOffset(w=>w-1)} aria-label="Forrige uge" title="Forrige uge" style={{background:"none",color:T.acc,fontSize:16,cursor:"pointer",padding:"4px 8px"}}>←</button>
      <div style={{fontSize:13,fontWeight:600}}>Uge {weekNum(getMonday(weekOffset))} · {getMonday(weekOffset)} — {getSunday(weekOffset)}</div>
      <button onClick={()=>setWeekOffset(w=>Math.min(w+1,0))} disabled={weekOffset>=0} aria-label="Næste uge" title="Næste uge" style={{background:"none",color:weekOffset>=0?T.dim:T.acc,fontSize:16,cursor:weekOffset>=0?"not-allowed":"pointer",padding:"4px 8px"}}>→</button>
      {weekOffset<0&&<button onClick={()=>setWeekOffset(0)} style={{background:T.accDD,color:T.acc,fontSize:11,cursor:"pointer",fontWeight:600,padding:"3px 10px",borderRadius:6,border:`1px solid ${T.acc}44`}}>Gå til nu</button>}
      <div style={{flex:1}}/>
      <Btn small onClick={exportCsv} disabled={loading}>Eksportér CSV</Btn>
    </div>}

    {/* Tabs — shown for today and week views */}
    {!isHistory&&<Tabs tabs={tabs} active={tab} onChange={setTab}/>}

    {loading&&<div style={{color:T.dim,fontSize:13,padding:20}}>Indlæser...</div>}

    {/* Today + Week: tab-filtered list */}
    {!isHistory&&!loading&&(entries.length===0
      ?<Empty text={period==="today"?"Ingen logs i dag":"Ingen logs denne uge"} action={period==="today"?"Tilføj":undefined} onAction={period==="today"?newE:undefined}/>
      :entries.map(e=>renderRow(e))
    )}

    {/* History: all categories, grouped by date */}
    {isHistory&&!loading&&(()=>{
      const all=getMergedAll()
      if(all.length===0)return<Empty text={`Ingen logs i uge ${weekNum(getMonday(weekOffset))}`}/>
      const groups=groupByDate(all)
      return groups.map(([date,items])=><div key={date} style={{marginBottom:18}}>
        <div style={{fontSize:11,fontWeight:700,color:T.dim,letterSpacing:".1em",textTransform:"uppercase",marginBottom:6,paddingBottom:4,borderBottom:`1px solid ${T.brdL}`}}>
          {new Date(date+"T12:00:00").toLocaleDateString("da-DK",{weekday:"long",day:"numeric",month:"long"})}
        </div>
        {items.map(e=>renderRow(e,true))}
      </div>)
    })()}

    {/* Entry form modal — same fields as before */}
    {show&&<Modal title={tabs.find(t=>t[0]===tab)?.[1]||"Log"} onClose={()=>setShow(false)}>
      <Field label="Dato"><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></Field>
      <Field label="Operatør"><input value={form.operator} onChange={e=>setForm({...form,operator:e.target.value})}/></Field>
      {tab==="cleaning"&&<><Field label="Område"><select value={form.area} onChange={e=>setForm({...form,area:e.target.value})}><option value="">Vælg...</option>{["Produktionsbord","Infusionskar","Filtreringsudstyr","Aftapningsudstyr","Gulv","Håndvask","Afløb"].map(a=><option key={a}>{a}</option>)}</select></Field><Field label="Middel"><input value={form.product} onChange={e=>setForm({...form,product:e.target.value})}/></Field><Check checked={form.disinfected} onChange={v=>setForm({...form,disinfected:v})} label="Desinficeret"/><div style={{marginTop:8}}><Check checked={form.ok} onChange={v=>setForm({...form,ok:v})} label="Godkendt"/></div></>}
      {tab==="temps"&&<><Field label="Tid"><input type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})}/></Field><Field label="Køl 1 (°C) max 5°C"><input type="number" step=".1" value={form.fridge1} onChange={e=>setForm({...form,fridge1:e.target.value})}/></Field><Field label="Køl 2 (°C) max 15°C"><input type="number" step=".1" value={form.fridge2} onChange={e=>setForm({...form,fridge2:e.target.value})}/></Field><Field label="Lokale (°C)"><input type="number" step=".1" value={form.prodRoom} onChange={e=>setForm({...form,prodRoom:e.target.value})}/></Field><Check checked={form.withinLimits} onChange={v=>setForm({...form,withinLimits:v})} label="Inden for grænser"/></>}
      {tab==="receiving"&&<><Field label="Leverandør"><input value={form.supplier} onChange={e=>setForm({...form,supplier:e.target.value})}/></Field><Field label="Vare"><input value={form.item} onChange={e=>setForm({...form,item:e.target.value})}/></Field><Field label="Mængde"><input value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})}/></Field><Field label="Temp (°C)"><input type="number" step=".1" value={form.temp} onChange={e=>setForm({...form,temp:e.target.value})}/></Field><Check checked={form.packagingOk} onChange={v=>setForm({...form,packagingOk:v})} label="Emballage OK"/><div style={{marginTop:8}}><Check checked={form.approved} onChange={v=>setForm({...form,approved:v})} label="Godkendt"/></div></>}
      {tab==="deviations"&&<>
        {devErr&&<div style={{background:"#fff0f0",border:`1px solid ${T.red}`,borderRadius:6,padding:"8px 12px",marginBottom:10,fontSize:13,color:T.red}}>{devErr}</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Afvigelsesnr."><input value={form.devNumber||""} readOnly style={{background:T.bgD,color:T.dim,cursor:"default"}}/></Field>
          <Field label="Batch"><select value={form.batchId||""} onChange={e=>{const b=devBatches.find(x=>x.id===e.target.value);setForm({...form,batchId:e.target.value,batchNumber:b?b.batch_number:""})}}><option value="">Ingen batch</option>{devBatches.map(b=><option key={b.id} value={b.id}>{b.batch_number} — {b.recipe_name||"ukendt"}</option>)}</select></Field>
        </div>
        <Field label="Procestrin"><input value={form.processStep||""} onChange={e=>setForm({...form,processStep:e.target.value})} placeholder="F.eks. blanchering, filtrering, aftapning..."/></Field>
        <Field label="Beskrivelse *"><textarea value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Beskriv afvigelsen..." rows={3}/></Field>
        <Field label="Straks-handling"><textarea value={form.immediateAction||""} onChange={e=>setForm({...form,immediateAction:e.target.value})} placeholder="Hvad blev gjort med det samme?" rows={2}/></Field>
        <Field label="Årsagsanalyse"><textarea value={form.rootCause||""} onChange={e=>setForm({...form,rootCause:e.target.value})} placeholder="Hvad var den grundlæggende årsag?" rows={2}/></Field>
        <Field label="Korrigerende handling"><textarea value={form.corrective||""} onChange={e=>setForm({...form,corrective:e.target.value})} placeholder="Hvad rettes for at fjerne årsagen?" rows={2}/></Field>
        <Field label="Forebyggende handling"><textarea value={form.preventive||""} onChange={e=>setForm({...form,preventive:e.target.value})} placeholder="Hvad forhindrer gentagelse?" rows={2}/></Field>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Ansvarlig"><input value={form.responsible||""} onChange={e=>setForm({...form,responsible:e.target.value})}/></Field>
          <Field label="Status"><select value={form.devStatus||"open"} onChange={e=>{const s=e.target.value;setForm({...form,devStatus:s,...(s==="open"?{closedDate:null}:{closedDate:form.closedDate||today()})})}}><option value="open">Åben</option><option value="closed">Lukket</option></select></Field>
        </div>
        {form.devStatus==="closed"&&<Field label="Lukkedato"><input type="date" value={form.closedDate||""} onChange={e=>setForm({...form,closedDate:e.target.value})}/></Field>}
      </>}
      {tab==="maintenance"&&<><Field label="Udstyr"><input value={form.equipment} onChange={e=>setForm({...form,equipment:e.target.value})}/></Field><Field label="Type"><input value={form.checkType} onChange={e=>setForm({...form,checkType:e.target.value})}/></Field><Field label="Status"><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>OK</option><option>Fejl</option></select></Field><Field label="Handling"><textarea value={form.action} onChange={e=>setForm({...form,action:e.target.value})}/></Field><Field label="Næste kontrol"><input type="date" value={form.nextCheck} onChange={e=>setForm({...form,nextCheck:e.target.value})}/></Field></>}
      <Field label="Noter"><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></Field>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={()=>setShow(false)}>Annuller</Btn><Btn primary onClick={doSave} disabled={saving}>{saving?"Gemmer...":"✓ Gem"}</Btn></div>
    </Modal>}
  </div>
}

// ═══ INVENTORY, PLANNING, CUSTOMERS, ECONOMY — kept from v2 with bigger fonts ═══
function Inventory({data,update,supabase,rawStock={},refreshStock}){
  const[show,setShow]=useState(false);const[form,setForm]=useState({});const[eId,setEId]=useState(null);const[qv,setQv]=useState("")
  const[showLot,setShowLot]=useState(false);const[lotForm,setLotForm]=useState({});const[savingLot,setSavingLot]=useState(false)
  const[activeLots,setActiveLots]=useState([])
  const[fgStock,setFgStock]=useState({})
  const loadLots=()=>{if(supabase)getActiveLots(supabase).then(setActiveLots).catch(()=>{})}
  useEffect(()=>{loadLots()},[supabase])
  const fgItems=(data.inventory||[]).filter(i=>i.cat==="Færdigvare")
  const fgIds=fgItems.map(i=>i.id).join(",")
  useEffect(()=>{
    if(!supabase||fgItems.length===0){setFgStock({});return}
    supabase.from("stock_levels").select("item_id,current_qty,last_movement_at").in("item_id",fgItems.map(i=>i.id))
      .then(({data:rows})=>{
        if(!rows)return
        const m={}
        rows.forEach(r=>{
          const prev=m[r.item_id]
          if(!prev){m[r.item_id]={qty:r.current_qty||0,lastAt:r.last_movement_at||null}}
          else{prev.qty+=(r.current_qty||0);if(r.last_movement_at&&(!prev.lastAt||r.last_movement_at>prev.lastAt))prev.lastAt=r.last_movement_at}
        })
        setFgStock(m)
      }).catch(()=>{})
  },[supabase,fgIds])
  const cats=[...new Set(data.inventory.map(i=>i.cat))].filter(c=>c!=="Færdigvare")
  const rawItems=(data.inventory||[]).filter(i=>i.cat==="Råvare")

  const saveLot=async()=>{
    if(!lotForm.item_id||!lotForm.lot_number||!lotForm.qty_received)return
    setSavingLot(true)
    try{
      const{data:{user}}=await supabase.auth.getUser()
      const qty=parseFloat(lotForm.qty_received)||0
      const unit=lotForm.item_unit||(rawItems.find(i=>i.id===lotForm.item_id)?.unit)||"kg"
      const lot=await createLot(supabase,{
        user_id:user.id,
        item_id:lotForm.item_id,
        lot_number:lotForm.lot_number,
        supplier:lotForm.supplier||null,
        received_date:lotForm.received_date||null,
        expiry_date:lotForm.expiry_date||null,
        qty_received:qty,
        qty_remaining:qty,
        unit,
      })
      await recordMovement(supabase,{
        user_id:user.id,
        item_id:lotForm.item_id,
        lot_id:lot.id,
        movement_type:"receipt",
        qty,
        unit,
        reference:lotForm.lot_number,
        notes:"Lot modtaget",
      })
      setShowLot(false);setLotForm({});loadLots();if(refreshStock)refreshStock()
    }catch(err){console.error("[DRYP] createLot failed:",err);alert("Fejl ved oprettelse af lot: "+err.message)}
    setSavingLot(false)
  }

  return<div style={{maxWidth:960}}>
    <SH title="Lagerbeholdning" desc="Varer og råvare-lots — klik på antal for hurtig-edit" tip="Her registreres to ting: 1) Lagervarer — de faste varer med minimumsbeholdning. 2) Lots — specifikke leverancer af råvarer med lottnummer og mængde. Lots bruges til sporbarhed i Batches.">
      <Btn primary onClick={()=>{setForm({id:uid(),name:"",unit:"stk",qty:0,min:0,cat:"Råvare",leadDays:7,supplier:"",costPer:0});setShow(true)}}><Plus s={12} c={T.bg}/> Tilføj vare</Btn>
    </SH>
    {cats.map(cat=><div key={cat} style={{marginBottom:22}}><div style={{fontSize:11,fontWeight:700,color:T.dim,letterSpacing:".1em",textTransform:"uppercase",marginBottom:10,paddingBottom:4,borderBottom:`1px solid ${T.brdL}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}><span>{cat}</span>{cat==="Råvare"&&<span style={{fontSize:10,color:T.acc,fontWeight:500,letterSpacing:".02em",textTransform:"none"}}>Opret lots for at spore råvareforbrug i produktion</span>}</div>
      {data.inventory.filter(i=>i.cat===cat).map(item=>{const sq=getStock(item,rawStock);const hasSql=item.cat==="Råvare"&&rawStock[item.id]!=null;const low=sq<item.min;return<Card key={item.id} style={{marginBottom:6,padding:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:14,fontWeight:500}}>{low&&<span style={{color:T.red}}>⚠ </span>}{item.name}</div><div style={{fontSize:12,color:T.dim}}>Min: {item.min} · Lead: {item.leadDays}d{item.supplier&&` · ${item.supplier}`} · {fk(item.costPer)}/{item.unit}{hasSql&&<span style={{color:T.acc,marginLeft:6}} title="Beregnet fra lot-bevægelser">· lot-baseret</span>}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",flexShrink:0}}>
            <div style={{display:"flex",alignItems:"baseline",gap:4,minWidth:70}}>
              <span style={{fontSize:20,fontFamily:T.fm,fontWeight:700,color:low?T.red:T.txt}}>{sq}</span>
              <span style={{fontSize:12,color:T.dim}}>{item.unit}</span>
            </div>
            {eId===item.id
              ?<div style={{display:"flex",gap:6,alignItems:"center"}}><input type="number" value={qv} onChange={e=>setQv(e.target.value)} style={{width:70}} autoFocus onKeyDown={e=>{if(e.key==="Enter"){update("inventory",p=>p.map(i=>i.id===item.id?{...i,qty:parseFloat(qv)||0}:i));setEId(null)}}}/><Btn small primary onClick={()=>{update("inventory",p=>p.map(i=>i.id===item.id?{...i,qty:parseFloat(qv)||0}:i));setEId(null)}}>Gem</Btn><Btn small onClick={()=>setEId(null)}>Annuller</Btn></div>
              :<>
                {!hasSql&&<Btn onClick={()=>{setEId(item.id);setQv(String(sq))}}>Ret antal</Btn>}
                {item.cat==="Råvare"&&<Btn onClick={()=>{setLotForm({item_id:item.id,item_name:item.name,item_unit:item.unit,lot_number:"",supplier:"",qty_received:"",received_date:today(),expiry_date:""});setShowLot(true)}} style={{background:T.accD,color:T.acc,border:`1px solid ${T.acc}44`}}>Opret lot</Btn>}
                <Btn onClick={()=>{setForm(item);setShow(true)}}>Rediger vare</Btn>
                <Btn danger onClick={()=>{if(confirm(`Slet "${item.name}"?`))update("inventory",p=>p.filter(x=>x.id!==item.id))}}>Slet</Btn>
              </>}
          </div></div>
        <div style={{marginTop:6,height:4,background:T.input,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(sq/(item.min||1)*100,100)}%`,background:low?T.red:sq<item.min*1.5?T.warn:T.ok,borderRadius:2}}/></div>
        {item.cat==="Råvare"&&activeLots.filter(l=>l.item_id===item.id).length>0&&<div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${T.brdL}`}}>
          <div style={{fontSize:10,fontWeight:600,color:T.dim,textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>Aktive lots</div>
          {activeLots.filter(l=>l.item_id===item.id).map(l=><div key={l.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12,padding:"3px 0",borderBottom:`1px solid ${T.brdL}22`}}>
            <span style={{fontWeight:500}}>{l.lot_number}</span>
            <div style={{display:"flex",gap:12,alignItems:"center",color:T.dim}}>
              <span style={{fontFamily:T.fm,color:T.acc}}>{l.qty_remaining} {l.unit}</span>
              <span>Modtaget {l.received_date||"—"}</span>
              {l.expiry_date&&<span style={{color:new Date(l.expiry_date)<new Date()?T.red:T.mid}}>Udløb {l.expiry_date}</span>}
            </div>
          </div>)}
        </div>}
      </Card>})}
    </div>)}

    {/* ─── FÆRDIGVARER (read-only, stock from SQL) ─── */}
    {fgItems.length>0&&<div style={{marginBottom:22}}>
      <div style={{fontSize:11,fontWeight:700,color:T.dim,letterSpacing:".1em",textTransform:"uppercase",marginBottom:10,paddingBottom:4,borderBottom:`1px solid ${T.brdL}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span>Færdigvarer</span>
        <span style={{fontSize:10,color:T.acc,fontWeight:500,letterSpacing:".02em",textTransform:"none"}}>Beholdning styres af batch-produktion</span>
      </div>
      {fgItems.map(item=>{const st=fgStock[item.id];const qty=st?.qty||0;const lastAt=st?.lastAt;return<Card key={item.id} style={{marginBottom:6,padding:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:14,fontWeight:500}}>{item.name}</div>
            <div style={{fontSize:12,color:T.dim}}>{item.id}{lastAt&&` · Seneste bevægelse: ${new Date(lastAt).toLocaleDateString("da-DK",{day:"numeric",month:"short",year:"numeric"})}`}</div>
          </div>
          <div style={{display:"inline-flex",alignItems:"baseline",gap:5,padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:600,background:T.card2,color:qty>0?T.ok:T.dim,border:`1px solid ${T.brd}`}}>
            <span style={{fontSize:18,fontFamily:T.fm,fontWeight:700}}>{qty}</span>
            <span style={{color:T.dim}}>{item.unit}</span>
          </div>
        </div>
      </Card>})}
    </div>}

    {showLot&&<Modal title={`Opret lot · ${lotForm.item_name||"—"}`} onClose={()=>setShowLot(false)}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18,padding:"10px 14px",background:T.accDD,borderRadius:10,border:`1px solid ${T.acc}33`}}>
        <div style={{fontSize:22}}>📦</div>
        <div><div style={{fontSize:14,fontWeight:600}}>{lotForm.item_name}</div><div style={{fontSize:12,color:T.mid}}>Enhed: {lotForm.item_unit||"—"}</div></div>
      </div>
      <Field label="Lot-nummer" tip="Leverandørens lot- eller batchnummer fra leveringsdokumentet"><input value={lotForm.lot_number} onChange={e=>setLotForm({...lotForm,lot_number:e.target.value})} placeholder="F.eks. LOT-2024-001" autoFocus/></Field>
      <Field label={`Modtaget antal (${lotForm.item_unit||"enheder"})`}><input type="number" step="any" min="0" value={lotForm.qty_received} onChange={e=>setLotForm({...lotForm,qty_received:e.target.value})} placeholder="0"/></Field>
      <Field label="Leverandør"><input value={lotForm.supplier} onChange={e=>setLotForm({...lotForm,supplier:e.target.value})} placeholder="Valgfri"/></Field>
      <Field label="Modtagelsesdato"><input type="date" value={lotForm.received_date} onChange={e=>setLotForm({...lotForm,received_date:e.target.value})}/></Field>
      <Field label="Udløbsdato" tip="Valgfri — bruges til FEFO-sortering og udløbsadvarsler i batch-produktion"><input type="date" value={lotForm.expiry_date} onChange={e=>setLotForm({...lotForm,expiry_date:e.target.value})}/></Field>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:6}}><Btn onClick={()=>setShowLot(false)}>Annuller</Btn><Btn primary onClick={saveLot} disabled={savingLot||!lotForm.lot_number||!lotForm.qty_received}>{savingLot?"Gemmer...":"✓ Opret lot"}</Btn></div>
    </Modal>}
    {show&&<Modal title={form.name||"Ny vare"} onClose={()=>setShow(false)}><Field label="Navn"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Kategori" tip="'Råvare' bruges i opskriftkalkulator. Alt andet regnes som emballage."><select value={form.cat} onChange={e=>setForm({...form,cat:e.target.value})}><option>Råvare</option><option>Emballage</option><option>Andet</option></select></Field><Field label="Enhed"><input value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}/></Field><Field label="Beholdning"><input type="number" value={form.qty} onChange={e=>setForm({...form,qty:parseFloat(e.target.value)||0})}/></Field><Field label="Minimum"><input type="number" value={form.min} onChange={e=>setForm({...form,min:parseFloat(e.target.value)||0})}/></Field><Field label="Lead time (dage)" tip="Antal dage fra bestilling til levering"><input type="number" value={form.leadDays} onChange={e=>setForm({...form,leadDays:parseInt(e.target.value)||0})}/></Field><Field label="Leverandør"><input value={form.supplier} onChange={e=>setForm({...form,supplier:e.target.value})}/></Field><Field label="Pris pr. enhed"><input type="number" step=".1" value={form.costPer} onChange={e=>setForm({...form,costPer:parseFloat(e.target.value)||0})}/></Field><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={()=>setShow(false)}>Annuller</Btn><Btn primary onClick={()=>{update("inventory",p=>p.find(i=>i.id===form.id)?p.map(i=>i.id===form.id?form:i):[...p,form]);setShow(false)}}>✓ Gem</Btn></div></Modal>}
  </div>
}

function Planning({data,update,rawStock={}}){
  const recipes=(data.recipes||[]).filter(r=>r.active)
  const[planQty,setPlanQty]=useState(()=>Object.fromEntries(recipes.map(r=>[r.id,50])))
  const[editItem,setEditItem]=useState(null);const[ef,setEf]=useState({})
  const needs={};recipes.forEach(r=>{const qty=parseInt(planQty[r.id])||0;(r.bom||[]).forEach(b=>{if(!needs[b.itemId])needs[b.itemId]={required:0,items:[]};needs[b.itemId].required+=b.qty*qty;needs[b.itemId].items.push({recipe:r.name,total:b.qty*qty})})})
  const plan=data.inventory.map(inv=>{const sq=getStock(inv,rawStock);const n=needs[inv.id]||{required:0,items:[]};const deficit=Math.max(0,n.required-sq);const oq=deficit>0?Math.ceil(deficit/10)*10:0;return{...inv,_sq:sq,need:n.required,deficit,orderQty:oq,orderBy:oq>0?addDays(today(),-(inv.leadDays||7)):null,needsOrder:oq>0}}).sort((a,b)=>(b.needsOrder?1:0)-(a.needsOrder?1:0))
  return<div style={{maxWidth:1060}}>
    <SH title="Indkøbsplan" desc="Beregnet fra opskrifter og lagerstatus" tip="Angiv antal flasker du vil producere. Systemet beregner indkøbsbehov. Klik Rediger for at ændre leverandør, pris og lead time direkte."/>
    <Card style={{marginBottom:20}}><div style={{fontSize:13,fontWeight:600,marginBottom:14}}>Planlagt produktion</div><div style={{display:"flex",gap:16,flexWrap:"wrap"}}>{recipes.map(r=><div key={r.id} style={{flex:"1 1 220px"}}><div style={{fontSize:13,color:T.mid,marginBottom:5}}>{r.name}</div><div style={{display:"flex",alignItems:"center",gap:10}}><input type="number" value={planQty[r.id]||0} onChange={e=>setPlanQty({...planQty,[r.id]:e.target.value})} style={{width:90,textAlign:"center"}}/><span style={{fontSize:12,color:T.dim}}>flasker</span></div></div>)}</div></Card>
    <div style={{fontSize:14,fontWeight:600,marginBottom:14}}>Indkøbsbehov</div>
    {plan.map(item=><Card key={item.id} style={{marginBottom:8,padding:14,borderLeft:item.needsOrder?`4px solid ${T.red}`:`4px solid ${T.ok}`}}>
      {editItem===item.id?<div className="fade-in"><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0 14px"}}><Field label="Navn"><input value={ef.name} onChange={e=>setEf({...ef,name:e.target.value})}/></Field><Field label="Enhed"><input value={ef.unit} onChange={e=>setEf({...ef,unit:e.target.value})}/></Field><Field label="Pris pr. enhed"><input type="number" step=".1" value={ef.costPer} onChange={e=>setEf({...ef,costPer:parseFloat(e.target.value)||0})}/></Field><Field label="Leverandør"><input value={ef.supplier} onChange={e=>setEf({...ef,supplier:e.target.value})}/></Field><Field label="Lead time (dage)"><input type="number" value={ef.leadDays} onChange={e=>setEf({...ef,leadDays:parseInt(e.target.value)||0})}/></Field><Field label="Minimum"><input type="number" value={ef.min} onChange={e=>setEf({...ef,min:parseFloat(e.target.value)||0})}/></Field></div><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn small onClick={()=>setEditItem(null)}>Annuller</Btn><Btn small primary onClick={()=>{update("inventory",prev=>prev.map(i=>i.id===editItem?{...i,...ef}:i));setEditItem(null)}}>✓ Gem</Btn></div></div>:
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:14,fontWeight:500}}>{item.name}</div><div style={{fontSize:12,color:T.dim}}>Behov: {item.need.toFixed(1)} {item.unit} · Lager: {item._sq} · Lead: {item.leadDays}d{item.supplier&&` · ${item.supplier}`} · {fk(item.costPer)}/{item.unit}</div></div><div style={{display:"flex",alignItems:"center",gap:10}}><Btn small onClick={()=>{setEditItem(item.id);setEf({name:item.name,costPer:item.costPer,supplier:item.supplier,leadDays:item.leadDays,min:item.min,unit:item.unit})}}>Rediger</Btn>{item.needsOrder?<div style={{textAlign:"right"}}><div style={{fontSize:18,fontWeight:700,fontFamily:T.fm,color:T.red}}>{item.orderQty} {item.unit}</div><div style={{fontSize:11,color:T.warn}}>Bestil senest {item.orderBy}</div><div style={{fontSize:11,color:T.dim}}>~{fk(Math.round(item.orderQty*(item.costPer||0)))}</div></div>:<Badge c={T.ok}>OK</Badge>}</div></div>}
    </Card>)}
    <Card style={{marginTop:18,background:T.accD,border:"none"}}><div style={{fontSize:13,fontWeight:600,marginBottom:6}}>Total indkøb</div><div style={{fontSize:22,fontWeight:700,fontFamily:T.fm,color:T.acc}}>{fk(Math.round(plan.reduce((s,i)=>s+i.orderQty*(i.costPer||0),0)))}</div></Card>
  </div>
}

function Customers({data,supabase,user}){
  const[tab,setTab]=useState("customers");const[show,setShow]=useState(false);const[ft,setFt]=useState("c");const[form,setForm]=useState({})
  const[customers,setCustomers]=useState([]);const[orders,setOrders]=useState([]);const[loading,setLoading]=useState(true)
  const[sqlBatches,setSqlBatches]=useState([])
  const recipes=(data.recipes||[]).filter(r=>r.active)
  const reload=async()=>{if(!supabase)return;try{const[c,o,b]=await Promise.all([getCustomers(supabase),getOrders(supabase),getBatches(supabase)]);setCustomers(c||[]);setOrders(o||[]);setSqlBatches(b||[])}catch(e){console.error('[DRYP] customers/orders load failed:',e)}finally{setLoading(false)}}
  useEffect(()=>{reload()},[supabase])
  const doSave=async()=>{
    try{
      if(ft==="c"){
        const payload={name:form.name,type:form.type,contact:form.contact||null,email:form.email||null,phone:form.phone||null,status:form.status,notes:form.notes||null,updated_by:user?.id||null}
        if(form._isNew){await createCustomer(supabase,{...payload,created_by:user?.id||null})}
        else{await updateCustomer(supabase,form.id,payload)}
      }else{
        const payload={customer_id:form.customer_id||null,order_date:form.order_date||null,delivery_date:form.delivery_date||null,product:form.product||null,qty:parseInt(form.qty)||null,price:parseFloat(form.price)||null,batch_ref:form.batch_ref||null,status:form.status,customer_ref:form.customer_ref||null,internal_note:form.internal_note||null,customer_note:form.customer_note||null,updated_by:user?.id||null}
        if(form._isNew){await createOrder(supabase,{...payload,created_by:user?.id||null})}
        else{await updateOrder(supabase,form.id,payload)}
      }
      setShow(false);await reload()
    }catch(e){alert("Fejl: "+(e.message||"Ukendt fejl"))}
  }
  const orderStatusDa={ny:"Ny",bekraeftet:"Bekræftet",produktion:"Klar til produktion",levering:"Klar til levering",leveret:"Leveret",fakturaklar:"Klar til fakturering",faktureret:"Faktureret"}
  const orderStatusC={ny:T.dim,bekraeftet:T.acc,produktion:T.warn,levering:T.warn,leveret:T.ok,fakturaklar:T.acc,faktureret:T.dim}
  const normalizeStatus=(s)=>({bestilt:"bekraeftet",pakket:"levering"}[s]||s)
  const newOrder=()=>{setFt("o");setForm({_isNew:true,customer_id:customers[0]?.id||"",order_date:today(),delivery_date:"",product:recipes[0]?.name||"",qty:"",price:"",batch_ref:"",status:"ny",customer_ref:"",internal_note:"",customer_note:""});setShow(true)}
  const newCustomer=()=>{setFt("c");setForm({_isNew:true,name:"",type:"restaurant",contact:"",email:"",phone:"",status:"lead",notes:""});setShow(true)}
  const handleDeleteCustomer=async(c)=>{if(!confirm(`Slet "${c.name}"?`))return;try{await deleteCustomer(supabase,c.id);await reload()}catch(e){alert("Fejl: "+(e.message||"Ukendt fejl"))}}
  const handleDeleteOrder=async(o)=>{const cust=customers.find(c=>c.id===o.customer_id);if(!confirm(`Slet ordre for ${cust?.name||"ukendt"}?`))return;try{await deleteOrder(supabase,o.id);await reload()}catch(e){alert("Fejl: "+(e.message||"Ukendt fejl"))}}
  const doneStatuses=["leveret","fakturaklar","faktureret"]
  const sorted=[...orders].sort((a,b)=>{
    const aDone=doneStatuses.includes(a.status)?1:0
    const bDone=doneStatuses.includes(b.status)?1:0
    if(aDone!==bDone)return aDone-bDone
    const aDate=a.delivery_date||a.order_date||""
    const bDate=b.delivery_date||b.order_date||""
    return aDone?bDate.localeCompare(aDate):aDate.localeCompare(bDate)
  })
  if(loading)return<div style={{textAlign:"center",padding:60,color:T.dim}}>Indlæser kunder og ordrer...</div>
  return<div style={{maxWidth:1060}}>
    <Tabs tabs={[["customers","Kunder"],["orders","Ordrer"]]} active={tab} onChange={setTab} right={<Btn primary small onClick={()=>{if(tab==="customers")newCustomer();else newOrder()}}><Plus s={11} c={T.bg}/> {tab==="customers"?"Ny kunde":"Ny ordre"}</Btn>}/>

    {/* ─── KUNDER ─── */}
    {tab==="customers"&&(customers.length===0?<Empty text="Ingen kunder endnu" action="Tilføj kunde" onAction={newCustomer}/>:customers.map(c=><Card key={c.id} style={{marginBottom:6,padding:12}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:32,height:32,borderRadius:"50%",background:T.accD,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:T.acc}}>{c.name?.charAt(0)?.toUpperCase()}</div><div><div style={{fontSize:13,fontWeight:500}}>{c.name}</div><div style={{fontSize:12,color:T.dim}}>{c.type}{c.email&&` · ${c.email}`}{c.phone&&` · ${c.phone}`}</div></div></div><div style={{display:"flex",gap:6,flexShrink:0}}><Badge c={c.status==="aktiv"?T.ok:c.status==="lead"?T.acc:T.dim}>{c.status}</Badge><Btn small onClick={()=>{setFt("c");setForm({...c});setShow(true)}}>Rediger</Btn><Btn small danger onClick={()=>handleDeleteCustomer(c)}>Slet</Btn></div></div></Card>))}

    {/* ─── ORDRER ─── */}
    {tab==="orders"&&(orders.length===0?<Empty text="Ingen ordrer endnu" action="Opret ordre" onAction={newOrder}/>:<div>
      {sorted.map(o=>{
        const cust=customers.find(c=>c.id===o.customer_id)
        const total=(parseFloat(o.price)||0)*(parseInt(o.qty)||0)
        const stLabel=orderStatusDa[o.status]||o.status
        const stColor=orderStatusC[o.status]||T.dim
        const isUrgent=!doneStatuses.includes(o.status)&&o.delivery_date&&o.delivery_date<=addDays(today(),2)
        return<Card key={o.id} style={{marginBottom:6,padding:"12px 14px",borderLeft:`4px solid ${stColor}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span style={{fontSize:14,fontWeight:600}}>{cust?.name||"—"}</span>
                <Badge c={stColor}>{stLabel}</Badge>
                {isUrgent&&<span style={{fontSize:11,fontWeight:600,color:T.red}}>Snart levering</span>}
              </div>
              <div style={{fontSize:12,color:T.dim,marginTop:3}}>
                {o.product} · {o.qty} stk{total>0&&<span style={{color:T.mid,marginLeft:6}}>{fk(Math.round(total))}</span>}
                {o.delivery_date&&<span style={{marginLeft:8}}>Levering: <span style={{color:isUrgent?T.red:T.txt,fontWeight:isUrgent?600:400}}>{o.delivery_date}</span></span>}
                {!o.delivery_date&&<span style={{marginLeft:8,color:T.warn}}>Ingen leveringsdato</span>}
              </div>
              <div style={{fontSize:11,color:T.dim,marginTop:2}}>
                Bestilt {o.order_date}{o.customer_ref&&<span style={{marginLeft:8}}>Ref: {o.customer_ref}</span>}{o.batch_ref&&<span style={{marginLeft:8}}>Batch: {o.batch_ref}</span>}
              </div>
              {o.internal_note&&<div style={{fontSize:11,color:T.warn,marginTop:3,fontStyle:"italic"}}>Intern: {o.internal_note}</div>}
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0,marginLeft:12}}>
              <Btn small onClick={()=>{setFt("o");setForm({...o,status:normalizeStatus(o.status)});setShow(true)}}>Rediger</Btn>
              <Btn small danger onClick={()=>handleDeleteOrder(o)}>Slet</Btn>
            </div>
          </div>
        </Card>
      })}
    </div>)}

    {/* ─── KUNDE MODAL ─── */}
    {show&&ft==="c"&&<Modal title={form.name||"Ny kunde"} onClose={()=>setShow(false)}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
        <Field label="Navn"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field>
        <Field label="Type"><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="restaurant">Restaurant</option><option value="delikatesse">Delikatesse</option><option value="detail">Detail</option><option value="engros">Engros</option></select></Field>
        <Field label="Kontakt"><input value={form.contact||""} onChange={e=>setForm({...form,contact:e.target.value})}/></Field>
        <Field label="Email"><input value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})}/></Field>
        <Field label="Telefon"><input value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})}/></Field>
        <Field label="Status"><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="lead">Lead</option><option value="prøve">Prøve sendt</option><option value="aktiv">Aktiv</option><option value="inaktiv">Inaktiv</option></select></Field>
      </div>
      <Field label="Noter"><textarea value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})}/></Field>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={()=>setShow(false)}>Annuller</Btn><Btn primary onClick={doSave}>Gem kunde</Btn></div>
    </Modal>}

    {/* ─── ORDRE MODAL ─── */}
    {show&&ft==="o"&&<Modal title={form.customer_id?`Ordre · ${customers.find(c=>c.id===form.customer_id)?.name||""}`:"Ny ordre"} onClose={()=>setShow(false)} wide>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0 16px"}}>
        <Field label="Kunde"><select value={form.customer_id||""} onChange={e=>setForm({...form,customer_id:e.target.value||null})}><option value="">Vælg kunde...</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Ordredato"><input type="date" value={form.order_date||""} onChange={e=>setForm({...form,order_date:e.target.value})}/></Field>
        <Field label="Ønsket leveringsdato" tip="Hvornår forventer kunden levering? Bruges til planlægning."><input type="date" value={form.delivery_date||""} onChange={e=>setForm({...form,delivery_date:e.target.value})}/></Field>
        <Field label="Produkt"><select value={form.product||""} onChange={e=>setForm({...form,product:e.target.value})}>{recipes.map(r=><option key={r.id}>{r.name}</option>)}</select></Field>
        <Field label="Antal"><input type="number" value={form.qty||""} onChange={e=>setForm({...form,qty:e.target.value})}/></Field>
        <Field label="Pris pr. stk"><input type="number" value={form.price||""} onChange={e=>setForm({...form,price:e.target.value})}/></Field>
        <Field label="Kundereference" tip="Kundens eget ordrenummer eller PO-reference."><input value={form.customer_ref||""} onChange={e=>setForm({...form,customer_ref:e.target.value})} placeholder="f.eks. PO-12345"/></Field>
        <Field label="Batch"><select value={form.batch_ref||""} onChange={e=>setForm({...form,batch_ref:e.target.value||null})}><option value="">—</option>{sqlBatches.map(b=><option key={b.id} value={b.batch_number}>{b.batch_number}</option>)}</select></Field>
        <Field label="Status"><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
          <option value="ny">Ny</option>
          <option value="bekraeftet">Bekræftet</option>
          <option value="produktion">Klar til produktion</option>
          <option value="levering">Klar til levering</option>
          <option value="leveret">Leveret</option>
          <option value="fakturaklar">Klar til fakturering</option>
          <option value="faktureret">Faktureret</option>
        </select></Field>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
        <Field label="Intern note" tip="Kun synlig internt — bruges til planlægning, produktion eller logistik."><textarea value={form.internal_note||""} onChange={e=>setForm({...form,internal_note:e.target.value})} placeholder="f.eks. kunden henter selv, special-etiket"/></Field>
        <Field label="Bemærkning til kunde" tip="Tekst der kan bruges på følgeseddel eller ordrebekræftelse senere."><textarea value={form.customer_note||""} onChange={e=>setForm({...form,customer_note:e.target.value})} placeholder="f.eks. leveres til bagindgang"/></Field>
      </div>
      {(parseFloat(form.price)||0)>0&&(parseInt(form.qty)||0)>0&&<div style={{padding:"10px 14px",background:T.accDD,borderRadius:8,marginBottom:14,fontSize:13}}>
        Total: <strong style={{fontFamily:T.fm,color:T.acc}}>{fk(Math.round((parseFloat(form.price)||0)*(parseInt(form.qty)||0)))}</strong>
        <span style={{color:T.dim,marginLeft:8}}>({form.qty} × {form.price} kr)</span>
      </div>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={()=>setShow(false)}>Annuller</Btn><Btn primary onClick={doSave}>Gem ordre</Btn></div>
    </Modal>}
  </div>
}

function Economy({data,save,supabase}){
  const[editP,setEditP]=useState(false);const p=data.prices||{};const[pf,setPf]=useState(p)
  const[simOpen,setSimOpen]=useState(false);const[simRid,setSimRid]=useState("");const[simW,setSimW]=useState("");const[simOh,setSimOh]=useState("");const[simRawMul,setSimRawMul]=useState("0");const[simPackMul,setSimPackMul]=useState("0")
  const[ecoBatches,setEcoBatches]=useState(null)
  const[orders,setOrders]=useState([])
  const recipes=(data.recipes||[]).filter(r=>r.active)
  useEffect(()=>{if(!supabase)return;getBatches(supabase).then(setEcoBatches).catch(()=>{});getOrders(supabase).then(setOrders).catch(()=>{})},[supabase])

  // Cost helpers
  const costRaw=(rid)=>{const r=(data.recipes||[]).find(x=>x.id===rid);if(!r)return 0;return(r.bom||[]).filter(b=>{const inv=data.inventory.find(x=>x.id===b.itemId);return inv?.cat==="Råvare"}).reduce((s,b)=>{const inv=data.inventory.find(x=>x.id===b.itemId);return s+(inv?.costPer||0)*b.qty},0)}
  const costPack=(rid)=>{const r=(data.recipes||[]).find(x=>x.id===rid);if(!r)return 0;return(r.bom||[]).filter(b=>{const inv=data.inventory.find(x=>x.id===b.itemId);return inv?.cat!=="Råvare"}).reduce((s,b)=>{const inv=data.inventory.find(x=>x.id===b.itemId);return s+(inv?.costPer||0)*b.qty},0)}

  // Wholesale price lookup — two-tier:
  // 1) data.prices.byRecipe[recipeId]?.wholesale (future-proof per-recipe mapping)
  // 2) Legacy fallback for exact dild-250/dild-500 only
  // Returns null if no price found so UI can show "mangler pris"
  const getWholesalePrice=(rid)=>{
    const byR=p.byRecipe?.[rid]
    if(byR?.wholesale!=null)return byR.wholesale
    if(rid==="dild-250"&&p.wholesale250!=null)return p.wholesale250
    if(rid==="dild-500"&&p.wholesale500!=null)return p.wholesale500
    return null
  }

  // Revenue: current and previous month
  const mo=today().slice(0,7)
  const prevDate=new Date(today());prevDate.setMonth(prevDate.getMonth()-1)
  const prevMo=prevDate.toISOString().slice(0,7)
  const revThis=orders.filter(o=>o.order_date?.startsWith(mo)).reduce((s,o)=>s+(parseFloat(o.price)||0)*(parseInt(o.qty)||0),0)
  const revPrev=orders.filter(o=>o.order_date?.startsWith(prevMo)).reduce((s,o)=>s+(parseFloat(o.price)||0)*(parseInt(o.qty)||0),0)

  // Bottles sold this month + weighted margin
  const thisMonthOrders=orders.filter(o=>o.order_date?.startsWith(mo))
  const totalQtyThis=thisMonthOrders.reduce((s,o)=>s+(parseInt(o.qty)||0),0)
  let marginWeightedSum=0;let revenueWeightedSum=0
  thisMonthOrders.forEach(o=>{
    const qty=parseInt(o.qty)||0;const price=parseFloat(o.price)||0
    const r=recipes.find(x=>x.name===o.product)
    if(!r||!qty||!price)return
    const cost=costRaw(r.id)+costPack(r.id)
    marginWeightedSum+=(price-cost)*qty
    revenueWeightedSum+=price*qty
  })
  const avgDbPct=revenueWeightedSum>0?Math.round(marginWeightedSum/revenueWeightedSum*100):null

  // Overhead per bottle — forecast (user-defined volume) and actual MTD (completed batches)
  const forecastBottles=p.forecastMonthlyBottles||600
  const forecastOh=(p.overhead||0)/Math.max(forecastBottles,1)
  const mtdBottles=ecoBatches?ecoBatches.filter(b=>b.status==="completed"&&b.completed_at?.startsWith(mo)).reduce((s,b)=>s+(b.actual_qty||0),0):null
  const actualOh=mtdBottles!=null&&mtdBottles>0?(p.overhead||0)/mtdBottles:null
  // Used by margin cards and simulator as the best available per-bottle overhead
  const overheadPerBottle=actualOh!=null?actualOh:forecastOh

  return<div style={{maxWidth:1060}}>
    <SH title="Økonomi" desc="Omsætning, kostpriser og marginer" tip="Råvarekost og emballage vises separat. Dækningsbidrag beregnes automatisk fra engrospris minus samlet kostpris."/>

    {/* ─── B1: KPI CARDS ─── */}
    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:22}}>
      <Stat label="Omsætning" value={fk(revThis)} c={T.ok} sub="Denne måned"/>
      <Stat label="Forrige måned" value={fk(revPrev)} c={T.mid}/>
      <Stat label="Gns. DB%" value={avgDbPct!==null?`${avgDbPct}%`:"—"} c={avgDbPct!==null&&avgDbPct>0?T.ok:T.warn} sub={avgDbPct!==null?"Vægtet snit denne måned":"Ingen ordrer endnu"}/>
      <Stat label="OH / flaske (forecast)" value={`${forecastOh.toFixed(1)} kr`} c={T.mid} sub={`Baseret på ${forecastBottles} flasker/md.`}/>
      <Stat label="OH / flaske (faktisk)" value={actualOh!=null?`${actualOh.toFixed(1)} kr`:"—"} c={actualOh!=null?T.ok:T.dim} sub={mtdBottles!=null&&mtdBottles>0?`${mtdBottles} stk produceret denne md.`:"Ingen afsluttede batches"}/>
    </div>

    {/* ─── B3: REVENUE MINI CHART (6 months) ─── */}
    {(()=>{
      const daMo=["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"]
      const months=[]
      for(let i=5;i>=0;i--){const d=new Date(today());d.setMonth(d.getMonth()-i);months.push(d.toISOString().slice(0,7))}
      const revByMonth=months.map(m=>({key:m,label:daMo[parseInt(m.slice(5,7))-1],rev:orders.filter(o=>o.order_date?.startsWith(m)).reduce((s,o)=>s+(parseFloat(o.price)||0)*(parseInt(o.qty)||0),0)}))
      const maxRev=Math.max(...revByMonth.map(m=>m.rev),1)
      const hasAny=revByMonth.some(m=>m.rev>0)
      return<Card style={{marginBottom:22,padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:14}}>
          <span style={{fontSize:14,fontWeight:600}}>Omsætning (6 mdr.)</span>
          <span style={{fontSize:11,color:T.dim}}>inkl. alle ordrer</span>
        </div>
        {hasAny?<div style={{display:"flex",alignItems:"flex-end",gap:8,height:120}}>
          {revByMonth.map(m=>{const h=m.rev>0?Math.max(m.rev/maxRev*100,4):0;return<div key={m.key} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <span style={{fontSize:10,fontFamily:T.fm,color:T.mid}}>{m.rev>0?fk(m.rev):""}</span>
            <div style={{width:"100%",maxWidth:48,height:`${h}%`,background:m.key===mo?T.acc:`${T.acc}88`,borderRadius:"4px 4px 0 0",transition:"height .3s"}}/>
            <span style={{fontSize:10,color:m.key===mo?T.acc:T.dim,fontWeight:m.key===mo?600:400}}>{m.label}</span>
          </div>})}
        </div>:<div style={{textAlign:"center",padding:"20px 0",fontSize:12,color:T.dim}}>Ingen ordrer de sidste 6 måneder</div>}
      </Card>
    })()}

    {/* ─── B2: PRODUCT MARGIN CARDS ─── */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <span style={{fontSize:14,fontWeight:600}}>Produktmargin</span>
      <Btn small onClick={()=>{setPf(p);setEditP(true)}}>Rediger priser</Btn>
    </div>
    {recipes.map(r=>{
      const raw=costRaw(r.id);const pack=costPack(r.id)
      const wholesale=getWholesalePrice(r.id)
      const hasPrice=wholesale!=null
      const ohPerUnit=overheadPerBottle||0
      const totalCost=raw+pack+ohPerUnit
      const db=hasPrice?wholesale-totalCost:null
      const dbPct=hasPrice&&wholesale>0?Math.round(db/wholesale*100):null
      // Stacked bar segments: proportional to wholesale (or totalCost if no price)
      const barMax=Math.max(hasPrice?wholesale:0,totalCost,1)
      const rawW=raw/barMax*100;const packW=pack/barMax*100;const ohW=ohPerUnit/barMax*100;const profitW=db!=null&&db>0?db/barMax*100:0
      return<Card key={r.id} style={{marginBottom:10,padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:10}}>
          <div><span style={{fontSize:14,fontWeight:600}}>{r.name}</span><span style={{fontSize:11,color:T.dim,marginLeft:8}}>{r.id}</span></div>
          <div style={{fontSize:13,fontFamily:T.fm,color:T.mid}}>Engros: {hasPrice?`${wholesale} kr`:<span style={{color:T.warn}}>mangler pris</span>}</div>
        </div>

        {/* Stacked cost bar */}
        <div style={{display:"flex",height:22,borderRadius:6,overflow:"hidden",marginBottom:10,background:T.input}}>
          {rawW>0&&<div style={{width:`${rawW}%`,background:"#7eb85a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:600,color:T.bg,minWidth:rawW>8?0:"auto"}} title={`Råvare: ${raw.toFixed(1)} kr`}>{rawW>10?"Råvare":""}</div>}
          {packW>0&&<div style={{width:`${packW}%`,background:"#b8a44e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:600,color:T.bg,minWidth:packW>8?0:"auto"}} title={`Emballage: ${pack.toFixed(1)} kr`}>{packW>10?"Emb":""}</div>}
          {ohW>0&&<div style={{width:`${ohW}%`,background:"#8a7a5a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:600,color:T.bg}} title={`Overhead: ${ohPerUnit.toFixed(1)} kr`}>{ohW>10?"OH":""}</div>}
          {profitW>0&&<div style={{width:`${profitW}%`,background:T.ok,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:600,color:T.bg}} title={`DB: ${db.toFixed(1)} kr`}>{profitW>12?"DB":""}</div>}
        </div>

        {/* Numbers row */}
        <div style={{display:"flex",gap:16,flexWrap:"wrap",fontSize:12}}>
          <span style={{color:"#7eb85a",fontFamily:T.fm}}>Råvare: {raw.toFixed(1)}</span>
          <span style={{color:"#b8a44e",fontFamily:T.fm}}>Emb: {pack.toFixed(1)}</span>
          {ohPerUnit>0&&<span style={{color:"#8a7a5a",fontFamily:T.fm}}>OH: {ohPerUnit.toFixed(1)}</span>}
          <span style={{color:T.warn,fontFamily:T.fm,fontWeight:600}}>Kostpris: {totalCost.toFixed(1)} kr</span>
          {db!=null&&<span style={{color:db>=0?T.ok:T.red,fontFamily:T.fm,fontWeight:600}}>DB: {db.toFixed(0)} kr {dbPct!=null&&`(${dbPct}%)`}</span>}
        </div>
      </Card>
    })}
    {/* ─── B4: WHAT-IF SIMULATOR ─── */}
    <Card style={{marginTop:18,padding:0,overflow:"hidden"}}>
      <div onClick={()=>setSimOpen(!simOpen)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",cursor:"pointer"}}>
        <span style={{fontSize:14,fontWeight:600}}>Hvad-hvis (simulator)</span>
        <span style={{fontSize:12,color:T.dim}}>{simOpen?"▲ Luk":"▼ Åbn"}</span>
      </div>
      {simOpen&&<div style={{padding:"0 16px 16px",borderTop:`1px solid ${T.brdL}`}}>
        <div style={{paddingTop:14,marginBottom:14}}>
          <Field label="Vælg produkt">
            <select value={simRid} onChange={e=>{const rid=e.target.value;setSimRid(rid);const wp=getWholesalePrice(rid);setSimW(wp!=null?String(wp):"");setSimOh(overheadPerBottle!=null?overheadPerBottle.toFixed(1):"0");setSimRawMul("0");setSimPackMul("0")}}>
              <option value="">Vælg opskrift...</option>
              {recipes.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
        </div>
        {simRid&&(()=>{
          const sRaw=costRaw(simRid)*(1+(parseFloat(simRawMul)||0)/100)
          const sPack=costPack(simRid)*(1+(parseFloat(simPackMul)||0)/100)
          const sOh=parseFloat(simOh)||0
          const sTotal=sRaw+sPack+sOh
          const sWp=parseFloat(simW)||0
          const sDb=sWp>0?sWp-sTotal:null
          const sDbPct=sWp>0&&sDb!=null?Math.round(sDb/sWp*100):null
          return<>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px",marginBottom:16}}>
              <Field label="Engrospris (kr)"><input type="number" value={simW} onChange={e=>setSimW(e.target.value)} placeholder="—"/></Field>
              <Field label="Overhead / flaske (kr)"><input type="number" step="0.1" value={simOh} onChange={e=>setSimOh(e.target.value)}/></Field>
              <Field label="Råvare ændring (%)" tip="F.eks. +10 for 10% dyrere"><input type="number" value={simRawMul} onChange={e=>setSimRawMul(e.target.value)}/></Field>
              <Field label="Emballage ændring (%)" tip="F.eks. -5 for 5% billigere"><input type="number" value={simPackMul} onChange={e=>setSimPackMul(e.target.value)}/></Field>
            </div>
            <div style={{background:T.input,borderRadius:8,padding:"12px 16px",marginBottom:14}}>
              <div style={{display:"flex",gap:20,flexWrap:"wrap",fontSize:13}}>
                <span style={{color:"#7eb85a",fontFamily:T.fm}}>Råvare: {sRaw.toFixed(1)}</span>
                <span style={{color:"#b8a44e",fontFamily:T.fm}}>Emb: {sPack.toFixed(1)}</span>
                <span style={{color:"#8a7a5a",fontFamily:T.fm}}>OH: {sOh.toFixed(1)}</span>
                <span style={{color:T.warn,fontFamily:T.fm,fontWeight:600}}>Kostpris: {sTotal.toFixed(1)} kr</span>
                {sDb!=null&&<span style={{color:sDb>=0?T.ok:T.red,fontFamily:T.fm,fontWeight:700}}>DB: {sDb.toFixed(0)} kr {sDbPct!=null&&`(${sDbPct}%)`}</span>}
                {sDb==null&&<span style={{color:T.dim,fontFamily:T.fm}}>Angiv engrospris for DB</span>}
              </div>
            </div>
            {sWp>0&&<div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <Btn small primary onClick={()=>{const newPrices={...data.prices,byRecipe:{...(data.prices.byRecipe||{}),[simRid]:{...(data.prices.byRecipe?.[simRid]||{}),wholesale:sWp}}};save({...data,prices:newPrices})}}>✓ Gem engrospris</Btn>
            </div>}
          </>
        })()}
      </div>}
    </Card>

    {editP&&<Modal title="Priser" onClose={()=>setEditP(false)}><Field label="Retail 250ml" tip="Vejledende udsalgspris til slutkunde"><input type="number" value={pf.retail250||0} onChange={e=>setPf({...pf,retail250:parseFloat(e.target.value)||0})}/></Field><Field label="Engros 250ml" tip="B2B pris til restauranter og forhandlere"><input type="number" value={pf.wholesale250||0} onChange={e=>setPf({...pf,wholesale250:parseFloat(e.target.value)||0})}/></Field><Field label="Retail 500ml"><input type="number" value={pf.retail500||0} onChange={e=>setPf({...pf,retail500:parseFloat(e.target.value)||0})}/></Field><Field label="Engros 500ml"><input type="number" value={pf.wholesale500||0} onChange={e=>setPf({...pf,wholesale500:parseFloat(e.target.value)||0})}/></Field><Field label="Overhead pr. måned" tip="Faste udgifter (lager, transport, forsikring)"><input type="number" value={pf.overhead||0} onChange={e=>setPf({...pf,overhead:parseFloat(e.target.value)||0})}/></Field><Field label="Forventet flasker pr. måned" tip="Bruges til forecast overhead pr. flaske. Standard: 600"><input type="number" value={pf.forecastMonthlyBottles||600} onChange={e=>setPf({...pf,forecastMonthlyBottles:parseInt(e.target.value)||0})}/></Field><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={()=>setEditP(false)}>Annuller</Btn><Btn primary onClick={()=>{save({...data,prices:pf});setEditP(false)}}>✓ Gem</Btn></div></Modal>}
  </div>
}

// ═══ MAIL — with templates + inbox + sent ═══
function Mail({data,update,supabase}){
  const[tab,setTab]=useState("compose");const[sending,setSending]=useState(false);const[status,setStatus]=useState("")
  const[to,setTo]=useState("");const[subject,setSubject]=useState("");const[body,setBody]=useState("")
  const emails=data.emails||[];const inbox=data.inbox||[]
  const[mailCustomers,setMailCustomers]=useState([])
  useEffect(()=>{if(supabase)getCustomers(supabase).then(setMailCustomers).catch(()=>{})},[supabase])

  const templates=[
    {name:"B2B Introduktion",subject:"DRYP — Dansk dild olie til dit køkken",body:"Kære [navn],\n\nJeg skriver fra DRYP i Skagen. Vi producerer koldpresset dansk rapsolie med frisk dild — et produkt skabt af kokke, til kokke.\n\nJeg vil gerne sende jer en gratis prøvepakke (3×50ml) så I selv kan smage kvaliteten.\n\nHvornår passer det at vi tager en kort snak?\n\nVenlig hilsen\nAndreas\nDRYP · Skagen"},
    {name:"Opfølgning efter prøve",subject:"Hvad synes I om DRYP?",body:"Hej [navn],\n\nJeg håber I har haft mulighed for at prøve DRYP dild olien. Hvad tænker I?\n\nJeg hører gerne jeres feedback — og hvis I er interesserede, sender jeg vores prisliste.\n\nVenlig hilsen\nAndreas\nDRYP"},
    {name:"Ordrebekræftelse",subject:"DRYP — Ordrebekræftelse",body:"Hej [navn],\n\nTak for din ordre! Her er en bekræftelse:\n\n[produkt] × [antal]\n\nVi sender inden for 48 timer.\n\nVenlig hilsen\nAndreas\nDRYP · Skagen"},
  ]
  const applyTemplate=(t)=>{setSubject(t.subject);setBody(t.body);setTab("compose")}

  const send=async()=>{
    if(!to||!subject||!body){setStatus("Udfyld alle felter");return}
    setSending(true);setStatus("")
    try{
      const res=await fetch("/api/send-email",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to,subject,html:`<div style="font-family:sans-serif;line-height:1.6;max-width:600px;">${body.replace(/\n/g,"<br/>")}</div><br/><div style="font-size:12px;color:#888;border-top:1px solid #eee;padding-top:12px;margin-top:20px;">DRYP · Grøn Olie · Skagen, DK<br/>dryp.dk</div>`,from_name:"DRYP"})})
      const result=await res.json()
      if(result.success){setStatus("✓ Mail sendt!");update("emails",prev=>[{id:uid(),to,subject,body,date:today(),time:new Date().toTimeString().slice(0,5),status:"sendt"},...(prev||[])]);setTo("");setSubject("");setBody("")}
      else setStatus(`Fejl: ${result.error}`)
    }catch(e){setStatus(`Fejl: ${e.message}`)}
    setSending(false)
  }

  return<div style={{maxWidth:860}}>
    <SH title="Mail" desc="Send og modtag mails" tip="Send emails via Resend. For at modtage mails i appen: opsæt MX records på dit domæne og Resend inbound webhook. Se setup-guiden."/>
    <Tabs tabs={[["compose","Skriv ny"],["templates","Skabeloner"],["sent","Sendt"],["inbox","Indbakke"]]} active={tab} onChange={setTab}/>

    {tab==="compose"&&<Card>
      <Field label="Til" tip="Modtagerens email. Du kan vælge en kunde-email nedenfor."><input type="email" value={to} onChange={e=>setTo(e.target.value)} placeholder="kunde@email.dk"/></Field>
      {mailCustomers.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>{mailCustomers.filter(c=>c.email).map(c=><button key={c.id} onClick={()=>setTo(c.email)} style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:to===c.email?T.accD:"transparent",border:`1px solid ${T.brdL}`,color:T.mid,cursor:"pointer"}}>{c.name}</button>)}</div>}
      <Field label="Emne"><input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="DRYP — ..."/></Field>
      <Field label="Besked"><textarea value={body} onChange={e=>setBody(e.target.value)} style={{minHeight:220,fontSize:13,lineHeight:1.6}} placeholder="Skriv din besked her..."/></Field>
      {status&&<div style={{fontSize:13,color:status.startsWith("✓")?T.ok:T.red,marginBottom:12,fontWeight:500}}>{status}</div>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn primary onClick={send} disabled={sending}>{sending?"Sender...":"✉ Send mail"}</Btn></div>
    </Card>}

    {tab==="templates"&&<div>
      <div style={{fontSize:13,color:T.dim,marginBottom:16}}>Klik på en skabelon for at bruge den som udgangspunkt for en ny mail.</div>
      {templates.map((t,i)=><Card key={i} onClick={()=>applyTemplate(t)} style={{marginBottom:10,cursor:"pointer",transition:"border-color .2s",borderColor:T.brdL}}>
        <div style={{fontSize:14,fontWeight:600,marginBottom:4}}>{t.name}</div>
        <div style={{fontSize:12,color:T.dim}}>Emne: {t.subject}</div>
        <div style={{fontSize:12,color:T.dim,marginTop:4,maxHeight:40,overflow:"hidden"}}>{t.body.slice(0,120)}...</div>
      </Card>)}
    </div>}

    {tab==="sent"&&<>{emails.length===0?<Empty text="Ingen sendte mails endnu"/>:emails.map(e=><Card key={e.id} style={{marginBottom:8,padding:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:13,fontWeight:500}}>{e.subject}</div><div style={{fontSize:12,color:T.dim}}>Til: {e.to} · {e.date} {e.time}</div></div><Badge c={T.ok}>{e.status}</Badge></div>
      <div style={{fontSize:12,color:T.mid,marginTop:8,lineHeight:1.5,maxHeight:80,overflow:"hidden",whiteSpace:"pre-wrap"}}>{e.body?.slice(0,250)}</div>
    </Card>)}</>}

    {tab==="inbox"&&<>{inbox.length===0?<Card style={{textAlign:"center",padding:40}}>
      <div style={{fontSize:14,color:T.dim,marginBottom:12}}>Indbakken er tom</div>
      <div style={{fontSize:12,color:T.dim,lineHeight:1.6,maxWidth:400,margin:"0 auto"}}>For at modtage mails i appen skal du:<br/>1. Opsætte MX records på dit domæne til Resend<br/>2. Konfigurere en inbound webhook i Resend<br/>3. Tilføje API-route <code>/api/receive-email</code><br/><br/>Se setup-guiden for detaljer.</div>
    </Card>:inbox.map(e=><Card key={e.id} style={{marginBottom:8,padding:14}}>
      <div style={{display:"flex",justifyContent:"space-between"}}><div><div style={{fontSize:13,fontWeight:500}}>{e.subject||"(Ingen emne)"}</div><div style={{fontSize:12,color:T.dim}}>Fra: {e.from} · {e.date}</div></div></div>
      <div style={{fontSize:12,color:T.mid,marginTop:6}}>{e.body?.slice(0,200)}</div>
    </Card>)}</>}
  </div>
}

// ═══ DOCUMENTS — with folders ═══
function Documents({data,update,supabase}){
  const[uploading,setUploading]=useState(false);const[status,setStatus]=useState("")
  const[newFolder,setNewFolder]=useState(false);const[folderName,setFolderName]=useState("")
  const[activeFolder,setActiveFolder]=useState(null)
  const fileRef=useRef(null)
  const docs=data.documents||[];const folders=data.docFolders||["Generelt"]
  const filteredDocs=activeFolder?docs.filter(d=>d.folder===activeFolder):docs

  const addFolder=()=>{if(!folderName.trim())return;update("docFolders",prev=>[...(prev||["Generelt"]),folderName.trim()]);setFolderName("");setNewFolder(false)}
  const upload=async(e)=>{
    const file=e.target.files?.[0];if(!file)return
    setUploading(true);setStatus("")
    try{
      const ext=file.name.split('.').pop();const path=`team/${uid()}.${ext}`
      const{error}=await supabase.storage.from('team-files').upload(path,file)
      if(error)throw error
      const{data:urlData}=supabase.storage.from('team-files').getPublicUrl(path)
      const ok=await update("documents",prev=>[{id:uid(),name:file.name,size:file.size,type:file.type,path,url:urlData.publicUrl,uploaded:today(),folder:activeFolder||"Generelt"},...(prev||[])])
      if(!ok){try{await supabase.storage.from('team-files').remove([path])}catch(re){console.error('[DRYP] rollback file delete failed:',re)};setStatus('Fejl: Fil uploadet men metadata ikke gemt — filen blev fjernet');return}
      setStatus(`✓ ${file.name} uploadet!`)
    }catch(err){setStatus(`Fejl: ${err.message}`)}
    setUploading(false);if(fileRef.current)fileRef.current.value=""
  }
  const del=async(doc)=>{if(!confirm(`Slet "${doc.name}"?`))return;try{const{error}=await supabase.storage.from('team-files').remove([doc.path]);if(error)throw error}catch(e){setStatus(`Fejl ved sletning: ${e.message}`);return}update("documents",prev=>(prev||[]).filter(d=>d.id!==doc.id))}
  const fmtSize=(b)=>b>1e6?`${(b/1e6).toFixed(1)} MB`:`${(b/1e3).toFixed(0)} KB`
  const typeIcon=(t)=>t?.includes("sheet")||t?.includes("excel")?"📊":t?.includes("pdf")?"📄":t?.includes("image")?"🖼":"📎"

  return<div style={{maxWidth:860}}>
    <SH title="Dokumenter" desc="Upload og organisér filer i mapper" tip="Upload Excel, PDF og andre filer. Organisér i mapper teamet kan tilgå.">
      <input ref={fileRef} type="file" onChange={upload} style={{display:"none"}} accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.zip"/>
      <Btn primary onClick={()=>fileRef.current?.click()} disabled={uploading}><Plus s={12} c={T.bg}/> {uploading?"Uploader...":"Upload fil"}</Btn>
    </SH>

    {/* Folder navigation */}
    <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
      <button onClick={()=>setActiveFolder(null)} style={{padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:!activeFolder?600:400,background:!activeFolder?T.accD:"transparent",color:!activeFolder?T.acc:T.dim,border:`1px solid ${!activeFolder?T.acc+"44":T.brdL}`,cursor:"pointer"}}>Alle ({docs.length})</button>
      {folders.map(f=>{const count=docs.filter(d=>d.folder===f).length;return<button key={f} onClick={()=>setActiveFolder(f)} style={{padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:activeFolder===f?600:400,background:activeFolder===f?T.accD:"transparent",color:activeFolder===f?T.acc:T.dim,border:`1px solid ${activeFolder===f?T.acc+"44":T.brdL}`,cursor:"pointer"}}>📁 {f} ({count})</button>})}
      {newFolder?<div style={{display:"flex",gap:4}}><input value={folderName} onChange={e=>setFolderName(e.target.value)} placeholder="Mappenavn" style={{width:140,fontSize:12}} autoFocus onKeyDown={e=>e.key==="Enter"&&addFolder()}/><Btn small primary onClick={addFolder}>✓ Opret</Btn><Btn small onClick={()=>setNewFolder(false)}>Annuller</Btn></div>:
      <button onClick={()=>setNewFolder(true)} style={{padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:600,color:T.mid,background:T.card2,border:`1px solid ${T.brd}`,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><Plus s={10} c={T.mid}/> Ny mappe</button>}
    </div>

    {status&&<div style={{fontSize:13,color:status.startsWith("✓")?T.ok:T.red,marginBottom:12,fontWeight:500}}>{status}</div>}
    {filteredDocs.length===0?<Empty text={activeFolder?`Ingen filer i "${activeFolder}"`:"Ingen dokumenter endnu"} action="Upload" onAction={()=>fileRef.current?.click()}/>:filteredDocs.map(doc=><Card key={doc.id} style={{marginBottom:8,padding:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:22}}>{typeIcon(doc.type)}</span><div><div style={{fontSize:13,fontWeight:500}}>{doc.name}</div><div style={{fontSize:11,color:T.dim}}>{fmtSize(doc.size)} · {doc.uploaded} · 📁 {doc.folder||"Generelt"}</div></div></div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>{doc.url&&<a href={doc.url} target="_blank" rel="noopener" style={{fontSize:12,color:T.acc,textDecoration:"none",fontWeight:500}}>↓ Download</a>}<Btn small danger onClick={()=>del(doc)}>Slet</Btn></div>
      </div>
    </Card>)}
  </div>
}

// ═══ TEAM ═══
// ═══ TEAM & WIKI — Supabase-backed wiki + realtime chat ═══
function Team({supabase,user}){
  const[section,setSection]=useState("pages")
  const[pages,setPages]=useState([])
  const[selectedId,setSelectedId]=useState(null)
  const[editing,setEditing]=useState(false)
  const[form,setForm]=useState({title:"",content:""})
  const[saving,setSaving]=useState(false)
  const[messages,setMessages]=useState([])
  const[msg,setMsg]=useState("")
  const[sending,setSending]=useState(false)
  const chatEnd=useRef(null)
  const userName=user?.email?.split("@")[0]||"Bruger"

  // ── Wiki ──
  const loadPages=async()=>{
    if(!supabase)return
    try{
      let rows=await getWikiPages(supabase)
      if(rows.length===0){
        const{data:{user:u}}=await supabase.auth.getUser()
        await createWikiPage(supabase,{title:"Velkommen til DRYP",content:"Her kan teamet skrive noter, mødereferater, idéer og planer.\n\nBrug + knappen til at oprette nye sider.",created_by:u.id})
        rows=await getWikiPages(supabase)
      }
      setPages(rows)
    }catch(err){console.error("[DRYP] loadPages failed:",err)}
  }
  useEffect(()=>{loadPages()},[supabase])

  const selected=pages.find(p=>p.id===selectedId)||null

  const startNew=async()=>{
    setForm({title:"",content:""})
    setEditing(true)
    setSelectedId(null)
  }

  const startEdit=()=>{
    if(!selected)return
    setForm({title:selected.title,content:selected.content})
    setEditing(true)
  }

  const savePage=async()=>{
    if(!supabase||!form.title.trim())return
    setSaving(true)
    try{
      const{data:{user:u}}=await supabase.auth.getUser()
      if(selectedId){
        await updateWikiPage(supabase,selectedId,{title:form.title,content:form.content,updated_by:u.id})
      }else{
        const p=await createWikiPage(supabase,{title:form.title,content:form.content,created_by:u.id})
        setSelectedId(p.id)
      }
      setEditing(false)
      await loadPages()
    }catch(err){console.error("[DRYP] savePage failed:",err);alert("Fejl: "+err.message)}
    setSaving(false)
  }

  const deletePage=async()=>{
    if(!selectedId||!confirm("Slet denne side?"))return
    try{await deleteWikiPage(supabase,selectedId);setSelectedId(null);setEditing(false);await loadPages()}
    catch(err){console.error("[DRYP] deletePage failed:",err)}
  }

  // ── Chat ──
  const loadMessages=async()=>{
    if(!supabase)return
    try{const rows=await getTeamMessages(supabase);setMessages(rows||[])}
    catch(err){console.error("[DRYP] loadMessages failed:",err)}
  }

  useEffect(()=>{
    if(section==="chat")loadMessages()
  },[section,supabase])

  // Realtime subscription for chat
  useEffect(()=>{
    if(!supabase)return
    const channel=supabase.channel("team-chat")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"team_messages"},(payload)=>{
        if(payload?.new)setMessages(prev=>{
          if(prev.some(m=>m.id===payload.new.id))return prev
          return[...prev,payload.new]
        })
      })
      .subscribe()
    return()=>{supabase.removeChannel(channel)}
  },[supabase])

  // Auto-scroll chat
  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth"})},[messages])

  const doSend=async()=>{
    if(!msg.trim()||!supabase)return
    setSending(true)
    try{
      const{data:{user:u}}=await supabase.auth.getUser()
      await sendTeamMessage(supabase,{author_id:u.id,author_name:userName,content:msg.trim()})
      setMsg("")
    }catch(err){console.error("[DRYP] sendMessage failed:",err)}
    setSending(false)
  }

  // ── Layout ──
  return<div style={{display:"flex",gap:0,maxWidth:1100,height:"calc(100vh - 120px)"}}>
    {/* Sidebar */}
    <div style={{width:220,minWidth:220,borderRight:`1px solid ${T.brdL}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:"12px 14px 8px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:10,fontWeight:700,color:T.dim,letterSpacing:".1em",textTransform:"uppercase"}}>Wiki / Sider</div>
        <button onClick={startNew} style={{background:T.accD,color:T.acc,fontSize:11,fontWeight:600,cursor:"pointer",padding:"4px 10px",borderRadius:6,border:`1px solid ${T.acc}44`}}>+ Ny side</button>
      </div>
      <div style={{flex:1,overflow:"auto",padding:"0 6px"}}>
        {pages.map(p=><button key={p.id} onClick={()=>{setSelectedId(p.id);setEditing(false);setSection("pages")}} style={{display:"block",width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:6,marginBottom:2,background:selectedId===p.id&&section==="pages"?T.accD:"transparent",color:selectedId===p.id&&section==="pages"?T.acc:T.mid,fontSize:12.5,fontWeight:selectedId===p.id&&section==="pages"?600:400,cursor:"pointer",border:"none",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.title||"Uden titel"}</button>)}
      </div>
      <div style={{borderTop:`1px solid ${T.brdL}`,padding:"10px 14px"}}>
        <button onClick={()=>{setSection("chat");setSelectedId(null);setEditing(false)}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 10px",borderRadius:6,background:section==="chat"?T.accD:"transparent",color:section==="chat"?T.acc:T.mid,fontSize:12.5,fontWeight:section==="chat"?600:400,cursor:"pointer",border:"none"}}>
          <span style={{fontSize:14}}>💬</span> Team Chat
          {messages.length>0&&<span style={{marginLeft:"auto",fontSize:10,color:T.dim,fontFamily:T.fm}}>{messages.length}</span>}
        </button>
      </div>
    </div>

    {/* Main area */}
    <div style={{flex:1,overflow:"auto",padding:"16px 24px"}}>

      {/* Wiki: no page selected */}
      {section==="pages"&&!selectedId&&!editing&&<div style={{textAlign:"center",padding:60,color:T.dim}}>
        <div style={{fontSize:14,marginBottom:12}}>Vælg en side i menuen til venstre</div>
        <Btn primary onClick={startNew}><Plus s={12} c={T.bg}/> Ny side</Btn>
      </div>}

      {/* Wiki: viewing a page */}
      {section==="pages"&&selected&&!editing&&<div className="fade-in">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <h2 style={{fontSize:22,fontWeight:700,lineHeight:1.3}}>{selected.title}</h2>
          <div style={{display:"flex",gap:8,flexShrink:0}}>
            <Btn small onClick={startEdit}>Rediger</Btn>
            <Btn small danger onClick={deletePage}>Slet</Btn>
          </div>
        </div>
        <div style={{fontSize:14,lineHeight:1.8,color:T.mid,whiteSpace:"pre-wrap",minHeight:200}}>{selected.content||"(Tom side)"}</div>
        <div style={{fontSize:11,color:T.dim,marginTop:24,paddingTop:12,borderTop:`1px solid ${T.brdL}`}}>
          Opdateret {selected.updated_at?.slice(0,10)||"—"}{selected.updated_by&&<span> · af {selected.updated_by===user?.id?userName:(selected.updated_by?.slice(0,8))}</span>}
          {selected.created_at&&<span style={{marginLeft:12}}>Oprettet {selected.created_at.slice(0,10)}</span>}
        </div>
      </div>}

      {/* Wiki: editing / creating */}
      {section==="pages"&&editing&&<div className="fade-in">
        <div style={{fontSize:10,fontWeight:700,color:T.dim,letterSpacing:".1em",textTransform:"uppercase",marginBottom:12}}>{selectedId?"Rediger side":"Ny side"}</div>
        <Field label="Titel"><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Sidetitel..." autoFocus style={{fontSize:15,fontWeight:600,padding:"10px 12px"}}/></Field>
        <Field label="Indhold"><textarea value={form.content} onChange={e=>setForm({...form,content:e.target.value})} placeholder="Skriv indhold her..." style={{minHeight:300,fontSize:13.5,lineHeight:1.7}}/></Field>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
          <Btn onClick={()=>{setEditing(false);if(!selectedId)setSelectedId(null)}}>Annuller</Btn>
          <Btn primary onClick={savePage} disabled={saving||!form.title.trim()}>{saving?"Gemmer...":"✓ Gem"}</Btn>
        </div>
      </div>}

      {/* Chat */}
      {section==="chat"&&<div style={{display:"flex",flexDirection:"column",height:"100%"}}>
        <div style={{fontSize:10,fontWeight:700,color:T.dim,letterSpacing:".1em",textTransform:"uppercase",marginBottom:12}}>Team Chat</div>
        <div style={{flex:1,overflow:"auto",marginBottom:14,minHeight:300}}>
          {messages.length===0
            ?<div style={{textAlign:"center",padding:50,color:T.dim,fontSize:13}}>Ingen beskeder endnu. Skriv den første!</div>
            :messages.map(m=><div key={m.id} style={{marginBottom:12,display:"flex",gap:10}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:T.accD,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:T.acc,flexShrink:0}}>{(m.author_name||"?").charAt(0).toUpperCase()}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:T.dim}}>{m.author_name||"—"} · {m.created_at?new Date(m.created_at).toLocaleString("da-DK",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):""}</div>
                <div style={{fontSize:14,marginTop:3,lineHeight:1.5}}>{m.content}</div>
              </div>
            </div>)
          }
          <div ref={chatEnd}/>
        </div>
        <div style={{display:"flex",gap:10,flexShrink:0}}>
          <input value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Skriv besked..." style={{fontSize:13}} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey)doSend()}}/>
          <Btn primary onClick={doSend} disabled={sending||!msg.trim()}>{sending?"...":"Send"}</Btn>
        </div>
      </div>}
    </div>
  </div>
}

// ═══ SETTINGS ═══
function Settings({data,save}){
  const[confirm1,setConfirm1]=useState(false)
  const clearAll=()=>{save({...data,productions:[],batches:[],customers:[],orders:[],emails:[],inbox:[],documents:[],haccp:{cleaning:[],temps:[],deviations:[],receiving:[],maintenance:[]},team:{pages:[],messages:[]}});setConfirm1(false)}
  const clearSection=(key,empty)=>{if(window.confirm(`Slet alle data i "${key}"?`))save({...data,[key]:empty})}
  return<div style={{maxWidth:740}}>
    <SH title="Indstillinger" desc="Datahåndtering og app-info" tip="Slet mockup-data, ryd sektioner, eller nulstil appen. Opskrifter, lagervarer og priser bevares altid."/>
    <Card style={{marginBottom:18}}>
      <div style={{fontSize:14,fontWeight:600,marginBottom:12}}>Slet data pr. sektion</div>
      <div style={{fontSize:13,color:T.dim,marginBottom:16}}>Klik for at slette data i en specifik sektion. Opskrifter, lager og priser bevares.</div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        {[["productions","Produktioner",[]],["batches","Batches",[]],["customers","Kunder",[]],["orders","Ordrer",[]],["emails","Sendte mails",[]],["inbox","Indbakke",[]],["documents","Dokumenter",[]]].map(([key,label,empty])=>
          <Btn key={key} small danger onClick={()=>clearSection(key,empty)}>Ryd {label} ({(data[key]||[]).length})</Btn>)}
        <Btn small danger onClick={()=>clearSection("haccp",{cleaning:[],temps:[],deviations:[],receiving:[],maintenance:[]})}>Ryd HACCP logs</Btn>
        <Btn small danger onClick={()=>clearSection("team",{pages:[],messages:[]})}>Ryd Team</Btn>
      </div>
    </Card>
    <Card style={{marginBottom:18,borderColor:T.red}}>
      <div style={{fontSize:14,fontWeight:600,color:T.red,marginBottom:8}}>⚠ Slet ALT mockup-data</div>
      <div style={{fontSize:13,color:T.dim,marginBottom:16}}>Sletter produktioner, batches, kunder, ordrer, mails, dokumenter, HACCP-logs og team. Bevarer opskrifter, lager og priser.</div>
      {!confirm1?<Btn danger onClick={()=>setConfirm1(true)}>Ryd alle data</Btn>:
        <div style={{background:"rgba(232,84,84,0.1)",border:`1px solid ${T.red}`,borderRadius:10,padding:16}}>
          <div style={{fontSize:14,fontWeight:600,color:T.red,marginBottom:12}}>Er du sikker? Kan ikke fortrydes.</div>
          <div style={{display:"flex",gap:10}}><Btn danger onClick={clearAll}>Ja, slet det hele</Btn><Btn onClick={()=>setConfirm1(false)}>Annuller</Btn></div>
        </div>}
    </Card>
    <Card>
      <div style={{fontSize:14,fontWeight:600,marginBottom:10}}>App-info</div>
      <div style={{fontSize:13,color:T.mid,lineHeight:1.8}}>
        <div>DRYP Virksomhedsstyring v3.0</div>
        <div>Framework: Next.js 14 + Supabase</div>
        <div>Data: Delt team-database (team_data)</div>
        <div>Mail: Resend API</div>
        <div style={{marginTop:10,color:T.dim}}>Adgangskontrol: ALLOWED_EMAILS i Vercel env vars</div>
      </div>
    </Card>
  </div>
}
