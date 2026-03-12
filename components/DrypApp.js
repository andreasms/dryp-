'use client'
import { useState, useEffect, useRef } from 'react'
import { createBatch } from '@/lib/db/batches'

const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6)
const today=()=>new Date().toISOString().slice(0,10)
const fk=n=>n?`${Number(n).toLocaleString("da-DK")} kr`:"—"
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)}

// ═══ THEME — bigger fonts, better readability ═══
const T={bg:"#0f1a0b",card:"#1a2814",card2:"#1f3318",input:"#0d150a",brd:"#2d4a22",brdL:"#1f3318",acc:"#a8d870",accD:"rgba(168,216,112,0.15)",accDD:"rgba(168,216,112,0.08)",txt:"#e8f0d8",mid:"rgba(232,240,216,0.65)",dim:"rgba(232,240,216,0.35)",red:"#e85454",warn:"#e8b854",ok:"#54c878",fm:"'JetBrains Mono','SF Mono',monospace",fs:13.5}

// ═══ UI COMPONENTS ═══
const Plus=({s=13,c="currentColor"})=><svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"><line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/></svg>

const Tip=({text})=>{
  const[open,setOpen]=useState(false)
  const ref=useRef(null)
  useEffect(()=>{if(!open)return;const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};document.addEventListener('click',h);return()=>document.removeEventListener('click',h)},[open])
  return<span ref={ref} style={{position:"relative",display:"inline-flex",marginLeft:6}}>
    <button onClick={e=>{e.stopPropagation();setOpen(!open)}} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:20,height:20,borderRadius:"50%",border:`1.5px solid ${open?T.acc:T.dim}`,fontSize:11,fontWeight:700,color:open?T.acc:T.dim,background:open?T.accD:"transparent",cursor:"pointer",lineHeight:1}}>?</button>
    {open&&<div style={{position:"absolute",bottom:"calc(100% + 10px)",left:"50%",transform:"translateX(-50%)",background:T.card,border:`1px solid ${T.brd}`,borderRadius:10,padding:"12px 16px",fontSize:13,color:T.txt,minWidth:260,maxWidth:360,zIndex:999,lineHeight:1.6,boxShadow:"0 12px 40px rgba(0,0,0,.6)",whiteSpace:"normal"}}>{text}<div style={{position:"absolute",bottom:-6,left:"50%",transform:"translateX(-50%) rotate(45deg)",width:12,height:12,background:T.card,borderRight:`1px solid ${T.brd}`,borderBottom:`1px solid ${T.brd}`}}/></div>}
  </span>
}

const Badge=({children,c=T.acc,bg})=><span style={{display:"inline-flex",fontSize:11,fontWeight:600,letterSpacing:".03em",textTransform:"uppercase",color:c,background:bg||`${c}22`,padding:"3px 10px",borderRadius:99,whiteSpace:"nowrap"}}>{children}</span>
const Btn=({children,primary,danger,small,disabled,style,...p})=><button {...p} style={{display:"inline-flex",alignItems:"center",gap:6,padding:small?"5px 12px":"8px 16px",borderRadius:8,fontSize:small?12:13,fontWeight:600,background:danger?T.red:primary?T.acc:"transparent",color:danger?"#fff":primary?T.bg:T.txt,border:primary||danger?"none":`1px solid ${T.brd}`,opacity:disabled?.4:1,cursor:disabled?"not-allowed":"pointer",transition:"all .15s",...style}} disabled={disabled}/>
const Card=({children,style,onClick})=><div onClick={onClick} style={{background:T.card,border:`1px solid ${T.brdL}`,borderRadius:12,padding:18,cursor:onClick?"pointer":"default",...style}}>{children}</div>
const Field=({label,children,tip})=><div style={{marginBottom:14}}><label style={{display:"flex",alignItems:"center",fontSize:11,fontWeight:600,color:T.mid,letterSpacing:".05em",textTransform:"uppercase",marginBottom:5}}>{label}{tip&&<Tip text={tip}/>}</label>{children}</div>
const Modal=({title,onClose,children,wide})=><div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3,padding:20}} onClick={onClose}><div className="fade-in" onClick={e=>e.stopPropagation()} style={{background:T.card,border:`1px solid ${T.brd}`,borderRadius:16,width:"100%",maxWidth:wide?760:480,maxHeight:"88vh",overflow:"auto",padding:28}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}><h3 style={{fontSize:18,fontWeight:700}}>{title}</h3><button onClick={onClose} style={{background:"none",color:T.dim,fontSize:18,cursor:"pointer",padding:4}}>✕</button></div>{children}</div></div>
const Stat=({label,value,sub,c=T.acc,tip})=><Card style={{flex:"1 1 140px",minWidth:140}}><div style={{display:"flex",alignItems:"center",fontSize:11,color:T.dim,letterSpacing:".06em",textTransform:"uppercase",marginBottom:8}}>{label}{tip&&<Tip text={tip}/>}</div><div style={{fontSize:24,fontWeight:700,color:c,lineHeight:1,fontFamily:T.fm}}>{value}</div>{sub&&<div style={{fontSize:12,color:T.mid,marginTop:6}}>{sub}</div>}</Card>
const Empty=({text,action,onAction})=><div style={{textAlign:"center",padding:60,color:T.dim}}><div style={{fontSize:14,marginBottom:16}}>{text}</div>{action&&<Btn primary onClick={onAction}><Plus s={12} c={T.bg}/> {action}</Btn>}</div>
const Dot=({s})=><span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:s==="ok"?T.ok:s==="warn"?T.warn:T.red,boxShadow:`0 0 6px ${s==="ok"?T.ok:s==="warn"?T.warn:T.red}44`}}/>
const Tabs=({tabs,active,onChange,right})=><div style={{display:"flex",gap:0,borderBottom:`1px solid ${T.brdL}`,marginBottom:18,alignItems:"flex-end"}}>{tabs.map(([id,l])=><button key={id} onClick={()=>onChange(id)} style={{padding:"10px 18px",fontSize:13,fontWeight:active===id?600:400,color:active===id?T.acc:T.dim,background:"none",borderBottom:active===id?`2px solid ${T.acc}`:"2px solid transparent",cursor:"pointer"}}>{l}</button>)}<div style={{flex:1}}/>{right}</div>
const Check=({checked,onChange,label})=><label style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer",fontSize:13}}><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} style={{width:16,height:16,accentColor:T.acc}}/>{label}</label>
const SH=({title,desc,tip,children})=><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}><div><div style={{fontSize:15,fontWeight:600,marginBottom:desc?4:0}}>{title}</div>{desc&&<div style={{display:"flex",alignItems:"center",fontSize:12,color:T.dim}}>{desc}{tip&&<Tip text={tip}/>}</div>}</div><div style={{display:"flex",gap:8}}>{children}</div></div>

