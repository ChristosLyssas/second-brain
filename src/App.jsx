import { useState, useEffect, useCallback, useRef } from "react";
import { auth, goalsDB, notesDB, txnsDB } from "./lib/supabase";
import { supabase } from "./lib/supabase";
import AuthScreen from "./AuthScreen";

let Analytics = () => null;
try { const mod = await import("@vercel/analytics/react").catch(()=>null); if(mod) Analytics=mod.Analytics; } catch {}

// ─── i18n ──────────────────────────────────────────────────────────────────────
const T = {
  el: {
    appTitle:["Second","Brain"], dateLocale:"el-GR",
    goals:"Στόχοι", notes:"Σημειώσεις",
    tabs:{ goals:"🎯 Goals", whisperer:"🌀 Whisperer", budget:"💸 Budget", calendar:"📅 Calendar", profile:"👤 Profile" },
    allAreas:"Όλα", newGoal:"+ Νέος Στόχος", newGoalTitle:"Νέος Στόχος",
    goalPlaceholder:"Τίτλος στόχου...", duePlaceholder:"Προθεσμία (π.χ. Ιούν 2026)",
    add:"Προσθήκη", cancel:"Άκυρο", save:"Αποθήκευση ↵", edit:"Επεξεργασία", saveEdit:"Αποθήκευση", deleteGoal:"Διαγραφή",
    priority:{ high:"Υψηλή", medium:"Μέτρια", low:"Χαμηλή" },
    priorityLabel:"Προτεραιότητα", dueLabel:"Προθεσμία", stepsLabel:"Βήματα", progressLabel:"Πρόοδος",
    areas:["Ανάπτυξη","Υγεία","Γνώση","Δημιουργία","Οικονομικά"],
    quickCapture:"⚡ Quick Capture", capturePlaceholder:"Πέτα μια ιδέα, σκέψη, reminder...",
    tagsPlaceholder:"Tags: ιδέα, tech, δουλειά", searchPlaceholder:"Αναζήτηση...",
    clear:"✕", notesCount:(n)=>`${n} σημειώσεις`, noNotes:"Δεν βρέθηκαν σημειώσεις",
    editNote:"Επεξεργασία",
    income:"Εισόδημα", expenses:"Έξοδα", balance:"Υπόλοιπο", savings:"Αποταμίευση",
    available:"Διαθέσιμο", fixed:"Πάγια",
    newTransaction:"+ Νέα Κίνηση", descPlaceholder:"Περιγραφή...", amountPlaceholder:"Ποσό (€)",
    expenseOpt:"Έξοδο", incomeOpt:"Έσοδο", fixedOpt:"Πάγιο Έξοδο",
    allFilter:"Όλα", incomeFilter:"Έσοδα", expenseFilter:"Έξοδα", fixedFilter:"Πάγια",
    breakdown:"Κατανομή Εξόδων", savingsGoal:"Στόχος Αποταμίευσης",
    savingsOf:(r,t)=>`${r}% του εισοδήματος · στόχος ${t}%`,
    noExpenses:"Δεν υπάρχουν έξοδα", fixedTotal:"Σύνολο Παγίων", afterFixed:"Μετά τα Πάγια",
    budgetCategories:["Κατοικία","Τρόφιμα","Φαγητό","Μεταφορά","Υγεία","Συνδρομές","Ψυχαγωγία","Άλλο","Εισόδημα"],
    catEmoji:{"Κατοικία":"🏠","Τρόφιμα":"🛒","Φαγητό":"🍽","Μεταφορά":"🚗","Υγεία":"💪","Συνδρομές":"📺","Εισόδημα":"💼","Ψυχαγωγία":"🎮","Άλλο":"💸"},
    monthLabel:"Μαρτίου 2026", signOut:"↩ Έξοδος",
    calTitle:"Ημερολόγιο", noDeadlines:"Δεν υπάρχουν deadlines αυτό τον μήνα",
    today:"Σήμερα", upcoming:"Επερχόμενα",
    profileTitle:"Προφίλ", displayName:"Εμφανιζόμενο Όνομα", emailLabel:"Email",
    changePassword:"Αλλαγή Password", newPassword:"Νέο Password", confirmPassword:"Επιβεβαίωση",
    updateProfile:"Ενημέρωση Προφίλ", profileSaved:"Αποθηκεύτηκε!", uploadAvatar:"Αλλαγή φωτογραφίας",
    savingsTarget:"Στόχος %",
  },
  en: {
    appTitle:["Second","Brain"], dateLocale:"en-GB",
    goals:"Goals", notes:"Notes",
    tabs:{ goals:"🎯 Goals", whisperer:"🌀 Whisperer", budget:"💸 Budget", calendar:"📅 Calendar", profile:"👤 Profile" },
    allAreas:"All", newGoal:"+ New Goal", newGoalTitle:"New Goal",
    goalPlaceholder:"Goal title...", duePlaceholder:"Due date (e.g. Jun 2026)",
    add:"Add", cancel:"Cancel", save:"Save ↵", edit:"Edit", saveEdit:"Save", deleteGoal:"Delete",
    priority:{ high:"High", medium:"Medium", low:"Low" },
    priorityLabel:"Priority", dueLabel:"Due Date", stepsLabel:"Steps", progressLabel:"Progress",
    areas:["Development","Health","Knowledge","Creativity","Finance"],
    quickCapture:"⚡ Quick Capture", capturePlaceholder:"Drop an idea, thought, reminder...",
    tagsPlaceholder:"Tags: idea, tech, work", searchPlaceholder:"Search...",
    clear:"✕", notesCount:(n)=>`${n} notes`, noNotes:"No notes found",
    editNote:"Edit",
    income:"Income", expenses:"Expenses", balance:"Balance", savings:"Savings",
    available:"Available", fixed:"Fixed",
    newTransaction:"+ New Transaction", descPlaceholder:"Description...", amountPlaceholder:"Amount (€)",
    expenseOpt:"Expense", incomeOpt:"Income", fixedOpt:"Fixed Expense",
    allFilter:"All", incomeFilter:"Income", expenseFilter:"Expenses", fixedFilter:"Fixed",
    breakdown:"Expense Breakdown", savingsGoal:"Savings Goal",
    savingsOf:(r,t)=>`${r}% of income · target ${t}%`,
    noExpenses:"No expenses yet", fixedTotal:"Total Fixed", afterFixed:"After Fixed",
    budgetCategories:["Housing","Groceries","Dining","Transport","Health","Subscriptions","Entertainment","Other","Income"],
    catEmoji:{"Housing":"🏠","Groceries":"🛒","Dining":"🍽","Transport":"🚗","Health":"💪","Subscriptions":"📺","Income":"💼","Entertainment":"🎮","Other":"💸"},
    monthLabel:"March 2026", signOut:"↩ Sign Out",
    calTitle:"Calendar", noDeadlines:"No deadlines this month",
    today:"Today", upcoming:"Upcoming",
    profileTitle:"Profile", displayName:"Display Name", emailLabel:"Email",
    changePassword:"Change Password", newPassword:"New Password", confirmPassword:"Confirm Password",
    updateProfile:"Update Profile", profileSaved:"Saved!", uploadAvatar:"Change photo",
    savingsTarget:"Target %",
  },
};

const AREA_COLORS = {
  "Ανάπτυξη":"#60a5fa","Υγεία":"#34d399","Γνώση":"#fbbf24","Δημιουργία":"#f472b6","Οικονομικά":"#a78bfa",
  "Development":"#60a5fa","Health":"#34d399","Knowledge":"#fbbf24","Creativity":"#f472b6","Finance":"#a78bfa",
};
const CAT_COLORS = {
  "Κατοικία":"#60a5fa","Τρόφιμα":"#34d399","Φαγητό":"#fbbf24","Μεταφορά":"#fb923c","Υγεία":"#f472b6","Συνδρομές":"#a78bfa","Ψυχαγωγία":"#22d3ee","Άλλο":"#94a3b8","Εισόδημα":"#34d399",
  "Housing":"#60a5fa","Groceries":"#34d399","Dining":"#fbbf24","Transport":"#fb923c","Health":"#f472b6","Subscriptions":"#a78bfa","Entertainment":"#22d3ee","Other":"#94a3b8","Income":"#34d399",
};
const TAG_PALETTE = ["#60a5fa","#34d399","#fbbf24","#f472b6","#a78bfa","#22d3ee","#f87171","#fb923c"];
function tagColor(tag){ let h=0; for(let c of tag) h=(h*31+c.charCodeAt(0))%TAG_PALETTE.length; return TAG_PALETTE[h]; }

const DARK  = { bg:"#080f1a",surface:"#0c1525",border:"#1e293b",borderStrong:"#334155",text:"#f1f5f9",textMuted:"#64748b",textDim:"#334155",input:"#1e293b",ring:"#1e293b",scrollThumb:"#1e293b",pinBg:"#0f0a1e",pinBorder:"#7c3aed66" };
const LIGHT = { bg:"#f0f4ff",surface:"#ffffff",border:"#e2e8f0",borderStrong:"#cbd5e1",text:"#0f172a",textMuted:"#64748b",textDim:"#cbd5e1",input:"#f8fafc",ring:"#e2e8f0",scrollThumb:"#cbd5e1",pinBg:"#faf5ff",pinBorder:"#a78bfa88" };

