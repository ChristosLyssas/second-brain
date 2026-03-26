import { useState, useEffect } from "react";

// ─── i18n ────────────────────────────────────────────────────────────────────
const T = {
  el: {
    appTitle: ["Second", "Brain"],
    dateLocale: "el-GR",
    goals: "Στόχοι", notes: "Σημειώσεις",
    tabs: { goals: "🎯  Goals", whisperer: "🌀  Whisperer", budget: "💸  Budget" },
    // Goals
    allAreas: "Όλα", newGoal: "+ Νέος Στόχος", newGoalTitle: "Νέος Στόχος",
    goalPlaceholder: "Τίτλος στόχου...", duePlaceholder: "Προθεσμία (π.χ. Ιούν 2026)",
    add: "Προσθήκη", cancel: "Άκυρο",
    priority: { high: "Υψηλή", medium: "Μέτρια", low: "Χαμηλή" },
    priorityLabel: "Προτεραιότητα", dueLabel: "Προθεσμία", stepsLabel: "Βήματα", progressLabel: "Πρόοδος",
    areas: ["Ανάπτυξη", "Υγεία", "Γνώση", "Δημιουργία", "Οικονομικά"],
    // Whisperer
    quickCapture: "⚡ Quick Capture",
    capturePlaceholder: "Πέτα μια ιδέα, σκέψη, reminder...",
    tagsPlaceholder: "Tags: ιδέα, tech, δουλειά",
    save: "Αποθήκευση ↵", searchPlaceholder: "Αναζήτηση...",
    clear: "✕", notesCount: (n) => `${n} σημειώσεις`,
    noNotes: "Δεν βρέθηκαν σημειώσεις",
    // Budget
    income: "Εισόδημα", expenses: "Έξοδα", balance: "Υπόλοιπο", savings: "Αποταμίευση",
    newTransaction: "+ Νέα Κίνηση", descPlaceholder: "Περιγραφή...", amountPlaceholder: "Ποσό (€)",
    expenseOpt: "Έξοδο", incomeOpt: "Έσοδο",
    allFilter: "Όλα", incomeFilter: "Έσοδα", expenseFilter: "Έξοδα",
    breakdown: "Κατανομή Εξόδων", savingsGoal: "Στόχος Αποταμίευσης",
    savingsOf: (r) => `${r}% του εισοδήματος · στόχος 20%`,
    noExpenses: "Δεν υπάρχουν έξοδα",
    budgetCategories: ["Κατοικία","Τρόφιμα","Φαγητό","Μεταφορά","Υγεία","Συνδρομές","Ψυχαγωγία","Άλλο","Εισόδημα"],
    catEmoji: { "Κατοικία":"🏠","Τρόφιμα":"🛒","Φαγητό":"🍽","Μεταφορά":"🚗","Υγεία":"💪","Συνδρομές":"📺","Εισόδημα":"💼","Ψυχαγωγία":"🎮","Άλλο":"💸" },
    monthLabel: "Μαρτίου 2026",
  },
  en: {
    appTitle: ["Second", "Brain"],
    dateLocale: "en-GB",
    goals: "Goals", notes: "Notes",
    tabs: { goals: "🎯  Goals", whisperer: "🌀  Whisperer", budget: "💸  Budget" },
    // Goals
    allAreas: "All", newGoal: "+ New Goal", newGoalTitle: "New Goal",
    goalPlaceholder: "Goal title...", duePlaceholder: "Due date (e.g. Jun 2026)",
    add: "Add", cancel: "Cancel",
    priority: { high: "High", medium: "Medium", low: "Low" },
    priorityLabel: "Priority", dueLabel: "Due Date", stepsLabel: "Steps", progressLabel: "Progress",
    areas: ["Development", "Health", "Knowledge", "Creativity", "Finance"],
    // Whisperer
    quickCapture: "⚡ Quick Capture",
    capturePlaceholder: "Drop an idea, thought, reminder...",
    tagsPlaceholder: "Tags: idea, tech, work",
    save: "Save ↵", searchPlaceholder: "Search...",
    clear: "✕", notesCount: (n) => `${n} notes`,
    noNotes: "No notes found",
    // Budget
    income: "Income", expenses: "Expenses", balance: "Balance", savings: "Savings",
    newTransaction: "+ New Transaction", descPlaceholder: "Description...", amountPlaceholder: "Amount (€)",
    expenseOpt: "Expense", incomeOpt: "Income",
    allFilter: "All", incomeFilter: "Income", expenseFilter: "Expenses",
    breakdown: "Expense Breakdown", savingsGoal: "Savings Goal",
    savingsOf: (r) => `${r}% of income · target 20%`,
    noExpenses: "No expenses yet",
    budgetCategories: ["Housing","Groceries","Dining","Transport","Health","Subscriptions","Entertainment","Other","Income"],
    catEmoji: { "Housing":"🏠","Groceries":"🛒","Dining":"🍽","Transport":"🚗","Health":"💪","Subscriptions":"📺","Income":"💼","Entertainment":"🎮","Other":"💸" },
    monthLabel: "March 2026",
  },
};

