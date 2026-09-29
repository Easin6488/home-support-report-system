import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  LayoutDashboard, FileText, Ticket, Users, UserCog, Settings,
  LogOut, Plus, Search, Download, Trash2, Edit3, Menu, X,
  RefreshCw, ShieldCheck, CalendarDays, SlidersHorizontal
} from "lucide-react";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";
import "./styles.css";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const nav = [
  ["dashboard","Dashboard",LayoutDashboard],
  ["reports","Daily Reports",FileText],
  ["tickets","Tickets",Ticket],
  ["customers","Customers",Users],
  ["engineers","Engineers",UserCog],
  ["settings","Report Settings",Settings],
];

function App(){
  const [session,setSession]=useState(null);
  const [profile,setProfile]=useState(null);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{
      setSession(data.session);
      if(data.session) loadProfile(data.session.user.id);
      else setLoading(false);
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{
      setSession(s);
      if(s) loadProfile(s.user.id); else {setProfile(null);setLoading(false);}
    });
    return ()=>subscription.unsubscribe();
  },[]);

  async function loadProfile(id){
    const {data,error}=await supabase.from("profiles").select("*").eq("id",id).single();
    if(!error) setProfile(data);
    setLoading(false);
  }
  if(loading) return <div className="center"><div className="spinner"/></div>;
  if(!session) return <Login />;
  if(!profile) return <div className="center card"><b>Profile not found.</b><p>Ask an administrator to create/approve your profile.</p><button onClick={()=>supabase.auth.signOut()}>Sign out</button></div>;
  return <Shell profile={profile} session={session}/>;
}

function Login(){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");
  async function submit(e){
    e.preventDefault(); setBusy(true); setMsg("");
    const {error}=await supabase.auth.signInWithPassword({email,password});
    if(error) setMsg(error.message);
    setBusy(false);
  }
  return <div className="login-page">
    <div className="login-card">
      <div className="brand-mark">HS</div>
      <h1>Home Support</h1><p className="muted">Engineer Report Management System</p>
      <form onSubmit={submit}>
        <label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/></label>
        <label>Password<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/></label>
        {msg && <div className="alert danger">{msg}</div>}
        <button className="primary full" disabled={busy}>{busy?"Signing in...":"Sign in"}</button>
      </form>
      <small className="muted">Use the email/password account created in Supabase Authentication.</small>
    </div>
  </div>
}