// ─── useSupabaseData ───────────────────────────────────────────────────────────
function useSupabaseData(dbHelpers, userId, localKey) {
  const [data, setDataRaw] = useState(()=>{ try{ const s=localStorage.getItem(localKey); return s?JSON.parse(s):[]; }catch{ return []; } });
  const [loading, setLoading] = useState(true);
  const setData = useCallback((v)=>{ setDataRaw(prev=>{ const next=typeof v==="function"?v(prev):v; try{ localStorage.setItem(localKey,JSON.stringify(next)); }catch{} return next; }); },[localKey]);
  useEffect(()=>{ if(!userId){ setLoading(false); return; } setLoading(true); dbHelpers.fetch(userId).then(rows=>{ setData(rows); setLoading(false); }).catch(err=>{ console.error(err); setLoading(false); }); },[userId]); // eslint-disable-line
  return [data,setData,loading];
}

// ─── ProgressRing ──────────────────────────────────────────────────────────────
function ProgressRing({ progress, color, size=60, theme }) {
  const r=(size-10)/2, circ=2*Math.PI*r, offset=circ-(progress/100)*circ;
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)", flexShrink:0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={theme.ring} strokeWidth={6}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition:"stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1)" }}/>
      <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle" style={{ transform:`rotate(90deg) translate(0,-${size}px)`, transformOrigin:`${size/2}px ${size/2}px`, fill:theme.text, fontSize:12, fontWeight:700, fontFamily:"inherit" }}>{progress}%</text>
    </svg>
  );
}

function FadeCard({ children, style, className, onClick }) {
  const [vis,setVis]=useState(false);
  useEffect(()=>{ const t=setTimeout(()=>setVis(true),30); return ()=>clearTimeout(t); },[]);
  return <div className={className} onClick={onClick} style={{ ...style, opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(10px)", transition:"opacity 0.3s ease,transform 0.3s ease,box-shadow 0.18s,border-color 0.18s,background 0.18s" }}>{children}</div>;
}

// ─── GOALS TAB ────────────────────────────────────────────────────────────────
function GoalsTab({ theme, isDark, lang, goals, setGoals }) {
  const t = T[lang];
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newGoal, setNewGoal] = useState({ title:"", areaIdx:0, priority:"high", due:"", progress:0 });
  const [editDraft, setEditDraft] = useState({});

  const areaName = (idx) => t.areas[idx] ?? t.areas[0];
  const goalTitle = (g) => lang==="el" ? g.titleEl : g.titleEn;
  const filtered = filter==="all" ? goals : goals.filter(g=>g.areaIdx===parseInt(filter));
  const sel = selected ? goals.find(g=>g.id===selected.id) : null;

  function addGoal() {
    if (!newGoal.title.trim()) return;
    setGoals([...goals, { id:Date.now(), areaIdx:newGoal.areaIdx, priority:newGoal.priority, progress:0, due:newGoal.due, tasks:[], titleEl:newGoal.title, titleEn:newGoal.title }]);
    setNewGoal({ title:"", areaIdx:0, priority:"high", due:"", progress:0 });
    setAdding(false);
  }

  function startEdit() {
    if (!sel) return;
    setEditDraft({ title:goalTitle(sel), areaIdx:sel.areaIdx, priority:sel.priority, due:sel.due||"" });
    setEditing(true);
  }

  function saveEdit() {
    if (!sel) return;
    setGoals(goals.map(g => g.id===sel.id ? { ...g, titleEl:editDraft.title, titleEn:editDraft.title, areaIdx:editDraft.areaIdx, priority:editDraft.priority, due:editDraft.due } : g));
    setEditing(false);
  }

  const iStyle = { background:theme.input, border:`1px solid ${theme.borderStrong}`, borderRadius:8, padding:"10px 14px", color:theme.text, fontSize:14, fontFamily:"inherit" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, height:"100%", minHeight:0 }}>
      {/* Filter row */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", flexShrink:0 }}>
        <button onClick={()=>setFilter("all")} style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${filter==="all"?"#60a5fa":theme.border}`, background:filter==="all"?"#60a5fa22":"transparent", color:filter==="all"?"#60a5fa":theme.textMuted, fontSize:13, fontFamily:"inherit", cursor:"pointer", transition:"all 0.18s", fontWeight:filter==="all"?600:400 }}>{t.allAreas}</button>
        {t.areas.map((a,i)=>{ const color=AREA_COLORS[a]||"#60a5fa", active=filter===String(i); return <button key={i} onClick={()=>setFilter(String(i))} style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${active?color:theme.border}`, background:active?color+"22":"transparent", color:active?color:theme.textMuted, fontSize:13, fontFamily:"inherit", cursor:"pointer", transition:"all 0.18s", fontWeight:active?600:400 }}>{a}</button>; })}
        <button onClick={()=>setAdding(true)} style={{ marginLeft:"auto", padding:"6px 16px", borderRadius:20, border:`1px solid ${isDark?"#1d4ed8":"#3b82f6"}`, background:isDark?"#1e3a8a":"#eff6ff", color:isDark?"#93c5fd":"#2563eb", fontSize:13, fontFamily:"inherit", cursor:"pointer", fontWeight:500 }}>{t.newGoal}</button>
      </div>

      <div style={{ flex:1, minHeight:0, display:"grid", gridTemplateColumns:sel?"1fr min(380px,42%)":"1fr", gap:16, transition:"grid-template-columns 0.3s" }}>
        {/* Goals grid */}
        <div style={{ overflowY:"auto", minHeight:0, WebkitOverflowScrolling:"touch", overscrollBehavior:"contain" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))", gap:14, alignContent:"start", paddingBottom:16 }}>
            {adding && (
              <div style={{ background:theme.surface, border:`1px solid ${isDark?"#1d4ed8":"#93c5fd"}`, borderRadius:16, padding:20, gridColumn:"1/-1", animation:"slideDown 0.2s ease" }}>
                <div style={{ fontSize:11, color:"#60a5fa", letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:14, fontWeight:600 }}>{t.newGoalTitle}</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <input placeholder={t.goalPlaceholder} value={newGoal.title} onChange={e=>setNewGoal({...newGoal,title:e.target.value})} style={{ ...iStyle, gridColumn:"1/-1", width:"100%" }}/>
                  <select value={newGoal.areaIdx} onChange={e=>setNewGoal({...newGoal,areaIdx:parseInt(e.target.value)})} style={iStyle}>{t.areas.map((a,i)=><option key={i} value={i}>{a}</option>)}</select>
                  <select value={newGoal.priority} onChange={e=>setNewGoal({...newGoal,priority:e.target.value})} style={iStyle}>
                    <option value="high">{t.priority.high}</option><option value="medium">{t.priority.medium}</option><option value="low">{t.priority.low}</option>
                  </select>
                  {/* Deadline: native date picker */}
                  <input type="date" value={newGoal.due} onChange={e=>setNewGoal({...newGoal,due:e.target.value})} style={{ ...iStyle, gridColumn:"1/-1", width:"100%", colorScheme:isDark?"dark":"light" }}/>
                </div>
                <div style={{ display:"flex", gap:8, marginTop:14 }}>
                  <button onClick={addGoal} style={{ flex:1, padding:"10px", background:"#2563eb", border:"none", borderRadius:8, color:"#fff", fontSize:13, fontFamily:"inherit", cursor:"pointer", fontWeight:600 }}>{t.add}</button>
                  <button onClick={()=>setAdding(false)} style={{ padding:"10px 18px", background:theme.input, border:`1px solid ${theme.borderStrong}`, borderRadius:8, color:theme.textMuted, fontSize:13, fontFamily:"inherit", cursor:"pointer" }}>{t.cancel}</button>
                </div>
              </div>
            )}
            {filtered.map((goal)=>{
              const color=AREA_COLORS[areaName(goal.areaIdx)]||"#60a5fa", isSel=sel?.id===goal.id;
              const dueDate = goal.due ? new Date(goal.due) : null;
              const isOverdue = dueDate && dueDate < new Date() && goal.progress < 100;
              return (
                <FadeCard key={goal.id} className="goal-card" onClick={()=>{ setSelected(isSel?null:goal); setEditing(false); }}
                  style={{ background:isSel?(isDark?"#0c1e3d":"#eff6ff"):theme.surface, border:`1px solid ${isSel?color+"99":isOverdue?"#f8717144":theme.border}`, borderRadius:16, padding:"20px 20px 16px", position:"relative", boxShadow:isSel?`0 0 0 1px ${color}33,0 6px 30px ${color}18`:"none" }}>
                  <button className="del-btn" onClick={e=>{e.stopPropagation();setGoals(goals.filter(g=>g.id!==goal.id));if(sel?.id===goal.id)setSelected(null);}} style={{ position:"absolute",top:12,right:12,background:theme.input,border:"none",borderRadius:6,color:"#f87171",fontSize:15,cursor:"pointer",padding:"2px 8px" }}>×</button>
                  <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
                    <ProgressRing progress={goal.progress} color={color} theme={theme}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:16, fontWeight:600, color:theme.text, lineHeight:1.35, marginBottom:6 }}>{goalTitle(goal)}</div>
                      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                        <span style={{ fontSize:12, padding:"3px 10px", borderRadius:10, background:color+"20", color, fontWeight:500 }}>{areaName(goal.areaIdx)}</span>
                        <span style={{ fontSize:12, padding:"3px 10px", borderRadius:10, background:goal.priority==="high"?"#f8717120":goal.priority==="medium"?"#fbbf2420":"#34d39920", color:goal.priority==="high"?"#f87171":goal.priority==="medium"?"#fbbf24":"#34d399", fontWeight:500 }}>{t.priority[goal.priority]}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ height:4, background:theme.ring, borderRadius:2, marginBottom:10, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${goal.progress}%`, background:color, borderRadius:2, transition:"width 0.6s cubic-bezier(.4,0,.2,1)" }}/>
                  </div>
                  <div style={{ fontSize:13, color:isOverdue?"#f87171":theme.textMuted }}>
                    📅 {goal.due ? new Date(goal.due).toLocaleDateString(T[lang].dateLocale,{day:"numeric",month:"short",year:"numeric"}) : "—"}
                    {isOverdue && " ⚠️"}
                  </div>
                </FadeCard>
              );
            })}
          </div>
        </div>

        {/* Detail / Edit panel */}
        {sel && (
          <div style={{ overflowY:"auto", minHeight:0, WebkitOverflowScrolling:"touch" }}>
            <div style={{ background:theme.surface, border:`1px solid ${AREA_COLORS[areaName(sel.areaIdx)]||theme.border}44`, borderRadius:16, padding:26, animation:"slideIn 0.22s ease" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                <span style={{ fontSize:11, color:AREA_COLORS[areaName(sel.areaIdx)], letterSpacing:"0.18em", textTransform:"uppercase", fontWeight:600 }}>{areaName(sel.areaIdx)}</span>
                <div style={{ display:"flex", gap:8 }}>
                  {!editing && <button onClick={startEdit} style={{ background:theme.input, border:`1px solid ${theme.border}`, borderRadius:8, color:theme.textMuted, cursor:"pointer", fontSize:12, padding:"4px 12px", fontFamily:"inherit" }}>✏️ {t.edit}</button>}
                  <button onClick={()=>{ setSelected(null); setEditing(false); }} style={{ background:"none", border:"none", color:theme.textMuted, cursor:"pointer", fontSize:20 }}>×</button>
                </div>
              </div>

              {editing ? (
                // ── Edit mode ──
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  <input value={editDraft.title} onChange={e=>setEditDraft({...editDraft,title:e.target.value})} style={{ ...iStyle, fontSize:18, fontWeight:600, fontFamily:"'Syne',sans-serif" }}/>
                  <select value={editDraft.areaIdx} onChange={e=>setEditDraft({...editDraft,areaIdx:parseInt(e.target.value)})} style={iStyle}>{t.areas.map((a,i)=><option key={i} value={i}>{a}</option>)}</select>
                  <select value={editDraft.priority} onChange={e=>setEditDraft({...editDraft,priority:e.target.value})} style={iStyle}>
                    <option value="high">{t.priority.high}</option><option value="medium">{t.priority.medium}</option><option value="low">{t.priority.low}</option>
                  </select>
                  <input type="date" value={editDraft.due} onChange={e=>setEditDraft({...editDraft,due:e.target.value})} style={{ ...iStyle, colorScheme:isDark?"dark":"light" }}/>
                  <div style={{ display:"flex", gap:8, marginTop:6 }}>
                    <button onClick={saveEdit} style={{ flex:1, padding:"10px", background:"#2563eb", border:"none", borderRadius:8, color:"#fff", fontSize:13, fontFamily:"inherit", cursor:"pointer", fontWeight:600 }}>{t.saveEdit}</button>
                    <button onClick={()=>setEditing(false)} style={{ padding:"10px 16px", background:theme.input, border:`1px solid ${theme.borderStrong}`, borderRadius:8, color:theme.textMuted, fontSize:13, fontFamily:"inherit", cursor:"pointer" }}>{t.cancel}</button>
                  </div>
                  <button onClick={()=>{ setGoals(goals.filter(g=>g.id!==sel.id)); setSelected(null); setEditing(false); }} style={{ padding:"9px", background:"#f8717115", border:"1px solid #f8717144", borderRadius:8, color:"#f87171", fontSize:13, fontFamily:"inherit", cursor:"pointer" }}>🗑 {t.deleteGoal}</button>
                </div>
              ) : (
                // ── View mode ──
                <>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:theme.text, lineHeight:1.25, marginBottom:22 }}>{goalTitle(sel)}</div>
                  <div style={{ display:"flex", justifyContent:"center", marginBottom:22 }}>
                    <ProgressRing progress={sel.progress} color={AREA_COLORS[areaName(sel.areaIdx)]||"#60a5fa"} size={110} theme={theme}/>
                  </div>
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:11, color:theme.textMuted, marginBottom:10, letterSpacing:"0.15em", textTransform:"uppercase", fontWeight:600 }}>{t.progressLabel}</div>
                    <input type="range" min={0} max={100} value={sel.progress} onChange={e=>setGoals(goals.map(g=>g.id===sel.id?{...g,progress:Number(e.target.value)}:g))} style={{ width:"100%", accentColor:AREA_COLORS[areaName(sel.areaIdx)]||"#60a5fa" }}/>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
                    {[
                      { label:t.dueLabel, value: sel.due ? new Date(sel.due).toLocaleDateString(T[lang].dateLocale,{day:"numeric",month:"short",year:"numeric"}) : "—" },
                      { label:t.priorityLabel, value:t.priority[sel.priority] }
                    ].map(m=>(
                      <div key={m.label} style={{ background:theme.input, borderRadius:10, padding:"12px 14px", border:`1px solid ${theme.border}` }}>
                        <div style={{ fontSize:11, color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:5, fontWeight:600 }}>{m.label}</div>
                        <div style={{ fontSize:15, color:theme.text, fontWeight:500 }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                  {sel.tasks?.length>0 && (
                    <div>
                      <div style={{ fontSize:11, color:theme.textMuted, letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:12, fontWeight:600 }}>{t.stepsLabel}</div>
                      {sel.tasks.map((task,i)=>(
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${theme.border}` }}>
                          <div style={{ width:7, height:7, borderRadius:"50%", background:AREA_COLORS[areaName(sel.areaIdx)]||"#60a5fa", flexShrink:0 }}/>
                          <span style={{ fontSize:14, color:theme.textMuted }}>{task}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CALENDAR TAB ─────────────────────────────────────────────────────────────