const AREA_COLORS = {
  // Greek
  "Ανάπτυξη": "#60a5fa", "Υγεία": "#34d399", "Γνώση": "#fbbf24", "Δημιουργία": "#f472b6", "Οικονομικά": "#a78bfa",
  // English
  "Development": "#60a5fa", "Health": "#34d399", "Knowledge": "#fbbf24", "Creativity": "#f472b6", "Finance": "#a78bfa",
};
const CAT_COLORS = {
  "Κατοικία":"#60a5fa","Τρόφιμα":"#34d399","Φαγητό":"#fbbf24","Μεταφορά":"#fb923c","Υγεία":"#f472b6","Συνδρομές":"#a78bfa","Ψυχαγωγία":"#22d3ee","Άλλο":"#94a3b8","Εισόδημα":"#34d399",
  "Housing":"#60a5fa","Groceries":"#34d399","Dining":"#fbbf24","Transport":"#fb923c","Health":"#f472b6","Subscriptions":"#a78bfa","Entertainment":"#22d3ee","Other":"#94a3b8","Income":"#34d399",
};
const TAG_PALETTE = ["#60a5fa","#34d399","#fbbf24","#f472b6","#a78bfa","#22d3ee","#f87171","#fb923c"];
function tagColor(tag) { let h=0; for(let c of tag) h=(h*31+c.charCodeAt(0))%TAG_PALETTE.length; return TAG_PALETTE[h]; }

const DARK = { bg:"#080f1a",surface:"#0c1525",border:"#1e293b",borderStrong:"#334155",text:"#f1f5f9",textMuted:"#64748b",textDim:"#334155",input:"#1e293b",ring:"#1e293b",scrollThumb:"#1e293b",pinBg:"#0f0a1e",pinBorder:"#7c3aed66" };
const LIGHT = { bg:"#f0f4ff",surface:"#ffffff",border:"#e2e8f0",borderStrong:"#cbd5e1",text:"#0f172a",textMuted:"#64748b",textDim:"#cbd5e1",input:"#f8fafc",ring:"#e2e8f0",scrollThumb:"#cbd5e1",pinBg:"#faf5ff",pinBorder:"#a78bfa88" };

// Initial data — language-neutral IDs, display in current lang
const GOALS_EL = [
  { id:1, titleEl:"Μάθω TypeScript", titleEn:"Learn TypeScript", areaIdx:0, priority:"high", progress:60, due:"Απρ 2026 / Apr 2026", tasks:["Διαβάσω docs / Read docs","Φτιάξω project / Build project"] },
  { id:2, titleEl:"Τρέξω 5km", titleEn:"Run 5km", areaIdx:1, priority:"high", progress:30, due:"Μάι 2026 / May 2026", tasks:["3x εβδομάδα / 3x weekly"] },
  { id:3, titleEl:"Διαβάσω 12 βιβλία", titleEn:"Read 12 books", areaIdx:2, priority:"medium", progress:25, due:"Δεκ 2026 / Dec 2026", tasks:["30 σελ/μέρα / 30 pages/day"] },
  { id:4, titleEl:"Side project launch", titleEn:"Side project launch", areaIdx:3, priority:"high", progress:80, due:"Απρ 2026 / Apr 2026", tasks:["MVP","Landing page","Launch"] },
  { id:5, titleEl:"Εξοικονόμηση 2000€", titleEn:"Save 2000€", areaIdx:4, priority:"medium", progress:45, due:"Δεκ 2026 / Dec 2026", tasks:["Budget tracking"] },
];

const NOTES_INIT = [
  { id:1, content:"Ιδέα για app: daily digest με AI που συνοψίζει τα σημαντικά news της μέρας", contentEn:"App idea: daily AI digest that summarizes the important news of the day", tags:["ιδέα","tech"], pinned:true, date:"25 Μαρ 2026" },
  { id:2, content:"Βιβλίο: 'Deep Work' του Cal Newport — πρέπει να το τελειώσω", contentEn:"Book: 'Deep Work' by Cal Newport — I need to finish it", tags:["βιβλία","productivity"], pinned:false, date:"24 Μαρ 2026" },
  { id:3, content:"Reminder: μιλήσω με τον Γιάννη για το project collaboration", contentEn:"Reminder: talk to Giannis about the project collaboration", tags:["δουλειά"], pinned:false, date:"23 Μαρ 2026" },
  { id:4, content:"Σκέψη: η καλύτερη ώρα για deep work είναι 6-9 πρωί", contentEn:"Thought: the best time for deep work is 6-9 AM before social media", tags:["productivity","ιδέα"], pinned:false, date:"22 Μαρ 2026" },
];

const TXNS_INIT = [
  { id:1, label:"Μισθός / Salary", amount:1800, type:"income", catIdx:8, date:"01 Μαρ 2026" },
  { id:2, label:"Ενοίκιο / Rent", amount:-550, type:"expense", catIdx:0, date:"05 Μαρ 2026" },
  { id:3, label:"Σούπερ μάρκετ / Supermarket", amount:-120, type:"expense", catIdx:1, date:"08 Μαρ 2026" },
  { id:4, label:"Netflix", amount:-15, type:"expense", catIdx:5, date:"10 Μαρ 2026" },
  { id:5, label:"Freelance project", amount:400, type:"income", catIdx:8, date:"15 Μαρ 2026" },
  { id:6, label:"Εστιατόριο / Restaurant", amount:-45, type:"expense", catIdx:2, date:"18 Μαρ 2026" },
  { id:7, label:"Γυμναστήριο / Gym", amount:-30, type:"expense", catIdx:4, date:"20 Μαρ 2026" },
  { id:8, label:"Βενζίνη / Fuel", amount:-60, type:"expense", catIdx:3, date:"22 Μαρ 2026" },
];

