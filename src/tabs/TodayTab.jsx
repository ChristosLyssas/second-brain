import { useState, useEffect } from "react";
import { T } from "../lib/i18n";
import { Icon } from "../components/Icon";
import { CountUp } from "../components/ui";
import { AREA_COLORS, fz, daysUntil, goalDue, SAVINGS_COLOR, NUM_FONT, fmtMoney, monthBudget, lsGet, lsSet } from "../lib/helpers";

// Section ids in their default order; the user's order/hidden set is kept per device
const SECTIONS = ["urgent","money","progress","notes"];
function loadLayout() {
  let saved = null;
  try { saved = JSON.parse(lsGet("sb_today_layout", "null")); } catch { saved = null; }
  let order = Array.isArray(saved?.order) ? saved.order.filter(id=>SECTIONS.includes(id)) : [];
  order = [...order, ...SECTIONS.filter(id=>!order.includes(id))];   // new sections get appended
  const hidden = Array.isArray(saved?.hidden) ? saved.hidden.filter(id=>SECTIONS.includes(id)) : [];
  return { order, hidden };
}

// Soft colour identity per section (top fade + title icon)
const ACCENT = { money:"#34d399", urgent:"#f87171", progress:"#fbbf24", notes:"#60a5fa" };

export default function TodayTab({ theme, lang, goals, notes, txns, savingsTarget, displayName, setTab, openGoal }) {
  const t = T[lang], locale = t.dateLocale;
  const money = (n) => fmtMoney(n, lang);
  const now = new Date();
  const goalName  = (g) => lang==="el" ? g.titleEl : g.titleEn;
  const areaColor = (g) => AREA_COLORS[t.areas[g.areaIdx] ?? t.areas[0]] || "#60a5fa";

  const [layout, setLayoutRaw] = useState(loadLayout);
  const setLayout = (l) => { setLayoutRaw(l); lsSet("sb_today_layout", JSON.stringify(l)); };
  const [editing, setEditing] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  // Cards sit side by side on wider screens (← →) and stack on phones (↑ ↓)
  const [wide, setWide] = useState(()=>typeof window!=="undefined" && window.matchMedia("(min-width:641px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(min-width:641px)");
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const move = (id, dir) => {
    const order = [...layout.order], i = order.indexOf(id), j = i+dir;
    if (j<0 || j>=order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    setLayout({ ...layout, order });
  };
  const dropOn = (targetId) => {
    if (!dragId || dragId===targetId) return;
    const order = layout.order.filter(id=>id!==dragId);
    order.splice(order.indexOf(targetId), 0, dragId);
    setLayout({ ...layout, order });
  };
  const toggleHidden = (id) => setLayout({ ...layout, hidden: layout.hidden.includes(id) ? layout.hidden.filter(x=>x!==id) : [...layout.hidden, id] });

  // Overdue or due within 7 days, not finished
  const urgent = goals.filter(g=>g.progress<100 && goalDue(g) && daysUntil(goalDue(g))<=7).sort((a,b)=>goalDue(a)-goalDue(b)).slice(0,6);
  const urgentIds = new Set(urgent.map(g=>g.id));
  const inProgress = goals.filter(g=>g.progress>0 && g.progress<100 && !urgentIds.has(g.id)).sort((a,b)=>b.progress-a.progress).slice(0,4);
  const pinned = notes.filter(n=>n.pinned);
  const shownNotes = (pinned.length ? pinned : notes).slice(0,4);
  const b = monthBudget(txns, savingsTarget, now);

  const card  = { background:theme.surface, border:`1px solid ${theme.border}`, boxShadow:theme.shadow, borderRadius:16, padding:18, display:"flex", flexDirection:"column", gap:10, minWidth:0 };
  const title = { fontSize:fz(11), color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.14em", fontWeight:600 };
  const muted = { fontSize:fz(14), color:theme.textMuted };
  const openLink = (tab) => <button onClick={()=>setTab(tab)} style={{ marginTop:4, alignSelf:"flex-start", background:"none", border:"none", color:"#60a5fa", fontSize:fz(12), fontFamily:"inherit", padding:0 }}>{t.openTab}</button>;
  const dueLabel = (d) => { const n=daysUntil(d); return n<0?t.overdue:n===0?t.today:n===1?t.tomorrow:t.inDays(n); };

  const sections = {
    urgent: {
      title: <><Icon name="urgent" size={13}/> {t.urgentTitle}</>,
      body: <>
        {urgent.length===0 && <div style={muted}>{t.nothingUrgent}</div>}
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
      </>,
    },
    money: {
      title: <><Icon name="money" size={13}/> {t.thisMonth} · <span style={{ textTransform:"capitalize" }}>{now.toLocaleDateString(locale,{ month:"long" })}</span></>,
      body: <>
        <div>
          <div style={{ fontSize:fz(12), color:theme.textMuted }}>{t.freeLabel}</div>
          <div style={{ fontSize:fz(28), fontFamily:NUM_FONT, fontWeight:500, color:b.freeToSpend>=0?"#60a5fa":"#f87171", lineHeight:1.2 }}><CountUp value={b.freeToSpend} format={money}/></div>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", gap:8, fontSize:fz(12), color:theme.textMuted }}>
          <span><Icon name="savings" size={13}/> {money(b.saved)} / {money(b.target)}</span>
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
      </>,
    },
    progress: {
      title: <><Icon name="progress" size={13}/> {t.inProgress}</>,
      empty: inProgress.length===0,
      body: <>
        {inProgress.length===0 && <div style={{ ...muted, fontSize:fz(13), lineHeight:1.5 }}>{t.noProgressHint}</div>}
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
      </>,
    },
    notes: {
      title: <><Icon name="notes" size={13}/> {pinned.length ? t.pinnedTitle : t.recentNotes}</>,
      body: <>
        {shownNotes.length===0 && <div style={muted}>{t.noNotes}</div>}
        {shownNotes.map(n=>(
          <div key={n.id} onClick={()=>setTab("whisperer")} style={{ fontSize:fz(13), color:theme.text, lineHeight:1.6, padding:"8px 10px", background:theme.input, borderRadius:10, cursor:"pointer", overflow:"hidden", display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical", whiteSpace:"pre-line", wordBreak:"break-word" }}>
            {lang==="el" ? n.content : (n.contentEn||n.content)}
          </div>
        ))}
        {openLink("whisperer")}
      </>,
    },
  };

  const visible = layout.order.filter(id=>!layout.hidden.includes(id) && (editing || !sections[id].empty));
  const iconBtn = (disabled) => ({ background:theme.input, border:`1px solid ${theme.border}`, borderRadius:8, color:theme.textMuted, width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center", fontSize:fz(12), padding:0, opacity:disabled?0.3:1, cursor:disabled?"default":"pointer" });

  return (
    <div style={{ height:"100%", minHeight:0, overflowY:"auto", WebkitOverflowScrolling:"touch", overscrollBehavior:"contain", paddingBottom:20 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:fz(22), fontWeight:500, letterSpacing:"0.01em", lineHeight:1.3, color:theme.text }}>
            {t.greeting(now.getHours())}{displayName?`, ${displayName}`:""}
          </div>
          <div style={{ fontSize:fz(13), color:theme.textMuted, marginTop:2, textTransform:"capitalize" }}>
            {now.toLocaleDateString(locale,{ weekday:"long", day:"numeric", month:"long", year:"numeric" })}
          </div>
        </div>
        <button onClick={()=>{ setEditing(!editing); setDragId(null); setOverId(null); }}
          style={{ flexShrink:0, padding:"6px 14px", borderRadius:20, border:`1px solid ${editing?"#60a5fa":theme.border}`, background:editing?"#60a5fa22":"transparent", color:editing?"#60a5fa":theme.textMuted, fontSize:fz(12), fontFamily:"inherit", fontWeight:editing?600:400, transition:"all 0.2s" }}>
          {editing ? t.doneLabel : t.customizeToday}
        </button>
      </div>
      {editing && <div style={{ fontSize:fz(12), color:theme.textMuted, marginBottom:12 }}>{t.layoutHint}</div>}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(280px,100%),1fr))", gap:14, alignItems:"start" }}>
        {visible.map((id, i)=>{
          const s = sections[id];
          const isOver = editing && overId===id && dragId && dragId!==id;
          return (
            <div key={id} className={editing ? undefined : "lift-card"}
              draggable={editing}
              onDragStart={e=>{ setDragId(id); e.dataTransfer.effectAllowed="move"; }}
              onDragOver={e=>{ if (!editing) return; e.preventDefault(); if (overId!==id) setOverId(id); }}
              onDragLeave={()=>{ if (overId===id) setOverId(null); }}
              onDrop={e=>{ e.preventDefault(); dropOn(id); setDragId(null); setOverId(null); }}
              onDragEnd={()=>{ setDragId(null); setOverId(null); }}
              style={{ ...card, "--accent":ACCENT[id], backgroundImage:`linear-gradient(180deg, ${ACCENT[id]}14, transparent 110px)`,
                ...(editing ? { cursor:"grab", borderStyle:"dashed", borderColor:isOver?"#60a5fa":theme.borderStrong } : {}),
                opacity: dragId===id ? 0.4 : 1,
                transition:"opacity 0.2s, border-color 0.2s" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div className="sec-title" style={{ ...title, flex:1, minWidth:0 }}>{s.title}</div>
                {editing && <>
                  <button aria-label={wide?t.moveLeft:t.moveUp}    title={wide?t.moveLeft:t.moveUp}    disabled={i===0}                onClick={()=>move(id,-1)} style={iconBtn(i===0)}>{wide?"←":"↑"}</button>
                  <button aria-label={wide?t.moveRight:t.moveDown} title={wide?t.moveRight:t.moveDown} disabled={i===visible.length-1} onClick={()=>move(id, 1)} style={iconBtn(i===visible.length-1)}>{wide?"→":"↓"}</button>
                  <button aria-label={t.hideSection} title={t.hideSection} onClick={()=>toggleHidden(id)} style={iconBtn(false)}><Icon name="close" size={13}/></button>
                </>}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10, pointerEvents:editing?"none":"auto", opacity:editing?0.6:1, transition:"opacity 0.2s" }}>
                {s.body}
              </div>
            </div>
          );
        })}
      </div>

      {/* Hidden sections: shown only while editing so they can be brought back */}
      {editing && layout.hidden.length>0 && (
        <div style={{ marginTop:18 }}>
          <div style={{ ...title, marginBottom:8 }}>{t.hiddenSections}</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {layout.hidden.map(id=>(
              <button key={id} onClick={()=>toggleHidden(id)} style={{ padding:"6px 12px", borderRadius:20, border:`1px dashed ${theme.borderStrong}`, background:"transparent", color:theme.textMuted, fontSize:fz(12), fontFamily:"inherit" }}>
                + {sections[id].title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
