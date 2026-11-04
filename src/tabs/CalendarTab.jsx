import { useState } from "react";
import { T } from "../lib/i18n";
import { AREA_COLORS, fz, daysUntil, goalDue, isSaving, NUM_FONT, fmtMoney, parseTxnDate } from "../lib/helpers";

// ─── CALENDAR TAB ─────────────────────────────────────────────────────────────
export default function CalendarTab({ theme, isDark, lang, goals, txns, openGoal }) {
  const t = T[lang];
  const locale = t.dateLocale;
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const isThisMonth = year===today.getFullYear() && month===today.getMonth();
  // Changing month keeps a day selected so the right-hand panel is never empty: today if it's in view, else the 1st
  const goMonth = (delta) => {
    const next = new Date(year, month+delta, 1);
    setViewDate(next);
    setSelectedDay(next.getFullYear()===today.getFullYear() && next.getMonth()===today.getMonth() ? today.getDate() : 1);
  };

  const goalsByDay = {};
  goals.forEach(g => {
    const d = goalDue(g); if (!d) return;
    if (d.getFullYear()===year && d.getMonth()===month) (goalsByDay[d.getDate()] ||= []).push(g);
  });

  // Fixed payments (rent, taxes…) on the day they're dated
  const fixedByDay = {};
  txns.filter(tx=>tx.type==="fixed" && !isSaving(tx)).forEach(tx => {
    const d = parseTxnDate(tx.date, tx.createdAt); if (!d) return;
    if (d.getFullYear()===year && d.getMonth()===month) (fixedByDay[d.getDate()] ||= []).push(tx);
  });

  const upcoming = goals
    .filter(g => goalDue(g) && g.progress < 100 && daysUntil(goalDue(g)) >= 0)   // includes today
    .sort((a,b) => goalDue(a) - goalDue(b))
    .slice(0, 8);

  // Mon-first day names, single char
  const dayNames = lang==="el" ? ["Δ","Τ","Τ","Π","Π","Σ","Κ"] : ["M","T","W","T","F","S","S"];
  const monthName = viewDate.toLocaleDateString(locale, { month:"long", year:"numeric" });
  const areaName = (idx) => T[lang].areas[idx] ?? T[lang].areas[0];
  const goalName = (g) => lang==="el" ? g.titleEl : g.titleEn;

  const urgencyOf = (days) => days<0 ? "#f87171" : days<=3 ? "#f87171" : days<=7 ? "#fbbf24" : "#34d399";
  const daysLabel = (days) => days<0 ? t.overdue : days===0 ? t.today : days===1 ? t.tomorrow : `${days}d`;
  const sectionTitle = { fontSize:fz(11), color:theme.textMuted, fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 };

  const goalRow = (g) => {
    const color = AREA_COLORS[areaName(g.areaIdx)]||"#60a5fa", d = goalDue(g), days = daysUntil(d), urg = urgencyOf(days);
    return (
      <div key={g.id} onClick={()=>openGoal(g.id)} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:theme.surface, border:`1px solid ${color}33`, borderRadius:10, marginBottom:6, cursor:"pointer" }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:color, flexShrink:0 }}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:fz(14), fontWeight:500, color:theme.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{goalName(g)}</div>
          <div style={{ fontSize:fz(12), color:theme.textMuted }}>{d.toLocaleDateString(locale,{ day:"numeric", month:"short" })} · {g.progress}%</div>
        </div>
        {g.progress<100 && <span style={{ fontSize:fz(11), padding:"2px 8px", borderRadius:8, background:urg+"20", color:urg, fontWeight:600, whiteSpace:"nowrap", flexShrink:0 }}>{daysLabel(days)}</span>}
      </div>
    );
  };

  return (
    // Desktop: calendar on the left, the selected day + lists on the right (each scrolls on its own).
    // Phones (≤ 900px, see .cal-layout in App.jsx): stacked in one scrolling column.
    <div className="cal-layout" style={{ height:"100%", minHeight:0, display:"grid", gridTemplateColumns:"minmax(0,1.5fr) minmax(300px,1fr)", gap:20 }}>

    {/* ── LEFT: calendar ── */}
    <div className="cal-col" style={{ minHeight:0, overflowY:"auto", WebkitOverflowScrolling:"touch", overscrollBehavior:"contain", display:"flex", flexDirection:"column", gap:14 }}>

      {/* Month nav */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <button onClick={()=>goMonth(-1)} style={{ background:theme.input, border:`1px solid ${theme.border}`, borderRadius:8, color:theme.text, padding:"6px 16px", fontFamily:"inherit", cursor:"pointer", fontSize:fz(20)}}>‹</button>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ fontSize:fz(18), fontWeight:500, letterSpacing:"0.01em", color:theme.text, textTransform:"capitalize" }}>{monthName}</div>
          {!isThisMonth && <button onClick={()=>{ setViewDate(new Date(today.getFullYear(),today.getMonth(),1)); setSelectedDay(today.getDate()); }} style={{ padding:"3px 10px", borderRadius:20, border:"1px solid #60a5fa66", background:"#60a5fa18", color:"#60a5fa", fontSize:fz(11), fontFamily:"inherit" }}>{t.today}</button>}
        </div>
        <button onClick={()=>goMonth(1)} style={{ background:theme.input, border:`1px solid ${theme.border}`, borderRadius:8, color:theme.text, padding:"6px 16px", fontFamily:"inherit", cursor:"pointer", fontSize:fz(20)}}>›</button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, flexShrink:0 }}>
        {dayNames.map((d,i)=><div key={i} style={{ textAlign:"center", fontSize:fz(11), color:theme.textMuted, fontWeight:600 }}>{d}</div>)}
      </div>

      {/* Compact calendar grid — goal title chips inside each cell */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, flexShrink:0 }}>
        {Array.from({ length:(firstDay+6)%7 }).map((_,i)=><div key={`e${i}`}/>)}
        {Array.from({ length:daysInMonth }).map((_,i)=>{
          const day = i+1;
          const isToday = today.getDate()===day && today.getMonth()===month && today.getFullYear()===year;
          const gs = goalsByDay[day], fx = fixedByDay[day];
          const has = !!(gs || fx), isSel = selectedDay===day;
          const isPast = new Date(year,month,day) < new Date(today.getFullYear(),today.getMonth(),today.getDate()) && !isToday;
          return (
            <div key={day} onClick={()=>setSelectedDay(day)}
              style={{ minHeight: has ? 62 : 44, display:"flex", flexDirection:"column", padding:"3px 4px 4px", borderRadius:8,
                background: isToday?"#2563eb" : gs?(isDark?"#1a2744":"#dbeafe") : "transparent",
                border:`1px solid ${isSel?"#60a5fa":isToday?"#3b82f6":has?theme.borderStrong:"transparent"}`,
                boxShadow:isSel?"0 0 0 1px #60a5fa":"none",
                cursor:"pointer", overflow:"hidden", transition:"all 0.15s" }}>
              <span style={{ fontSize:fz(11), fontWeight:isToday?700:400, color:isToday?"#fff":isPast?theme.textDim:theme.text, lineHeight:1.4 }}>{day}</span>
              {gs && gs.slice(0,2).map(g=>{
                const color=AREA_COLORS[areaName(g.areaIdx)]||"#60a5fa";
                return (
                  <div key={g.id} style={{ marginTop:2, fontSize:fz(9), fontWeight:600, color:"#fff", background:color, borderRadius:3, padding:"1px 4px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", lineHeight:1.6 }}>
                    {goalName(g)}
                  </div>
                );
              })}
              {gs && gs.length>2 && <div style={{ fontSize:fz(8), color:isToday?"#fff":theme.textMuted }}>+{gs.length-2}</div>}
              {fx && (
                <div style={{ marginTop:2, fontSize:fz(9), fontWeight:600, color:isToday?"#fff":"#f87171", background:isToday?"#f8717166":"#f8717122", borderRadius:3, padding:"1px 4px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", lineHeight:1.6, fontFamily:NUM_FONT }}>
                  🔒 {fmtMoney(fx.reduce((s,tx)=>s+Math.abs(tx.amount),0), lang)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>

    {/* ── RIGHT: selected day, this month's deadlines, upcoming ── */}
    <div className="cal-col" style={{ minHeight:0, overflowY:"auto", WebkitOverflowScrolling:"touch", overscrollBehavior:"contain", display:"flex", flexDirection:"column", gap:14 }}>

      {/* Selected day panel */}
      {selectedDay && (
        <div key={`${year}-${month}-${selectedDay}`} style={{ background:theme.surface, border:"1px solid #60a5fa44", borderRadius:14, padding:14, flexShrink:0, animation:"slideDown 0.2s ease" }}>
          <div style={{ ...sectionTitle, textTransform:"capitalize", letterSpacing:"0.02em", fontSize:fz(14), fontWeight:500, color:theme.text, marginBottom:10 }}>
            {new Date(year,month,selectedDay).toLocaleDateString(locale,{ weekday:"long", day:"numeric", month:"long" })}
          </div>
          {(goalsByDay[selectedDay]||[]).map(goalRow)}
          {(fixedByDay[selectedDay]||[]).map(tx=>(
            <div key={tx.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:isDark?"#1a0a0a":"#fff5f5", border:"1px solid #f8717130", borderRadius:10, marginBottom:6 }}>
              <span>🔒</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:fz(14), fontWeight:500, color:theme.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tx.label}</div>
                <div style={{ fontSize:fz(12), color:theme.textMuted }}>{t.fixedPayments} · {t.budgetCategories[tx.catIdx]||""}</div>
              </div>
              <span style={{ fontSize:fz(14), color:"#f87171", fontFamily:NUM_FONT, whiteSpace:"nowrap" }}>{fmtMoney(Math.abs(tx.amount), lang)}</span>
            </div>
          ))}
          {!goalsByDay[selectedDay] && !fixedByDay[selectedDay] && <div style={{ fontSize:fz(13), color:theme.textMuted, padding:"4px 0" }}>{t.dayEmpty}</div>}
        </div>
      )}

      {/* Deadline list for this month */}
      {Object.keys(goalsByDay).length>0 && (
        <div style={{ flexShrink:0 }}>
          <div style={sectionTitle}>📋 {t.deadlinesTitle}</div>
          {Object.entries(goalsByDay)
            .sort((a,b)=>Number(a[0])-Number(b[0]))
            .flatMap(([,gs])=>gs.map(goalRow))}
        </div>
      )}
      {Object.keys(goalsByDay).length===0 && <div style={{ textAlign:"center", padding:"12px 0", color:theme.textMuted, fontSize:fz(14)}}>{t.noDeadlines}</div>}

      {/* Upcoming panel — full width below */}
      {upcoming.length>0 && (
        <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:14, padding:16, flexShrink:0 }}>
          <div style={{ fontSize:fz(11), color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.14em", fontWeight:600, marginBottom:12 }}>🚀 {t.upcoming}</div>
          {upcoming.map(g=>{
            const color=AREA_COLORS[areaName(g.areaIdx)]||"#60a5fa";
            const daysLeft=daysUntil(goalDue(g));
            const urgency=urgencyOf(daysLeft);
            return (
              <div key={g.id} onClick={()=>openGoal(g.id)} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:`1px solid ${theme.border}`, cursor:"pointer" }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:fz(13), fontWeight:500, color:theme.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{goalName(g)}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4 }}>
                    <div style={{ flex:1, height:3, background:theme.ring, borderRadius:2, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${g.progress}%`, background:color, borderRadius:2 }}/>
                    </div>
                    <span style={{ fontSize:fz(11), color:theme.textMuted, flexShrink:0 }}>{g.progress}%</span>
                  </div>
                </div>
                <span style={{ fontSize:fz(11), padding:"2px 8px", borderRadius:8, background:urgency+"20", color:urgency, fontWeight:600, whiteSpace:"nowrap", flexShrink:0 }}>
                  {daysLabel(daysLeft)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
    </div>
  );
}