// ═══ MAIN APP ═══
export default function DrypApp({data,update,save,user,onLogout,supabase}){
  const[page,setPage]=useState("dashboard")
  const[sb,setSb]=useState(typeof window!=='undefined'?window.innerWidth>900:true)
  useEffect(()=>{const h=()=>setSb(window.innerWidth>900);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h)},[])

  const nav=[
    {id:"_hd",l:"PRODUKTION",hd:true},
    {id:"dashboard",l:"Overblik",i:"◻"},
    {id:"recipes",l:"Opskrifter",i:"◉"},
    {id:"production",l:"Produktion",i:"⬡"},
    {id:"batches",l:"Batches & GS1",i:"⬢"},
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

  return<div style={{display:"flex",height:"100vh",overflow:"hidden",fontSize:T.fs,color:T.txt}}>
    <div style={{width:sb?220:0,minWidth:sb?220:0,background:T.card,borderRight:`1px solid ${T.brdL}`,display:"flex",flexDirection:"column",transition:"all .3s",overflow:"hidden",position:typeof window!=='undefined'&&window.innerWidth<=768?"fixed":"relative",zIndex:100,height:"100%"}}>
      <div style={{padding:"20px 16px 8px"}}><div style={{fontFamily:"'Archivo Black',sans-serif",fontSize:20,color:T.acc,letterSpacing:".12em"}}>DRYP</div><div style={{fontSize:9,color:T.dim,letterSpacing:".15em",textTransform:"uppercase",marginTop:2}}>Skagen · DK</div></div>
      <nav style={{padding:"10px 8px",flex:1,overflow:"auto"}}>
        {nav.map(n=>n.hd?<div key={n.id} style={{fontSize:9,fontWeight:700,color:T.dim,letterSpacing:".12em",padding:"16px 10px 4px",opacity:.6}}>{n.l}</div>:
        <button key={n.id} onClick={()=>{setPage(n.id);if(typeof window!=='undefined'&&window.innerWidth<=768)setSb(false)}} style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"8px 12px",borderRadius:7,marginBottom:2,background:page===n.id?T.accD:"transparent",color:page===n.id?T.acc:T.mid,fontSize:12.5,fontWeight:page===n.id?600:400,textAlign:"left",cursor:"pointer"}}><span style={{width:16,textAlign:"center",fontSize:12,opacity:page===n.id?1:.4}}>{n.i}</span>{n.l}</button>)}
      </nav>
      <div style={{padding:"12px 16px",borderTop:`1px solid ${T.brdL}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:28,height:28,borderRadius:"50%",background:T.accD,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:T.acc}}>{userName.charAt(0).toUpperCase()}</div><div style={{fontSize:12}}>{userName}</div></div>
        <button onClick={onLogout} style={{background:"none",color:T.dim,fontSize:10,cursor:"pointer"}}>Log ud</button>
      </div>
    </div>
    {sb&&typeof window!=='undefined'&&window.innerWidth<=768&&<div onClick={()=>setSb(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:99}}/>}
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:T.bg}}>
      <header style={{display:"flex",alignItems:"center",gap:12,padding:"12px 20px",borderBottom:`1px solid ${T.brdL}`,background:T.card,flexShrink:0}}>
        {!sb&&<button onClick={()=>setSb(true)} style={{background:"none",color:T.mid,fontSize:18,cursor:"pointer"}}>☰</button>}
        <h1 style={{fontSize:16,fontWeight:600}}>{nav.find(n=>n.id===page)?.l}</h1>
        <div style={{flex:1}}/>
        <div style={{fontSize:11,color:T.dim,fontFamily:T.fm}}>{new Date().toLocaleDateString("da-DK",{weekday:"long",day:"numeric",month:"long"})}</div>
      </header>
      <main style={{flex:1,overflow:"auto",padding:22}} className="fade-in" key={page}><Pg data={data} update={update} save={save} user={user} supabase={supabase}/></main>
    </div>
  </div>
}

// ═══ DASHBOARD — cleaner, priority-focused ═══
function Dashboard({data}){
  const mo=today().slice(0,7);const prods=data.productions.filter(p=>p.date?.startsWith(mo))
  const rev=data.orders.filter(o=>o.date?.startsWith(mo)).reduce((s,o)=>s+(parseFloat(o.price)||0)*(parseInt(o.qty)||0),0)
  const low=data.inventory.filter(i=>i.qty<i.min)
  const ccpOk=prods.filter(p=>p.ccp1Ok&&p.ccp2Ok).length
  const openDevs=(data.haccp?.deviations||[]).filter(d=>!d.closedDate)
  const pendingOrders=(data.orders||[]).filter(o=>o.status==="bestilt")
  return<div style={{maxWidth:1100}}>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:24}}>
      <Stat label="Produktioner" value={prods.length} sub={`${prods.reduce((s,p)=>s+(parseFloat(p.volume)||0),0).toFixed(1)}L denne måned`} tip="Antal produktioner registreret denne kalendermåned"/>
      <Stat label="Omsætning" value={fk(rev)} c={rev>0?T.ok:T.dim} sub="Denne måned" tip="Samlet ordreværdi for indeværende måned"/>
      <Stat label="CCP status" value={prods.length?`${Math.round(ccpOk/prods.length*100)}%`:"—"} c={ccpOk===prods.length&&prods.length>0?T.ok:T.warn} sub={`${ccpOk}/${prods.length} godkendt`} tip="Andel produktioner med godkendt CCP1 (temperatur) og CCP2 (forsegling)"/>
      <Stat label="Lager-alarm" value={low.length} c={low.length>0?T.red:T.ok} sub={low.length?low.map(i=>i.name).join(", "):"Alt over minimum"} tip="Varer under minimumsbeholdning"/>
    </div>

    {(low.length>0||openDevs.length>0||pendingOrders.length>0)&&<Card style={{marginBottom:20,borderLeft:`4px solid ${T.warn}`,background:T.accDD}}>
      <div style={{fontSize:14,fontWeight:600,color:T.warn,marginBottom:10}}>⚡ Kræver opmærksomhed</div>
      {low.length>0&&<div style={{fontSize:13,marginBottom:6,color:T.txt}}>🔴 <strong>{low.length} lagervare{low.length>1?"r":""}</strong> under minimum: {low.map(i=>i.name).join(", ")}</div>}
      {openDevs.length>0&&<div style={{fontSize:13,marginBottom:6,color:T.txt}}>⚠️ <strong>{openDevs.length} åben{openDevs.length>1?"e":""} afvigelse{openDevs.length>1?"r":""}</strong> i HACCP</div>}
      {pendingOrders.length>0&&<div style={{fontSize:13,color:T.txt}}>📦 <strong>{pendingOrders.length} ordre{pendingOrders.length>1?"r":""}</strong> afventer levering</div>}
    </Card>}

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <Card><div style={{fontSize:13,fontWeight:600,marginBottom:12}}>Aktive produkter</div>{(data.recipes||[]).filter(r=>r.active).length===0?<div style={{color:T.dim,fontSize:13}}>Ingen aktive opskrifter</div>:(data.recipes||[]).filter(r=>r.active).map(r=>{
        const rawCost=(r.bom||[]).filter(b=>{const inv=data.inventory.find(x=>x.id===b.itemId);return inv?.cat==="Råvare"}).reduce((s,b)=>{const inv=data.inventory.find(x=>x.id===b.itemId);return s+(inv?.costPer||0)*b.qty},0)
        return<div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${T.brdL}`,fontSize:13}}><span>{r.name}</span><div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:11,color:T.dim,fontFamily:T.fm}}>Råvare: {rawCost.toFixed(0)} kr</span><Badge c={T.ok}>Aktiv</Badge></div></div>})}</Card>
      <Card><div style={{fontSize:13,fontWeight:600,marginBottom:12}}>Seneste produktioner</div>{data.productions.length===0?<div style={{color:T.dim,fontSize:13}}>Ingen endnu</div>:[...data.productions].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,5).map(p=><div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${T.brdL}`}}><div><span style={{fontSize:13,fontWeight:500}}>{p.batchId}</span><span style={{fontSize:12,color:T.dim,marginLeft:8}}>{p.recipeName} · {p.date}</span></div><div style={{display:"flex",gap:5}}><Badge c={p.ccp1Ok?T.ok:T.red}>CCP1</Badge><Badge c={p.ccp2Ok?T.ok:T.red}>CCP2</Badge></div></div>)}</Card>
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
          <Btn small onClick={()=>{setForm(migrateBom(r));setShow(true)}}>✎</Btn>
          <Btn small danger onClick={()=>{if(confirm(`Slet "${r.name}"?`))update("recipes",prev=>prev.filter(x=>x.id!==r.id))}}>✕</Btn>
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
          <button onClick={()=>setForm({...form,rawBom:form.rawBom.filter((_,j)=>j!==i)})} style={{background:"none",color:T.red,fontSize:16,cursor:"pointer"}}>✕</button>
        </div>)}
      </div>

      {/* EMBALLAGE BOM */}
      <div style={{borderTop:`1px solid ${T.brdL}`,marginTop:10,paddingTop:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:12,fontWeight:700,color:T.mid,letterSpacing:".06em"}}>EMBALLAGE</span><Btn small onClick={()=>setForm({...form,packBom:[...(form.packBom||[]),{itemId:packItems[0]?.id||"",qty:1,unit:packItems[0]?.unit||"stk"}]})}><Plus s={10}/> Emballage</Btn></div>
        {(form.packBom||[]).map((b,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:6,alignItems:"center"}}>
          <select value={b.itemId} onChange={e=>{const bom=[...form.packBom];bom[i]={...bom[i],itemId:e.target.value,unit:data.inventory.find(x=>x.id===e.target.value)?.unit||"stk"};setForm({...form,packBom:bom})}} style={{flex:2}}>{packItems.map(inv=><option key={inv.id} value={inv.id}>{inv.name}</option>)}</select>
          <input type="number" step=".01" value={b.qty} onChange={e=>{const bom=[...form.packBom];bom[i]={...bom[i],qty:parseFloat(e.target.value)||0};setForm({...form,packBom:bom})}} style={{flex:1}}/>
          <span style={{fontSize:11,color:T.dim,width:30}}>{b.unit}</span>
          <button onClick={()=>setForm({...form,packBom:form.packBom.filter((_,j)=>j!==i)})} style={{background:"none",color:T.red,fontSize:16,cursor:"pointer"}}>✕</button>
        </div>)}
      </div>

      {/* PROCESTRIN */}
      <div style={{borderTop:`1px solid ${T.brdL}`,marginTop:16,paddingTop:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:12,fontWeight:700,color:T.acc,letterSpacing:".06em"}}>PROCESTRIN</span><Btn small onClick={()=>setForm({...form,steps:[...(form.steps||[]),""]})}>< Plus s={10}/> Trin</Btn></div>
        {(form.steps||[]).map((s,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:6,alignItems:"center"}}>
          <span style={{fontSize:11,color:T.dim,width:22,textAlign:"right"}}>{i+1}.</span>
          <input value={s} onChange={e=>{const steps=[...form.steps];steps[i]=e.target.value;setForm({...form,steps})}} style={{flex:1}}/>
          <button onClick={()=>setForm({...form,steps:form.steps.filter((_,j)=>j!==i)})} style={{background:"none",color:T.red,fontSize:16,cursor:"pointer"}}>✕</button>
        </div>)}
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}><Btn onClick={()=>setShow(false)}>Annuller</Btn><Btn primary onClick={doSave}>✓ Gem opskrift</Btn></div>
    </Modal>}
  </div>
}

// ═══ PRODUCTION ═══
function Production({data,update,supabase}){
  const[show,setShow]=useState(false);const[form,setForm]=useState({});const[exp,setExp]=useState(null)
  const recipes=(data.recipes||[]).filter(r=>r.active)
  const startNew=()=>{const r=recipes[0];setForm({id:uid(),recipeId:r?.id||"",recipeName:r?.name||"",batchId:`DRYP-${today().replace(/-/g,"").slice(2)}-${String(data.productions.length+1).padStart(3,"0")}`,date:today(),operator:"Andreas",rapsolieQty:"",rapsolieLot:"",dildQty:"",volume:"",bottles250:"",bottles500:"",ccp1TempStart:"",ccp1TempEnd:"",infusionTime:r?.infusionTime||"",ccp1Ok:false,ccp2Visual:false,ccp2Ok:false,cleaningDone:false,hygieneDone:false,tempStorage:"",notes:""});setShow(true)}
  const doSave=()=>{update("productions",prev=>[form,...prev.filter(p=>p.id!==form.id)]);if(!data.batches.find(b=>b.id===form.batchId))update("batches",prev=>[{id:form.batchId,created:form.date,recipeId:form.recipeId,recipeName:form.recipeName,rapsolieOrigin:"Dansk",status:"produceret",bestBefore:addDays(form.date,recipes.find(r=>r.id===form.recipeId)?.shelfLifeDays||90),notes:"",gtin:"",gs1Note:""},...prev]);createBatch(supabase,{batch_number:form.batchId,recipe_id:form.recipeId,recipe_snapshot:recipes.find(r=>r.id===form.recipeId)||{},status:"draft",planned_date:form.date,operator:form.operator,planned_qty:(parseInt(form.bottles250)||0)+(parseInt(form.bottles500)||0)}).catch(err=>console.error("[DRYP] createBatch failed:",err));setShow(false)}
  return<div style={{maxWidth:960}}>
    <SH title="Produktionslog" desc="Registrer produktioner med HACCP CCP1+CCP2" tip="Hver produktion logges med temperaturkontrol (CCP1: infusion) og forseglingskontrol (CCP2). Opretter automatisk en batch."><Btn primary onClick={startNew}><Plus s={12} c={T.bg}/> Ny produktion</Btn></SH>
    {data.productions.length===0?<Empty text="Ingen produktioner endnu" action="Start produktion" onAction={startNew}/>:
      [...data.productions].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(p=><Card key={p.id} onClick={()=>setExp(exp===p.id?null:p.id)} style={{marginBottom:10,cursor:"pointer"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:14,fontWeight:600}}>{p.batchId}</div><div style={{fontSize:12,color:T.dim}}>{p.recipeName||"—"} · {p.date} · {p.operator||""}</div></div><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:12,fontFamily:T.fm,color:T.mid}}>{p.volume||"—"}L</span><Badge c={p.ccp1Ok?T.ok:T.red}>CCP1</Badge><Badge c={p.ccp2Ok?T.ok:T.red}>CCP2</Badge></div></div>
        {exp===p.id&&<div className="fade-in" style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${T.brdL}`,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"6px 20px",fontSize:12}}>
          {[["Rapsolie",`${p.rapsolieQty||"—"}L`],["Lot",p.rapsolieLot],["Dild",`${p.dildQty||"—"}kg`],["CCP1 start",`${p.ccp1TempStart||"—"}°C`],["CCP1 slut",`${p.ccp1TempEnd||"—"}°C`],["Tid",p.infusionTime],["250ml",p.bottles250],["500ml",p.bottles500],["Lagertemp",`${p.tempStorage||"—"}°C`]].map(([k,v])=><div key={k}><span style={{color:T.dim}}>{k}:</span> <span style={{color:T.txt}}>{v||"—"}</span></div>)}
          {p.notes&&<div style={{gridColumn:"1/-1",color:T.dim,fontStyle:"italic",marginTop:4}}>{p.notes}</div>}
          <div style={{gridColumn:"1/-1",marginTop:8,display:"flex",gap:8}}><Btn small onClick={e=>{e.stopPropagation();setForm(p);setShow(true)}}>✎ Rediger</Btn><Btn small danger onClick={e=>{e.stopPropagation();if(confirm("Slet?"))update("productions",prev=>prev.filter(x=>x.id!==p.id))}}>✕ Slet</Btn></div>
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
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={()=>setShow(false)}>Annuller</Btn><Btn primary onClick={doSave}>✓ Gem produktion</Btn></div>
    </Modal>}
  </div>
}