function Shell({profile,session}){
  const [page,setPage]=useState("dashboard");
  const [mobile,setMobile]=useState(false);
  const isAdmin=profile.role==="admin";
  const title=nav.find(x=>x[0]===page)?.[1]||"Dashboard";
  return <div className="app">
    <aside className={"sidebar "+(mobile?"open":"")}>
      <div className="side-brand"><div className="brand-mark small">HS</div><div><b>Home Support</b><span>Operations</span></div><button className="icon mobile-close" onClick={()=>setMobile(false)}><X size={20}/></button></div>
      <nav>{nav.filter(n=>n[0]!=="engineers" && n[0]!=="settings" || isAdmin).map(([id,label,Icon])=>
        <button key={id} className={page===id?"active":""} onClick={()=>{setPage(id);setMobile(false)}}><Icon size={18}/>{label}</button>
      )}</nav>
      <div className="side-bottom">
        <div className="user-mini"><div className="avatar">{(profile.full_name||"U").slice(0,1).toUpperCase()}</div><div><b>{profile.full_name}</b><span>{profile.role}</span></div></div>
        <button className="logout" onClick={()=>supabase.auth.signOut()}><LogOut size={17}/> Sign out</button>
      </div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="icon menu-btn" onClick={()=>setMobile(true)}><Menu/></button><div><h2>{title}</h2><span className="muted">{new Date().toLocaleDateString("en-BD",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</span></div><div className="top-user"><ShieldCheck size={17}/>{isAdmin?"Administrator":"Engineer"}</div></header>
      <div className="content">
        {page==="dashboard" && <Dashboard profile={profile}/>}
        {page==="reports" && <Reports profile={profile}/>}
        {page==="tickets" && <Tickets profile={profile}/>}
        {page==="customers" && <Customers profile={profile}/>}
        {page==="engineers" && isAdmin && <Engineers />}
        {page==="settings" && isAdmin && <SettingsPage />}
      </div>
    </main>
  </div>
}

function Dashboard({profile}){
  const [data,setData]=useState({reports:0,tickets:0,customers:0,engineers:0});
  const [recent,setRecent]=useState([]);
  useEffect(()=>{load();},[]);
  async function load(){
    const [r,t,c,e]=await Promise.all([
      supabase.from("daily_reports").select("id",{count:"exact",head:true}),
      supabase.from("tickets").select("id",{count:"exact",head:true}),
      supabase.from("customers").select("id",{count:"exact",head:true}),
      supabase.from("profiles").select("id",{count:"exact",head:true}).eq("role","engineer")
    ]);
    setData({reports:r.count||0,tickets:t.count||0,customers:c.count||0,engineers:e.count||0});
    const {data:x}=await supabase.from("daily_reports").select("*,profiles(full_name)").order("report_date",{ascending:false}).limit(8);
    setRecent(x||[]);
  }
  const cards=[["Daily Reports",data.reports,FileText],["Tickets",data.tickets,Ticket],["Customers",data.customers,Users],["Engineers",data.engineers,UserCog]];
  return <div>
    <div className="welcome"><div><h1>Welcome, {profile.full_name?.split(" ")[0]}</h1><p>Manage your team's daily work and support activities from one place.</p></div><button onClick={load} className="secondary"><RefreshCw size={16}/> Refresh</button></div>
    <div className="stats">{cards.map(([a,b,I])=><div className="stat" key={a}><div className="stat-icon"><I size={21}/></div><div><span>{a}</span><strong>{b}</strong></div></div>)}</div>
    <section className="panel"><div className="panel-head"><div><h3>Recent Daily Reports</h3><p className="muted">Latest submitted reports</p></div></div>
      <ReportTable rows={recent} compact/>
    </section>
  </div>
}

function Reports({profile}){
  const [rows,setRows]=useState([]),[engineers,setEngineers]=useState([]),[filters,setFilters]=useState({q:"",from:"",to:"",engineer:"",sort:"report_date"});
  const [editing,setEditing]=useState(null),[show,setShow]=useState(false);
  const admin=profile.role==="admin";
  useEffect(()=>{load(); supabase.from("profiles").select("id,full_name").eq("role","engineer").eq("status","active").order("full_name").then(({data})=>setEngineers(data||[]));},[]);
  async function load(){
    let q=supabase.from("daily_reports").select("*,profiles(full_name)").order(filters.sort,{ascending:false});
    if(filters.from) q=q.gte("report_date",filters.from);
    if(filters.to) q=q.lte("report_date",filters.to);
    if(filters.engineer) q=q.eq("engineer_id",filters.engineer);
    if(!admin) q=q.eq("engineer_id",profile.id);
    const {data,error}=await q;
    if(!error) setRows(data||[]);
  }
  useEffect(()=>{load()},[filters.from,filters.to,filters.engineer,filters.sort]);
  const filtered=rows.filter(r=>JSON.stringify(r).toLowerCase().includes(filters.q.toLowerCase()));
  function exportExcel(){
    const out=filtered.map(r=>({Date:r.report_date,Engineer:r.profiles?.full_name||"",Resolved:r.resolved,In_Progress:r.in_progress,Waiting:r.waiting,Forward:r.forward_count,In_Call:r.in_call,Out_Call:r.out_call,Partner_Eng_Support:r.partner_eng_support,Physical_Support:r.physical_support,Total:r.total_work,Notes:r.notes||""}));
    const ws=XLSX.utils.json_to_sheet(out), wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Daily Reports"); XLSX.writeFile(wb,"daily-reports.xlsx");
  }
  function exportPdf(){
    const doc=new jsPDF("landscape"); doc.text("Home Support - Daily Reports",14,15);
    autoTable(doc,{head:[["Date","Engineer","Resolved","Progress","Waiting","Forward","In Call","Out Call","Partner/Eng","Physical","Total"]],body:filtered.map(r=>[r.report_date,r.profiles?.full_name||"",r.resolved,r.in_progress,r.waiting,r.forward_count,r.in_call,r.out_call,r.partner_eng_support,r.physical_support,r.total_work])});
    doc.save("daily-reports.pdf");
  }
  return <div><div className="toolbar"><div className="search"><Search size={17}/><input placeholder="Search reports..." value={filters.q} onChange={e=>setFilters({...filters,q:e.target.value})}/></div><button className="secondary" onClick={()=>setShow(true)}><Plus size={16}/> New Report</button><button className="secondary" onClick={exportExcel}><Download size={16}/> Excel</button><button className="secondary" onClick={exportPdf}><Download size={16}/> PDF</button></div>
    <div className="filters"><CalendarDays size={16}/><input type="date" value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value})}/><span>to</span><input type="date" value={filters.to} onChange={e=>setFilters({...filters,to:e.target.value})}/>{admin&&<select value={filters.engineer} onChange={e=>setFilters({...filters,engineer:e.target.value})}><option value="">All Engineers</option>{engineers.map(x=><option key={x.id} value={x.id}>{x.full_name}</option>)}</select>}</div>
    <section className="panel"><div className="panel-head"><div><h3>Daily Reports</h3><p className="muted">{filtered.length} record(s)</p></div></div><ReportTable rows={filtered} onEdit={setEditing} onDelete={async id=>{if(confirm("Delete this report?")){await supabase.from("daily_reports").delete().eq("id",id);load()}}} admin={admin}/></section>
    {(show||editing)&&<ReportForm profile={profile} existing={editing} engineers={engineers} onClose={()=>{setShow(false);setEditing(null)}} onSaved={()=>{setShow(false);setEditing(null);load()}}/>}
  </div>
}