function ProgressRing({ progress, color, size=60, theme }) {
  const r=(size-10)/2, circ=2*Math.PI*r, offset=circ-(progress/100)*circ;
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)", flexShrink:0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={theme.ring} strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition:"stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1)" }} />
      <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
        style={{ transform:`rotate(90deg) translate(0,-${size}px)`, transformOrigin:`${size/2}px ${size/2}px`, fill:theme.text, fontSize:12, fontWeight:700, fontFamily:"inherit" }}>
        {progress}%
      </text>
    </svg>
  );
}

function FadeCard({ children, style, className, onClick }) {
  const [vis,setVis]=useState(false);
  useEffect(()=>{ const t=setTimeout(()=>setVis(true),30); return ()=>clearTimeout(t); },[]);
  return <div className={className} onClick={onClick} style={{ ...style, opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(10px)", transition:"opacity 0.3s ease,transform 0.3s ease,box-shadow 0.18s,border-color 0.18s,background 0.18s" }}>{children}</div>;
}

// ─── GOALS ───────────────────────────────────────────────────────────────────
function GoalsTab({ theme, isDark, lang, goals, setGoals }) {
  const t = T[lang];
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newGoal, setNewGoal] = useState({ title:"", areaIdx:0, priority:"high", due:"", progress:0 });

  const areaName = (idx) => t.areas[idx] ?? t.areas[0];
  const goalTitle = (g) => lang==="el" ? g.titleEl : g.titleEn;

  const filtered = filter==="all" ? goals : goals.filter(g => g.areaIdx === parseInt(filter));
  const sel = selected ? goals.find(g=>g.id===selected.id) : null;

  function addGoal() {
    if (!newGoal.title.trim()) return;
    const base = { id:Date.now(), areaIdx:newGoal.areaIdx, priority:newGoal.priority, progress:0, due:newGoal.due, tasks:[] };
    setGoals([...goals, lang==="el" ? { ...base, titleEl:newGoal.title, titleEn:newGoal.title } : { ...base, titleEl:newGoal.title, titleEn:newGoal.title }]);
    setNewGoal({ title:"", areaIdx:0, priority:"high", due:"", progress:0 });
    setAdding(false);
  }

  const iStyle = { background:theme.input, border:`1px solid ${theme.borderStrong}`, borderRadius:8, padding:"10px 14px", color:theme.text, fontSize:14, fontFamily:"inherit" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, height:"100%" }}>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
        <button onClick={()=>setFilter("all")} style={{ padding:"6px 16px", borderRadius:20, border:`1px solid ${filter==="all"?"#60a5fa":theme.border}`, background:filter==="all"?"#60a5fa22":"transparent", color:filter==="all"?"#60a5fa":theme.textMuted, fontSize:13, fontFamily:"inherit", cursor:"pointer", transition:"all 0.18s", fontWeight:filter==="all"?600:400 }}>{t.allAreas}</button>
        {t.areas.map((a,i) => {
          const color = AREA_COLORS[a]||"#60a5fa"; const active = filter===String(i);
          return <button key={i} onClick={()=>setFilter(String(i))} style={{ padding:"6px 16px", borderRadius:20, border:`1px solid ${active?color:theme.border}`, background:active?color+"22":"transparent", color:active?color:theme.textMuted, fontSize:13, fontFamily:"inherit", cursor:"pointer", transition:"all 0.18s", fontWeight:active?600:400 }}>{a}</button>;
        })}
        <button onClick={()=>setAdding(true)} style={{ marginLeft:"auto", padding:"6px 18px", borderRadius:20, border:`1px solid ${isDark?"#1d4ed8":"#3b82f6"}`, background:isDark?"#1e3a8a":"#eff6ff", color:isDark?"#93c5fd":"#2563eb", fontSize:13, fontFamily:"inherit", cursor:"pointer", fontWeight:500 }}>{t.newGoal}</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:sel?"1fr min(360px,38%)":"1fr", gap:16, flex:1, minHeight:0, transition:"grid-template-columns 0.3s" }}>
        <div style={{ overflowY:"auto", paddingRight:4 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:14, alignContent:"start" }}>
            {adding && (
              <div style={{ background:theme.surface, border:`1px solid ${isDark?"#1d4ed8":"#93c5fd"}`, borderRadius:16, padding:20, gridColumn:"1/-1", animation:"slideDown 0.2s ease" }}>
                <div style={{ fontSize:11, color:"#60a5fa", letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:14, fontWeight:600 }}>{t.newGoalTitle}</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <input placeholder={t.goalPlaceholder} value={newGoal.title} onChange={e=>setNewGoal({...newGoal,title:e.target.value})} style={{ ...iStyle, gridColumn:"1/-1", width:"100%" }} />
                  <select value={newGoal.areaIdx} onChange={e=>setNewGoal({...newGoal,areaIdx:parseInt(e.target.value)})} style={iStyle}>{t.areas.map((a,i)=><option key={i} value={i}>{a}</option>)}</select>
                  <select value={newGoal.priority} onChange={e=>setNewGoal({...newGoal,priority:e.target.value})} style={iStyle}>
                    <option value="high">{t.priority.high}</option><option value="medium">{t.priority.medium}</option><option value="low">{t.priority.low}</option>
                  </select>
                  <input placeholder={t.duePlaceholder} value={newGoal.due} onChange={e=>setNewGoal({...newGoal,due:e.target.value})} style={{ ...iStyle, gridColumn:"1/-1", width:"100%" }} />
                </div>
                <div style={{ display:"flex", gap:8, marginTop:14 }}>
                  <button onClick={addGoal} style={{ flex:1, padding:"10px", background:"#2563eb", border:"none", borderRadius:8, color:"#fff", fontSize:13, fontFamily:"inherit", cursor:"pointer", fontWeight:600 }}>{t.add}</button>
                  <button onClick={()=>setAdding(false)} style={{ padding:"10px 18px", background:theme.input, border:`1px solid ${theme.borderStrong}`, borderRadius:8, color:theme.textMuted, fontSize:13, fontFamily:"inherit", cursor:"pointer" }}>{t.cancel}</button>
                </div>
              </div>
            )}
            {filtered.map((goal,i) => {
              const color = AREA_COLORS[areaName(goal.areaIdx)]||"#60a5fa"; const isSel = sel?.id===goal.id;
              return (
                <FadeCard key={goal.id} className="goal-card" onClick={()=>setSelected(isSel?null:goal)}
                  style={{ background:isSel?(isDark?"#0c1e3d":"#eff6ff"):theme.surface, border:`1px solid ${isSel?color+"99":theme.border}`, borderRadius:16, padding:"20px 20px 16px", position:"relative", boxShadow:isSel?`0 0 0 1px ${color}33,0 6px 30px ${color}18`:"none" }}>
                  <button className="del-btn" onClick={e=>{e.stopPropagation();setGoals(goals.filter(g=>g.id!==goal.id));if(sel?.id===goal.id)setSelected(null);}} style={{ position:"absolute",top:12,right:12,background:theme.input,border:"none",borderRadius:6,color:"#f87171",fontSize:15,cursor:"pointer",padding:"2px 8px" }}>×</button>
                  <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
                    <ProgressRing progress={goal.progress} color={color} theme={theme} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:16, fontWeight:600, color:theme.text, lineHeight:1.35, marginBottom:6 }}>{goalTitle(goal)}</div>
                      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                        <span style={{ fontSize:12, padding:"3px 10px", borderRadius:10, background:color+"20", color, fontWeight:500 }}>{areaName(goal.areaIdx)}</span>
                        <span style={{ fontSize:12, padding:"3px 10px", borderRadius:10, background:goal.priority==="high"?"#f8717120":goal.priority==="medium"?"#fbbf2420":"#34d39920", color:goal.priority==="high"?"#f87171":goal.priority==="medium"?"#fbbf24":"#34d399", fontWeight:500 }}>{t.priority[goal.priority]}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ height:4, background:theme.ring, borderRadius:2, marginBottom:10, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${goal.progress}%`, background:color, borderRadius:2, transition:"width 0.6s cubic-bezier(.4,0,.2,1)" }} />
                  </div>
                  <div style={{ fontSize:13, color:theme.textMuted }}>📅 {goal.due||"—"}</div>
                </FadeCard>
              );
            })}
          </div>
        </div>
        {sel && (
          <div style={{ background:theme.surface, border:`1px solid ${AREA_COLORS[areaName(sel.areaIdx)]||theme.border}44`, borderRadius:16, padding:26, overflowY:"auto", animation:"slideIn 0.22s ease" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <span style={{ fontSize:11, color:AREA_COLORS[areaName(sel.areaIdx)], letterSpacing:"0.18em", textTransform:"uppercase", fontWeight:600 }}>{areaName(sel.areaIdx)}</span>
              <button onClick={()=>setSelected(null)} style={{ background:"none", border:"none", color:theme.textMuted, cursor:"pointer", fontSize:20 }}>×</button>
            </div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:theme.text, lineHeight:1.25, marginBottom:22 }}>{lang==="el"?sel.titleEl:sel.titleEn}</div>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:22 }}>
              <ProgressRing progress={sel.progress} color={AREA_COLORS[areaName(sel.areaIdx)]||"#60a5fa"} size={110} theme={theme} />
            </div>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, color:theme.textMuted, marginBottom:10, letterSpacing:"0.15em", textTransform:"uppercase", fontWeight:600 }}>{t.progressLabel}</div>
              <input type="range" min={0} max={100} value={sel.progress} onChange={e=>setGoals(goals.map(g=>g.id===sel.id?{...g,progress:Number(e.target.value)}:g))} style={{ width:"100%", accentColor:AREA_COLORS[areaName(sel.areaIdx)]||"#60a5fa" }} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
              {[{label:t.dueLabel,value:sel.due||"—"},{label:t.priorityLabel,value:t.priority[sel.priority]}].map(m=>(
                <div key={m.label} style={{ background:theme.input, borderRadius:10, padding:"12px 14px", border:`1px solid ${theme.border}` }}>
                  <div style={{ fontSize:12, color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:5, fontWeight:600 }}>{m.label}</div>
                  <div style={{ fontSize:15, color:theme.text, fontWeight:500 }}>{m.value}</div>
                </div>
              ))}
            </div>
            {sel.tasks.length>0 && <div>
              <div style={{ fontSize:11, color:theme.textMuted, letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:12, fontWeight:600 }}>{t.stepsLabel}</div>
              {sel.tasks.map((task,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${theme.border}` }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:AREA_COLORS[areaName(sel.areaIdx)]||"#60a5fa", flexShrink:0 }} />
                  <span style={{ fontSize:14, color:theme.textMuted }}>{task}</span>
                </div>
              ))}
            </div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── WHISPERER ───────────────────────────────────────────────────────────────