// ═══ BATCHES with GS1 ═══
function Batches({data,update}){
  const[show,setShow]=useState(false);const[form,setForm]=useState({})
  return<div style={{maxWidth:960}}>
    <SH title="Batches & GS1" desc="Sporbarhed og stregkode-forberedelse" tip="Hver batch har et unikt ID til sporbarhed. GTIN-feltet er klar til når I får GS1 medlemskab — så kan I linke batches direkte til stregkoder."><Btn primary onClick={()=>{setForm({id:`DRYP-${today().replace(/-/g,"").slice(2)}-${String(data.batches.length+1).padStart(3,"0")}`,created:today(),recipeName:"",rapsolieOrigin:"Dansk",status:"produceret",bestBefore:"",notes:"",gtin:"",gs1Note:""});setShow(true)}}><Plus s={12} c={T.bg}/> Ny batch</Btn></SH>

    <Card style={{marginBottom:16,background:T.accDD,border:`1px solid ${T.acc}33`}}>
      <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>📊 GS1 / Stregkode</div>
      <div style={{fontSize:12,color:T.mid,lineHeight:1.6}}>Når I får GS1 Danmark medlemskab, tildeles I et firma-præfiks (typisk 5790xxxxxxx). Hvert produkt får et GTIN-13 nummer som kan printes som EAN-stregkode. Udfyld GTIN-feltet på batches for at koble produktion til stregkoder.</div>
    </Card>

    {data.batches.length===0?<Empty text="Ingen batches"/>:[...data.batches].sort((a,b)=>(b.created||"").localeCompare(a.created||"")).map(b=><Card key={b.id} style={{marginBottom:8,padding:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><div style={{fontSize:14,fontWeight:600}}>{b.id}</div><div style={{fontSize:12,color:T.dim}}>{b.recipeName||"—"} · {b.created}{b.bestBefore&&` · Holdbar til: ${b.bestBefore}`}</div>{b.gtin&&<div style={{fontSize:11,color:T.acc,fontFamily:T.fm,marginTop:2}}>GTIN: {b.gtin}</div>}</div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}><Badge c={{produceret:T.acc,lagret:T.warn,frigivet:T.ok,afsluttet:T.dim}[b.status]||T.dim}>{b.status}</Badge><Btn small onClick={()=>{setForm({...b,gtin:b.gtin||"",gs1Note:b.gs1Note||""});setShow(true)}}>✎</Btn><Btn small danger onClick={()=>{if(confirm("Slet?"))update("batches",prev=>prev.filter(x=>x.id!==b.id))}}>✕</Btn></div>
      </div>
    </Card>)}
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

// ═══ HACCP — same as before but with bigger text ═══
function HACCPLogs({data,update}){
  const[tab,setTab]=useState("cleaning");const[show,setShow]=useState(false);const[form,setForm]=useState({})
  const tabs=[["cleaning","Rengøring"],["temps","Temperatur"],["receiving","Modtagelse"],["deviations","Afvigelser"],["maintenance","Vedligehold"]]
  const tipMap={cleaning:"Daglig rengøringslog — dokumenterer at udstyr og lokaler er rengjort.",temps:"Temperaturlog for køleudstyr — registreres dagligt.",receiving:"Modtagekontrol af råvarer — temperatur og emballage ved levering.",deviations:"Afvigelser fra normal procedure — kræver korrigerende handling.",maintenance:"Forebyggende vedligehold af udstyr."}
  const newE=()=>{const base={id:uid(),date:today(),operator:"Andreas",notes:""};const ex={cleaning:{area:"",product:"",disinfected:false,ok:false},temps:{time:"08:00",fridge1:"",fridge2:"",prodRoom:"",withinLimits:false,action:""},receiving:{supplier:"",item:"",qty:"",temp:"",packagingOk:false,approved:false},deviations:{description:"",processStep:"",batchId:"",corrective:"",preventive:"",closedDate:""},maintenance:{equipment:"",checkType:"",status:"OK",action:"",nextCheck:""}};setForm({...base,...ex[tab]});setShow(true)}
  const doSave=()=>{update("haccp",prev=>({...prev,[tab]:[form,...(prev?.[tab]||[]).filter(e=>e.id!==form.id)]}));setShow(false)}
  const entries=(data.haccp?.[tab]||[]).sort((a,b)=>(b.date||"").localeCompare(a.date||""))
  return<div style={{maxWidth:960}}>
    <SH title="HACCP Logs" desc="Egenkontrol-dokumentation" tip={tipMap[tab]}><Btn primary onClick={newE}><Plus s={12} c={T.bg}/> Ny log</Btn></SH>
    <Tabs tabs={tabs} active={tab} onChange={setTab}/>
    {entries.length===0?<Empty text="Ingen logs endnu" action="Tilføj" onAction={newE}/>:entries.map(e=><Card key={e.id} style={{marginBottom:6,padding:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontFamily:T.fm,fontSize:12,color:T.dim}}>{e.date}</span>{tab==="cleaning"&&<span>{e.area}</span>}{tab==="temps"&&<span>K1:{e.fridge1}° K2:{e.fridge2}°</span>}{tab==="receiving"&&<span>{e.item} ← {e.supplier}</span>}{tab==="deviations"&&<span style={{color:T.red}}>{e.description?.slice(0,60)}</span>}{tab==="maintenance"&&<span>{e.equipment}</span>}</div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>{tab==="cleaning"&&<Dot s={e.ok?"ok":"warn"}/>}{tab==="temps"&&<Dot s={e.withinLimits?"ok":"warn"}/>}{tab==="receiving"&&<Dot s={e.approved?"ok":"warn"}/>}{tab==="deviations"&&<Badge c={e.closedDate?T.ok:T.red}>{e.closedDate?"Lukket":"Åben"}</Badge>}{tab==="maintenance"&&<Badge c={e.status==="OK"?T.ok:T.warn}>{e.status}</Badge>}<Btn small onClick={()=>{setForm(e);setShow(true)}}>✎</Btn><Btn small danger onClick={()=>{if(confirm("Slet?"))update("haccp",prev=>({...prev,[tab]:(prev?.[tab]||[]).filter(x=>x.id!==e.id)}))}}>✕</Btn></div>
      </div>
    </Card>)}
    {show&&<Modal title={tabs.find(t=>t[0]===tab)?.[1]} onClose={()=>setShow(false)}>
      <Field label="Dato"><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></Field>
      <Field label="Operatør"><input value={form.operator} onChange={e=>setForm({...form,operator:e.target.value})}/></Field>
      {tab==="cleaning"&&<><Field label="Område"><select value={form.area} onChange={e=>setForm({...form,area:e.target.value})}><option value="">Vælg...</option>{["Produktionsbord","Infusionskar","Filtreringsudstyr","Aftapningsudstyr","Gulv","Håndvask","Afløb"].map(a=><option key={a}>{a}</option>)}</select></Field><Field label="Middel"><input value={form.product} onChange={e=>setForm({...form,product:e.target.value})}/></Field><Check checked={form.disinfected} onChange={v=>setForm({...form,disinfected:v})} label="Desinficeret"/><div style={{marginTop:8}}><Check checked={form.ok} onChange={v=>setForm({...form,ok:v})} label="Godkendt"/></div></>}
      {tab==="temps"&&<><Field label="Tid"><input type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})}/></Field><Field label="Køl 1 (°C) max 5°C"><input type="number" step=".1" value={form.fridge1} onChange={e=>setForm({...form,fridge1:e.target.value})}/></Field><Field label="Køl 2 (°C) max 15°C"><input type="number" step=".1" value={form.fridge2} onChange={e=>setForm({...form,fridge2:e.target.value})}/></Field><Field label="Lokale (°C)"><input type="number" step=".1" value={form.prodRoom} onChange={e=>setForm({...form,prodRoom:e.target.value})}/></Field><Check checked={form.withinLimits} onChange={v=>setForm({...form,withinLimits:v})} label="Inden for grænser"/></>}
      {tab==="receiving"&&<><Field label="Leverandør"><input value={form.supplier} onChange={e=>setForm({...form,supplier:e.target.value})}/></Field><Field label="Vare"><input value={form.item} onChange={e=>setForm({...form,item:e.target.value})}/></Field><Field label="Mængde"><input value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})}/></Field><Field label="Temp (°C)"><input type="number" step=".1" value={form.temp} onChange={e=>setForm({...form,temp:e.target.value})}/></Field><Check checked={form.packagingOk} onChange={v=>setForm({...form,packagingOk:v})} label="Emballage OK"/><div style={{marginTop:8}}><Check checked={form.approved} onChange={v=>setForm({...form,approved:v})} label="Godkendt"/></div></>}
      {tab==="deviations"&&<><Field label="Beskrivelse"><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></Field><Field label="Procestrin"><input value={form.processStep} onChange={e=>setForm({...form,processStep:e.target.value})}/></Field><Field label="Batch"><input value={form.batchId} onChange={e=>setForm({...form,batchId:e.target.value})}/></Field><Field label="Korrigerende handling"><textarea value={form.corrective} onChange={e=>setForm({...form,corrective:e.target.value})}/></Field><Field label="Forebyggende"><textarea value={form.preventive} onChange={e=>setForm({...form,preventive:e.target.value})}/></Field><Field label="Afsluttet"><input type="date" value={form.closedDate} onChange={e=>setForm({...form,closedDate:e.target.value})}/></Field></>}
      {tab==="maintenance"&&<><Field label="Udstyr"><input value={form.equipment} onChange={e=>setForm({...form,equipment:e.target.value})}/></Field><Field label="Type"><input value={form.checkType} onChange={e=>setForm({...form,checkType:e.target.value})}/></Field><Field label="Status"><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>OK</option><option>Fejl</option></select></Field><Field label="Handling"><textarea value={form.action} onChange={e=>setForm({...form,action:e.target.value})}/></Field><Field label="Næste kontrol"><input type="date" value={form.nextCheck} onChange={e=>setForm({...form,nextCheck:e.target.value})}/></Field></>}
      <Field label="Noter"><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></Field>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={()=>setShow(false)}>Annuller</Btn><Btn primary onClick={doSave}>✓ Gem</Btn></div>
    </Modal>}
  </div>
}