function ReportTable({rows,onEdit,onDelete,admin,compact}){
  return <div className="table-wrap"><table><thead><tr><th>Date</th><th>Engineer</th><th>Resolved</th><th>Progress</th><th>Waiting</th><th>Forward</th><th>In Call</th><th>Out Call</th><th>Partner/Eng</th><th>Physical</th><th>Total</th>{!compact&&<th>Actions</th>}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.report_date}</td><td>{r.profiles?.full_name||"—"}</td><td>{r.resolved}</td><td>{r.in_progress}</td><td>{r.waiting}</td><td>{r.forward_count}</td><td>{r.in_call}</td><td>{r.out_call}</td><td>{r.partner_eng_support}</td><td>{r.physical_support}</td><td><b>{r.total_work}</b></td>{!compact&&<td><div className="actions"><button className="icon" onClick={()=>onEdit?.(r)}><Edit3 size={15}/></button>{(admin)&&<button className="icon danger-text" onClick={()=>onDelete?.(r.id)}><Trash2 size={15}/></button>}</div></td>}</tr>)}{!rows.length&&<tr><td colSpan="12" className="empty">No records found.</td></tr>}</tbody></table></div>
}

function ReportForm({profile,existing,engineers,onClose,onSaved}){
  const [f,setF]=useState({report_date:existing?.report_date||new Date().toISOString().slice(0,10),engineer_id:existing?.engineer_id||profile.id,resolved:existing?.resolved||0,in_progress:existing?.in_progress||0,waiting:existing?.waiting||0,forward_count:existing?.forward_count||0,in_call:existing?.in_call||0,out_call:existing?.out_call||0,partner_eng_support:existing?.partner_eng_support||0,physical_support:existing?.physical_support||0,notes:existing?.notes||""});
  const [busy,setBusy]=useState(false);
  const set=(k,v)=>setF(x=>({...x,[k]:v}));
  const total=["resolved","in_progress","waiting","forward_count","in_call","out_call","partner_eng_support","physical_support"].reduce((a,k)=>a+(Number(f[k])||0),0);
  async function save(e){e.preventDefault();setBusy(true);const payload={...f,total_work:total};let res=existing?await supabase.from("daily_reports").update(payload).eq("id",existing.id):await supabase.from("daily_reports").upsert(payload,{onConflict:"engineer_id,report_date"});setBusy(false);if(res.error) alert(res.error.message); else onSaved();}
  return <Modal title={existing?"Edit Daily Report":"New Daily Report"} onClose={onClose}><form onSubmit={save}><div className="grid2">{profile.role==="admin"&&<label>Engineer<select value={f.engineer_id} onChange={e=>set("engineer_id",e.target.value)}>{engineers.map(x=><option key={x.id} value={x.id}>{x.full_name}</option>)}</select></label>}<label>Date<input type="date" required value={f.report_date} onChange={e=>set("report_date",e.target.value)}/></label></div><div className="work-grid">{[["resolved","Resolved"],["in_progress","In Progress"],["waiting","Waiting"],["forward_count","Forward"],["in_call","In Call"],["out_call","Out Call"],["partner_eng_support","Partner / Eng Support"],["physical_support","Physical Support"]].map(([k,l])=><label key={k}>{l}<input type="number" min="0" value={f[k]} onChange={e=>set(k,e.target.value)}/></label>)}</div><div className="total-box">Total Work <b>{total}</b></div><label>Notes<textarea value={f.notes} onChange={e=>set("notes",e.target.value)} rows="3"/></label><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={busy}>{busy?"Saving...":"Save Report"}</button></div></form></Modal>
}