function WhispererTab({ theme, isDark, lang, notes, setNotes }) {
  const t = T[lang];
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const [draft, setDraft] = useState("");
  const [draftTag, setDraftTag] = useState("");
  const [expanded, setExpanded] = useState(null);

  const allTags = [...new Set(notes.flatMap(n=>n.tags))];
  const filtered = notes.filter(n=>{
    const content = lang==="el" ? n.content : (n.contentEn||n.content);
    const ms = !search || content.toLowerCase().includes(search.toLowerCase()) || n.tags.some(t=>t.includes(search.toLowerCase()));
    return ms && (!activeTag||n.tags.includes(activeTag));
  }).sort((a,b)=>b.pinned-a.pinned);

  function addNote() {
    if (!draft.trim()) return;
    const tags = draftTag.split(",").map(t=>t.trim()).filter(Boolean);
    const today = new Date().toLocaleDateString(t.dateLocale, { day:"numeric", month:"short", year:"numeric" });
    setNotes([{ id:Date.now(), content:draft, contentEn:draft, tags, pinned:false, date:today }, ...notes]);
    setDraft(""); setDraftTag("");
  }

  const cs = { background:isDark?"#160d2a":"#faf5ff", border:`1px solid ${isDark?"#2d1b4e":"#e9d5ff"}`, borderRadius:8, padding:"9px 14px", color:theme.text, fontSize:13, fontFamily:"inherit" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, height:"100%" }}>
      <div style={{ background:theme.surface, border:`1px solid ${isDark?"#2d1b4e":"#e9d5ff"}`, borderRadius:16, padding:20, flexShrink:0 }}>
        <div style={{ fontSize:11, color:"#c084fc", letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:12, fontWeight:600 }}>{t.quickCapture}</div>
        <textarea placeholder={t.capturePlaceholder} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&e.metaKey&&addNote()} rows={3}
          style={{ ...cs, width:"100%", marginBottom:10, lineHeight:1.65, fontSize:14, padding:"11px 14px", resize:"none", borderRadius:10 }} />
        <div style={{ display:"flex", gap:8 }}>
          <input placeholder={t.tagsPlaceholder} value={draftTag} onChange={e=>setDraftTag(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addNote()} style={{ ...cs, flex:1 }} />
          <button onClick={addNote} style={{ padding:"9px 20px", background:"#7c3aed", border:"none", borderRadius:8, color:"#ede9fe", fontSize:13, fontFamily:"inherit", cursor:"pointer", fontWeight:600, whiteSpace:"nowrap" }}>{t.save}</button>
        </div>
      </div>

      <div style={{ display:"flex", gap:7, flexWrap:"wrap", alignItems:"center", flexShrink:0 }}>
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", fontSize:12, pointerEvents:"none" }}>🔍</span>
          <input placeholder={t.searchPlaceholder} value={search} onChange={e=>setSearch(e.target.value)}
            style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:20, padding:"7px 14px 7px 30px", color:theme.text, fontSize:13, fontFamily:"inherit", width:200, outline:"none" }} />
        </div>
        {allTags.map(tag=>(
          <button key={tag} onClick={()=>setActiveTag(activeTag===tag?null:tag)} style={{ padding:"5px 13px", borderRadius:20, border:`1px solid ${activeTag===tag?tagColor(tag):theme.border}`, background:activeTag===tag?tagColor(tag)+"20":"transparent", color:activeTag===tag?tagColor(tag):theme.textMuted, fontSize:12, fontFamily:"inherit", cursor:"pointer", transition:"all 0.15s", fontWeight:activeTag===tag?600:400 }}>#{tag}</button>
        ))}
        {(search||activeTag) && <button onClick={()=>{setSearch("");setActiveTag(null);}} style={{ padding:"5px 12px", borderRadius:20, border:`1px solid ${theme.border}`, background:"transparent", color:theme.textMuted, fontSize:12, fontFamily:"inherit", cursor:"pointer" }}>{t.clear}</button>}
        <span style={{ marginLeft:"auto", fontSize:12, color:theme.textDim }}>{t.notesCount(filtered.length)}</span>
      </div>

      <div style={{ overflowY:"auto", flex:1 }}>
        <div style={{ columns:"290px", columnGap:14 }}>
          {filtered.map((note,i)=>(
            <div key={note.id} onClick={()=>setExpanded(expanded===note.id?null:note.id)} className="note-card"
              style={{ breakInside:"avoid", marginBottom:14, cursor:"pointer", background:note.pinned?theme.pinBg:theme.surface, border:`1px solid ${note.pinned?theme.pinBorder:theme.border}`, borderRadius:14, padding:18, position:"relative", boxShadow:note.pinned?`0 0 28px ${isDark?"#7c3aed18":"#a78bfa22"}`:"none", transition:"transform 0.18s", animation:"fadeUp 0.3s ease both", animationDelay:`${i*40}ms` }}>
              <div style={{ position:"absolute", top:12, right:12, display:"flex", gap:4 }}>
                <button onClick={e=>{e.stopPropagation();setNotes(notes.map(n=>n.id===note.id?{...n,pinned:!n.pinned}:n));}} style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, opacity:note.pinned?1:0.2, transition:"opacity 0.18s,transform 0.15s" }} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.2)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>📌</button>
                <button onClick={e=>{e.stopPropagation();setNotes(notes.filter(n=>n.id!==note.id));if(expanded===note.id)setExpanded(null);}} style={{ background:"none", border:"none", cursor:"pointer", fontSize:15, color:"#f87171", opacity:0.3, transition:"opacity 0.15s" }} onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity="0.3"}>×</button>
              </div>
              <div style={{ fontSize:15, color:theme.text, lineHeight:1.7, marginBottom:12, paddingRight:46, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:expanded===note.id?"unset":3, WebkitBoxOrient:"vertical" }}>{lang==="el"?note.content:(note.contentEn||note.content)}</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                {note.tags.map(tag=><span key={tag} style={{ fontSize:12, padding:"3px 10px", borderRadius:10, background:tagColor(tag)+"20", color:tagColor(tag), fontWeight:500 }}>#{tag}</span>)}
                <span style={{ fontSize:12, color:theme.textDim, marginLeft:"auto" }}>{note.date}</span>
              </div>
            </div>
          ))}
        </div>
        {filtered.length===0 && <div style={{ textAlign:"center", padding:"60px 0", color:theme.textDim, fontSize:14 }}>{t.noNotes}</div>}
      </div>
    </div>
  );
}

