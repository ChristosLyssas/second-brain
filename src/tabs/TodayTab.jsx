import { T } from "../lib/i18n";
import { AREA_COLORS, fz, daysUntil, goalDue, SAVINGS_COLOR, NUM_FONT, fmtMoney, monthBudget } from "../lib/helpers";

export default function TodayTab({ theme, lang, goals, notes, txns, savingsTarget, displayName, setTab, openGoal }) {
  const t = T[lang], locale = t.dateLocale;
  const money = (n) => fmtMoney(n, lang);
  const now = new Date();
  const goalName  = (g) => lang==="el" ? g.titleEl : g.titleEn;
  const areaColor = (g) => AREA_COLORS[t.areas[g.areaIdx] ?? t.areas[0]] || "#60a5fa";

  // Overdue or due within 7 days, not finished
  const urgent = goals.filter(g=>g.progress<100 && goalDue(g) && daysUntil(goalDue(g))<=7).sort((a,b)=>goalDue(a)-goalDue(b)).slice(0,6);
  const urgentIds = new Set(urgent.map(g=>g.id));
  const inProgress = goals.filter(g=>g.progress>0 && g.progress<100 && !urgentIds.has(g.id)).sort((a,b)=>b.progress-a.progress).slice(0,4);
  const pinned = notes.filter(n=>n.pinned);
  const shownNotes = (pinned.length ? pinned : notes).slice(0,4);
  const b = monthBudget(txns, savingsTarget, now);

  const card  = { background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:16, padding:18, display:"flex", flexDirection:"column", gap:10, minWidth:0 };
  const title = { fontSize:fz(11), color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.14em", fontWeight:600 };
  const openLink = (tab) => <button onClick={()=>setTab(tab)} style={{ marginTop:4, alignSelf:"flex-start", background:"none", border:"none", color:"#60a5fa", fontSize:fz(12), fontFamily:"inherit", padding:0 }}>{t.openTab}</button>;
  const dueLabel = (d) => { const n=daysUntil(d); return n<0?t.overdue:n===0?t.today:n===1?t.tomorrow:t.inDays(n); };

  return (
    <div style={{ height:"100%", minHeight:0, overflowY:"auto", WebkitOverflowScrolling:"touch", overscrollBehavior:"contain", paddingBottom:20 }}>
      <div style={{ fontSize:fz(22), fontWeight:500, letterSpacing:"0.01em", lineHeight:1.3, color:theme.text, marginBottom:16 }}>
        {t.greeting(now.getHours())}{displayName?`, ${displayName}`:""}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(280px,100%),1fr))", gap:14, alignItems:"start" }}>

        {/* Urgent goals */}
        <div style={card}>
          <div style={title}>⏰ {t.urgentTitle}</div>
          {urgent.length===0 && <div style={{ fontSize:fz(14), color:theme.textMuted }}>{t.nothingUrgent}</div>}
          {urgent.map(g=>{
            const d=goalDue(g), n=daysUntil(d), c=n<=1?"#f87171":n<=3?"#fbbf24":"#34d399";
            return (
              <div key={g.id} onClick={()=>openGoal(g.id)} style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:areaColor(g), flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0, fontSize:fz(14), color:theme.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{goalName(g)}</div>
                <span style={{ fontSize:fz(11), padding:"2px 8px", borderRadius:8, background:c+"20", color:c, fontWeight:600, whiteSpace:"nowrap" }}>{dueLabel(d)}</span>
              </div>
            );
          })}
          {openLink("calendar")}
        </div>

        {/* Money this month */}
        <div style={card}>
          <div style={title}>💸 {t.thisMonth} · <span style={{ textTransform:"capitalize" }}>{now.toLocaleDateString(locale,{ month:"long" })}</span></div>
          <div>
            <div style={{ fontSize:fz(12), color:theme.textMuted }}>{t.freeLabel}</div>
            <div style={{ fontSize:fz(28), fontFamily:NUM_FONT, fontWeight:500, color:b.freeToSpend>=0?"#60a5fa":"#f87171", lineHeight:1.2 }}>{money(b.freeToSpend)}</div>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", gap:8, fontSize:fz(12), color:theme.textMuted }}>
            <span>🏦 {money(b.saved)} / {money(b.target)}</span>
            <span style={{ fontFamily:NUM_FONT }}>{Math.round(b.coverage)}%</span>
          </div>
          <div style={{ height:6, background:theme.ring, borderRadius:3, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${b.coverage}%`, background:b.coverage>=100?"#34d399":SAVINGS_COLOR, borderRadius:3, transition:"width 0.6s" }}/>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", gap:8, flexWrap:"wrap", fontSize:fz(12), color:theme.textMuted }}>
            <span>{t.income} <span style={{ color:"#34d399", fontFamily:NUM_FONT }}>{money(b.income)}</span></span>
            <span>{t.expenses} <span style={{ color:"#fb923c", fontFamily:NUM_FONT }}>{money(b.expenses)}</span></span>
          </div>
          {openLink("budget")}
        </div>

        {/* Goals in progress */}
        {inProgress.length>0 && (
          <div style={card}>
            <div style={title}>🔥 {t.inProgress}</div>
            {inProgress.map(g=>(
              <div key={g.id} onClick={()=>openGoal(g.id)} style={{ cursor:"pointer" }}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:8, fontSize:fz(13), color:theme.text, marginBottom:4 }}>
                  <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{goalName(g)}</span>
                  <span style={{ color:theme.textMuted, fontFamily:NUM_FONT }}>{g.progress}%</span>
                </div>
                <div style={{ height:4, background:theme.ring, borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${g.progress}%`, background:areaColor(g), borderRadius:2 }}/>
                </div>
              </div>
            ))}
            {openLink("goals")}
          </div>
        )}

        {/* Pinned (or recent) notes */}
        <div style={card}>
          <div style={title}>📌 {pinned.length ? t.pinnedTitle : t.recentNotes}</div>
          {shownNotes.length===0 && <div style={{ fontSize:fz(14), color:theme.textMuted }}>{t.noNotes}</div>}
          {shownNotes.map(n=>(
            <div key={n.id} onClick={()=>setTab("whisperer")} style={{ fontSize:fz(13), color:theme.text, lineHeight:1.6, padding:"8px 10px", background:theme.input, borderRadius:10, cursor:"pointer", overflow:"hidden", display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical", whiteSpace:"pre-line", wordBreak:"break-word" }}>
              {lang==="el" ? n.content : (n.contentEn||n.content)}
            </div>
          ))}
          {openLink("whisperer")}
        </div>
      </div>
    </div>
  );
}
