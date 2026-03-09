'use client'
import { useState, useEffect, useRef } from 'react'

const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6)
const today=()=>new Date().toISOString().slice(0,10)
const fk=n=>n?`${Number(n).toLocaleString("da-DK")} kr`:"—"
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)}

// UI Components
const T={bg:"#0f1a0b",card:"#1a2814",input:"#0d150a",brd:"#2d4a22",brdL:"#1f3318",acc:"#a8d870",accD:"rgba(168,216,112,0.15)",txt:"#e8f0d8",mid:"rgba(232,240,216,0.6)",dim:"rgba(232,240,216,0.3)",red:"#e85454",warn:"#e8b854",ok:"#54c878",fm:"'JetBrains Mono','SF Mono',monospace"}
const Badge=({children,c=T.acc,bg})=><span style={{display:"inline-flex",fontSize:10,fontWeight:600,letterSpacing:".04em",textTransform:"uppercase",color:c,background:bg||`${c}22`,padding:"2px 8px",borderRadius:99,whiteSpace:"nowrap"}}>{children}</span>
const Btn=({children,primary,danger,small,disabled,style,...p})=><button {...p} style={{display:"inline-flex",alignItems:"center",gap:5,padding:small?"4px 10px":"7px 14px",borderRadius:7,fontSize:small?11:12,fontWeight:600,background:danger?T.red:primary?T.acc:"transparent",color:danger?"#fff":primary?T.bg:T.txt,border:primary||danger?"none":`1px solid ${T.brd}`,opacity:disabled?.4:1,...style}} disabled={disabled}/>
const Card=({children,style,onClick})=><div onClick={onClick} style={{background:T.card,border:`1px solid ${T.brdL}`,borderRadius:10,padding:16,cursor:onClick?"pointer":"default",...style}}>{children}</div>
const Field=({label,children})=><div style={{marginBottom:12}}><label style={{display:"block",fontSize:10,fontWeight:600,color:T.mid,letterSpacing:".06em",textTransform:"uppercase",marginBottom:4}}>{label}</label>{children}</div>
const Modal=({title,onClose,children,wide})=><div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3,padding:16}} onClick={onClose}><div className="fade-in" onClick={e=>e.stopPropagation()} style={{background:T.card,border:`1px solid ${T.brd}`,borderRadius:14,width:"100%",maxWidth:wide?720:460,maxHeight:"85vh",overflow:"auto",padding:24}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><h3 style={{fontSize:16,fontWeight:700}}>{title}</h3><button onClick={onClose} style={{background:"none",color:T.dim,fontSize:16}}>✕</button></div>{children}</div></div>
const Stat=({label,value,sub,c=T.acc})=><Card style={{flex:"1 1 130px",minWidth:130}}><div style={{fontSize:10,color:T.dim,letterSpacing:".07em",textTransform:"uppercase",marginBottom:6}}>{label}</div><div style={{fontSize:22,fontWeight:700,color:c,lineHeight:1,fontFamily:T.fm}}>{value}</div>{sub&&<div style={{fontSize:11,color:T.mid,marginTop:5}}>{sub}</div>}</Card>
const Empty=({text,action,onAction})=><div style={{textAlign:"center",padding:50,color:T.dim}}><div style={{fontSize:13,marginBottom:14}}>{text}</div>{action&&<Btn primary onClick={onAction}><PlusIcon size={11} color={T.bg}/> {action}</Btn>}</div>
const Dot=({s})=><span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:s==="ok"?T.ok:s==="warn"?T.warn:T.red,boxShadow:`0 0 5px ${s==="ok"?T.ok:s==="warn"?T.warn:T.red}44`}}/>
const Tabs=({tabs,active,onChange,right})=><div style={{display:"flex",gap:0,borderBottom:`1px solid ${T.brdL}`,marginBottom:16,alignItems:"flex-end"}}>{tabs.map(([id,l])=><button key={id} onClick={()=>onChange(id)} style={{padding:"8px 16px",fontSize:12,fontWeight:active===id?600:400,color:active===id?T.acc:T.dim,background:"none",borderBottom:active===id?`2px solid ${T.acc}`:"2px solid transparent"}}>{l}</button>)}<div style={{flex:1}}/>{right}</div>
const Check=({checked,onChange,label})=><label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:12}}><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} style={{width:"auto",accentColor:T.acc}}/>{label}</label>
const PlusIcon=({size=12,color="currentColor"})=><svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>
const Tip=({text})=>{const[show,setShow]=useState(false);return<span style={{position:"relative",display:"inline-flex",marginLeft:6,cursor:"help"}} onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)} onClick={()=>setShow(!show)}><span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:18,height:18,borderRadius:"50%",border:`1.5px solid ${T.dim}`,fontSize:10,fontWeight:700,color:T.dim,lineHeight:1}}>?</span>{show&&<span style={{position:"absolute",bottom:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)",background:"#0d150a",border:`1px solid ${T.brd}`,borderRadius:8,padding:"8px 12px",fontSize:11,color:T.mid,minWidth:220,maxWidth:320,zIndex:999,lineHeight:1.5,boxShadow:"0 8px 32px rgba(0,0,0,.5)",whiteSpace:"normal",pointerEvents:"none"}}>{text}</span>}</span>}
const SH=({desc,tip,children})=><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}><div style={{display:"flex",alignItems:"center",fontSize:11,color:T.dim}}>{desc}{tip&&<Tip text={tip}/>}</div><div style={{display:"flex",gap:6}}>{children}</div></div>

export default function DrypApp({data,update,save,user,onLogout,supabase}){
  const[page,setPage]=useState("dashboard")
  const[sb,setSb]=useState(typeof window!=='undefined'?window.innerWidth>860:true)
  useEffect(()=>{const h=()=>setSb(window.innerWidth>860);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h)},[])

  const nav=[{id:"dashboard",l:"Overblik",i:"◻"},{id:"production",l:"Produktion",i:"⬡"},{id:"recipes",l:"Opskrifter",i:"◉"},{id:"haccp",l:"HACCP Logs",i:"✓"},{id:"batches",l:"Batches",i:"⬢"},{id:"customers",l:"Kunder & Ordrer",i:"◎"},{id:"inventory",l:"Lager",i:"▦"},{id:"planning",l:"Indkøbsplan",i:"◇"},{id:"economy",l:"Økonomi",i:"◈"},{id:"mail",l:"Mail",i:"✉"},{id:"documents",l:"Dokumenter",i:"▤"},{id:"team",l:"Team",i:"☰"},{id:"settings",l:"Indstillinger",i:"⚙"}]
  const Pg={dashboard:Dashboard,production:Production,recipes:Recipes,haccp:HACCPLogs,batches:Batches,customers:Customers,inventory:Inventory,planning:Planning,economy:Economy,mail:Mail,documents:Documents,team:Team,settings:Settings}[page]||Dashboard

  const userName=user?.email?.split('@')[0]||'Bruger'

  return<div style={{display:"flex",height:"100vh",overflow:"hidden"}}>
    <div style={{width:sb?210:0,minWidth:sb?210:0,background:T.card,borderRight:`1px solid ${T.brdL}`,display:"flex",flexDirection:"column",transition:"all .3s",overflow:"hidden",position:typeof window!=='undefined'&&window.innerWidth<=768?"fixed":"relative",zIndex:100,height:"100%"}}>
      <div style={{padding:"18px 14px 6px"}}><div style={{fontFamily:"'Archivo Black',sans-serif",fontSize:18,color:T.acc,letterSpacing:".12em"}}>DRYP</div><div style={{fontSize:8,color:T.dim,letterSpacing:".15em",textTransform:"uppercase"}}>Skagen · DK</div></div>
      <nav style={{padding:"12px 6px",flex:1,overflow:"auto"}}>{nav.map(n=><button key={n.id} onClick={()=>{setPage(n.id);if(typeof window!=='undefined'&&window.innerWidth<=768)setSb(false)}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"7px 10px",borderRadius:6,marginBottom:1,background:page===n.id?T.accD:"transparent",color:page===n.id?T.acc:T.mid,fontSize:11.5,fontWeight:page===n.id?600:400,textAlign:"left"}}><span style={{width:16,textAlign:"center",fontSize:11,opacity:page===n.id?1:.4}}>{n.i}</span>{n.l}</button>)}</nav>
      <div style={{padding:"10px 14px",borderTop:`1px solid ${T.brdL}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:26,height:26,borderRadius:"50%",background:T.accD,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:T.acc}}>{userName.charAt(0).toUpperCase()}</div><div style={{fontSize:11}}>{userName}</div></div>
        <button onClick={onLogout} style={{background:"none",color:T.dim,fontSize:9,textDecoration:"underline"}}>Log ud</button>
      </div>
    </div>
    {sb&&typeof window!=='undefined'&&window.innerWidth<=768&&<div onClick={()=>setSb(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:99}}/>}
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <header style={{display:"flex",alignItems:"center",gap:10,padding:"10px 18px",borderBottom:`1px solid ${T.brdL}`,background:T.card,flexShrink:0}}>{!sb&&<button onClick={()=>setSb(true)} style={{background:"none",color:T.mid,fontSize:16}}>☰</button>}<h1 style={{fontSize:14,fontWeight:600}}>{nav.find(n=>n.id===page)?.l}</h1><div style={{flex:1}}/><div style={{fontSize:10,color:T.dim,fontFamily:T.fm}}>{new Date().toLocaleDateString("da-DK",{weekday:"short",day:"numeric",month:"short"})}</div></header>
      <main style={{flex:1,overflow:"auto",padding:18}} className="fade-in" key={page}><Pg data={data} update={update} save={save} user={user} supabase={supabase}/></main>
    </div>
  </div>
}

// ═══ DASHBOARD ═══
function Dashboard({data}){
  const mo=today().slice(0,7);const prods=data.productions.filter(p=>p.date?.startsWith(mo))
  const rev=data.orders.filter(o=>o.date?.startsWith(mo)).reduce((s,o)=>s+(parseFloat(o.price)||0)*(parseInt(o.qty)||0),0)
  const low=data.inventory.filter(i=>i.qty<i.min).length
  const ccpOk=prods.filter(p=>p.ccp1Ok&&p.ccp2Ok).length
  return<div style={{maxWidth:1000}}>
    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:20}}>
      <Stat label="Produktioner" value={prods.length} sub={`${prods.reduce((s,p)=>s+(parseFloat(p.volume)||0),0).toFixed(1)}L`}/>
      <Stat label="Omsætning" value={fk(rev)} c={rev>0?T.ok:T.dim}/>
      <Stat label="CCP OK" value={prods.length?`${Math.round(ccpOk/prods.length*100)}%`:"—"} c={ccpOk===prods.length&&prods.length>0?T.ok:T.warn}/>
      <Stat label="Lager" value={low} c={low>0?T.warn:T.ok} sub={low?"Under min":"Alt OK"}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      <Card><div style={{fontSize:11,fontWeight:600,marginBottom:10}}>Aktive produkter</div>{(data.recipes||[]).filter(r=>r.active).map(r=><div key={r.id} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${T.brdL}`,fontSize:12}}><span>{r.name}</span><Badge c={T.ok}>Aktiv</Badge></div>)}</Card>
      <Card><div style={{fontSize:11,fontWeight:600,marginBottom:10}}>Lagerstatus</div>{data.inventory.map(i=>{const c=i.qty<i.min?T.red:i.qty<i.min*1.5?T.warn:T.ok;return<div key={i.id} style={{marginBottom:6}}><div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:2}}><span style={{color:T.mid}}>{i.name}</span><span style={{fontFamily:T.fm,color:c}}>{i.qty}{i.unit}</span></div><div style={{height:3,background:T.input,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min((i.qty/(i.min||1))*100,100)}%`,background:c,borderRadius:2}}/></div></div>})}</Card>
      <Card style={{gridColumn:"1/-1"}}><div style={{fontSize:11,fontWeight:600,marginBottom:10}}>Seneste produktioner</div>{data.productions.length===0?<div style={{color:T.dim,fontSize:11}}>Ingen endnu</div>:[...data.productions].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,5).map(p=><div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${T.brdL}`}}><div><span style={{fontSize:12,fontWeight:500}}>{p.batchId}</span><span style={{fontSize:10,color:T.dim,marginLeft:8}}>{p.recipeName||"—"} · {p.date}</span></div><div style={{display:"flex",gap:4}}><Badge c={p.ccp1Ok?T.ok:T.red}>CCP1</Badge><Badge c={p.ccp2Ok?T.ok:T.red}>CCP2</Badge></div></div>)}</Card>
    </div>
  </div>
}