function Tickets({profile}){
  const [rows,setRows]=useState([]),[q,setQ]=useState(""),[status,setStatus]=useState(""),[show,setShow]=useState(false),[edit,setEdit]=useState(null),[customers,setCustomers]=useState([]);
  useEffect(()=>{load();supabase.from("customers").select("id,name,cid").order("name").then(({data})=>setCustomers(data||[]))},[status]);
  async function load(){let x=supabase.from("tickets").select("*,customers(name,cid),profiles(full_name)").order("created_at",{ascending:false});if(status)x=x.eq("status",status);if(profile.role!=="admin")x=x.eq("engineer_id",profile.id);const {data}=await x;if(data)setRows(data)}
  const filtered=rows.filter(x=>JSON.stringify(x).toLowerCase().includes(q.toLowerCase()));
  return <div><div className="toolbar"><div className="search"><Search size={17}/><input placeholder="Search ticket, CID, customer..." value={q} onChange={e=>setQ(e.target.value)}/></div><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All Status</option><option>Open</option><option>In Progress</option><option>Waiting</option><option>Resolved</option><option>Closed</option></select><button className="primary" onClick={()=>{setEdit(null);setShow(true)}}><Plus size={16}/> New Ticket</button></div><section className="panel"><div className="table-wrap"><table><thead><tr><th>Ticket</th><th>Customer</th><th>Engineer</th><th>Issue</th><th>Status</th><th>Priority</th><th>Created</th><th>Actions</th></tr></thead><tbody>{filtered.map(r=><tr key={r.id}><td><b>{r.ticket_no}</b></td><td>{r.customers?.name}<small>{r.customers?.cid}</small></td><td>{r.profiles?.full_name||"—"}</td><td>{r.issue_type}</td><td><span className={"badge "+r.status.toLowerCase().replaceAll(" ","-")}>{r.status}</span></td><td>{r.priority}</td><td>{new Date(r.created_at).toLocaleDateString()}</td><td><button className="icon" onClick={()=>{setEdit(r);setShow(true)}}><Edit3 size={15}/></button>{profile.role==="admin"&&<button className="icon danger-text" onClick={async()=>{if(confirm("Delete ticket?")){await supabase.from("tickets").delete().eq("id",r.id);load()}}}><Trash2 size={15}/></button>}</td></tr>)}{!filtered.length&&<tr><td colSpan="8" className="empty">No tickets found.</td></tr>}</tbody></table></div></section>{show&&<TicketForm profile={profile} existing={edit} customers={customers} onClose={()=>setShow(false)} onSaved={()=>{setShow(false);load()}}/>}</div>
}

function TicketForm({profile,existing,customers,onClose,onSaved}){
  const [f,setF]=useState({ticket_no:existing?.ticket_no||"T-"+Date.now().toString().slice(-7),customer_id:existing?.customer_id||"",issue_type:existing?.issue_type||"",description:existing?.description||"",status:existing?.status||"Open",priority:existing?.priority||"Normal",engineer_id:existing?.engineer_id||profile.id});
  const set=(k,v)=>setF(x=>({...x,[k]:v}));
  async function save(e){e.preventDefault();let res=existing?await supabase.from("tickets").update(f).eq("id",existing.id):await supabase.from("tickets").insert(f);if(res.error)alert(res.error.message);else onSaved()}
  return <Modal title={existing?"Edit Ticket":"New Ticket"} onClose={onClose}><form onSubmit={save}><div className="grid2"><label>Ticket No<input value={f.ticket_no} onChange={e=>set("ticket_no",e.target.value)} required/></label><label>Customer<select value={f.customer_id} onChange={e=>set("customer_id",e.target.value)}><option value="">Select customer</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name} — {c.cid}</option>)}</select></label><label>Issue Type<input value={f.issue_type} onChange={e=>set("issue_type",e.target.value)} required/></label><label>Status<select value={f.status} onChange={e=>set("status",e.target.value)}>{["Open","In Progress","Waiting","Resolved","Closed"].map(x=><option key={x}>{x}</option>)}</select></label><label>Priority<select value={f.priority} onChange={e=>set("priority",e.target.value)}><option>Low</option><option>Normal</option><option>High</option><option>Urgent</option></select></label></div><label>Description<textarea value={f.description} onChange={e=>set("description",e.target.value)} rows="5"/></label><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary">Save Ticket</button></div></form></Modal>
}