// ═══ INVENTORY, PLANNING, CUSTOMERS, ECONOMY — kept from v2 with bigger fonts ═══
function Inventory({data,update}){
  const[show,setShow]=useState(false);const[form,setForm]=useState({});const[eId,setEId]=useState(null);const[qv,setQv]=useState("")
  const cats=[...new Set(data.inventory.map(i=>i.cat))]
  return<div style={{maxWidth:960}}>
    <SH title="Lagerbeholdning" desc="Klik på antal for hurtig-edit" tip="Her styrer du al lagerbeholdning. Klik direkte på tallet for hurtig ændring, eller ✎ for alle detaljer. Lagerstatus påvirker indkøbsplanen automatisk."><Btn primary onClick={()=>{setForm({id:uid(),name:"",unit:"stk",qty:0,min:0,cat:"Råvare",leadDays:7,supplier:"",costPer:0});setShow(true)}}><Plus s={12} c={T.bg}/> Tilføj vare</Btn></SH>
    {cats.map(cat=><div key={cat} style={{marginBottom:22}}><div style={{fontSize:11,fontWeight:700,color:T.dim,letterSpacing:".1em",textTransform:"uppercase",marginBottom:10,paddingBottom:4,borderBottom:`1px solid ${T.brdL}`}}>{cat}</div>
      {data.inventory.filter(i=>i.cat===cat).map(item=>{const low=item.qty<item.min;return<Card key={item.id} style={{marginBottom:6,padding:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:14,fontWeight:500}}>{low&&<span style={{color:T.red}}>⚠ </span>}{item.name}</div><div style={{fontSize:12,color:T.dim}}>Min: {item.min} · Lead: {item.leadDays}d{item.supplier&&` · ${item.supplier}`} · {fk(item.costPer)}/{item.unit}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>{eId===item.id?<div style={{display:"flex",gap:4}}><input type="number" value={qv} onChange={e=>setQv(e.target.value)} style={{width:70}} autoFocus onKeyDown={e=>{if(e.key==="Enter"){update("inventory",p=>p.map(i=>i.id===item.id?{...i,qty:parseFloat(qv)||0}:i));setEId(null)}}}/><Btn small primary onClick={()=>{update("inventory",p=>p.map(i=>i.id===item.id?{...i,qty:parseFloat(qv)||0}:i));setEId(null)}}>✓</Btn></div>:<button onClick={()=>{setEId(item.id);setQv(String(item.qty))}} style={{background:"none",color:low?T.red:T.txt,cursor:"pointer"}}><span style={{fontSize:20,fontFamily:T.fm,fontWeight:700}}>{item.qty}</span><span style={{fontSize:11,color:T.dim,marginLeft:3}}>{item.unit}</span></button>}<Btn small onClick={()=>{setForm(item);setShow(true)}}>✎</Btn><Btn small danger onClick={()=>{if(confirm(`Slet "${item.name}"?`))update("inventory",p=>p.filter(x=>x.id!==item.id))}}>✕</Btn></div></div>
        <div style={{marginTop:6,height:4,background:T.input,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(item.qty/(item.min||1)*100,100)}%`,background:low?T.red:item.qty<item.min*1.5?T.warn:T.ok,borderRadius:2}}/></div>
      </Card>})}
    </div>)}
    {show&&<Modal title={form.name||"Ny vare"} onClose={()=>setShow(false)}><Field label="Navn"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Kategori" tip="'Råvare' bruges i opskriftkalkulator. Alt andet regnes som emballage."><select value={form.cat} onChange={e=>setForm({...form,cat:e.target.value})}><option>Råvare</option><option>Emballage</option><option>Andet</option></select></Field><Field label="Enhed"><input value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}/></Field><Field label="Beholdning"><input type="number" value={form.qty} onChange={e=>setForm({...form,qty:parseFloat(e.target.value)||0})}/></Field><Field label="Minimum"><input type="number" value={form.min} onChange={e=>setForm({...form,min:parseFloat(e.target.value)||0})}/></Field><Field label="Lead time (dage)" tip="Antal dage fra bestilling til levering"><input type="number" value={form.leadDays} onChange={e=>setForm({...form,leadDays:parseInt(e.target.value)||0})}/></Field><Field label="Leverandør"><input value={form.supplier} onChange={e=>setForm({...form,supplier:e.target.value})}/></Field><Field label="Pris pr. enhed"><input type="number" step=".1" value={form.costPer} onChange={e=>setForm({...form,costPer:parseFloat(e.target.value)||0})}/></Field><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={()=>setShow(false)}>Annuller</Btn><Btn primary onClick={()=>{update("inventory",p=>p.find(i=>i.id===form.id)?p.map(i=>i.id===form.id?form:i):[...p,form]);setShow(false)}}>✓ Gem</Btn></div></Modal>}
  </div>
}

function Planning({data,update}){
  const recipes=(data.recipes||[]).filter(r=>r.active)
  const[planQty,setPlanQty]=useState(()=>Object.fromEntries(recipes.map(r=>[r.id,50])))
  const[editItem,setEditItem]=useState(null);const[ef,setEf]=useState({})
  const needs={};recipes.forEach(r=>{const qty=parseInt(planQty[r.id])||0;(r.bom||[]).forEach(b=>{if(!needs[b.itemId])needs[b.itemId]={required:0,items:[]};needs[b.itemId].required+=b.qty*qty;needs[b.itemId].items.push({recipe:r.name,total:b.qty*qty})})})
  const plan=data.inventory.map(inv=>{const n=needs[inv.id]||{required:0,items:[]};const deficit=Math.max(0,n.required-inv.qty);const oq=deficit>0?Math.ceil(deficit/10)*10:0;return{...inv,need:n.required,deficit,orderQty:oq,orderBy:oq>0?addDays(today(),-(inv.leadDays||7)):null,needsOrder:oq>0}}).sort((a,b)=>(b.needsOrder?1:0)-(a.needsOrder?1:0))
  return<div style={{maxWidth:1060}}>
    <SH title="Indkøbsplan" desc="Beregnet fra opskrifter og lagerstatus" tip="Angiv antal flasker du vil producere. Systemet beregner indkøbsbehov. Klik ✎ for at ændre leverandør, pris og lead time direkte."/>
    <Card style={{marginBottom:20}}><div style={{fontSize:13,fontWeight:600,marginBottom:14}}>Planlagt produktion</div><div style={{display:"flex",gap:16,flexWrap:"wrap"}}>{recipes.map(r=><div key={r.id} style={{flex:"1 1 220px"}}><div style={{fontSize:13,color:T.mid,marginBottom:5}}>{r.name}</div><div style={{display:"flex",alignItems:"center",gap:10}}><input type="number" value={planQty[r.id]||0} onChange={e=>setPlanQty({...planQty,[r.id]:e.target.value})} style={{width:90,textAlign:"center"}}/><span style={{fontSize:12,color:T.dim}}>flasker</span></div></div>)}</div></Card>
    <div style={{fontSize:14,fontWeight:600,marginBottom:14}}>Indkøbsbehov</div>
    {plan.map(item=><Card key={item.id} style={{marginBottom:8,padding:14,borderLeft:item.needsOrder?`4px solid ${T.red}`:`4px solid ${T.ok}`}}>
      {editItem===item.id?<div className="fade-in"><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0 14px"}}><Field label="Navn"><input value={ef.name} onChange={e=>setEf({...ef,name:e.target.value})}/></Field><Field label="Enhed"><input value={ef.unit} onChange={e=>setEf({...ef,unit:e.target.value})}/></Field><Field label="Pris pr. enhed"><input type="number" step=".1" value={ef.costPer} onChange={e=>setEf({...ef,costPer:parseFloat(e.target.value)||0})}/></Field><Field label="Leverandør"><input value={ef.supplier} onChange={e=>setEf({...ef,supplier:e.target.value})}/></Field><Field label="Lead time (dage)"><input type="number" value={ef.leadDays} onChange={e=>setEf({...ef,leadDays:parseInt(e.target.value)||0})}/></Field><Field label="Minimum"><input type="number" value={ef.min} onChange={e=>setEf({...ef,min:parseFloat(e.target.value)||0})}/></Field></div><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn small onClick={()=>setEditItem(null)}>Annuller</Btn><Btn small primary onClick={()=>{update("inventory",prev=>prev.map(i=>i.id===editItem?{...i,...ef}:i));setEditItem(null)}}>✓ Gem</Btn></div></div>:
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:14,fontWeight:500}}>{item.name}</div><div style={{fontSize:12,color:T.dim}}>Behov: {item.need.toFixed(1)} {item.unit} · Lager: {item.qty} · Lead: {item.leadDays}d{item.supplier&&` · ${item.supplier}`} · {fk(item.costPer)}/{item.unit}</div></div><div style={{display:"flex",alignItems:"center",gap:10}}><Btn small onClick={()=>{setEditItem(item.id);setEf({name:item.name,costPer:item.costPer,supplier:item.supplier,leadDays:item.leadDays,min:item.min,unit:item.unit})}}>✎</Btn>{item.needsOrder?<div style={{textAlign:"right"}}><div style={{fontSize:18,fontWeight:700,fontFamily:T.fm,color:T.red}}>{item.orderQty} {item.unit}</div><div style={{fontSize:11,color:T.warn}}>Bestil senest {item.orderBy}</div><div style={{fontSize:11,color:T.dim}}>~{fk(Math.round(item.orderQty*(item.costPer||0)))}</div></div>:<Badge c={T.ok}>OK</Badge>}</div></div>}
    </Card>)}
    <Card style={{marginTop:18,background:T.accD,border:"none"}}><div style={{fontSize:13,fontWeight:600,marginBottom:6}}>Total indkøb</div><div style={{fontSize:22,fontWeight:700,fontFamily:T.fm,color:T.acc}}>{fk(Math.round(plan.reduce((s,i)=>s+i.orderQty*(i.costPer||0),0)))}</div></Card>
  </div>
}

function Customers({data,update}){
  const[tab,setTab]=useState("customers");const[show,setShow]=useState(false);const[ft,setFt]=useState("c");const[form,setForm]=useState({})
  const recipes=(data.recipes||[]).filter(r=>r.active)
  const doSave=()=>{if(ft==="c")update("customers",p=>[form,...p.filter(c=>c.id!==form.id)]);else update("orders",p=>[form,...p.filter(o=>o.id!==form.id)]);setShow(false)}
  return<div style={{maxWidth:1060}}>
    <Tabs tabs={[["customers","Kunder"],["orders","Ordrer"]]} active={tab} onChange={setTab} right={<Btn primary small onClick={()=>{if(tab==="customers"){setFt("c");setForm({id:uid(),name:"",type:"restaurant",contact:"",email:"",phone:"",status:"lead",notes:"",created:today()})}else{setFt("o");setForm({id:uid(),customerId:data.customers[0]?.id||"",date:today(),product:recipes[0]?.name||"",qty:"",price:"",batchId:"",status:"bestilt",notes:""})}setShow(true)}}><Plus s={11} c={T.bg}/> Ny</Btn>}/>
    {tab==="customers"&&(data.customers.length===0?<Empty text="Ingen kunder endnu" action="Tilføj kunde" onAction={()=>{setFt("c");setForm({id:uid(),name:"",type:"restaurant",contact:"",email:"",phone:"",status:"lead",notes:"",created:today()});setShow(true)}}/>:data.customers.map(c=><Card key={c.id} style={{marginBottom:6,padding:12}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:32,height:32,borderRadius:"50%",background:T.accD,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:T.acc}}>{c.name?.charAt(0)?.toUpperCase()}</div><div><div style={{fontSize:13,fontWeight:500}}>{c.name}</div><div style={{fontSize:12,color:T.dim}}>{c.type}{c.email&&` · ${c.email}`}</div></div></div><div style={{display:"flex",gap:6}}><Badge c={c.status==="aktiv"?T.ok:c.status==="lead"?T.acc:T.dim}>{c.status}</Badge><Btn small onClick={()=>{setFt("c");setForm(c);setShow(true)}}>✎</Btn><Btn small danger onClick={()=>{if(confirm(`Slet?`))update("customers",p=>p.filter(x=>x.id!==c.id))}}>✕</Btn></div></div></Card>))}
    {tab==="orders"&&(data.orders.length===0?<Empty text="Ingen ordrer"/>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr style={{borderBottom:`1px solid ${T.brd}`}}>{["Dato","Kunde","Produkt","Antal","Pris","Status",""].map(h=><th key={h} style={{textAlign:"left",padding:"8px 10px",fontSize:11,color:T.dim,fontWeight:600}}>{h}</th>)}</tr></thead><tbody>{[...data.orders].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(o=><tr key={o.id} style={{borderBottom:`1px solid ${T.brdL}`}}><td style={{padding:"8px 10px",fontFamily:T.fm,fontSize:12,color:T.mid}}>{o.date}</td><td style={{padding:"8px 10px"}}>{data.customers.find(c=>c.id===o.customerId)?.name||"—"}</td><td style={{padding:"8px 10px",color:T.mid}}>{o.product}</td><td style={{padding:"8px 10px",fontFamily:T.fm}}>{o.qty}</td><td style={{padding:"8px 10px",fontFamily:T.fm}}>{o.price?`${o.price}kr`:"—"}</td><td style={{padding:"8px 10px"}}><Badge c={o.status==="leveret"?T.ok:o.status==="bestilt"?T.warn:T.acc}>{o.status}</Badge></td><td><Btn small onClick={()=>{setFt("o");setForm(o);setShow(true)}}>✎</Btn></td></tr>)}</tbody></table></div>)}
    {show&&ft==="c"&&<Modal title={form.name||"Ny kunde"} onClose={()=>setShow(false)}><Field label="Navn"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Type"><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="restaurant">Restaurant</option><option value="delikatesse">Delikatesse</option><option value="detail">Detail</option><option value="engros">Engros</option></select></Field><Field label="Kontakt"><input value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})}/></Field><Field label="Email"><input value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field><Field label="Telefon"><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field><Field label="Status"><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="lead">Lead</option><option value="prøve">Prøve sendt</option><option value="aktiv">Aktiv</option><option value="inaktiv">Inaktiv</option></select></Field><Field label="Noter"><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></Field><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={()=>setShow(false)}>Annuller</Btn><Btn primary onClick={doSave}>✓ Gem</Btn></div></Modal>}
    {show&&ft==="o"&&<Modal title="Ordre" onClose={()=>setShow(false)}><Field label="Kunde"><select value={form.customerId} onChange={e=>setForm({...form,customerId:e.target.value})}>{data.customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Dato"><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></Field><Field label="Produkt"><select value={form.product} onChange={e=>setForm({...form,product:e.target.value})}>{recipes.map(r=><option key={r.id}>{r.name}</option>)}</select></Field><Field label="Antal"><input type="number" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})}/></Field><Field label="Pris pr. stk"><input type="number" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></Field><Field label="Batch"><select value={form.batchId} onChange={e=>setForm({...form,batchId:e.target.value})}><option value="">—</option>{data.batches.map(b=><option key={b.id} value={b.id}>{b.id}</option>)}</select></Field><Field label="Status"><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="bestilt">Bestilt</option><option value="pakket">Pakket</option><option value="leveret">Leveret</option><option value="faktureret">Faktureret</option></select></Field><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={()=>setShow(false)}>Annuller</Btn><Btn primary onClick={doSave}>✓ Gem</Btn></div></Modal>}
  </div>
}

function Economy({data,save}){
  const[editP,setEditP]=useState(false);const p=data.prices||{};const[pf,setPf]=useState(p)
  const costRaw=(rid)=>{const r=(data.recipes||[]).find(x=>x.id===rid);if(!r)return 0;return(r.bom||[]).filter(b=>{const inv=data.inventory.find(x=>x.id===b.itemId);return inv?.cat==="Råvare"}).reduce((s,b)=>{const inv=data.inventory.find(x=>x.id===b.itemId);return s+(inv?.costPer||0)*b.qty},0)}
  const costPack=(rid)=>{const r=(data.recipes||[]).find(x=>x.id===rid);if(!r)return 0;return(r.bom||[]).filter(b=>{const inv=data.inventory.find(x=>x.id===b.itemId);return inv?.cat!=="Råvare"}).reduce((s,b)=>{const inv=data.inventory.find(x=>x.id===b.itemId);return s+(inv?.costPer||0)*b.qty},0)}
  const costTotal=(rid)=>costRaw(rid)+costPack(rid)
  const mo=today().slice(0,7);const rev=data.orders.filter(o=>o.date?.startsWith(mo)).reduce((s,o)=>s+(parseFloat(o.price)||0)*(parseInt(o.qty)||0),0)
  return<div style={{maxWidth:1060}}>
    <SH title="Økonomi" desc="Omsætning, kostpriser og marginer" tip="Råvarekost og emballage vises separat. Dækningsbidrag beregnes automatisk fra engrospris minus samlet kostpris."/>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:22}}>
      <Stat label="Omsætning" value={fk(rev)} c={T.ok} sub="Denne måned"/>
      <Stat label="Engros 250ml" value={`${p.wholesale250||0} kr`} c={T.acc} sub={`Råvare: ${costRaw("dild-250").toFixed(0)} + Emb: ${costPack("dild-250").toFixed(0)} = ${costTotal("dild-250").toFixed(0)} kr · DB: ${((p.wholesale250||0)-costTotal("dild-250")).toFixed(0)} kr`}/>
      <Stat label="Engros 500ml" value={`${p.wholesale500||0} kr`} c={T.acc} sub={`Råvare: ${costRaw("dild-500").toFixed(0)} + Emb: ${costPack("dild-500").toFixed(0)} = ${costTotal("dild-500").toFixed(0)} kr · DB: ${((p.wholesale500||0)-costTotal("dild-500")).toFixed(0)} kr`}/>
    </div>
    <Card><div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><span style={{fontSize:14,fontWeight:600}}>Kostpris pr. produkt</span><Btn small onClick={()=>{setPf(p);setEditP(true)}}>✎ Priser</Btn></div>
      {(data.recipes||[]).filter(r=>r.active).map(r=>{const raw=costRaw(r.id);const pack=costPack(r.id);const total=raw+pack;return<div key={r.id} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${T.brdL}`,fontSize:13}}><span style={{fontWeight:500}}>{r.name}</span><div style={{display:"flex",gap:16,fontSize:12}}><span style={{color:T.acc,fontFamily:T.fm}}>Råvare: {raw.toFixed(1)}</span><span style={{color:T.mid,fontFamily:T.fm}}>Emb: {pack.toFixed(1)}</span><span style={{color:T.warn,fontFamily:T.fm,fontWeight:600}}>Total: {total.toFixed(1)} kr</span>{r.id==="dild-250"&&p.wholesale250>0&&<span style={{color:T.ok,fontFamily:T.fm}}>DB: {((p.wholesale250||0)-total).toFixed(0)} kr ({(((p.wholesale250-total)/p.wholesale250)*100).toFixed(0)}%)</span>}{r.id==="dild-500"&&p.wholesale500>0&&<span style={{color:T.ok,fontFamily:T.fm}}>DB: {((p.wholesale500||0)-total).toFixed(0)} kr ({(((p.wholesale500-total)/p.wholesale500)*100).toFixed(0)}%)</span>}</div></div>})}
    </Card>
    {editP&&<Modal title="Priser" onClose={()=>setEditP(false)}><Field label="Retail 250ml" tip="Vejledende udsalgspris til slutkunde"><input type="number" value={pf.retail250||0} onChange={e=>setPf({...pf,retail250:parseFloat(e.target.value)||0})}/></Field><Field label="Engros 250ml" tip="B2B pris til restauranter og forhandlere"><input type="number" value={pf.wholesale250||0} onChange={e=>setPf({...pf,wholesale250:parseFloat(e.target.value)||0})}/></Field><Field label="Retail 500ml"><input type="number" value={pf.retail500||0} onChange={e=>setPf({...pf,retail500:parseFloat(e.target.value)||0})}/></Field><Field label="Engros 500ml"><input type="number" value={pf.wholesale500||0} onChange={e=>setPf({...pf,wholesale500:parseFloat(e.target.value)||0})}/></Field><Field label="Overhead pr. måned" tip="Faste udgifter (lager, transport, forsikring)"><input type="number" value={pf.overhead||0} onChange={e=>setPf({...pf,overhead:parseFloat(e.target.value)||0})}/></Field><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={()=>setEditP(false)}>Annuller</Btn><Btn primary onClick={()=>{save({...data,prices:pf});setEditP(false)}}>✓ Gem</Btn></div></Modal>}
  </div>
}

// ═══ MAIL — with templates + inbox + sent ═══
function Mail({data,update}){
  const[tab,setTab]=useState("compose");const[sending,setSending]=useState(false);const[status,setStatus]=useState("")
  const[to,setTo]=useState("");const[subject,setSubject]=useState("");const[body,setBody]=useState("")
  const emails=data.emails||[];const inbox=data.inbox||[]

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
      {data.customers?.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>{data.customers.filter(c=>c.email).map(c=><button key={c.id} onClick={()=>setTo(c.email)} style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:to===c.email?T.accD:"transparent",border:`1px solid ${T.brdL}`,color:T.mid,cursor:"pointer"}}>{c.name}</button>)}</div>}
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
      update("documents",prev=>[{id:uid(),name:file.name,size:file.size,type:file.type,path,url:urlData.publicUrl,uploaded:today(),folder:activeFolder||"Generelt"},...(prev||[])])
      setStatus(`✓ ${file.name} uploadet!`)
    }catch(err){setStatus(`Fejl: ${err.message}`)}
    setUploading(false);if(fileRef.current)fileRef.current.value=""
  }
  const del=async(doc)=>{if(!confirm(`Slet "${doc.name}"?`))return;try{await supabase.storage.from('team-files').remove([doc.path])}catch(e){}update("documents",prev=>(prev||[]).filter(d=>d.id!==doc.id))}
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
      {newFolder?<div style={{display:"flex",gap:4}}><input value={folderName} onChange={e=>setFolderName(e.target.value)} placeholder="Mappenavn" style={{width:140,fontSize:12}} autoFocus onKeyDown={e=>e.key==="Enter"&&addFolder()}/><Btn small primary onClick={addFolder}>✓</Btn><Btn small onClick={()=>setNewFolder(false)}>✕</Btn></div>:
      <button onClick={()=>setNewFolder(true)} style={{padding:"6px 14px",borderRadius:20,fontSize:12,color:T.dim,background:"transparent",border:`1px dashed ${T.brdL}`,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><Plus s={10} c={T.dim}/> Ny mappe</button>}
    </div>

    {status&&<div style={{fontSize:13,color:status.startsWith("✓")?T.ok:T.red,marginBottom:12,fontWeight:500}}>{status}</div>}
    {filteredDocs.length===0?<Empty text={activeFolder?`Ingen filer i "${activeFolder}"`:"Ingen dokumenter endnu"} action="Upload" onAction={()=>fileRef.current?.click()}/>:filteredDocs.map(doc=><Card key={doc.id} style={{marginBottom:8,padding:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:22}}>{typeIcon(doc.type)}</span><div><div style={{fontSize:13,fontWeight:500}}>{doc.name}</div><div style={{fontSize:11,color:T.dim}}>{fmtSize(doc.size)} · {doc.uploaded} · 📁 {doc.folder||"Generelt"}</div></div></div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>{doc.url&&<a href={doc.url} target="_blank" rel="noopener" style={{fontSize:12,color:T.acc,textDecoration:"none",fontWeight:500}}>↓ Download</a>}<Btn small danger onClick={()=>del(doc)}>✕</Btn></div>
      </div>
    </Card>)}
  </div>
}

// ═══ TEAM ═══
function Team({data,update}){
  const[tab,setTab]=useState("pages");const[show,setShow]=useState(false);const[form,setForm]=useState({});const[view,setView]=useState(null);const[msg,setMsg]=useState("")
  const pages=data.team?.pages||[];const msgs=data.team?.messages||[]
  const sendMsg=()=>{if(!msg.trim())return;update("team",prev=>({...prev,messages:[...(prev?.messages||[]),{id:uid(),author:"Andreas",date:today(),time:new Date().toTimeString().slice(0,5),text:msg.trim()}]}));setMsg("")}
  return<div style={{maxWidth:960}}>
    <Tabs tabs={[["pages","Wiki / Sider"],["chat","Team Chat"]]} active={tab} onChange={setTab} right={tab==="pages"&&<Btn primary small onClick={()=>{setForm({id:uid(),title:"",content:"",updated:today(),author:"Andreas"});setShow(true)}}><Plus s={10} c={T.bg}/> Ny side</Btn>}/>
    {tab==="pages"&&<>{view?<div><button onClick={()=>setView(null)} style={{background:"none",color:T.acc,fontSize:13,marginBottom:14,cursor:"pointer"}}>← Tilbage til oversigt</button><div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><h2 style={{fontSize:20,fontWeight:600}}>{view.title}</h2><div style={{display:"flex",gap:8}}><Btn small onClick={()=>{setForm(view);setShow(true);setView(null)}}>✎</Btn><Btn small danger onClick={()=>{if(confirm("Slet?"))update("team",prev=>({...prev,pages:(prev?.pages||[]).filter(p=>p.id!==view.id)}));setView(null)}}>✕</Btn></div></div><div style={{fontSize:14,lineHeight:1.8,color:T.mid,whiteSpace:"pre-wrap"}}>{view.content}</div><div style={{fontSize:11,color:T.dim,marginTop:18}}>{view.updated} · {view.author}</div></div>:pages.length===0?<Empty text="Ingen wiki-sider endnu" action="Opret" onAction={()=>{setForm({id:uid(),title:"",content:"",updated:today(),author:"Andreas"});setShow(true)}}/>:pages.map(p=><Card key={p.id} onClick={()=>setView(p)} style={{marginBottom:8,padding:14,cursor:"pointer"}}><div style={{display:"flex",justifyContent:"space-between"}}><div><div style={{fontSize:14,fontWeight:600}}>{p.title}</div><div style={{fontSize:12,color:T.dim,marginTop:2}}>{p.content?.slice(0,100)}</div></div><span style={{fontSize:11,color:T.dim,whiteSpace:"nowrap",marginLeft:12}}>{p.updated}</span></div></Card>)}</>}
    {tab==="chat"&&<div><div style={{minHeight:350,maxHeight:450,overflow:"auto",marginBottom:14}}>{msgs.length===0?<div style={{textAlign:"center",padding:50,color:T.dim,fontSize:13}}>Ingen beskeder endnu</div>:msgs.map(m=><div key={m.id} style={{marginBottom:10,display:"flex",gap:10}}><div style={{width:30,height:30,borderRadius:"50%",background:T.accD,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:T.acc,flexShrink:0}}>{m.author?.charAt(0)}</div><div><div style={{fontSize:11,color:T.dim}}>{m.author} · {m.date} {m.time}</div><div style={{fontSize:14,marginTop:3,lineHeight:1.5}}>{m.text}</div></div></div>)}</div><div style={{display:"flex",gap:10}}><input value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Skriv besked..." style={{fontSize:13}} onKeyDown={e=>e.key==="Enter"&&sendMsg()}/><Btn primary onClick={sendMsg}>Send</Btn></div></div>}
    {show&&<Modal title={form.title||"Ny side"} onClose={()=>setShow(false)} wide><Field label="Titel"><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></Field><Field label="Indhold"><textarea value={form.content} onChange={e=>setForm({...form,content:e.target.value})} style={{minHeight:240,fontSize:13,lineHeight:1.6}}/></Field><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={()=>setShow(false)}>Annuller</Btn><Btn primary onClick={()=>{update("team",prev=>({...prev,pages:[{...form,updated:today()},...(prev?.pages||[]).filter(p=>p.id!==form.id)]}));setShow(false)}}>✓ Gem</Btn></div></Modal>}
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
          <Btn key={key} small danger onClick={()=>clearSection(key,empty)}>✕ {label} ({(data[key]||[]).length})</Btn>)}
        <Btn small danger onClick={()=>clearSection("haccp",{cleaning:[],temps:[],deviations:[],receiving:[],maintenance:[]})}>✕ HACCP logs</Btn>
        <Btn small danger onClick={()=>clearSection("team",{pages:[],messages:[]})}>✕ Team</Btn>
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