// ─── BUDGET ──────────────────────────────────────────────────────────────────
function BudgetTab({ theme, isDark, lang }) {
  const t = T[lang];
  const [txns, setTxns] = usePersist("sb_txns", TXNS_INIT);
  const [adding, setAdding] = useState(false);
  const [newTxn, setNewTxn] = useState({ label:"", amount:"", type:"expense", catIdx:1 });
  const [filterType, setFilterType] = useState("all");

  const income = txns.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const expenses = txns.filter(t=>t.type==="expense").reduce((s,t)=>s+Math.abs(t.amount),0);
  const balance = income-expenses;
  const savingsRate = income>0 ? Math.round((balance/income)*100) : 0;
  const filtered = filterType==="all" ? txns : txns.filter(t=>t.type===filterType);

  const catBreakdown = {};
  txns.filter(t=>t.type==="expense").forEach(tx=>{
    const cat = t.budgetCategories[tx.catIdx];
    catBreakdown[cat]=(catBreakdown[cat]||0)+Math.abs(tx.amount);
  });
  const sortedCats = Object.entries(catBreakdown).sort((a,b)=>b[1]-a[1]);

  function addTxn() {
    if (!newTxn.label.trim()||!newTxn.amount) return;
    const amt = parseFloat(newTxn.amount);
    const today = new Date().toLocaleDateString(t.dateLocale, { day:"numeric", month:"short", year:"numeric" });
    setTxns([{ ...newTxn, id:Date.now(), amount:newTxn.type==="expense"?-Math.abs(amt):Math.abs(amt), date:today }, ...txns]);
    setNewTxn({ label:"", amount:"", type:"expense", catIdx:1 });
    setAdding(false);
  }

  const iStyle = { background:theme.input, border:`1px solid ${theme.borderStrong}`, borderRadius:8, padding:"9px 12px", color:theme.text, fontSize:13, fontFamily:"inherit" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, height:"100%" }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, flexShrink:0 }}>
        {[
          { label:t.income, value:income, color:"#34d399" },
          { label:t.expenses, value:expenses, color:"#f87171" },
          { label:t.balance, value:balance, color:balance>=0?"#60a5fa":"#f87171" },
          { label:t.savings, value:`${savingsRate}%`, color:"#a78bfa", raw:true },
        ].map(s=>(
          <div key={s.label} style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:14, padding:"16px 18px", animation:"fadeUp 0.3s ease both" }}>
            <div style={{ fontSize:11, color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:600, marginBottom:8 }}>{s.label}</div>
            <div style={{ fontSize:22, fontWeight:800, fontFamily:"'Syne',sans-serif", color:s.color, letterSpacing:"-0.5px" }}>
              {s.raw ? s.value : `${typeof s.value==="number"?s.value.toFixed(0):s.value}€`}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 280px", gap:16, flex:1, minHeight:0 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:12, minHeight:0 }}>
          <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
            {[[" all",t.allFilter],["income",t.incomeFilter],["expense",t.expenseFilter]].map(([v,l])=>(
              <button key={v} onClick={()=>setFilterType(v.trim())} style={{ padding:"5px 14px", borderRadius:20, border:`1px solid ${filterType===v.trim()?(v.trim()==="income"?"#34d399":v.trim()==="expense"?"#f87171":"#60a5fa"):theme.border}`, background:filterType===v.trim()?(v.trim()==="income"?"#34d39920":v.trim()==="expense"?"#f8717120":"#60a5fa20"):"transparent", color:filterType===v.trim()?(v.trim()==="income"?"#34d399":v.trim()==="expense"?"#f87171":"#60a5fa"):theme.textMuted, fontSize:12, fontFamily:"inherit", cursor:"pointer", transition:"all 0.15s" }}>{l}</button>
            ))}
            <button onClick={()=>setAdding(!adding)} style={{ marginLeft:"auto", padding:"5px 16px", borderRadius:20, border:`1px solid ${isDark?"#15803d":"#22c55e"}`, background:isDark?"#14532d":"#f0fdf4", color:isDark?"#86efac":"#16a34a", fontSize:12, fontFamily:"inherit", cursor:"pointer", fontWeight:500 }}>{t.newTransaction}</button>
          </div>

          {adding && (
            <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:14, padding:18, animation:"slideDown 0.2s ease", flexShrink:0 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <input placeholder={t.descPlaceholder} value={newTxn.label} onChange={e=>setNewTxn({...newTxn,label:e.target.value})} style={{ ...iStyle, gridColumn:"1/-1" }} />
                <input placeholder={t.amountPlaceholder} type="number" value={newTxn.amount} onChange={e=>setNewTxn({...newTxn,amount:e.target.value})} style={iStyle} />
                <select value={newTxn.type} onChange={e=>setNewTxn({...newTxn,type:e.target.value})} style={iStyle}>
                  <option value="expense">{t.expenseOpt}</option><option value="income">{t.incomeOpt}</option>
                </select>
                <select value={newTxn.catIdx} onChange={e=>setNewTxn({...newTxn,catIdx:parseInt(e.target.value)})} style={{ ...iStyle, gridColumn:"1/-1" }}>
                  {t.budgetCategories.map((c,i)=><option key={i} value={i}>{c}</option>)}
                </select>
              </div>
              <div style={{ display:"flex", gap:8, marginTop:12 }}>
                <button onClick={addTxn} style={{ flex:1, padding:"9px", background:"#16a34a", border:"none", borderRadius:8, color:"#fff", fontSize:13, fontFamily:"inherit", cursor:"pointer", fontWeight:600 }}>{t.add}</button>
                <button onClick={()=>setAdding(false)} style={{ padding:"9px 16px", background:theme.input, border:`1px solid ${theme.borderStrong}`, borderRadius:8, color:theme.textMuted, fontSize:13, fontFamily:"inherit", cursor:"pointer" }}>{t.cancel}</button>
              </div>
            </div>
          )}

          <div style={{ overflowY:"auto", flex:1 }}>
            {filtered.map((txn,i)=>{
              const cat = t.budgetCategories[txn.catIdx]||"";
              const color = CAT_COLORS[cat]||"#94a3b8";
              const emoji = t.catEmoji[cat]||"💸";
              return (
                <div key={txn.id} className="note-card" style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 16px", background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:12, marginBottom:8, animation:"fadeUp 0.25s ease both", animationDelay:`${i*30}ms`, transition:"transform 0.15s" }}>
                  <div style={{ width:38, height:38, borderRadius:10, background:color+"20", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{emoji}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:15, fontWeight:500, color:theme.text }}>{txn.label}</div>
                    <div style={{ fontSize:12, color:theme.textMuted, marginTop:2 }}>{cat} · {txn.date}</div>
                  </div>
                  <div style={{ fontSize:17, fontWeight:700, color:txn.type==="income"?"#34d399":"#f87171", fontFamily:"'Syne',sans-serif" }}>
                    {txn.type==="income"?"+":""}{txn.amount.toFixed(0)}€
                  </div>
                  <button onClick={()=>setTxns(txns.filter(tx=>tx.id!==txn.id))} style={{ background:"none", border:"none", color:theme.textMuted, cursor:"pointer", fontSize:16, opacity:0.4, transition:"opacity 0.15s", padding:"2px 4px" }} onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity="0.4"}>×</button>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:16, padding:20, overflowY:"auto", alignSelf:"start" }}>
          <div style={{ fontSize:11, color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.15em", fontWeight:600, marginBottom:16 }}>{t.breakdown}</div>
          {sortedCats.map(([cat,amt])=>{
            const pct = Math.round((amt/expenses)*100);
            const color = CAT_COLORS[cat]||"#94a3b8";
            return (
              <div key={cat} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontSize:14, color:theme.text, fontWeight:500 }}>{cat}</span>
                  <span style={{ fontSize:14, color:theme.textMuted }}>{amt}€ <span style={{ fontSize:12, color:theme.textDim }}>({pct}%)</span></span>
                </div>
                <div style={{ height:6, background:theme.ring, borderRadius:3, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:3, transition:"width 0.6s cubic-bezier(.4,0,.2,1)" }} />
                </div>
              </div>
            );
          })}
          {sortedCats.length===0 && <div style={{ fontSize:13, color:theme.textDim, textAlign:"center", padding:"20px 0" }}>{t.noExpenses}</div>}

          <div style={{ marginTop:20, paddingTop:16, borderTop:`1px solid ${theme.border}` }}>
            <div style={{ fontSize:11, color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.15em", fontWeight:600, marginBottom:10 }}>{t.savingsGoal}</div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:14, color:theme.text }}>{t.monthLabel}</span>
              <span style={{ fontSize:14, fontWeight:600, color:balance>=0?"#34d399":"#f87171" }}>{balance>=0?"+":""}{balance}€</span>
            </div>
            <div style={{ height:8, background:theme.ring, borderRadius:4, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${Math.min(100,Math.max(0,savingsRate))}%`, background:savingsRate>=20?"#34d399":savingsRate>=10?"#fbbf24":"#f87171", borderRadius:4, transition:"width 0.6s" }} />
            </div>
            <div style={{ fontSize:11, color:theme.textMuted, marginTop:5 }}>{t.savingsOf(savingsRate)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── LiveStats ────────────────────────────────────────────────────────────────
function LiveStats({ theme, t, goalCount, noteCount }) {
  return (
    <div style={{ display:"flex", gap:20 }}>
      {[{label:t.goals, value:goalCount, color:"#60a5fa"},{label:t.notes, value:noteCount, color:"#a78bfa"}].map(s=>(
        <div key={s.label} style={{ textAlign:"right" }}>
          <div style={{ fontSize:26, fontWeight:800, fontFamily:"'Syne',sans-serif", color:s.color, lineHeight:1 }}>{s.value}</div>
          <div style={{ fontSize:11, color:theme.textMuted, letterSpacing:"0.12em", textTransform:"uppercase", marginTop:3, fontWeight:500 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
function usePersist(key, init) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init; } catch { return init; }
  });
  const set = (v) => {
    setVal(prev => {
      const next = typeof v === "function" ? v(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  return [val, set];
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function SecondBrain() {
  const [tab, setTab] = usePersist("sb_tab", "goals");
  const [isDark, setIsDark] = usePersist("sb_dark", true);
  const [lang, setLang] = usePersist("sb_lang", "el");
  const [goals, setGoals] = usePersist("sb_goals", GOALS_EL);
  const [notes, setNotes] = usePersist("sb_notes", NOTES_INIT);
  const theme = isDark ? DARK : LIGHT;
  const t = T[lang];

  return (
    <div style={{ position:"fixed", inset:0, background:theme.bg, fontFamily:"'DM Mono','Courier New',monospace", color:theme.text, display:"flex", flexDirection:"column", overflow:"hidden", transition:"background 0.3s,color 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; font-size:15px; }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:transparent; } ::-webkit-scrollbar-thumb { background:${theme.scrollThumb}; border-radius:4px; }
        .goal-card:hover { transform:translateY(-3px) !important; box-shadow:0 10px 36px rgba(0,0,0,0.18) !important; }
        .note-card:hover { transform:translateY(-2px); }
        .del-btn { opacity:0; transition:opacity 0.15s; } .goal-card:hover .del-btn { opacity:1; }
        input,select,textarea { outline:none; transition:border-color 0.18s; }
        input:focus,textarea:focus { border-color:#7c3aed !important; }
        textarea { resize:none; } button { cursor:pointer; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(12px)} to{opacity:1;transform:translateX(0)} }
        @media (max-width:640px) { .hpad{padding:18px 20px 0 !important} .cpad{padding:16px 20px 24px !important} h1{font-size:24px !important} }
      `}</style>

      {/* Header */}
      <div className="hpad" style={{ padding:"24px 44px 0", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12, flexShrink:0 }}>
        <div>
          <div style={{ fontSize:13, letterSpacing:"0.14em", color:theme.textMuted, marginBottom:7, textTransform:"uppercase", fontWeight:500 }}>
            {new Date().toLocaleDateString(t.dateLocale, { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
          </div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:34, fontWeight:800, letterSpacing:"0px", lineHeight:1.1, color:theme.text }}>
            {t.appTitle[0]} <span style={{ color:"#60a5fa" }}>{t.appTitle[1]}</span>
          </h1>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          {/* Live stats — pass goals/notes counts down via context workaround: read from localStorage */}
          <LiveStats theme={theme} t={t} goalCount={goals.length} noteCount={notes.length} />

          {/* Export JSON
          <button onClick={() => {
            const data = {
              goals: (() => { try { return JSON.parse(localStorage.getItem("sb_goals")||"[]"); } catch { return []; } })(),
              notes: (() => { try { return JSON.parse(localStorage.getItem("sb_notes")||"[]"); } catch { return []; } })(),
              transactions: (() => { try { return JSON.parse(localStorage.getItem("sb_txns")||"[]"); } catch { return []; } })(),
              exported: new Date().toISOString(),
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type:"application/json" });
            const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
            a.download = `second-brain-${new Date().toISOString().slice(0,10)}.json`; a.click();
          }} style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${theme.border}`, background:theme.surface, color:theme.textMuted, fontSize:12, fontFamily:"inherit", cursor:"pointer", transition:"all 0.2s", display:"flex", alignItems:"center", gap:5, whiteSpace:"nowrap" }}>
            ↓ Export
          </button> */}

          {/* Lang toggle — shows current lang flag + next lang label */}
          <button onClick={()=>setLang(lang==="el"?"en":"el")}
            style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${theme.border}`, background:theme.surface, color:theme.text, fontSize:13, fontFamily:"inherit", fontWeight:600, transition:"all 0.2s", display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:16 }}>{lang==="el"?"🇬🇷":"🇬🇧"}</span>
            <span style={{ fontSize:12, color:theme.textMuted }}>{lang==="el"?"→ EN":"→ ΕΛ"}</span>
          </button>

          {/* Dark/Light toggle */}
          <button onClick={()=>setIsDark(!isDark)} style={{ width:50, height:28, borderRadius:14, background:isDark?"#1e3a8a":"#e0e7ff", border:`1px solid ${isDark?"#3b82f6":"#a5b4fc"}`, cursor:"pointer", position:"relative", transition:"background 0.3s,border-color 0.3s", flexShrink:0 }}>
            <div style={{ position:"absolute", top:4, left:isDark?4:24, width:18, height:18, borderRadius:"50%", background:isDark?"#60a5fa":"#6366f1", transition:"left 0.25s cubic-bezier(.4,0,.2,1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10 }}>{isDark?"🌙":"☀️"}</div>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding:"18px 44px 0", display:"flex", gap:4, flexShrink:0 }}>
        {Object.entries(t.tabs).map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{ padding:"9px 22px", border:`1px solid ${theme.border}`, borderBottom:tab===id?`1px solid ${theme.bg}`:`1px solid ${theme.border}`, borderRadius:"10px 10px 0 0", background:tab===id?theme.surface:"transparent", color:tab===id?theme.text:theme.textMuted, fontSize:14, fontFamily:"inherit", fontWeight:tab===id?500:400, letterSpacing:"0.02em", transition:"all 0.18s" }}>{label}</button>
        ))}
        <div style={{ flex:1, borderBottom:`1px solid ${theme.border}` }} />
      </div>

      {/* Content */}
      <div className="cpad" style={{ padding:"20px 44px 28px", flex:1, minHeight:0, display:"flex", flexDirection:"column" }}>
        {tab==="goals" && <GoalsTab theme={theme} isDark={isDark} lang={lang} goals={goals} setGoals={setGoals} />}
        {tab==="whisperer" && <WhispererTab theme={theme} isDark={isDark} lang={lang} notes={notes} setNotes={setNotes} />}
        {tab==="budget" && <BudgetTab theme={theme} isDark={isDark} lang={lang} />}
      </div>
    </div>
  );
}