function Customers({profile}){
  const [rows,setRows]=useState([]),[q,setQ]=useState(""),[show,setShow]=useState(false),[edit,setEdit]=useState(null);
  useEffect(()=>load(),[]);
  async function load(){const {data}=await supabase.from("customers").select("*").order("created_at",{ascending:false});setRows(data||[])}
  const filtered=rows.filter(x=>JSON.stringify(x).toLowerCase().includes(q.toLowerCase()));
  return <div><div className="toolbar"><div className="search"><Search size={17}/><input placeholder="Search customer / CID / mobile..." value={q} onChange={e=>setQ(e.target.value)}/></div><button className="primary" onClick={()=>{setEdit(null);setShow(true)}}><Plus size={16}/> Add Customer</button></div><section className="panel"><div className="table-wrap"><table><thead><tr><th>CID</th><th>Customer</th><th>Mobile</th><th>Package</th><th>POP</th><th>Address</th><th>Actions</th></tr></thead><tbody>{filtered.map(r=><tr key={r.id}><td><b>{r.cid}</b></td><td>{r.name}</td><td>{r.mobile||"—"}</td><td>{r.package_name||"—"}</td><td>{r.pop||"—"}</td><td>{r.address||"—"}</td><td><button className="icon" onClick={()=>{setEdit(r);setShow(true)}}><Edit3 size={15}/></button>{profile.role==="admin"&&<button className="icon danger-text" onClick={async()=>{if(confirm("Delete customer?")){await supabase.from("customers").delete().eq("id",r.id);load()}}}><Trash2 size={15}/></button>}</td></tr>)}{!filtered.length&&<tr><td colSpan="7" className="empty">No customers found.</td></tr>}</tbody></table></div></section>{show&&<CustomerForm existing={edit} onClose={()=>setShow(false)} onSaved={()=>{setShow(false);load()}}/>}</div>
}

function CustomerForm({existing,onClose,onSaved}){
 const [f,setF]=useState({cid:existing?.cid||"",name:existing?.name||"",mobile:existing?.mobile||"",package_name:existing?.package_name||"",pop:existing?.pop||"",address:existing?.address||"",onu_mac:existing?.onu_mac||"",olt_name:existing?.olt_name||""});
 const set=(k,v)=>setF(x=>({...x,[k]:v}));
 async function save(e){e.preventDefault();const res=existing?await supabase.from("customers").update(f).eq("id",existing.id):await supabase.from("customers").insert(f);if(res.error)alert(res.error.message);else onSaved()}
 return <Modal title={existing?"Edit Customer":"Add Customer"} onClose={onClose}><form onSubmit={save}><div className="grid2"><label>CID<input required value={f.cid} onChange={e=>set("cid",e.target.value)}/></label><label>Name<input required value={f.name} onChange={e=>set("name",e.target.value)}/></label><label>Mobile<input value={f.mobile} onChange={e=>set("mobile",e.target.value)}/></label><label>Package<input value={f.package_name} onChange={e=>set("package_name",e.target.value)}/></label><label>POP<input value={f.pop} onChange={e=>set("pop",e.target.value)}/></label><label>ONU MAC<input value={f.onu_mac} onChange={e=>set("onu_mac",e.target.value)}/></label><label>OLT<input value={f.olt_name} onChange={e=>set("olt_name",e.target.value)}/></label></div><label>Address<textarea value={f.address} onChange={e=>set("address",e.target.value)} rows="3"/></label><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary">Save Customer</button></div></form></Modal>
}