function CalendarTab({ theme, isDark, lang, goals, setTab, setSelectedGoal }) {
  const t = T[lang];
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month+1, 0).getDate();

  // Map goals with valid date deadlines
  const goalsByDay = {};
  goals.forEach(g => {
    if (!g.due) return;
    const d = new Date(g.due);
    if (d.getFullYear()===year && d.getMonth()===month) {
      const day = d.getDate();
      if (!goalsByDay[day]) goalsByDay[day] = [];
      goalsByDay[day].push(g);
    }
  });

  // Upcoming deadlines (next 30 days)
  const upcoming = goals
    .filter(g => g.due && g.progress < 100)
    .map(g => ({ ...g, dueDate: new Date(g.due) }))
    .filter(g => g.dueDate >= today)
    .sort((a,b) => a.dueDate - b.dueDate)
    .slice(0, 8);

  const dayNames = lang==="el"
    ? ["Κυρ","Δευ","Τρι","Τετ","Πεμ","Παρ","Σαβ"]
    : ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const monthName = viewDate.toLocaleDateString(T[lang].dateLocale, { month:"long", year:"numeric" });

  const areaName = (idx) => T[lang].areas[idx] ?? T[lang].areas[0];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, height:"100%", minHeight:0 }}>
      <div style={{ flex:1, minHeight:0, display:"grid", gridTemplateColumns:"1fr min(320px,38%)", gap:16 }}>

        {/* Calendar */}
        <div style={{ display:"flex", flexDirection:"column", gap:14, minHeight:0 }}>
          {/* Month nav */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
            <button onClick={()=>setViewDate(new Date(year, month-1, 1))} style={{ background:theme.input, border:`1px solid ${theme.border}`, borderRadius:8, color:theme.text, padding:"6px 14px", fontFamily:"inherit", cursor:"pointer", fontSize:18 }}>‹</button>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:700, color:theme.text, textTransform:"capitalize" }}>{monthName}</div>
            <button onClick={()=>setViewDate(new Date(year, month+1, 1))} style={{ background:theme.input, border:`1px solid ${theme.border}`, borderRadius:8, color:theme.text, padding:"6px 14px", fontFamily:"inherit", cursor:"pointer", fontSize:18 }}>›</button>
          </div>

          {/* Day headers */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, flexShrink:0 }}>
            {dayNames.map(d=><div key={d} style={{ textAlign:"center", fontSize:11, color:theme.textMuted, fontWeight:600, letterSpacing:"0.08em", padding:"4px 0" }}>{d}</div>)}
          </div>

          {/* Days grid */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, overflowY:"auto", WebkitOverflowScrolling:"touch" }}>
            {/* Empty cells before first day (Mon-based: shift) */}
            {Array.from({ length: (firstDay+6)%7 }).map((_,i)=><div key={`e${i}`}/>)}
            {Array.from({ length: daysInMonth }).map((_,i)=>{
              const day = i+1;
              const isToday = today.getDate()===day && today.getMonth()===month && today.getFullYear()===year;
              const hasGoals = goalsByDay[day];
              const isPast = new Date(year,month,day) < new Date(today.getFullYear(),today.getMonth(),today.getDate()) && !isToday;
              return (
                <div key={day} style={{ aspectRatio:"1", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-start", padding:"6px 2px 4px", borderRadius:10, background:isToday?"#2563eb":hasGoals?(isDark?"#1e293b":"#f0f4ff"):"transparent", border:`1px solid ${isToday?"#2563eb":hasGoals?theme.borderStrong:"transparent"}`, position:"relative", cursor:hasGoals?"pointer":"default", transition:"all 0.15s" }}
                  onClick={()=>{ if(hasGoals) setViewDate(new Date(year,month,1)); }}>
                  <span style={{ fontSize:13, fontWeight:isToday?700:400, color:isToday?"#fff":isPast?theme.textDim:theme.text }}>{day}</span>
                  {hasGoals && (
                    <div style={{ display:"flex", gap:2, flexWrap:"wrap", justifyContent:"center", marginTop:2 }}>
                      {hasGoals.slice(0,3).map(g=>(
                        <div key={g.id} style={{ width:6, height:6, borderRadius:"50%", background:AREA_COLORS[areaName(g.areaIdx)]||"#60a5fa" }}/>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Goals this month */}
          <div style={{ flex:1, minHeight:0, overflowY:"auto", WebkitOverflowScrolling:"touch" }}>
            {Object.entries(goalsByDay).sort((a,b)=>Number(a[0])-Number(b[0])).map(([day, gs])=>(
              <div key={day} style={{ marginBottom:10 }}>
                <div style={{ fontSize:11, color:theme.textMuted, fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6 }}>
                  {new Date(year,month,Number(day)).toLocaleDateString(T[lang].dateLocale,{weekday:"long",day:"numeric",month:"short"})}
                </div>
                {gs.map(g=>{
                  const color=AREA_COLORS[areaName(g.areaIdx)]||"#60a5fa";
                  return (
                    <div key={g.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:theme.surface, border:`1px solid ${color}33`, borderRadius:10, marginBottom:6, cursor:"pointer" }}
                      onClick={()=>setTab("goals")}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:color, flexShrink:0 }}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:500, color:theme.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{lang==="el"?g.titleEl:g.titleEn}</div>
                        <div style={{ fontSize:12, color:theme.textMuted }}>{areaName(g.areaIdx)} · {g.progress}%</div>
                      </div>
                      <div style={{ width:40, height:4, background:theme.ring, borderRadius:2, overflow:"hidden", flexShrink:0 }}>
                        <div style={{ height:"100%", width:`${g.progress}%`, background:color, borderRadius:2 }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            {Object.keys(goalsByDay).length===0 && <div style={{ textAlign:"center", padding:"24px 0", color:theme.textDim, fontSize:14 }}>{t.noDeadlines}</div>}
          </div>
        </div>

        {/* Upcoming panel */}
        <div style={{ overflowY:"auto", minHeight:0, WebkitOverflowScrolling:"touch" }}>
          <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:14, padding:18 }}>
            <div style={{ fontSize:11, color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.14em", fontWeight:600, marginBottom:14 }}>🚀 {t.upcoming}</div>
            {upcoming.length===0 && <div style={{ fontSize:13, color:theme.textDim, textAlign:"center", padding:"16px 0" }}>{t.noDeadlines}</div>}
            {upcoming.map(g=>{
              const color=AREA_COLORS[areaName(g.areaIdx)]||"#60a5fa";
              const daysLeft = Math.ceil((g.dueDate - today)/(1000*60*60*24));
              const urgency = daysLeft<=3?"#f87171":daysLeft<=7?"#fbbf24":"#34d399";
              return (
                <div key={g.id} style={{ display:"flex", flexDirection:"column", gap:6, padding:"12px 0", borderBottom:`1px solid ${theme.border}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div style={{ fontSize:14, fontWeight:500, color:theme.text, flex:1, marginRight:8 }}>{lang==="el"?g.titleEl:g.titleEn}</div>
                    <span style={{ fontSize:11, padding:"2px 8px", borderRadius:8, background:urgency+"20", color:urgency, fontWeight:600, whiteSpace:"nowrap", flexShrink:0 }}>
                      {daysLeft===0 ? (lang==="el"?"Σήμερα":"Today") : `${daysLeft}d`}
                    </span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ flex:1, height:4, background:theme.ring, borderRadius:2, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${g.progress}%`, background:color, borderRadius:2 }}/>
                    </div>
                    <span style={{ fontSize:12, color:theme.textMuted, flexShrink:0 }}>{g.progress}%</span>
                  </div>
                  <div style={{ fontSize:11, color:theme.textMuted }}>{areaName(g.areaIdx)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── WHISPERER TAB ────────────────────────────────────────────────────────────
function WhispererTab({ theme, isDark, lang, notes, setNotes }) {
  const t = T[lang];
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const [draft, setDraft] = useState("");
  const [draftTag, setDraftTag] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState("");

  const allTags = [...new Set(notes.flatMap(n=>n.tags))];
  const filtered = notes.filter(n=>{
    const content = lang==="el" ? n.content : (n.contentEn||n.content);
    const ms = !search || content.toLowerCase().includes(search.toLowerCase()) || n.tags.some(tg=>tg.includes(search.toLowerCase()));
    return ms && (!activeTag||n.tags.includes(activeTag));
  }).sort((a,b)=>b.pinned-a.pinned);

  function addNote() {
    if (!draft.trim()) return;
    const tags = draftTag.split(",").map(tg=>tg.trim()).filter(Boolean);
    const today = new Date().toLocaleDateString(T[lang].dateLocale,{day:"numeric",month:"short",year:"numeric"});
    setNotes([{ id:Date.now(), content:draft, contentEn:draft, tags, pinned:false, date:today }, ...notes]);
    setDraft(""); setDraftTag("");
  }

  function startEdit(e, note) {
    e.stopPropagation();
    setEditingId(note.id);
    setEditContent(lang==="el" ? note.content : (note.contentEn||note.content));
    setEditTags(note.tags.join(", "));
  }

  function saveEdit(e, note) {
    e.stopPropagation();
    const tags = editTags.split(",").map(tg=>tg.trim()).filter(Boolean);
    setNotes(notes.map(n=>n.id===note.id?{...n,content:editContent,contentEn:editContent,tags}:n));
    setEditingId(null);
  }

  const cs = { background:isDark?"#160d2a":"#faf5ff", border:`1px solid ${isDark?"#2d1b4e":"#e9d5ff"}`, borderRadius:8, padding:"9px 14px", color:theme.text, fontSize:13, fontFamily:"inherit" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14, height:"100%", minHeight:0 }}>
      <div style={{ background:theme.surface, border:`1px solid ${isDark?"#2d1b4e":"#e9d5ff"}`, borderRadius:16, padding:18, flexShrink:0 }}>
        <div style={{ fontSize:11, color:"#c084fc", letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:10, fontWeight:600 }}>{t.quickCapture}</div>
        <textarea placeholder={t.capturePlaceholder} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&e.metaKey&&addNote()} rows={2} style={{ ...cs, width:"100%", marginBottom:8, lineHeight:1.6, fontSize:14, padding:"10px 14px", resize:"none", borderRadius:10 }}/>
        <div style={{ display:"flex", gap:8 }}>
          <input placeholder={t.tagsPlaceholder} value={draftTag} onChange={e=>setDraftTag(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addNote()} style={{ ...cs, flex:1 }}/>
          <button onClick={addNote} style={{ padding:"8px 18px", background:"#7c3aed", border:"none", borderRadius:8, color:"#ede9fe", fontSize:13, fontFamily:"inherit", cursor:"pointer", fontWeight:600, whiteSpace:"nowrap" }}>{t.save}</button>
        </div>
      </div>

      <div style={{ display:"flex", gap:7, flexWrap:"wrap", alignItems:"center", flexShrink:0 }}>
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", fontSize:12, pointerEvents:"none" }}>🔍</span>
          <input placeholder={t.searchPlaceholder} value={search} onChange={e=>setSearch(e.target.value)} style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:20, padding:"7px 14px 7px 30px", color:theme.text, fontSize:13, fontFamily:"inherit", width:160, outline:"none" }}/>
        </div>
        {allTags.map(tag=>(
          <button key={tag} onClick={()=>setActiveTag(activeTag===tag?null:tag)} style={{ padding:"4px 12px", borderRadius:20, border:`1px solid ${activeTag===tag?tagColor(tag):theme.border}`, background:activeTag===tag?tagColor(tag)+"20":"transparent", color:activeTag===tag?tagColor(tag):theme.textMuted, fontSize:12, fontFamily:"inherit", cursor:"pointer", transition:"all 0.15s" }}>#{tag}</button>
        ))}
        {(search||activeTag) && <button onClick={()=>{setSearch("");setActiveTag(null);}} style={{ padding:"4px 10px", borderRadius:20, border:`1px solid ${theme.border}`, background:"transparent", color:theme.textMuted, fontSize:12, fontFamily:"inherit", cursor:"pointer" }}>{t.clear}</button>}
        <span style={{ marginLeft:"auto", fontSize:12, color:theme.textDim }}>{t.notesCount(filtered.length)}</span>
      </div>

      <div style={{ flex:1, minHeight:0, overflowY:"auto", WebkitOverflowScrolling:"touch", overscrollBehavior:"contain" }}>
        <div style={{ columns:"290px", columnGap:14, paddingBottom:32 }}>
          {filtered.map((note,i)=>(
            <div key={note.id} className="note-card" style={{ breakInside:"avoid", marginBottom:14, background:note.pinned?theme.pinBg:theme.surface, border:`1px solid ${note.pinned?theme.pinBorder:theme.border}`, borderRadius:14, padding:18, position:"relative", boxShadow:note.pinned?`0 0 28px ${isDark?"#7c3aed18":"#a78bfa22"}`:"none", transition:"transform 0.18s", animation:"fadeUp 0.3s ease both", animationDelay:`${i*40}ms` }}>
              <div style={{ position:"absolute", top:12, right:12, display:"flex", gap:4 }}>
                <button onClick={e=>startEdit(e,note)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, color:theme.textMuted, opacity:editingId===note.id?1:0.35, transition:"opacity 0.15s", padding:"2px 5px" }} onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity=editingId===note.id?"1":"0.35"}>✏️</button>
                <button onClick={e=>{e.stopPropagation();setNotes(notes.map(n=>n.id===note.id?{...n,pinned:!n.pinned}:n));}} style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, opacity:note.pinned?1:0.2, transition:"opacity 0.18s,transform 0.15s" }} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.2)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>📌</button>
                <button onClick={e=>{e.stopPropagation();setNotes(notes.filter(n=>n.id!==note.id));if(editingId===note.id)setEditingId(null);}} style={{ background:"none", border:"none", cursor:"pointer", fontSize:15, color:"#f87171", opacity:0.3, transition:"opacity 0.15s" }} onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity="0.3"}>×</button>
              </div>
              {editingId===note.id ? (
                <div onClick={e=>e.stopPropagation()}>
                  <textarea value={editContent} onChange={e=>setEditContent(e.target.value)} rows={4} style={{ ...cs, width:"100%", marginBottom:8, lineHeight:1.6, fontSize:14, padding:"10px 14px", resize:"none", borderRadius:10 }}/>
                  <input value={editTags} onChange={e=>setEditTags(e.target.value)} placeholder={t.tagsPlaceholder} style={{ ...cs, width:"100%", marginBottom:10 }}/>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={e=>saveEdit(e,note)} style={{ flex:1, padding:"8px", background:"#7c3aed", border:"none", borderRadius:8, color:"#ede9fe", fontSize:13, fontFamily:"inherit", cursor:"pointer", fontWeight:600 }}>{t.saveEdit}</button>
                    <button onClick={e=>{e.stopPropagation();setEditingId(null);}} style={{ padding:"8px 14px", background:theme.input, border:`1px solid ${theme.borderStrong}`, borderRadius:8, color:theme.textMuted, fontSize:13, fontFamily:"inherit", cursor:"pointer" }}>{t.cancel}</button>
                  </div>
                </div>
              ) : (
                <div onClick={()=>setExpanded(expanded===note.id?null:note.id)} style={{ cursor:"pointer" }}>
                  <div style={{ fontSize:15, color:theme.text, lineHeight:1.7, marginBottom:12, paddingRight:80, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:expanded===note.id?"unset":3, WebkitBoxOrient:"vertical" }}>{lang==="el"?note.content:(note.contentEn||note.content)}</div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                    {note.tags.map(tag=><span key={tag} style={{ fontSize:12, padding:"3px 10px", borderRadius:10, background:tagColor(tag)+"20", color:tagColor(tag), fontWeight:500 }}>#{tag}</span>)}
                    <span style={{ fontSize:12, color:theme.textDim, marginLeft:"auto" }}>{note.date}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        {filtered.length===0 && <div style={{ textAlign:"center", padding:"40px 0", color:theme.textDim, fontSize:14 }}>{t.noNotes}</div>}
      </div>
    </div>
  );
}

// ─── BUDGET TAB ───────────────────────────────────────────────────────────────
function BudgetTab({ theme, isDark, lang, txns, setTxns, savingsTarget, setSavingsTarget }) {
  const t = T[lang];
  const [adding, setAdding] = useState(false);
  const [newTxn, setNewTxn] = useState({ label:"", amount:"", type:"expense", catIdx:1 });
  const [filterType, setFilterType] = useState("all");
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetDraft, setTargetDraft] = useState(String(savingsTarget));

  const income      = txns.filter(tx=>tx.type==="income").reduce((s,tx)=>s+tx.amount,0);
  const fixedTotal  = txns.filter(tx=>tx.type==="fixed").reduce((s,tx)=>s+Math.abs(tx.amount),0);
  const varExpenses = txns.filter(tx=>tx.type==="expense").reduce((s,tx)=>s+Math.abs(tx.amount),0);
  const expenses    = fixedTotal+varExpenses;
  const balance     = income-expenses;
  const afterFixed  = income-fixedTotal;
  const savingsRate = income>0 ? Math.round((balance/income)*100) : 0;

  const filtered = filterType==="all" ? txns : filterType==="fixed" ? txns.filter(tx=>tx.type==="fixed") : txns.filter(tx=>tx.type===filterType);

  const catBreakdown = {};
  txns.filter(tx=>tx.type==="expense"||tx.type==="fixed").forEach(tx=>{ const cat=t.budgetCategories[tx.catIdx]; catBreakdown[cat]=(catBreakdown[cat]||0)+Math.abs(tx.amount); });
  const sortedCats = Object.entries(catBreakdown).sort((a,b)=>b[1]-a[1]);

  function addTxn() {
    if (!newTxn.label.trim()||!newTxn.amount) return;
    const amt = parseFloat(newTxn.amount);
    const today = new Date().toLocaleDateString(T[lang].dateLocale,{day:"numeric",month:"short",year:"numeric"});
    setTxns([{ ...newTxn, id:Date.now(), amount:newTxn.type==="income"?Math.abs(amt):-Math.abs(amt), date:today }, ...txns]);
    setNewTxn({ label:"", amount:"", type:"expense", catIdx:1 }); setAdding(false);
  }

  const iStyle = { background:theme.input, border:`1px solid ${theme.borderStrong}`, borderRadius:8, padding:"9px 12px", color:theme.text, fontSize:13, fontFamily:"inherit" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14, height:"100%", minHeight:0 }}>
      {/* Summary cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))", gap:10, flexShrink:0 }}>
        {[
          { label:t.income,    value:income,     color:"#34d399" },
          { label:t.fixed,     value:fixedTotal, color:"#f87171", badge:"🔒" },
          { label:t.afterFixed,value:afterFixed, color:afterFixed>=0?"#60a5fa":"#f87171" },
          { label:t.expenses,  value:varExpenses,color:"#fb923c" },
          { label:t.balance,   value:balance,    color:balance>=0?"#a78bfa":"#f87171" },
        ].map(s=>(
          <div key={s.label} style={{ background:theme.surface, border:`1px solid ${s.badge?s.color+"44":theme.border}`, borderRadius:12, padding:"12px 14px", position:"relative" }}>
            {s.badge && <span style={{ position:"absolute", top:8, right:10, fontSize:11 }}>{s.badge}</span>}
            <div style={{ fontSize:10, color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:600, marginBottom:5 }}>{s.label}</div>
            <div style={{ fontSize:18, fontWeight:800, fontFamily:"'Syne',sans-serif", color:s.color }}>{s.value.toFixed(0)}€</div>
          </div>
        ))}
      </div>

      <div style={{ flex:1, minHeight:0, display:"grid", gridTemplateColumns:"1fr 260px", gap:14 }}>
        {/* Transactions */}
        <div style={{ display:"flex", flexDirection:"column", gap:10, minHeight:0 }}>
          <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap", flexShrink:0 }}>
            {[["all",t.allFilter],["income",t.incomeFilter],["expense",t.expenseFilter],["fixed",t.fixedFilter]].map(([v,l])=>{
              const clr=v==="income"?"#34d399":v==="expense"?"#fb923c":v==="fixed"?"#f87171":"#60a5fa";
              return <button key={v} onClick={()=>setFilterType(v)} style={{ padding:"5px 12px", borderRadius:20, border:`1px solid ${filterType===v?clr:theme.border}`, background:filterType===v?clr+"20":"transparent", color:filterType===v?clr:theme.textMuted, fontSize:12, fontFamily:"inherit", cursor:"pointer", transition:"all 0.15s" }}>{l}</button>;
            })}
            <button onClick={()=>setAdding(!adding)} style={{ marginLeft:"auto", padding:"5px 14px", borderRadius:20, border:`1px solid ${isDark?"#15803d":"#22c55e"}`, background:isDark?"#14532d":"#f0fdf4", color:isDark?"#86efac":"#16a34a", fontSize:12, fontFamily:"inherit", cursor:"pointer", fontWeight:500 }}>{t.newTransaction}</button>
          </div>
          {adding && (
            <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:12, padding:16, animation:"slideDown 0.2s ease", flexShrink:0 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <input placeholder={t.descPlaceholder} value={newTxn.label} onChange={e=>setNewTxn({...newTxn,label:e.target.value})} style={{ ...iStyle, gridColumn:"1/-1" }}/>
                <input placeholder={t.amountPlaceholder} type="number" value={newTxn.amount} onChange={e=>setNewTxn({...newTxn,amount:e.target.value})} style={iStyle}/>
                <select value={newTxn.type} onChange={e=>setNewTxn({...newTxn,type:e.target.value})} style={iStyle}>
                  <option value="expense">{t.expenseOpt}</option>
                  <option value="income">{t.incomeOpt}</option>
                  <option value="fixed">{t.fixedOpt}</option>
                </select>
                <select value={newTxn.catIdx} onChange={e=>setNewTxn({...newTxn,catIdx:parseInt(e.target.value)})} style={{ ...iStyle, gridColumn:"1/-1" }}>
                  {t.budgetCategories.map((c,i)=><option key={i} value={i}>{c}</option>)}
                </select>
              </div>
              <div style={{ display:"flex", gap:8, marginTop:10 }}>
                <button onClick={addTxn} style={{ flex:1, padding:"9px", background:"#16a34a", border:"none", borderRadius:8, color:"#fff", fontSize:13, fontFamily:"inherit", cursor:"pointer", fontWeight:600 }}>{t.add}</button>
                <button onClick={()=>setAdding(false)} style={{ padding:"9px 14px", background:theme.input, border:`1px solid ${theme.borderStrong}`, borderRadius:8, color:theme.textMuted, fontSize:13, fontFamily:"inherit", cursor:"pointer" }}>{t.cancel}</button>
              </div>
            </div>
          )}
          <div style={{ flex:1, minHeight:0, overflowY:"auto", WebkitOverflowScrolling:"touch", overscrollBehavior:"contain" }}>
            {filtered.map((txn)=>{
              const cat=t.budgetCategories[txn.catIdx]||"", color=CAT_COLORS[cat]||"#94a3b8", emoji=t.catEmoji[cat]||"💸";
              const isFixed=txn.type==="fixed";
              return (
                <div key={txn.id} className="note-card" style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px", background:theme.surface, border:`1px solid ${isFixed?"#f8717130":theme.border}`, borderRadius:12, marginBottom:7, transition:"transform 0.15s" }}>
                  <div style={{ width:36, height:36, borderRadius:9, background:color+"20", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{emoji}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <div style={{ fontSize:14, fontWeight:500, color:theme.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{txn.label}</div>
                      {isFixed && <span style={{ fontSize:10, padding:"1px 6px", borderRadius:6, background:"#f8717122", color:"#f87171", fontWeight:600, flexShrink:0 }}>🔒</span>}
                    </div>
                    <div style={{ fontSize:12, color:theme.textMuted, marginTop:1 }}>{cat} · {txn.date}</div>
                  </div>
                  <div style={{ fontSize:16, fontWeight:700, color:txn.type==="income"?"#34d399":isFixed?"#f87171":"#fb923c", fontFamily:"'Syne',sans-serif", flexShrink:0 }}>{txn.type==="income"?"+":""}{txn.amount.toFixed(0)}€</div>
                  <button onClick={()=>setTxns(txns.filter(tx=>tx.id!==txn.id))} style={{ background:"none", border:"none", color:theme.textMuted, cursor:"pointer", fontSize:16, opacity:0.4, transition:"opacity 0.15s", padding:"2px 4px", flexShrink:0 }} onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity="0.4"}>×</button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Breakdown */}
        <div style={{ overflowY:"auto", minHeight:0, WebkitOverflowScrolling:"touch", overscrollBehavior:"contain" }}>
          <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:14, padding:18 }}>
            {fixedTotal>0 && (
              <div style={{ marginBottom:16, padding:"12px 14px", background:isDark?"#1a0a0a":"#fff5f5", border:"1px solid #f8717130", borderRadius:10 }}>
                <div style={{ fontSize:11, color:"#f87171", textTransform:"uppercase", letterSpacing:"0.14em", fontWeight:600, marginBottom:8 }}>🔒 {t.fixedTotal}</div>
                {txns.filter(tx=>tx.type==="fixed").map(tx=>(
                  <div key={tx.id} style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:12, color:theme.textMuted }}>{tx.label}</span>
                    <span style={{ fontSize:12, color:"#f87171", fontWeight:600 }}>{Math.abs(tx.amount)}€</span>
                  </div>
                ))}
                <div style={{ borderTop:"1px solid #f8717130", marginTop:8, paddingTop:8, display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:12, color:theme.text, fontWeight:600 }}>{t.afterFixed}</span>
                  <span style={{ fontSize:13, fontWeight:800, fontFamily:"'Syne',sans-serif", color:afterFixed>=0?"#60a5fa":"#f87171" }}>{afterFixed.toFixed(0)}€</span>
                </div>
              </div>
            )}
            <div style={{ fontSize:11, color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.14em", fontWeight:600, marginBottom:14 }}>{t.breakdown}</div>
            {sortedCats.map(([cat,amt])=>{
              const pct=Math.round((amt/expenses)*100), color=CAT_COLORS[cat]||"#94a3b8";
              return (
                <div key={cat} style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:13, color:theme.text, fontWeight:500 }}>{cat}</span>
                    <span style={{ fontSize:13, color:theme.textMuted }}>{amt}€ <span style={{ fontSize:11, color:theme.textDim }}>({pct}%)</span></span>
                  </div>
                  <div style={{ height:5, background:theme.ring, borderRadius:3, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:3, transition:"width 0.6s" }}/>
                  </div>
                </div>
              );
            })}
            {sortedCats.length===0 && <div style={{ fontSize:13, color:theme.textDim, textAlign:"center", padding:"16px 0" }}>{t.noExpenses}</div>}

            {/* Savings goal — editable % */}
            <div style={{ marginTop:16, paddingTop:14, borderTop:`1px solid ${theme.border}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <div style={{ fontSize:11, color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.14em", fontWeight:600 }}>{t.savingsGoal}</div>
                {/* Editable target */}
                {editingTarget ? (
                  <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                    <input type="number" min={1} max={100} value={targetDraft} onChange={e=>setTargetDraft(e.target.value)} style={{ width:52, background:theme.input, border:`1px solid ${theme.borderStrong}`, borderRadius:6, padding:"3px 6px", color:theme.text, fontSize:12, fontFamily:"inherit", textAlign:"center" }}/>
                    <span style={{ fontSize:12, color:theme.textMuted }}>%</span>
                    <button onClick={()=>{ setSavingsTarget(Math.max(1,Math.min(100,parseInt(targetDraft)||20))); setEditingTarget(false); }} style={{ background:"#2563eb", border:"none", borderRadius:6, color:"#fff", fontSize:11, padding:"3px 8px", cursor:"pointer", fontFamily:"inherit" }}>✓</button>
                  </div>
                ) : (
                  <button onClick={()=>{ setTargetDraft(String(savingsTarget)); setEditingTarget(true); }} style={{ background:"none", border:"none", color:theme.textMuted, cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>🎯 {savingsTarget}% ✏️</button>
                )}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <span style={{ fontSize:13, color:theme.text }}>{t.monthLabel}</span>
                <span style={{ fontSize:13, fontWeight:600, color:balance>=0?"#34d399":"#f87171" }}>{balance>=0?"+":""}{balance.toFixed(0)}€</span>
              </div>
              <div style={{ height:7, background:theme.ring, borderRadius:4, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${Math.min(100,Math.max(0,savingsRate))}%`, background:savingsRate>=savingsTarget?"#34d399":savingsRate>=(savingsTarget/2)?"#fbbf24":"#f87171", borderRadius:4, transition:"width 0.6s" }}/>
              </div>
              <div style={{ fontSize:11, color:theme.textMuted, marginTop:4 }}>{t.savingsOf(savingsRate, savingsTarget)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PROFILE TAB ──────────────────────────────────────────────────────────────
function ProfileTab({ theme, isDark, lang, session }) {
  const t = T[lang];
  const [displayName, setDisplayName] = useState(session.user.user_metadata?.display_name || "");
  const [avatarUrl, setAvatarUrl] = useState(session.user.user_metadata?.avatar_url || "");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef();

  const initials = (displayName || session.user.email || "?").slice(0,2).toUpperCase();

  async function handleSave() {
    setSaving(true); setMsg(""); setError("");
    try {
      const updates = { data: { display_name: displayName } };
      if (newPass) {
        if (newPass !== confirmPass) { setError("Τα passwords δεν ταιριάζουν / Passwords don't match"); setSaving(false); return; }
        updates.password = newPass;
      }
      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;
      setMsg(t.profileSaved); setNewPass(""); setConfirmPass("");
    } catch(e) { setError(e.message); }
    setSaving(false);
  }

  async function handleAvatar(e) {
    const file = e.target.files?.[0]; if (!file) return;
    setSaving(true); setMsg(""); setError("");
    try {
      const ext = file.name.split(".").pop();
      const path = `${session.user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert:true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = data.publicUrl + "?t=" + Date.now();
      await supabase.auth.updateUser({ data: { avatar_url: url } });
      setAvatarUrl(url);
      setMsg(t.profileSaved);
    } catch(e) { setError(e.message); }
    setSaving(false);
  }

  const iStyle = { width:"100%", background:theme.input, border:`1px solid ${theme.borderStrong}`, borderRadius:10, padding:"13px 16px", color:theme.text, fontSize:14, fontFamily:"'DM Mono',monospace", outline:"none", transition:"border-color 0.18s", boxSizing:"border-box" };

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:0, height:"100%", minHeight:0, overflowY:"auto", WebkitOverflowScrolling:"touch" }}>
      <div style={{ width:"100%", maxWidth:480, paddingBottom:32 }}>
        <div style={{ fontSize:11, color:theme.textMuted, letterSpacing:"0.18em", textTransform:"uppercase", fontWeight:600, marginBottom:28 }}>{t.profileTitle}</div>

        {/* Avatar */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:32 }}>
          <div style={{ width:100, height:100, borderRadius:"50%", background:avatarUrl?"transparent":isDark?"#1e3a8a":"#dbeafe", border:`2px solid ${theme.borderStrong}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:36, fontWeight:700, fontFamily:"'Syne',sans-serif", color:"#60a5fa", overflow:"hidden", marginBottom:12, cursor:"pointer", position:"relative" }}
            onClick={()=>fileRef.current?.click()}>
            {avatarUrl ? <img src={avatarUrl} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : initials}
            <div style={{ position:"absolute", inset:0, background:"#00000044", display:"flex", alignItems:"center", justifyContent:"center", opacity:0, transition:"opacity 0.18s" }} className="avatar-overlay">
              <span style={{ fontSize:20 }}>📷</span>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatar} style={{ display:"none" }}/>
          <button onClick={()=>fileRef.current?.click()} style={{ background:"none", border:"none", color:"#60a5fa", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>{t.uploadAvatar}</button>
          <div style={{ marginTop:6, fontSize:13, color:theme.textMuted }}>{session.user.email}</div>
        </div>

        {/* Fields */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ fontSize:11, color:theme.textMuted, letterSpacing:"0.14em", textTransform:"uppercase", fontWeight:600, display:"block", marginBottom:7 }}>{t.displayName}</label>
            <input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Your name..." style={iStyle} className="auth-input"/>
          </div>

          <div style={{ borderTop:`1px solid ${theme.border}`, paddingTop:20, marginTop:6 }}>
            <div style={{ fontSize:11, color:theme.textMuted, letterSpacing:"0.14em", textTransform:"uppercase", fontWeight:600, marginBottom:14 }}>{t.changePassword}</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="••••••••" style={iStyle} className="auth-input"/>
              <input type="password" value={confirmPass} onChange={e=>setConfirmPass(e.target.value)} placeholder="••••••••" style={iStyle} className="auth-input"/>
            </div>
          </div>

          {msg && <div style={{ background:"#34d39918", border:"1px solid #34d39944", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#34d399" }}>{msg}</div>}
          {error && <div style={{ background:"#f8717118", border:"1px solid #f8717144", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#f87171" }}>{error}</div>}

          <button onClick={handleSave} disabled={saving} style={{ padding:"13px", background:saving?"#1e3a8a":"#2563eb", border:"none", borderRadius:10, color:"#fff", fontSize:14, fontFamily:"inherit", fontWeight:600, cursor:saving?"not-allowed":"pointer", marginTop:4 }}>
            {saving ? "..." : t.updateProfile}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── LiveStats ─────────────────────────────────────────────────────────────────
function LiveStats({ theme, t, goalCount, noteCount }) {
  return (
    <div style={{ display:"flex", gap:20 }}>
      {[{label:t.goals,value:goalCount,color:"#60a5fa"},{label:t.notes,value:noteCount,color:"#a78bfa"}].map(s=>(
        <div key={s.label} style={{ textAlign:"right" }}>
          <div style={{ fontSize:24, fontWeight:800, fontFamily:"'Syne',sans-serif", color:s.color, lineHeight:1 }}>{s.value}</div>
          <div style={{ fontSize:10, color:theme.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginTop:2, fontWeight:500 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── AUTH GATE ────────────────────────────────────────────────────────────────
export default function SecondBrainApp() {
  const [session, setSession] = useState(undefined);
  useEffect(()=>{
    auth.getSession().then(({ data })=>setSession(data.session??null));
    const { data:{ subscription } } = auth.onAuthStateChange((_,s)=>setSession(s??null));
    return ()=>subscription.unsubscribe();
  },[]);
  useEffect(()=>{ const timer=setTimeout(()=>setSession(prev=>prev===undefined?null:prev),3000); return ()=>clearTimeout(timer); },[]);
  if (session===undefined) return null;
  if (!session) return <AuthScreen onAuth={setSession}/>;
  return <SecondBrain session={session}/>;
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function SecondBrain({ session }) {
  const userId = session.user.id;

  const [goals, setGoalsRaw, goalsLoading] = useSupabaseData(goalsDB, userId, "sb_goals");
  const [notes, setNotesRaw, notesLoading] = useSupabaseData(notesDB, userId, "sb_notes");
  const [txns,  setTxnsRaw,  txnsLoading]  = useSupabaseData(txnsDB,  userId, "sb_txns");

  function makeSetter(snapshot, setRaw, db) {
    return async (updater) => {
      const prev=snapshot, next=typeof updater==="function"?updater(prev):updater;
      const prevMap=new Map(prev.map(x=>[x.id,x])), nextMap=new Map(next.map(x=>[x.id,x]));
      for (const [id] of prevMap) { if(!nextMap.has(id)){ setRaw(next); await db.delete(id).catch(console.error); return; } }
      for (const [id,item] of nextMap) { if(!prevMap.has(id)){ setRaw(next); const saved=await db.insert(userId,item).catch(console.error); if(saved) setRaw(cur=>cur.map(x=>x.id===id?saved:x)); return; } }
      for (const [id,item] of nextMap) { const old=prevMap.get(id); if(old&&JSON.stringify(old)!==JSON.stringify(item)){ setRaw(next); if(db.update) await db.update(id,item).catch(console.error); return; } }
      setRaw(next);
    };
  }

  const setGoals = (u) => makeSetter(goals, setGoalsRaw, goalsDB)(u);
  const setNotes = (u) => makeSetter(notes, setNotesRaw, notesDB)(u);
  const setTxns  = (u) => makeSetter(txns,  setTxnsRaw,  txnsDB)(u);

  const [tab,    setTabRaw]    = useState(()=>localStorage.getItem("sb_tab")||"goals");
  const [isDark, setIsDarkRaw] = useState(()=>localStorage.getItem("sb_dark")!=="false");
  const [lang,   setLangRaw]   = useState(()=>{ const l=localStorage.getItem("sb_lang"); return (l==="el"||l==="en")?l:"el"; });
  const [savingsTarget, setSavingsTargetRaw] = useState(()=>parseInt(localStorage.getItem("sb_savings_target")||"20"));

  const setTab    = v=>{ setTabRaw(v);    localStorage.setItem("sb_tab",v); };
  const setIsDark = v=>{ setIsDarkRaw(v); localStorage.setItem("sb_dark",String(v)); };
  const setLang   = v=>{ setLangRaw(v);   localStorage.setItem("sb_lang",v); };
  const setSavingsTarget = v=>{ setSavingsTargetRaw(v); localStorage.setItem("sb_savings_target",String(v)); };

  const theme = isDark ? DARK : LIGHT;
  const t = T[lang];
  const isLoading = goalsLoading||notesLoading||txnsLoading;

  // Tabs config — profile is an icon button separately on desktop
  const TABS = ["goals","whisperer","budget","calendar"];

  return (
    <div style={{ position:"fixed", inset:0, background:theme.bg, fontFamily:"'DM Mono','Courier New',monospace", color:theme.text, display:"flex", flexDirection:"column", overflow:"hidden", transition:"background 0.3s,color 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:${theme.scrollThumb}; border-radius:4px; }
        .goal-card:hover { transform:translateY(-3px) !important; box-shadow:0 10px 36px rgba(0,0,0,0.18) !important; }
        .note-card:hover { transform:translateY(-2px); }
        .del-btn { opacity:0; transition:opacity 0.15s; } .goal-card:hover .del-btn { opacity:1; }
        input,select,textarea { outline:none; transition:border-color 0.18s; font-size:14px; }
        input:focus,textarea:focus { border-color:#7c3aed !important; }
        .auth-input:focus { border-color:#60a5fa !important; }
        textarea { resize:none; } button { cursor:pointer; }
        .avatar-overlay { opacity:0; } div:hover > .avatar-overlay { opacity:1; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(12px)} to{opacity:1;transform:translateX(0)} }
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(400%)} }

        /* ── MOBILE ── */
        @media (max-width:640px) {
          .desktop-tabs { display:none !important; }
          .mobile-nav   { display:flex !important; }
          .hpad { padding:14px 16px 0 !important; }
          .cpad { padding:12px 16px 0 !important; }
          ::-webkit-scrollbar { width:0px; }
        }
        @media (min-width:641px) {
          .mobile-nav { display:none !important; }
          .hpad { padding:22px 40px 0; }
          .tpad { padding:16px 40px 0; }
          .cpad { padding:18px 40px 24px; }
        }
      `}</style>

      {isLoading && (
        <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:theme.border, zIndex:100, overflow:"hidden" }}>
          <div style={{ position:"absolute", top:0, left:0, width:"40%", height:"100%", background:"linear-gradient(90deg,transparent,#60a5fa,transparent)", animation:"shimmer 1.2s infinite" }}/>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="hpad" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10, flexShrink:0 }}>
        <div>
          <div style={{ fontSize:11, letterSpacing:"0.14em", color:theme.textMuted, marginBottom:3, textTransform:"uppercase", fontWeight:500 }}>
            {new Date().toLocaleDateString(t.dateLocale,{ weekday:"long", day:"numeric", month:"long", year:"numeric" })}
          </div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", lineHeight:1.05, color:theme.text }}>
            <span style={{ fontSize:18, fontWeight:700, opacity:0.6 }}>{t.appTitle[0]} </span>
            <span style={{ fontSize:34, fontWeight:800, color:"#60a5fa" }}>{t.appTitle[1]}</span>
          </h1>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <LiveStats theme={theme} t={t} goalCount={goals.length} noteCount={notes.length}/>

          <button onClick={()=>setLang(lang==="el"?"en":"el")} style={{ padding:"5px 10px", borderRadius:20, border:`1px solid ${theme.border}`, background:theme.surface, color:theme.text, fontSize:12, fontFamily:"inherit", fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
            <span>{lang==="el"?"🇬🇷":"🇬🇧"}</span>
            <span style={{ fontSize:11, color:theme.textMuted }}>{lang==="el"?"EN":"ΕΛ"}</span>
          </button>

          <button onClick={()=>setIsDark(!isDark)} style={{ width:44, height:24, borderRadius:12, background:isDark?"#1e3a8a":"#e0e7ff", border:`1px solid ${isDark?"#3b82f6":"#a5b4fc"}`, cursor:"pointer", position:"relative", transition:"background 0.3s", flexShrink:0 }}>
            <div style={{ position:"absolute", top:3, left:isDark?3:20, width:16, height:16, borderRadius:"50%", background:isDark?"#60a5fa":"#6366f1", transition:"left 0.25s cubic-bezier(.4,0,.2,1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9 }}>{isDark?"🌙":"☀️"}</div>
          </button>

          {/* Profile button — top right, desktop only */}
          <button onClick={()=>setTab("profile")}
            style={{ width:34, height:34, borderRadius:"50%", background:tab==="profile"?"#2563eb":theme.input, border:`2px solid ${tab==="profile"?"#2563eb":theme.borderStrong}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, transition:"all 0.18s", flexShrink:0, overflow:"hidden" }}>
            {session.user.user_metadata?.avatar_url
              ? <img src={session.user.user_metadata.avatar_url} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
              : "👤"}
          </button>

          <button onClick={()=>auth.signOut()}
            style={{ padding:"5px 12px", borderRadius:20, border:`1px solid ${theme.border}`, background:"transparent", color:theme.textMuted, fontSize:11, fontFamily:"inherit", cursor:"pointer", transition:"all 0.18s" }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor="#f87171"; e.currentTarget.style.color="#f87171"; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor=theme.border; e.currentTarget.style.color=theme.textMuted; }}>
            {t.signOut}
          </button>
        </div>
      </div>

      {/* ── DESKTOP TABS ── */}
      <div className="tpad desktop-tabs" style={{ display:"flex", gap:4, flexShrink:0, paddingTop:16 }}>
        {TABS.map(id=>(
          <button key={id} onClick={()=>setTab(id)} style={{ padding:"8px 16px", border:`1px solid ${theme.border}`, borderBottom:tab===id?`1px solid ${theme.bg}`:`1px solid ${theme.border}`, borderRadius:"10px 10px 0 0", background:tab===id?theme.surface:"transparent", color:tab===id?theme.text:theme.textMuted, fontSize:13, fontFamily:"inherit", fontWeight:tab===id?500:400, letterSpacing:"0.02em", transition:"all 0.18s" }}>
            {t.tabs[id]}
          </button>
        ))}
        {tab==="profile" && (
          <button style={{ padding:"8px 16px", border:`1px solid ${theme.border}`, borderBottom:`1px solid ${theme.bg}`, borderRadius:"10px 10px 0 0", background:theme.surface, color:theme.text, fontSize:13, fontFamily:"inherit", fontWeight:500, letterSpacing:"0.02em" }}>
            {t.tabs.profile}
          </button>
        )}
        <div style={{ flex:1, borderBottom:`1px solid ${theme.border}` }}/>
      </div>

      {/* ── CONTENT ── */}
      <div className="cpad" style={{ flex:1, minHeight:0, display:"flex", flexDirection:"column", paddingBottom:0 }}>
        <div style={{ flex:1, minHeight:0, display:"flex", flexDirection:"column",
          // On mobile add padding for bottom nav
          paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          {tab==="goals"     && <GoalsTab     theme={theme} isDark={isDark} lang={lang} goals={goals} setGoals={setGoals}/>}
          {tab==="whisperer" && <WhispererTab theme={theme} isDark={isDark} lang={lang} notes={notes} setNotes={setNotes}/>}
          {tab==="budget"    && <BudgetTab    theme={theme} isDark={isDark} lang={lang} txns={txns} setTxns={setTxns} savingsTarget={savingsTarget} setSavingsTarget={setSavingsTarget}/>}
          {tab==="calendar"  && <CalendarTab  theme={theme} isDark={isDark} lang={lang} goals={goals} setTab={setTab}/>}
          {tab==="profile"   && <ProfileTab   theme={theme} isDark={isDark} lang={lang} session={session}/>}
        </div>
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <div className="mobile-nav" style={{ display:"none", position:"fixed", bottom:0, left:0, right:0, background:theme.surface, borderTop:`1px solid ${theme.border}`, padding:"8px 0 calc(8px + env(safe-area-inset-bottom, 0px))", zIndex:50, justifyContent:"space-around", alignItems:"center" }}>
        {[...TABS, "profile"].map(id=>{
          const icons = { goals:"🎯", whisperer:"🌀", budget:"💸", calendar:"📅", profile:"👤" };
          const labels = { goals:t.goals, whisperer:"Notes", budget:"Budget", calendar:"Cal", profile:"Profile" };
          const active = tab===id;
          return (
            <button key={id} onClick={()=>setTab(id)}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, background:"none", border:"none", padding:"6px 12px", borderRadius:10, cursor:"pointer", transition:"all 0.15s",
                color:active?"#60a5fa":theme.textMuted }}>
              <span style={{ fontSize:id==="profile"&&session.user.user_metadata?.avatar_url?0:20 }}>
                {id==="profile" && session.user.user_metadata?.avatar_url
                  ? <img src={session.user.user_metadata.avatar_url} style={{ width:24, height:24, borderRadius:"50%", objectFit:"cover", border:`2px solid ${active?"#60a5fa":theme.border}` }}/>
                  : icons[id]}
              </span>
              <span style={{ fontSize:10, fontWeight:active?600:400 }}>{labels[id]}</span>
              {active && <div style={{ width:4, height:4, borderRadius:"50%", background:"#60a5fa" }}/>}
            </button>
          );
        })}
      </div>

      {/* Spacer for mobile nav */}
      <div className="mobile-nav" style={{ display:"none", height:70, flexShrink:0 }}/>

      <Analytics/>
    </div>
  );
}