// ═══ RECIPES ═══
function Recipes({data,update}){
  const[show,setShow]=useState(false);const[form,setForm]=useState({})
  const newR=()=>{setForm({id:uid(),name:"",size:"250ml",active:true,bom:[],steps:[""],infusionTemp:"",infusionTime:"",shelfLifeDays:90});setShow(true)}
  const doSave=()=>{update("recipes",prev=>[form,...(prev||[]).filter(r=>r.id!==form.id)]);setShow(false)}
  return<div style={{maxWidth:900}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><div style={{fontSize:11,color:T.dim}}>Produktopskrifter med stykliste og procestrin</div><Btn primary onClick={newR}><PlusIcon size={11} color={T.bg}/> Ny opskrift</Btn></div>
    {(data.recipes||[]).map(r=><Card key={r.id} style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><div style={{fontSize:14,fontWeight:600}}>{r.name}</div><div style={{fontSize:11,color:T.dim}}>{r.size} · {r.bom?.length||0} materialer · {r.steps?.length||0} trin · Holdbarhed: {r.shelfLifeDays}d</div></div>
        <div style={{display:"flex",gap:6}}><Badge c={r.active?T.ok:T.dim}>{r.active?"Aktiv":"Inaktiv"}</Badge><Btn small onClick={()=>{setForm(r);setShow(true)}}>✎</Btn></div>
      </div>
      <div style={{marginTop:10,display:"flex",gap:8,flexWrap:"wrap"}}>{(r.bom||[]).map((b,i)=>{const inv=data.inventory.find(x=>x.id===b.itemId);return<div key={i} style={{fontSize:11,color:T.mid,background:T.input,padding:"3px 8px",borderRadius:5}}>{inv?.name||b.itemId}: {b.qty} {b.unit}</div>})}</div>
    </Card>)}
    {show&&<Modal title={form.name||"Ny opskrift"} onClose={()=>setShow(false)} wide>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0 14px"}}>
        <Field label="Produktnavn"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field>
        <Field label="Størrelse"><input value={form.size} onChange={e=>setForm({...form,size:e.target.value})}/></Field>
        <Field label="Holdbarhed (dage)"><input type="number" value={form.shelfLifeDays} onChange={e=>setForm({...form,shelfLifeDays:parseInt(e.target.value)||90})}/></Field>
        <Field label="Infusionstemperatur"><input value={form.infusionTemp} onChange={e=>setForm({...form,infusionTemp:e.target.value})}/></Field>
        <Field label="Infusionstid"><input value={form.infusionTime} onChange={e=>setForm({...form,infusionTime:e.target.value})}/></Field>
        <Field label=""><div style={{marginTop:16}}><Check checked={form.active} onChange={v=>setForm({...form,active:v})} label="Aktiv"/></div></Field>
      </div>
      <div style={{borderTop:`1px solid ${T.brdL}`,marginTop:8,paddingTop:14}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:11,fontWeight:700,color:T.acc,textTransform:"uppercase"}}>Stykliste (BOM)</span><Btn small onClick={()=>setForm({...form,bom:[...form.bom,{itemId:data.inventory[0]?.id||"",qty:1,unit:data.inventory[0]?.unit||"stk"}]})}><PlusIcon size={10}/> Materiale</Btn></div>
        {(form.bom||[]).map((b,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:6,alignItems:"center"}}>
          <select value={b.itemId} onChange={e=>{const bom=[...form.bom];bom[i]={...bom[i],itemId:e.target.value,unit:data.inventory.find(x=>x.id===e.target.value)?.unit||"stk"};setForm({...form,bom})}} style={{flex:2}}>{data.inventory.map(inv=><option key={inv.id} value={inv.id}>{inv.name}</option>)}</select>
          <input type="number" step=".01" value={b.qty} onChange={e=>{const bom=[...form.bom];bom[i]={...bom[i],qty:parseFloat(e.target.value)||0};setForm({...form,bom})}} style={{flex:1}}/>
          <span style={{fontSize:10,color:T.dim,width:30}}>{b.unit}</span>
          <button onClick={()=>setForm({...form,bom:form.bom.filter((_,j)=>j!==i)})} style={{background:"none",color:T.red,fontSize:14}}>✕</button>
        </div>)}
      </div>
      <div style={{borderTop:`1px solid ${T.brdL}`,marginTop:14,paddingTop:14}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:11,fontWeight:700,color:T.acc,textTransform:"uppercase"}}>Procestrin</span><Btn small onClick={()=>setForm({...form,steps:[...(form.steps||[]),""]})}><PlusIcon size={10}/> Trin</Btn></div>
        {(form.steps||[]).map((s,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:6,alignItems:"center"}}>
          <span style={{fontSize:10,color:T.dim,width:20}}>{i+1}.</span>
          <input value={s} onChange={e=>{const steps=[...form.steps];steps[i]=e.target.value;setForm({...form,steps})}} style={{flex:1}}/>
          <button onClick={()=>setForm({...form,steps:form.steps.filter((_,j)=>j!==i)})} style={{background:"none",color:T.red,fontSize:14}}>✕</button>
        </div>)}
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:14}}><Btn onClick={()=>setShow(false)}>Annuller</Btn><Btn primary onClick={doSave}>✓ Gem</Btn></div>
    </Modal>}
  </div>
}