function Engineers(){
 const [rows,setRows]=useState([]),[show,setShow]=useState(false),[edit,setEdit]=useState(null);
 useEffect(()=>load(),[]);
 async function load(){const {data}=await supabase.from("profiles").select("*").order("full_name");setRows(data||[])}
 async function saveStatus(r){const s=r.status==="active"?"inactive":"active";await supabase.from("profiles").update({status:s}).eq("id",r.id);load()}
 return <div><div className="toolbar"><div><h3>Engineer Directory</h3><p className="muted">Manage team profiles and access roles.</p></div><button className="primary" onClick={()=>{setEdit(null);setShow(true)}}><Plus size={16}/> Add Engineer</button></div><section className="panel"><div className="table-wrap"><table><thead><tr><th>Engineer</th><th>Email</th><th>Department</th><th>Designation</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><b>{r.full_name}</b><small>{r.employee_id||""}</small></td><td>{r.email}</td><td>{r.department||"—"}</td><td>{r.designation||"—"}</td><td>{r.role}</td><td><span className={"badge "+r.status}>{r.status}</span></td><td><button className="icon" onClick={()=>{setEdit(r);setShow(true)}}><Edit3 size={15}/></button><button className="secondary tiny" onClick={()=>saveStatus(r)}>{r.status==="active"?"Deactivate":"Activate"}</button></td></tr>)}</tbody></table></div></section>{show&&<EngineerForm existing={edit} onClose={()=>setShow(false)} onSaved={()=>{setShow(false);load()}}/>}</div>
}

function EngineerForm({existing,onClose,onSaved}){
 const [f,setF]=useState({id:existing?.id||"",full_name:existing?.full_name||"",email:existing?.email||"",employee_id:existing?.employee_id||"",department:existing?.department||"Home Support",designation:existing?.designation||"Engineer",role:existing?.role||"engineer",status:existing?.status||"active"});
 const set=(k,v)=>setF(x=>({...x,[k]:v}));
 async function save(e){e.preventDefault();if(!f.id){alert("Create the login user first in Supabase Authentication, then add the user's UUID here.");return}const {error}=await supabase.from("profiles").upsert(f);if(error)alert(error.message);else onSaved()}
 return <Modal title={existing?"Edit Engineer":"Add Engineer Profile"} onClose={onClose}><form onSubmit={save}><div className="grid2"><label>Auth User UUID<input required value={f.id} onChange={e=>set("id",e.target.value)} placeholder="Supabase Auth user UUID"/></label><label>Full Name<input required value={f.full_name} onChange={e=>set("full_name",e.target.value)}/></label><label>Email<input type="email" required value={f.email} onChange={e=>set("email",e.target.value)}/></label><label>Employee ID<input value={f.employee_id} onChange={e=>set("employee_id",e.target.value)}/></label><label>Department<input value={f.department} onChange={e=>set("department",e.target.value)}/></label><label>Designation<input value={f.designation} onChange={e=>set("designation",e.target.value)}/></label><label>Role<select value={f.role} onChange={e=>set("role",e.target.value)}><option value="engineer">Engineer</option><option value="admin">Admin</option></select></label><label>Status<select value={f.status} onChange={e=>set("status",e.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option></select></label></div><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary">Save Profile</button></div></form></Modal>
}

function SettingsPage(){
 const [cols,setCols]=useState([]),[name,setName]=useState("");
 useEffect(()=>load(),[]);
 async function load(){const {data}=await supabase.from("report_columns").select("*").order("sort_order");setCols(data||[])}
 async function add(){if(!name.trim())return;await supabase.from("report_columns").insert({column_key:name.toLowerCase().replaceAll(" ","_"),label:name,sort_order:cols.length+1});setName("");load()}
 async function toggle(c){await supabase.from("report_columns").update({is_visible:!c.is_visible}).eq("id",c.id);load()}
 async function del(c){if(confirm("Delete this customization?")){await supabase.from("report_columns").delete().eq("id",c.id);load()}}
 return <div><section className="panel"><div className="panel-head"><div><h3>Report Sheet Customization</h3><p className="muted">Control which standard columns are visible in the report configuration.</p></div></div><div className="add-column"><input value={name} onChange={e=>setName(e.target.value)} placeholder="New column label"/><button className="primary" onClick={add}><Plus size={16}/> Add Column</button></div><div className="settings-list">{cols.map(c=><div className="setting-row" key={c.id}><SlidersHorizontal size={17}/><div><b>{c.label}</b><small>{c.column_key}</small></div><span className="grow"/><button className={"toggle "+(c.is_visible?"on":"")} onClick={()=>toggle(c)}>{c.is_visible?"Visible":"Hidden"}</button><button className="icon danger-text" onClick={()=>del(c)}><Trash2 size={16}/></button></div>)}</div></section></div>
}

function Modal({title,onClose,children}){
 return <div className="overlay"><div className="modal"><div className="modal-head"><h3>{title}</h3><button className="icon" onClick={onClose}><X/></button></div>{children}</div></div>
}

createRoot(document.getElementById("root")).render(<App/>);