// ═══ PRODUCTION ═══
function Production({data,update}){
  const[show,setShow]=useState(false);const[form,setForm]=useState({});const[exp,setExp]=useState(null)
  const recipes=(data.recipes||[]).filter(r=>r.active)
  const startNew=()=>{const r=recipes[0];setForm({id:uid(),recipeId:r?.id||"",recipeName:r?.name||"",batchId:`DRYP-${today().replace(/-/g,"").slice(2)}-${String(data.productions.length+1).padStart(3,"0")}`,date:today(),operator:"Andreas",rapsolieQty:"",rapsolieLot:"",dildQty:"",volume:"",bottles250:"",bottles500:"",ccp1TempStart:"",ccp1TempEnd:"",infusionTime:r?.infusionTime||"",ccp1Ok:false,ccp2Visual:false,ccp2Ok:false,cleaningDone:false,hygieneDone:false,tempStorage:"",notes:""});setShow(true)}
  const doSave=()=>{update("productions",prev=>[form,...prev.filter(p=>p.id!==form.id)]);if(!data.batches.find(b=>b.id===form.batchId))update("batches",prev=>[{id:form.batchId,created:form.date,recipeId:form.recipeId,recipeName:form.recipeName,rapsolieOrigin:"Dansk",status:"produceret",bestBefore:addDays(form.date,recipes.find(r=>r.id===form.recipeId)?.shelfLifeDays||90),notes:""},...prev]);setShow(false)}
  return<div style={{maxWidth:920}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}><div style={{fontSize:11,color:T.dim}}>Produktionslog med HACCP CCP1+CCP2</div><Btn primary onClick={startNew}><PlusIcon size={11} color={T.bg}/> Ny produktion</Btn></div>
    {data.productions.length===0?<Empty text="Ingen produktioner" action="Start" onAction={startNew}/>:
      [...data.productions].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(p=><Card key={p.id} onClick={()=>setExp(exp===p.id?null:p.id)} style={{marginBottom:8,cursor:"pointer"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:13,fontWeight:600}}>{p.batchId}</div><div style={{fontSize:10,color:T.dim}}>{p.recipeName||"—"} · {p.date}</div></div><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:11,fontFamily:T.fm,color:T.mid}}>{p.volume||"—"}L</span><Badge c={p.ccp1Ok?T.ok:T.red}>CCP1</Badge><Badge c={p.ccp2Ok?T.ok:T.red}>CCP2</Badge></div></div>
        {exp===p.id&&<div className="fade-in" style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${T.brdL}`,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"4px 16px",fontSize:11}}>
          {[["Rapsolie",`${p.rapsolieQty||"—"}L`],["Lot",p.rapsolieLot],["Dild",`${p.dildQty||"—"}kg`],["CCP1 start",`${p.ccp1TempStart||"—"}°C`],["CCP1 slut",`${p.ccp1TempEnd||"—"}°C`],["Tid",p.infusionTime],["250ml",p.bottles250],["500ml",p.bottles500],["Lager",`${p.tempStorage||"—"}°C`]].map(([k,v])=><div key={k}><span style={{color:T.dim}}>{k}:</span> {v||"—"}</div>)}
          <div style={{gridColumn:"1/-1",marginTop:4}}><Btn small onClick={e=>{e.stopPropagation();setForm(p);setShow(true)}}>✎ Rediger</Btn></div>
        </div>}
      </Card>)}
    {show&&<Modal title={`Produktion · ${form.batchId}`} onClose={()=>setShow(false)} wide>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0 12px"}}>
        <Field label="Opskrift"><select value={form.recipeId} onChange={e=>{const r=recipes.find(x=>x.id===e.target.value);setForm({...form,recipeId:e.target.value,recipeName:r?.name||""})}}>{recipes.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
        <Field label="Batch-nr."><input value={form.batchId} onChange={e=>setForm({...form,batchId:e.target.value})}/></Field>
        <Field label="Dato"><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></Field>
        <Field label="Operatør"><input value={form.operator} onChange={e=>setForm({...form,operator:e.target.value})}/></Field>
        <Field label="Rapsolie (L)"><input type="number" step=".1" value={form.rapsolieQty} onChange={e=>setForm({...form,rapsolieQty:e.target.value})}/></Field>
        <Field label="Rapsolie lot"><input value={form.rapsolieLot} onChange={e=>setForm({...form,rapsolieLot:e.target.value})}/></Field>
        <div style={{gridColumn:"1/-1",borderBottom:`1px solid ${T.brdL}`,margin:"4px 0 12px"}}><span style={{fontSize:10,fontWeight:700,color:T.warn,textTransform:"uppercase"}}>⚠ CCP1 — Infusion</span></div>
        <Field label="Temp start (°C)"><input type="number" value={form.ccp1TempStart} onChange={e=>setForm({...form,ccp1TempStart:e.target.value})}/></Field>
        <Field label="Temp slut (°C)"><input type="number" value={form.ccp1TempEnd} onChange={e=>setForm({...form,ccp1TempEnd:e.target.value})}/></Field>
        <Field label="Tid"><input value={form.infusionTime} onChange={e=>setForm({...form,infusionTime:e.target.value})}/></Field>
        <Field label=""><div style={{marginTop:16}}><Check checked={form.ccp1Ok} onChange={v=>setForm({...form,ccp1Ok:v})} label="CCP1 Godkendt"/></div></Field>
        <div style={{gridColumn:"1/-1",borderBottom:`1px solid ${T.brdL}`,margin:"4px 0 12px"}}><span style={{fontSize:10,fontWeight:700,color:T.warn,textTransform:"uppercase"}}>⚠ CCP2 — Forsegling</span></div>
        <Field label=""><Check checked={form.ccp2Visual} onChange={v=>setForm({...form,ccp2Visual:v})} label="Visuel kontrol OK"/></Field>
        <Field label=""><Check checked={form.ccp2Ok} onChange={v=>setForm({...form,ccp2Ok:v})} label="CCP2 Godkendt"/></Field>
        <div style={{gridColumn:"1/-1",borderBottom:`1px solid ${T.brdL}`,margin:"4px 0 12px"}}><span style={{fontSize:10,fontWeight:700,color:T.acc,textTransform:"uppercase"}}>Output</span></div>
        <Field label="Total (L)"><input type="number" step=".1" value={form.volume} onChange={e=>setForm({...form,volume:e.target.value})}/></Field>
        <Field label="250ml"><input type="number" value={form.bottles250} onChange={e=>setForm({...form,bottles250:e.target.value})}/></Field>
        <Field label="500ml"><input type="number" value={form.bottles500} onChange={e=>setForm({...form,bottles500:e.target.value})}/></Field>
        <Field label="Lagertemp"><input type="number" step=".1" value={form.tempStorage} onChange={e=>setForm({...form,tempStorage:e.target.value})}/></Field>
        <Field label=""><div style={{marginTop:16}}><Check checked={form.cleaningDone} onChange={v=>setForm({...form,cleaningDone:v})} label="Rengøring"/></div></Field>
        <Field label=""><div style={{marginTop:16}}><Check checked={form.hygieneDone} onChange={v=>setForm({...form,hygieneDone:v})} label="Hygiejne"/></div></Field>
        <div style={{gridColumn:"1/-1"}}><Field label="Noter"><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></Field></div>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={()=>setShow(false)}>Annuller</Btn><Btn primary onClick={doSave}>✓ Gem</Btn></div>
    </Modal>}
  </div>
}

// ═══ HACCP LOGS ═══
function HACCPLogs({data,update}){
  const[tab,setTab]=useState("cleaning");const[show,setShow]=useState(false);const[form,setForm]=useState({})
  const tabs=[["cleaning","Rengøring"],["temps","Temperatur"],["receiving","Varemodtagelse"],["deviations","Afvigelser"],["maintenance","Vedligehold"]]
  const newE=()=>{const base={id:uid(),date:today(),operator:"Andreas",notes:""};const ex={cleaning:{area:"",product:"",disinfected:false,ok:false},temps:{time:"08:00",fridge1:"",fridge2:"",prodRoom:"",withinLimits:false,action:""},receiving:{supplier:"",item:"",qty:"",temp:"",packagingOk:false,approved:false},deviations:{description:"",processStep:"",batchId:"",corrective:"",preventive:"",closedDate:""},maintenance:{equipment:"",checkType:"",status:"OK",action:"",nextCheck:""}};setForm({...base,...ex[tab]});setShow(true)}
  const doSave=()=>{update("haccp",prev=>({...prev,[tab]:[form,...(prev?.[tab]||[]).filter(e=>e.id!==form.id)]}));setShow(false)}
  const entries=(data.haccp?.[tab]||[]).sort((a,b)=>(b.date||"").localeCompare(a.date||""))
  return<div style={{maxWidth:920}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><div style={{fontSize:11,color:T.dim}}>HACCP egenkontrol-logs</div><Btn primary onClick={newE}><PlusIcon size={11} color={T.bg}/> Ny log</Btn></div>
    <Tabs tabs={tabs} active={tab} onChange={setTab}/>
    {entries.length===0?<Empty text="Ingen logs endnu" action="Tilføj" onAction={newE}/>:entries.map(e=><Card key={e.id} style={{marginBottom:5,padding:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontFamily:T.fm,fontSize:10,color:T.dim}}>{e.date}</span>{tab==="cleaning"&&<span>{e.area}</span>}{tab==="temps"&&<span>K1:{e.fridge1}° K2:{e.fridge2}°</span>}{tab==="receiving"&&<span>{e.item} ← {e.supplier}</span>}{tab==="deviations"&&<span style={{color:T.red}}>{e.description?.slice(0,50)}</span>}{tab==="maintenance"&&<span>{e.equipment}</span>}</div>
        <div style={{display:"flex",gap:4}}>{tab==="cleaning"&&<Dot s={e.ok?"ok":"warn"}/>}{tab==="temps"&&<Dot s={e.withinLimits?"ok":"warn"}/>}{tab==="receiving"&&<Dot s={e.approved?"ok":"warn"}/>}{tab==="deviations"&&<Badge c={e.closedDate?T.ok:T.red}>{e.closedDate?"Lukket":"Åben"}</Badge>}{tab==="maintenance"&&<Badge c={e.status==="OK"?T.ok:T.warn}>{e.status}</Badge>}<button onClick={()=>{setForm(e);setShow(true)}} style={{background:"none",color:T.dim,fontSize:11}}>✎</button></div>
      </div>
    </Card>)}
    {show&&<Modal title={`${tabs.find(t=>t[0]===tab)?.[1]}`} onClose={()=>setShow(false)}>
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

// ═══ PLANNING (editable) ═══
function Planning({data,update}){
  const recipes=(data.recipes||[]).filter(r=>r.active)
  const[planQty,setPlanQty]=useState(()=>Object.fromEntries(recipes.map(r=>[r.id,50])))
  const[editItem,setEditItem]=useState(null);const[ef,setEf]=useState({})
  const needs={};recipes.forEach(r=>{const qty=parseInt(planQty[r.id])||0;(r.bom||[]).forEach(b=>{if(!needs[b.itemId])needs[b.itemId]={required:0,items:[]};needs[b.itemId].required+=b.qty*qty;needs[b.itemId].items.push({recipe:r.name,total:b.qty*qty})})})
  const plan=data.inventory.map(inv=>{const n=needs[inv.id]||{required:0,items:[]};const deficit=Math.max(0,n.required-inv.qty);const oq=deficit>0?Math.ceil(deficit/10)*10:0;return{...inv,need:n.required,deficit,orderQty:oq,orderBy:oq>0?addDays(today(),-(inv.leadDays||7)):null,needsOrder:oq>0,breakdown:n.items}}).sort((a,b)=>(b.needsOrder?1:0)-(a.needsOrder?1:0))
  const startEdit=(item)=>{setEditItem(item.id);setEf({name:item.name,costPer:item.costPer,supplier:item.supplier,leadDays:item.leadDays,min:item.min,unit:item.unit})}
  const saveEdit=()=>{update("inventory",prev=>prev.map(i=>i.id===editItem?{...i,...ef}:i));setEditItem(null)}
  return<div style={{maxWidth:1000}}>
    <SH desc="Indkøbsplan baseret på planlagt produktion" tip="Angiv antal flasker du vil producere. Systemet beregner indkøbsbehov ud fra opskrifter og lager. Klik ✎ for at redigere materialer direkte."/>
    <Card style={{marginBottom:20}}><div style={{display:"flex",alignItems:"center",fontSize:12,fontWeight:600,marginBottom:12}}>Planlagt produktion<Tip text="Antal flasker du planlægger. Systemet beregner nødvendige råvarer automatisk."/></div><div style={{display:"flex",gap:14,flexWrap:"wrap"}}>{recipes.map(r=><div key={r.id} style={{flex:"1 1 200px"}}><div style={{fontSize:11,color:T.mid,marginBottom:4}}>{r.name}</div><div style={{display:"flex",alignItems:"center",gap:8}}><input type="number" value={planQty[r.id]||0} onChange={e=>setPlanQty({...planQty,[r.id]:e.target.value})} style={{width:80}}/><span style={{fontSize:11,color:T.dim}}>flasker</span></div></div>)}</div></Card>
    <div style={{display:"flex",alignItems:"center",fontSize:12,fontWeight:600,marginBottom:12}}>Indkøbsbehov<Tip text="Rød = skal bestilles. Grøn = lager OK. Klik ✎ for at redigere leverandør, pris og lead time."/></div>
    {plan.map(item=><Card key={item.id} style={{marginBottom:8,padding:12,borderLeft:item.needsOrder?`3px solid ${T.red}`:`3px solid ${T.ok}`}}>
      {editItem===item.id?<div className="fade-in">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0 12px"}}>
          <Field label="Navn"><input value={ef.name} onChange={e=>setEf({...ef,name:e.target.value})}/></Field>
          <Field label="Enhed"><input value={ef.unit} onChange={e=>setEf({...ef,unit:e.target.value})}/></Field>
          <Field label="Pris pr. enhed"><input type="number" step=".1" value={ef.costPer} onChange={e=>setEf({...ef,costPer:parseFloat(e.target.value)||0})}/></Field>
          <Field label="Leverandør"><input value={ef.supplier} onChange={e=>setEf({...ef,supplier:e.target.value})}/></Field>
          <Field label="Lead time (dage)"><input type="number" value={ef.leadDays} onChange={e=>setEf({...ef,leadDays:parseInt(e.target.value)||0})}/></Field>
          <Field label="Minimum"><input type="number" value={ef.min} onChange={e=>setEf({...ef,min:parseFloat(e.target.value)||0})}/></Field>
        </div>
        <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}><Btn small onClick={()=>setEditItem(null)}>Annuller</Btn><Btn small primary onClick={saveEdit}>✓ Gem</Btn></div>
      </div>:<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:13,fontWeight:500}}>{item.name}</div><div style={{fontSize:10,color:T.dim}}>Behov: {item.need.toFixed(1)} {item.unit} · Lager: {item.qty} · Lead: {item.leadDays}d{item.supplier&&` · ${item.supplier}`} · {fk(item.costPer)}/{item.unit}</div></div><div style={{display:"flex",alignItems:"center",gap:8}}><Btn small onClick={()=>startEdit(item)}>✎</Btn>{item.needsOrder?<div style={{textAlign:"right"}}><div style={{fontSize:16,fontWeight:700,fontFamily:T.fm,color:T.red}}>{item.orderQty} {item.unit}</div><div style={{fontSize:10,color:T.warn}}>Bestil senest {item.orderBy}</div><div style={{fontSize:10,color:T.dim}}>~{fk(Math.round(item.orderQty*(item.costPer||0)))}</div></div>:<Badge c={T.ok}>OK</Badge>}</div></div>}
    </Card>)}
    <Card style={{marginTop:16,background:T.accD,border:"none"}}><div style={{fontSize:12,fontWeight:600,marginBottom:6}}>Total indkøb</div><div style={{fontSize:20,fontWeight:700,fontFamily:T.fm,color:T.acc}}>{fk(Math.round(plan.reduce((s,i)=>s+i.orderQty*(i.costPer||0),0)))}</div></Card>
  </div>
}

// ═══ BATCHES ═══
function Batches({data,update}){
  const[show,setShow]=useState(false);const[form,setForm]=useState({})
  return<div style={{maxWidth:900}}>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:18}}><div style={{fontSize:11,color:T.dim}}>Sporbarhed: råvare → batch → kunde</div><Btn primary onClick={()=>{setForm({id:`DRYP-${today().replace(/-/g,"").slice(2)}-${String(data.batches.length+1).padStart(3,"0")}`,created:today(),recipeName:"",rapsolieOrigin:"Dansk",status:"produceret",bestBefore:"",notes:""});setShow(true)}}><PlusIcon size={11} color={T.bg}/> Ny batch</Btn></div>
    {data.batches.length===0?<Empty text="Ingen batches"/>:[...data.batches].sort((a,b)=>(b.created||"").localeCompare(a.created||"")).map(b=><Card key={b.id} style={{marginBottom:6,padding:12}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:13,fontWeight:600}}>{b.id}</div><div style={{fontSize:10,color:T.dim}}>{b.recipeName||"—"} · {b.created}</div></div><div style={{display:"flex",gap:6}}><Badge c={{produceret:T.acc,lagret:T.warn,frigivet:T.ok,afsluttet:T.dim}[b.status]||T.dim}>{b.status}</Badge><button onClick={()=>{setForm(b);setShow(true)}} style={{background:"none",color:T.dim,fontSize:11}}>✎</button></div></div></Card>)}
    {show&&<Modal title={`Batch · ${form.id}`} onClose={()=>setShow(false)}>
      <Field label="Batch-nr."><input value={form.id} onChange={e=>setForm({...form,id:e.target.value})}/></Field>
      <Field label="Oprettet"><input type="date" value={form.created} onChange={e=>setForm({...form,created:e.target.value})}/></Field>
      <Field label="Rapsolie"><select value={form.rapsolieOrigin} onChange={e=>setForm({...form,rapsolieOrigin:e.target.value})}><option>Dansk</option><option>EU</option></select></Field>
      <Field label="Holdbar til"><input type="date" value={form.bestBefore} onChange={e=>setForm({...form,bestBefore:e.target.value})}/></Field>
      <Field label="Status"><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="produceret">Produceret</option><option value="lagret">Lagret</option><option value="frigivet">Frigivet</option><option value="afsluttet">Afsluttet</option></select></Field>
      <Field label="Noter"><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></Field>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={()=>setShow(false)}>Annuller</Btn><Btn primary onClick={()=>{update("batches",prev=>[form,...prev.filter(b=>b.id!==form.id)]);setShow(false)}}>✓ Gem</Btn></div>
    </Modal>}
  </div>
}

// ═══ CUSTOMERS ═══
function Customers({data,update}){
  const[tab,setTab]=useState("customers");const[show,setShow]=useState(false);const[ft,setFt]=useState("c");const[form,setForm]=useState({})
  const recipes=(data.recipes||[]).filter(r=>r.active)
  const doSave=()=>{if(ft==="c")update("customers",p=>[form,...p.filter(c=>c.id!==form.id)]);else update("orders",p=>[form,...p.filter(o=>o.id!==form.id)]);setShow(false)}
  return<div style={{maxWidth:1000}}>
    <Tabs tabs={[["customers","Kunder"],["orders","Ordrer"]]} active={tab} onChange={setTab} right={<Btn primary small onClick={()=>{if(tab==="customers"){setFt("c");setForm({id:uid(),name:"",type:"restaurant",contact:"",email:"",phone:"",status:"lead",notes:"",created:today()})}else{setFt("o");setForm({id:uid(),customerId:data.customers[0]?.id||"",date:today(),product:recipes[0]?.name||"",qty:"",price:"",batchId:"",status:"bestilt",notes:""})}setShow(true)}}><PlusIcon size={10} color={T.bg}/> Ny</Btn>}/>
    {tab==="customers"&&(data.customers.length===0?<Empty text="Ingen kunder" action="Tilføj" onAction={()=>{setFt("c");setForm({id:uid(),name:"",type:"restaurant",contact:"",email:"",phone:"",status:"lead",notes:"",created:today()});setShow(true)}}/>:data.customers.map(c=><Card key={c.id} style={{marginBottom:5,padding:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:28,height:28,borderRadius:"50%",background:T.accD,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:T.acc}}>{c.name?.charAt(0)?.toUpperCase()}</div><div><div style={{fontSize:12,fontWeight:500}}>{c.name}</div><div style={{fontSize:10,color:T.dim}}>{c.type} · {c.email||"—"}</div></div></div><div style={{display:"flex",gap:4}}><Badge c={c.status==="aktiv"?T.ok:c.status==="lead"?T.acc:T.dim}>{c.status}</Badge><button onClick={()=>{setFt("c");setForm(c);setShow(true)}} style={{background:"none",color:T.dim,fontSize:11}}>✎</button></div></div></Card>))}
    {tab==="orders"&&(data.orders.length===0?<Empty text="Ingen ordrer"/>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{borderBottom:`1px solid ${T.brd}`}}>{["Dato","Kunde","Produkt","Antal","Pris","Status",""].map(h=><th key={h} style={{textAlign:"left",padding:"6px 8px",fontSize:10,color:T.dim,fontWeight:600}}>{h}</th>)}</tr></thead><tbody>{[...data.orders].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(o=><tr key={o.id} style={{borderBottom:`1px solid ${T.brdL}`}}><td style={{padding:"6px 8px",fontFamily:T.fm,fontSize:11,color:T.mid}}>{o.date}</td><td style={{padding:"6px 8px"}}>{data.customers.find(c=>c.id===o.customerId)?.name||"—"}</td><td style={{padding:"6px 8px",color:T.mid}}>{o.product}</td><td style={{padding:"6px 8px",fontFamily:T.fm}}>{o.qty}</td><td style={{padding:"6px 8px",fontFamily:T.fm}}>{o.price?`${o.price}kr`:"—"}</td><td style={{padding:"6px 8px"}}><Badge c={o.status==="leveret"?T.ok:o.status==="bestilt"?T.warn:T.acc}>{o.status}</Badge></td><td><button onClick={()=>{setFt("o");setForm(o);setShow(true)}} style={{background:"none",color:T.dim,fontSize:11}}>✎</button></td></tr>)}</tbody></table></div>)}
    {show&&ft==="c"&&<Modal title={form.name||"Ny kunde"} onClose={()=>setShow(false)}><Field label="Navn"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Type"><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="restaurant">Restaurant</option><option value="delikatesse">Delikatesse</option><option value="detail">Detail</option><option value="engros">Engros</option></select></Field><Field label="Kontakt"><input value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})}/></Field><Field label="Email"><input value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field><Field label="Telefon"><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field><Field label="Status"><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="lead">Lead</option><option value="prøve">Prøve sendt</option><option value="aktiv">Aktiv</option><option value="inaktiv">Inaktiv</option></select></Field><Field label="Noter"><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></Field><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={()=>setShow(false)}>Annuller</Btn><Btn primary onClick={doSave}>✓ Gem</Btn></div></Modal>}
    {show&&ft==="o"&&<Modal title="Ordre" onClose={()=>setShow(false)}><Field label="Kunde"><select value={form.customerId} onChange={e=>setForm({...form,customerId:e.target.value})}>{data.customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Dato"><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></Field><Field label="Produkt"><select value={form.product} onChange={e=>setForm({...form,product:e.target.value})}>{recipes.map(r=><option key={r.id}>{r.name}</option>)}</select></Field><Field label="Antal"><input type="number" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})}/></Field><Field label="Pris pr. stk"><input type="number" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></Field><Field label="Batch"><select value={form.batchId} onChange={e=>setForm({...form,batchId:e.target.value})}><option value="">—</option>{data.batches.map(b=><option key={b.id} value={b.id}>{b.id}</option>)}</select></Field><Field label="Status"><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="bestilt">Bestilt</option><option value="pakket">Pakket</option><option value="leveret">Leveret</option><option value="faktureret">Faktureret</option></select></Field><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={()=>setShow(false)}>Annuller</Btn><Btn primary onClick={doSave}>✓ Gem</Btn></div></Modal>}
  </div>
}

// ═══ INVENTORY ═══
function Inventory({data,update}){
  const[show,setShow]=useState(false);const[form,setForm]=useState({});const[eId,setEId]=useState(null);const[qv,setQv]=useState("")
  const cats=[...new Set(data.inventory.map(i=>i.cat))]
  return<div style={{maxWidth:900}}>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:18}}><div style={{fontSize:11,color:T.dim}}>Klik antal for hurtig-edit</div><Btn primary onClick={()=>{setForm({id:uid(),name:"",unit:"stk",qty:0,min:0,cat:"Råvare",leadDays:7,supplier:"",costPer:0});setShow(true)}}><PlusIcon size={11} color={T.bg}/> Tilføj</Btn></div>
    {cats.map(cat=><div key={cat} style={{marginBottom:20}}><div style={{fontSize:10,fontWeight:700,color:T.dim,letterSpacing:".1em",textTransform:"uppercase",marginBottom:8}}>{cat}</div>
      {data.inventory.filter(i=>i.cat===cat).map(item=>{const low=item.qty<item.min;return<Card key={item.id} style={{marginBottom:5,padding:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:13,fontWeight:500}}>{low&&<span style={{color:T.red}}>⚠ </span>}{item.name}</div><div style={{fontSize:10,color:T.dim}}>Min:{item.min} · Lead:{item.leadDays}d{item.supplier&&` · ${item.supplier}`} · {fk(item.costPer)}/{item.unit}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>{eId===item.id?<div style={{display:"flex",gap:4}}><input type="number" value={qv} onChange={e=>setQv(e.target.value)} style={{width:60}} autoFocus onKeyDown={e=>{if(e.key==="Enter"){update("inventory",p=>p.map(i=>i.id===item.id?{...i,qty:parseFloat(qv)||0}:i));setEId(null)}}}/><Btn small primary onClick={()=>{update("inventory",p=>p.map(i=>i.id===item.id?{...i,qty:parseFloat(qv)||0}:i));setEId(null)}}>✓</Btn></div>:<button onClick={()=>{setEId(item.id);setQv(String(item.qty))}} style={{background:"none",color:low?T.red:T.txt,cursor:"pointer"}}><span style={{fontSize:18,fontFamily:T.fm,fontWeight:700}}>{item.qty}</span><span style={{fontSize:10,color:T.dim,marginLeft:3}}>{item.unit}</span></button>}<button onClick={()=>{setForm(item);setShow(true)}} style={{background:"none",color:T.dim,fontSize:11}}>✎</button></div></div>
        <div style={{marginTop:5,height:3,background:T.input,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(item.qty/(item.min||1)*100,100)}%`,background:low?T.red:item.qty<item.min*1.5?T.warn:T.ok,borderRadius:2}}/></div>
      </Card>})}
    </div>)}
    {show&&<Modal title={form.name||"Ny vare"} onClose={()=>setShow(false)}><Field label="Navn"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Kategori"><select value={form.cat} onChange={e=>setForm({...form,cat:e.target.value})}><option>Råvare</option><option>Emballage</option><option>Andet</option></select></Field><Field label="Enhed"><input value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}/></Field><Field label="Beholdning"><input type="number" value={form.qty} onChange={e=>setForm({...form,qty:parseFloat(e.target.value)||0})}/></Field><Field label="Minimum"><input type="number" value={form.min} onChange={e=>setForm({...form,min:parseFloat(e.target.value)||0})}/></Field><Field label="Lead time (dage)"><input type="number" value={form.leadDays} onChange={e=>setForm({...form,leadDays:parseInt(e.target.value)||0})}/></Field><Field label="Leverandør"><input value={form.supplier} onChange={e=>setForm({...form,supplier:e.target.value})}/></Field><Field label="Pris pr. enhed"><input type="number" step=".1" value={form.costPer} onChange={e=>setForm({...form,costPer:parseFloat(e.target.value)||0})}/></Field><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={()=>setShow(false)}>Annuller</Btn><Btn primary onClick={()=>{update("inventory",p=>p.find(i=>i.id===form.id)?p.map(i=>i.id===form.id?form:i):[...p,form]);setShow(false)}}>✓ Gem</Btn></div></Modal>}
  </div>
}

// ═══ ECONOMY ═══
function Economy({data,save}){
  const[editP,setEditP]=useState(false);const p=data.prices||{};const[pf,setPf]=useState(p)
  const cost=(rid)=>{const r=(data.recipes||[]).find(x=>x.id===rid);if(!r)return 0;return(r.bom||[]).reduce((s,b)=>{const i=data.inventory.find(x=>x.id===b.itemId);return s+(i?.costPer||0)*b.qty},0)}
  const mo=today().slice(0,7);const rev=data.orders.filter(o=>o.date?.startsWith(mo)).reduce((s,o)=>s+(parseFloat(o.price)||0)*(parseInt(o.qty)||0),0)
  return<div style={{maxWidth:1000}}>
    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:20}}>
      <Stat label="Omsætning" value={fk(rev)} c={T.ok} sub="Denne måned"/>
      <Stat label="Engros 250ml" value={`${p.wholesale250||0} kr`} c={T.acc} sub={`Kostpris: ${cost("dild-250").toFixed(1)} kr · DB: ${((p.wholesale250||0)-cost("dild-250")).toFixed(1)} kr`}/>
      <Stat label="Engros 500ml" value={`${p.wholesale500||0} kr`} c={T.acc} sub={`Kostpris: ${cost("dild-500").toFixed(1)} kr · DB: ${((p.wholesale500||0)-cost("dild-500")).toFixed(1)} kr`}/>
    </div>
    <Card><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><span style={{fontSize:12,fontWeight:600}}>Kostpris pr. produkt</span><Btn small onClick={()=>{setPf(p);setEditP(true)}}>✎ Priser</Btn></div>
      {(data.recipes||[]).filter(r=>r.active).map(r=>{const c=cost(r.id);return<div key={r.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.brdL}`,fontSize:12}}><span>{r.name}</span><div style={{display:"flex",gap:16}}><span style={{fontFamily:T.fm,color:T.warn}}>Kost: {c.toFixed(1)} kr</span>{r.id==="dild-250"&&<span style={{fontFamily:T.fm,color:T.ok}}>DB: {((p.wholesale250||0)-c).toFixed(1)} kr ({p.wholesale250>0?((((p.wholesale250||0)-c)/(p.wholesale250||1))*100).toFixed(0):0}%)</span>}{r.id==="dild-500"&&<span style={{fontFamily:T.fm,color:T.ok}}>DB: {((p.wholesale500||0)-c).toFixed(1)} kr ({p.wholesale500>0?((((p.wholesale500||0)-c)/(p.wholesale500||1))*100).toFixed(0):0}%)</span>}</div></div>})}
    </Card>
    {editP&&<Modal title="Priser" onClose={()=>setEditP(false)}><Field label="Retail 250ml"><input type="number" value={pf.retail250||0} onChange={e=>setPf({...pf,retail250:parseFloat(e.target.value)||0})}/></Field><Field label="Engros 250ml"><input type="number" value={pf.wholesale250||0} onChange={e=>setPf({...pf,wholesale250:parseFloat(e.target.value)||0})}/></Field><Field label="Retail 500ml"><input type="number" value={pf.retail500||0} onChange={e=>setPf({...pf,retail500:parseFloat(e.target.value)||0})}/></Field><Field label="Engros 500ml"><input type="number" value={pf.wholesale500||0} onChange={e=>setPf({...pf,wholesale500:parseFloat(e.target.value)||0})}/></Field><Field label="Overhead/md"><input type="number" value={pf.overhead||0} onChange={e=>setPf({...pf,overhead:parseFloat(e.target.value)||0})}/></Field><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={()=>setEditP(false)}>Annuller</Btn><Btn primary onClick={()=>{save({...data,prices:pf});setEditP(false)}}>✓ Gem</Btn></div></Modal>}
  </div>
}

// ═══ TEAM ═══
function Team({data,update}){
  const[tab,setTab]=useState("pages");const[show,setShow]=useState(false);const[form,setForm]=useState({});const[view,setView]=useState(null);const[msg,setMsg]=useState("")
  const pages=data.team?.pages||[];const msgs=data.team?.messages||[]
  const sendMsg=()=>{if(!msg.trim())return;update("team",prev=>({...prev,messages:[...(prev?.messages||[]),{id:uid(),author:"Andreas",date:today(),time:new Date().toTimeString().slice(0,5),text:msg.trim()}]}));setMsg("")}
  return<div style={{maxWidth:900}}>
    <Tabs tabs={[["pages","Sider"],["chat","Chat"]]} active={tab} onChange={setTab} right={tab==="pages"&&<Btn primary small onClick={()=>{setForm({id:uid(),title:"",content:"",updated:today(),author:"Andreas"});setShow(true)}}><PlusIcon size={10} color={T.bg}/> Ny side</Btn>}/>
    {tab==="pages"&&<>{view?<div><button onClick={()=>setView(null)} style={{background:"none",color:T.acc,fontSize:12,marginBottom:12,cursor:"pointer"}}>← Tilbage</button><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><h2 style={{fontSize:18,fontWeight:600}}>{view.title}</h2><Btn small onClick={()=>{setForm(view);setShow(true);setView(null)}}>✎</Btn></div><div style={{fontSize:13,lineHeight:1.8,color:T.mid,whiteSpace:"pre-wrap"}}>{view.content}</div><div style={{fontSize:10,color:T.dim,marginTop:16}}>{view.updated} · {view.author}</div></div>:pages.length===0?<Empty text="Ingen sider" action="Opret" onAction={()=>{setForm({id:uid(),title:"",content:"",updated:today(),author:"Andreas"});setShow(true)}}/>:pages.map(p=><Card key={p.id} onClick={()=>setView(p)} style={{marginBottom:6,padding:12,cursor:"pointer"}}><div style={{display:"flex",justifyContent:"space-between"}}><div><div style={{fontSize:13,fontWeight:600}}>{p.title}</div><div style={{fontSize:10,color:T.dim}}>{p.content?.slice(0,80)}</div></div><span style={{fontSize:10,color:T.dim}}>{p.updated}</span></div></Card>)}</>}
    {tab==="chat"&&<div><div style={{minHeight:300,maxHeight:400,overflow:"auto",marginBottom:12}}>{msgs.length===0?<div style={{textAlign:"center",padding:40,color:T.dim,fontSize:12}}>Ingen beskeder</div>:msgs.map(m=><div key={m.id} style={{marginBottom:8,display:"flex",gap:8}}><div style={{width:26,height:26,borderRadius:"50%",background:T.accD,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:T.acc,flexShrink:0}}>{m.author?.charAt(0)}</div><div><div style={{fontSize:10,color:T.dim}}>{m.author} · {m.date} {m.time}</div><div style={{fontSize:13,marginTop:2}}>{m.text}</div></div></div>)}</div><div style={{display:"flex",gap:8}}><input value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Skriv..." onKeyDown={e=>e.key==="Enter"&&sendMsg()}/><Btn primary onClick={sendMsg}>Send</Btn></div></div>}
    {show&&<Modal title={form.title||"Ny side"} onClose={()=>setShow(false)} wide><Field label="Titel"><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></Field><Field label="Indhold"><textarea value={form.content} onChange={e=>setForm({...form,content:e.target.value})} style={{minHeight:200}}/></Field><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={()=>setShow(false)}>Annuller</Btn><Btn primary onClick={()=>{update("team",prev=>({...prev,pages:[{...form,updated:today()},...(prev?.pages||[]).filter(p=>p.id!==form.id)]}));setShow(false)}}>✓ Gem</Btn></div></Modal>}
  </div>
}

// ═══ MAIL ═══
function Mail({data,update}){
  const[tab,setTab]=useState("compose");const[sending,setSending]=useState(false);const[status,setStatus]=useState("")
  const[to,setTo]=useState("");const[subject,setSubject]=useState("");const[body,setBody]=useState("")
  const emails=data.emails||[]
  const send=async()=>{
    if(!to||!subject||!body){setStatus("Udfyld alle felter");return}
    setSending(true);setStatus("")
    try{
      const res=await fetch("/api/send-email",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to,subject,html:`<div style="font-family:sans-serif;line-height:1.6;">${body.replace(/\n/g,"<br/>")}</div><br/><div style="font-size:12px;color:#888;">—<br/>DRYP · Grøn Olie · Skagen, DK<br/>dryp.dk</div>`,from_name:"DRYP"})})
      const result=await res.json()
      if(result.success){setStatus("✓ Sendt!");update("emails",prev=>[{id:uid(),to,subject,body,date:today(),time:new Date().toTimeString().slice(0,5),status:"sendt"},...(prev||[])]);setTo("");setSubject("");setBody("")}
      else setStatus(`Fejl: ${result.error}`)
    }catch(e){setStatus(`Fejl: ${e.message}`)}
    setSending(false)
  }
  return<div style={{maxWidth:800}}>
    <SH desc="Send mails direkte fra DRYP" tip="Send emails til kunder og leverandører via Resend. Kræver RESEND_API_KEY i Vercel env vars."/>
    <Tabs tabs={[["compose","Skriv"],["sent","Sendt"]]} active={tab} onChange={setTab}/>
    {tab==="compose"&&<Card>
      <Field label="Til" tip="Modtagerens email-adresse"><input type="email" value={to} onChange={e=>setTo(e.target.value)} placeholder="kunde@email.dk"/></Field>
      <Field label="Emne"><input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="DRYP — ..."/></Field>
      <Field label="Besked"><textarea value={body} onChange={e=>setBody(e.target.value)} style={{minHeight:200}} placeholder="Skriv din besked her..."/></Field>
      {status&&<div style={{fontSize:12,color:status.startsWith("✓")?T.ok:T.red,marginBottom:10}}>{status}</div>}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn primary onClick={send} disabled={sending}>{sending?"Sender...":"✉ Send mail"}</Btn></div>
    </Card>}
    {tab==="sent"&&<>{emails.length===0?<Empty text="Ingen sendte mails endnu"/>:emails.map(e=><Card key={e.id} style={{marginBottom:6,padding:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:12,fontWeight:500}}>{e.subject}</div><div style={{fontSize:10,color:T.dim}}>Til: {e.to} · {e.date} {e.time}</div></div><Badge c={T.ok}>{e.status}</Badge></div>
      <div style={{fontSize:11,color:T.mid,marginTop:6,maxHeight:60,overflow:"hidden"}}>{e.body?.slice(0,200)}</div>
    </Card>)}</>}
  </div>
}

// ═══ DOCUMENTS ═══
function Documents({data,update,supabase}){
  const[uploading,setUploading]=useState(false);const[status,setStatus]=useState("")
  const fileRef=useRef(null)
  const docs=data.documents||[]
  const upload=async(e)=>{
    const file=e.target.files?.[0];if(!file)return
    setUploading(true);setStatus("")
    try{
      const ext=file.name.split('.').pop();const path=`team/${uid()}.${ext}`
      const{error}=await supabase.storage.from('team-files').upload(path,file)
      if(error)throw error
      const{data:urlData}=supabase.storage.from('team-files').getPublicUrl(path)
      update("documents",prev=>[{id:uid(),name:file.name,size:file.size,type:file.type,path,url:urlData.publicUrl,uploaded:today(),uploadedBy:"Team"},...(prev||[])])
      setStatus(`✓ ${file.name} uploadet!`)
    }catch(err){setStatus(`Fejl: ${err.message}. Opret 'team-files' bucket i Supabase Storage.`)}
    setUploading(false);if(fileRef.current)fileRef.current.value=""
  }
  const del=async(doc)=>{if(!confirm(`Slet "${doc.name}"?`))return;try{await supabase.storage.from('team-files').remove([doc.path])}catch(e){}update("documents",prev=>(prev||[]).filter(d=>d.id!==doc.id))}
  const fmtSize=(b)=>b>1e6?`${(b/1e6).toFixed(1)} MB`:`${(b/1e3).toFixed(0)} KB`
  const typeIcon=(t)=>t?.includes("sheet")||t?.includes("excel")?"📊":t?.includes("pdf")?"📄":t?.includes("image")?"🖼":"📎"
  return<div style={{maxWidth:800}}>
    <SH desc="Upload og del dokumenter med teamet" tip="Upload Excel, PDF og andre filer. Filer gemmes i Supabase Storage og kan tilgås af hele teamet.">
      <input ref={fileRef} type="file" onChange={upload} style={{display:"none"}} accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"/>
      <Btn primary onClick={()=>fileRef.current?.click()} disabled={uploading}><PlusIcon size={11} color={T.bg}/> {uploading?"Uploader...":"Upload fil"}</Btn>
    </SH>
    {status&&<div style={{fontSize:12,color:status.startsWith("✓")?T.ok:T.red,marginBottom:12}}>{status}</div>}
    {docs.length===0?<Empty text="Ingen dokumenter endnu" action="Upload" onAction={()=>fileRef.current?.click()}/>:docs.map(doc=><Card key={doc.id} style={{marginBottom:6,padding:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>{typeIcon(doc.type)}</span><div><div style={{fontSize:12,fontWeight:500}}>{doc.name}</div><div style={{fontSize:10,color:T.dim}}>{fmtSize(doc.size)} · {doc.uploaded}</div></div></div>
        <div style={{display:"flex",gap:6}}>{doc.url&&<a href={doc.url} target="_blank" rel="noopener" style={{fontSize:11,color:T.acc,textDecoration:"none"}}>↓ Download</a>}<button onClick={()=>del(doc)} style={{background:"none",color:T.red,fontSize:11,cursor:"pointer"}}>✕</button></div>
      </div>
    </Card>)}
  </div>
}

// ═══ SETTINGS ═══
function Settings({data,save}){
  const[confirm1,setConfirm1]=useState(false)
  const clearAll=()=>{save({...data,productions:[],batches:[],customers:[],orders:[],emails:[],documents:[],haccp:{cleaning:[],temps:[],deviations:[],receiving:[],maintenance:[]},team:{pages:[],messages:[]}});setConfirm1(false)}
  const clearSection=(key,empty)=>{if(window.confirm(`Slet alle data i "${key}"?`))save({...data,[key]:empty})}
  return<div style={{maxWidth:700}}>
    <SH desc="App-indstillinger og datahåndtering" tip="Slet mockup-data, ryd sektioner, eller nulstil hele appen."/>
    <Card style={{marginBottom:16}}>
      <div style={{fontSize:13,fontWeight:600,marginBottom:12}}>Slet data pr. sektion</div>
      <div style={{fontSize:11,color:T.dim,marginBottom:14}}>Klik for at slette data i en sektion. Opskrifter, lager og priser bevares.</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {[["productions","Produktioner",[]],["batches","Batches",[]],["customers","Kunder",[]],["orders","Ordrer",[]],["emails","Sendte mails",[]],["documents","Dokumenter",[]]].map(([key,label,empty])=>
          <Btn key={key} small danger onClick={()=>clearSection(key,empty)}>✕ {label} ({(data[key]||[]).length})</Btn>)}
        <Btn small danger onClick={()=>clearSection("haccp",{cleaning:[],temps:[],deviations:[],receiving:[],maintenance:[]})}>✕ HACCP</Btn>
        <Btn small danger onClick={()=>clearSection("team",{pages:[],messages:[]})}>✕ Team</Btn>
      </div>
    </Card>
    <Card style={{marginBottom:16,borderColor:T.red}}>
      <div style={{fontSize:13,fontWeight:600,color:T.red,marginBottom:8}}>⚠ Slet ALT mockup-data</div>
      <div style={{fontSize:11,color:T.dim,marginBottom:14}}>Sletter alt undtagen opskrifter, lagervarer og priser.</div>
      {!confirm1?<Btn danger onClick={()=>setConfirm1(true)}>Ryd alle data</Btn>:
        <div style={{background:"rgba(232,84,84,0.1)",border:`1px solid ${T.red}`,borderRadius:8,padding:14}}>
          <div style={{fontSize:12,fontWeight:600,color:T.red,marginBottom:10}}>Er du sikker? Kan ikke fortrydes.</div>
          <div style={{display:"flex",gap:8}}><Btn danger onClick={clearAll}>Ja, slet</Btn><Btn onClick={()=>setConfirm1(false)}>Annuller</Btn></div>
        </div>}
    </Card>
    <Card>
      <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>App-info</div>
      <div style={{fontSize:11,color:T.mid,lineHeight:1.8}}>
        <div>DRYP Virksomhedsstyring v2.0</div>
        <div>Adgangskontrol via ALLOWED_EMAILS i Vercel env vars</div>
      </div>
    </Card>
  </div>
}
