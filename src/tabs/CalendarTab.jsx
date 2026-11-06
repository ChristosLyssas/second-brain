import { useState, useEffect, useRef } from "react";
import { T } from "../lib/i18n";
import { Icon } from "../components/Icon";
import { AREA_COLORS, fz, daysUntil, goalDue, isSaving, NUM_FONT, fmtMoney, parseTxnDate, toISO, startOfDay, lsGet, lsSet, goalSteps, encodeStep as encodeStepLocal, SAVINGS_COLOR } from "../lib/helpers";
import { ProgressRing } from "../components/ui";
import { EVENT_COLORS, REPEATS, eventsOn, upcomingOccurrences, timeLabel, parseISODate } from "../lib/events";

// ─── Event form (modal) ──────────────────────────────────────────────────────
// (autoFocus only for new events: on phones it opens the keyboard, which resizes the page behind)
// stacked: opened from the day pop-up → reuses the pop-up's dimmed/blurred backdrop (one backdrop, no blur gap)
function EventForm({ theme, t, initial, isNew, onSave, onDelete, onClose, stacked, onLeaving }) {
  const [d, setD] = useState(initial);
  const [err, setErr] = useState("");
  const [closing, setClosing] = useState(false);
  const set = (patch) => { setD(prev=>({ ...prev, ...patch })); setErr(""); };
  // Every way out (✕, Cancel, backdrop, Esc, Save, Delete) fades the form out first
  const leave = (fn) => { if (closing) return; setClosing(true); onLeaving?.(); setTimeout(fn, 200); };
  const close = () => leave(onClose);

  useEffect(()=>{
    const onKey = (e) => { if (e.key==="Escape") close(); };
    window.addEventListener("keydown", onKey);
    return ()=>window.removeEventListener("keydown", onKey);
  }); // re-bound each render so it always sees the current state

  const submit = (e) => {
    e?.preventDefault();
    if (!d.title.trim() || !d.date) return;
    if (!d.allDay && d.start && d.end && d.end < d.start) { setErr(t.eventTimeError); return; }
    const out = { ...d, title:d.title.trim(), location:d.location.trim(), notes:d.notes.trim(), allDay:d.allDay || !d.start };
    leave(()=>onSave(out));
  };

  const iStyle = { width:"100%", minWidth:0, background:theme.input, border:`1px solid ${theme.borderStrong}`, borderRadius:10, padding:"10px 12px", color:theme.text, fontSize:fz(14), fontFamily:"inherit", outline:"none", boxSizing:"border-box" };
  const label = { fontSize:fz(11), color:theme.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:600, marginBottom:6, display:"block" };

  return (
    <div onClick={close} style={{ position:"fixed", inset:0, zIndex:90, display:"flex", alignItems:"center", justifyContent:"center", padding:16,
      ...(stacked ? { background:"transparent" } : { background:"rgba(2,6,15,0.5)", animation:closing?"fadeOut 0.2s ease forwards":"fadeIn 0.18s ease" }) }}>
      <form onSubmit={submit} onClick={e=>e.stopPropagation()}
        style={{ width:"100%", maxWidth:440, maxHeight:"calc(100vh - 32px)", overflowY:"auto", background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:18, padding:20, boxShadow:"0 24px 60px rgba(0,0,0,0.45)", display:"flex", flexDirection:"column", gap:14, animation:closing?"popOut 0.17s ease forwards":"fadeUp 0.2s ease", backgroundImage:`linear-gradient(180deg, ${d.color}14, transparent 140px)` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ flex:1, fontSize:fz(11), color:"#60a5fa", letterSpacing:"0.15em", textTransform:"uppercase", fontWeight:600 }}>{isNew ? t.newEventTitle : t.editEvent}</div>
          <button type="button" onClick={close} aria-label={t.cancel} style={{ background:"none", border:"none", color:theme.textMuted, padding:4, display:"inline-flex", cursor:"pointer" }}><Icon name="close" size={18}/></button>
        </div>

        <input autoFocus={isNew} value={d.title} onChange={e=>set({ title:e.target.value })} placeholder={t.eventPlaceholder} required
          style={{ ...iStyle, fontSize:fz(17), fontWeight:600, padding:"12px 14px" }}/>

        <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) auto", gap:10, alignItems:"end" }}>
          <div>
            <label style={label}>{t.eventDate}</label>
            <input type="date" value={d.date} onChange={e=>set({ date:e.target.value })} required style={iStyle}/>
          </div>
          <label style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 4px", cursor:"pointer", fontSize:fz(13), color:theme.text, whiteSpace:"nowrap" }}>
            <input type="checkbox" checked={d.allDay} onChange={e=>set({ allDay:e.target.checked })} style={{ width:16, height:16, accentColor:"#3b82f6" }}/>
            {t.allDay}
          </label>
        </div>

        {!d.allDay && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div><label style={label}>{t.startTime}</label><input type="time" value={d.start} onChange={e=>set({ start:e.target.value })} style={iStyle}/></div>
            <div><label style={label}>{t.endTime}</label><input type="time" value={d.end} onChange={e=>set({ end:e.target.value })} style={iStyle}/></div>
          </div>
        )}

        <div>
          <label style={label}>{t.eventLocation}</label>
          <input value={d.location} onChange={e=>set({ location:e.target.value })} placeholder="Gazarte, Αθήνα" style={iStyle}/>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)", gap:10, alignItems:"end" }}>
          <div>
            <label style={label}>{t.repeatLabel}</label>
            <select value={d.repeat} onChange={e=>set({ repeat:e.target.value })} style={iStyle}>
              {REPEATS.map(r=><option key={r} value={r}>{t.repeatOpts[r]}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>{t.colorLabel}</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, padding:"4px 0" }}>
              {EVENT_COLORS.map(c=>(
                <button key={c} type="button" onClick={()=>set({ color:c })} aria-label={c}
                  style={{ width:22, height:22, borderRadius:"50%", background:c, border:"none", cursor:"pointer", padding:0,
                    boxShadow:d.color===c?`0 0 0 2px ${theme.surface}, 0 0 0 4px ${c}`:"none", transition:"box-shadow 0.15s" }}/>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label style={label}>{t.eventNotes}</label>
          <textarea value={d.notes} onChange={e=>set({ notes:e.target.value })} rows={2} style={{ ...iStyle, resize:"vertical", lineHeight:1.5 }}/>
        </div>

        {err && <div style={{ fontSize:fz(13), color:"#f87171" }}>{err}</div>}

        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {!isNew && (
            <button type="button" onClick={()=>leave(onDelete)} style={{ background:"none", border:"none", color:"#f87171", fontSize:fz(13), fontFamily:"inherit", cursor:"pointer", padding:"10px 4px", display:"inline-flex", alignItems:"center", gap:6, marginRight:"auto" }}>
              <Icon name="trash" size={14}/>{t.deleteGoal}
            </button>
          )}
          <button type="button" onClick={close} style={{ marginLeft:isNew?"auto":0, padding:"10px 18px", background:theme.input, border:`1px solid ${theme.borderStrong}`, borderRadius:10, color:theme.textMuted, fontSize:fz(13), fontFamily:"inherit", cursor:"pointer" }}>{t.cancel}</button>
          <button type="submit" disabled={!d.title.trim() || !d.date} style={{ padding:"10px 22px", background:"#2563eb", border:"none", borderRadius:10, color:"#fff", fontSize:fz(13), fontFamily:"inherit", fontWeight:600, cursor:"pointer", opacity:(!d.title.trim() || !d.date)?0.5:1 }}>{t.save.replace(/\s*↵$/,"")}</button>
        </div>
      </form>
    </div>
  );
}

// ─── Goal sheet (modal): a goal opened from the Calendar stays in the Calendar ──
// Progress, due date, priority and steps (tick them here); "Open in Goals" for full editing.
function GoalSheet({ theme, t, lang, goal, onClose, onToggleStep, onSetProgress, onOpenFull, stacked, onLeaving }) {
  const [closing, setClosing] = useState(false);
  const leave = (fn) => { if (closing) return; setClosing(true); onLeaving?.(); setTimeout(fn, 200); };
  const close = () => leave(onClose);
  useEffect(()=>{
    const onKey = (e) => { if (e.key==="Escape") close(); };
    window.addEventListener("keydown", onKey);
    return ()=>window.removeEventListener("keydown", onKey);
  });
  const area = T[lang].areas[goal.areaIdx] ?? T[lang].areas[0];
  const color = AREA_COLORS[area] || "#60a5fa";
  const steps = goalSteps(goal), doneN = steps.filter(st=>st.done).length, due = goalDue(goal);
  const label = { fontSize:fz(11), color:theme.textMuted, letterSpacing:"0.14em", textTransform:"uppercase", fontWeight:600, marginBottom:8 };
  return (
    <div onClick={close} style={{ position:"fixed", inset:0, zIndex:90, display:"flex", alignItems:"center", justifyContent:"center", padding:16,
      ...(stacked ? { background:"transparent" } : { background:"rgba(2,6,15,0.55)", animation:closing?"fadeOut 0.2s ease forwards":"fadeIn 0.18s ease" }) }}>
      <div onClick={e=>e.stopPropagation()} role="dialog"
        style={{ width:"100%", maxWidth:420, maxHeight:"calc(100vh - 32px)", overflowY:"auto", background:theme.surface, border:`1px solid ${color}44`, borderRadius:18, padding:20, boxShadow:"0 24px 60px rgba(0,0,0,0.45)",
          backgroundImage:`linear-gradient(180deg, ${color}14, transparent 140px)`, animation:closing?"popOut 0.2s ease forwards":"popIn 0.26s cubic-bezier(.2,.8,.2,1)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
          <span style={{ flex:1, fontSize:fz(11), color, letterSpacing:"0.18em", textTransform:"uppercase", fontWeight:600 }}>{area}</span>
          <button onClick={close} aria-label={t.cancel} style={{ background:"none", border:"none", color:theme.textMuted, padding:4, display:"inline-flex", cursor:"pointer" }}><Icon name="close" size={18}/></button>
        </div>
        <div style={{ fontSize:fz(19), fontWeight:600, color:theme.text, lineHeight:1.35, marginBottom:16 }}>{lang==="el" ? goal.titleEl : goal.titleEn}</div>

        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:16 }}>
          <ProgressRing progress={goal.progress} color={color} size={76} theme={theme}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={label}>{t.progressLabel}</div>
            {goal.savedSoFar!=null ? (
              <>
                <div style={{ fontSize:fz(16), fontFamily:NUM_FONT, color:SAVINGS_COLOR }}>{fmtMoney(goal.savedSoFar,lang)} <span style={{ fontSize:fz(12), color:theme.textMuted }}>/ {fmtMoney(goal.targetAmount,lang)}</span></div>
                <div style={{ fontSize:fz(12), color:theme.textMuted, marginTop:2 }}><Icon name="savings" size={12}/> {t.linkedSavings}</div>
              </>
            ) : steps.length>0 ? (
              <>
                <div style={{ fontSize:fz(16), fontFamily:NUM_FONT, color:theme.text }}>{t.stepsOf(doneN, steps.length)}</div>
                <div style={{ fontSize:fz(12), color:theme.textMuted, marginTop:2 }}><Icon name="steps" size={12}/> {t.autoProgress}</div>
              </>
            ) : (
              <input type="range" min={0} max={100} value={goal.progress} onChange={e=>onSetProgress(Number(e.target.value))} style={{ width:"100%", accentColor:color }}/>
            )}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
          {[
            { k:t.dueLabel, v: due ? due.toLocaleDateString(t.dateLocale,{ day:"numeric", month:"short", year:"numeric" }) : "—" },
            { k:t.priorityLabel, v:t.priority[goal.priority] || "—" },
          ].map(m=>(
            <div key={m.k} style={{ background:theme.input, borderRadius:10, padding:"9px 12px", border:`1px solid ${theme.border}` }}>
              <div style={{ fontSize:fz(10), color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:3, fontWeight:600 }}>{m.k}</div>
              <div style={{ fontSize:fz(14), color:theme.text, fontWeight:500 }}>{m.v}</div>
            </div>
          ))}
        </div>

        {steps.length>0 && (
          <div style={{ marginBottom:14 }}>
            <div style={label}>{t.stepsLabel} · {doneN}/{steps.length}</div>
            {steps.map((st,i)=>(
              <button key={i} onClick={()=>onToggleStep(i)} className="cal-ev"
                style={{ width:"100%", display:"flex", alignItems:"flex-start", gap:10, padding:"8px 8px", marginBottom:2, background:"none", border:"none", borderRadius:8, cursor:"pointer", textAlign:"left", fontFamily:"inherit" }}>
                <span style={{ width:18, height:18, marginTop:1, flexShrink:0, borderRadius:5, border:`1.5px solid ${st.done?color:theme.borderStrong}`, background:st.done?color:"transparent", color:"#fff", display:"inline-flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s" }}>
                  {st.done && <Icon name="check" size={12} strokeWidth={3}/>}
                </span>
                <span style={{ fontSize:fz(14), color:theme.text, lineHeight:1.45, textDecoration:st.done?"line-through":"none", opacity:st.done?0.55:1 }}>{st.text}</span>
              </button>
            ))}
          </div>
        )}

        <button onClick={()=>leave(onOpenFull)} style={{ width:"100%", padding:"10px", background:"transparent", border:`1px solid ${theme.border}`, borderRadius:10, color:"#60a5fa", fontSize:fz(13), fontFamily:"inherit", fontWeight:600, cursor:"pointer" }}>{t.openInGoals} →</button>
      </div>
    </div>
  );
}

// ─── CALENDAR TAB ─────────────────────────────────────────────────────────────
const VIEWS = ["day", "week", "month", "year"];
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const weekStart = (d) => addDays(d, -((d.getDay() + 6) % 7));   // Monday
const sameDay = (a, b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();

export default function CalendarTab({ theme, isDark, lang, goals, setGoals, txns, openGoal, events=[], setEvents, notify, reopenDay, onReopened }) {
  const t = T[lang];
  const locale = t.dateLocale;
  const today = startOfDay(new Date());
  const [view, setViewRaw] = useState(()=>{ const v = lsGet("sb_cal_view", "month"); return VIEWS.includes(v) ? v : "month"; });
  const setView = (v) => { setViewRaw(v); lsSet("sb_cal_view", v); };
  // Back from a goal opened in the day pop-up → that day, pop-up open again
  const backDay = reopenDay ? parseISODate(reopenDay) : null;
  const [cursor, setCursor] = useState(backDay || today);   // the selected day; every view is built around it
  const [form, setFormRaw] = useState(null);     // { initial, isNew } while the event form is open
  const [formLeaving, setFormLeaving] = useState(false);   // form is fading out → bring the pop-up card back at the same time
  const setForm = (f) => { setFormLeaving(false); setFormRaw(f); };
  const [goalSheetId, setGoalSheetIdRaw] = useState(null);   // goal opened as a pop-up (stays in the Calendar)
  const openGoalSheet = (id) => { setFormLeaving(false); setGoalSheetIdRaw(id); };
  const sheetGoal = goalSheetId!=null ? goals.find(g=>g.id===goalSheetId) : null;
  const sheetOpen = !!form || !!sheetGoal;   // something is open on top of the day pop-up
  const toggleGoalStep = (goal, idx) => {
    const steps = goalSteps(goal).map((st,i)=>i===idx ? { ...st, done:!st.done } : st);
    const done = steps.filter(st=>st.done).length;
    setGoals(goals.map(g=>g.id===goal.id ? { ...g, tasks:steps.map(encodeStepLocal), progress:Math.round(done/steps.length*100) } : g));
  };
  const setGoalProgress = (goal, v) => setGoals(goals.map(g=>g.id===goal.id ? { ...g, progress:v } : g));
  const [dayPop, setDayPopRaw] = useState(backDay);   // month view: tapping a busy day lists its items in a pop-up
  // Reopened on the way back from a goal → shown instantly (no entry animation), as if it never closed
  // Back from a goal: the pop-up plays its normal entrance, in step with the tab's fade-in
  const [popInstant, setPopInstant] = useState(false);
  const popOpenedAt = useRef(0);
  const setDayPop = (d) => { setPopInstant(false); if (d) popOpenedAt.current = performance.now(); setDayPopRaw(d); };
  // A second tap right after the pop-up opened lands on its backdrop → that's a double tap: new event instead
  const onPopBackdrop = () => {
    if (performance.now() - popOpenedAt.current < 350) { const d = dayPop; setDayPopRaw(null); openNew(d); return; }
    closePop();
  };
  // Closing fades the pop-up out first (then runs `then`, e.g. opening a goal)
  const [popClosing, setPopClosing] = useState(false);
  const closePop = (then) => {
    if (!dayPop) { then?.(); return; }
    setPopClosing(true);
    setTimeout(()=>{ setDayPopRaw(null); setPopClosing(false); then?.(); }, 260);
  };
  useEffect(()=>{ if (reopenDay) onReopened?.(); },[]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{
    if (!dayPop) return;
    const onKey = (e) => { if (e.key==="Escape" && !form && goalSheetId==null) closePop(); };
    window.addEventListener("keydown", onKey);
    return ()=>window.removeEventListener("keydown", onKey);
  },[dayPop, form, goalSheetId]); // eslint-disable-line react-hooks/exhaustive-deps
  const lastColor = useRef(EVENT_COLORS[0]);

  // ── data by day ──
  const goalsByISO = {}, fixedByISO = {};
  // Completed goals have no deadline to worry about → not shown in the Calendar
  goals.forEach(g => { const d = goalDue(g); if (d && g.progress < 100) (goalsByISO[toISO(d)] ||= []).push(g); });
  txns.filter(tx=>tx.type==="fixed" && !isSaving(tx)).forEach(tx => {
    const d = parseTxnDate(tx.date, tx.createdAt); if (d) (fixedByISO[toISO(d)] ||= []).push(tx);
  });
  const itemsOn = (d) => { const iso = toISO(d); return { evs:eventsOn(events, d), gs:goalsByISO[iso]||[], fx:fixedByISO[iso]||[] }; };

  // ── event create / edit / delete ──
  const openNew = (date, start="") => setForm({ isNew:true, initial:{ id:null, title:"", date:toISO(date), allDay:!start, start, end:"", location:"", notes:"", color:lastColor.current, repeat:"none" } });
  const openEdit = (ev) => { setForm({ isNew:false, initial:{ ...ev, color:ev.color||EVENT_COLORS[0], location:ev.location||"", notes:ev.notes||"", start:ev.start||"", end:ev.end||"", allDay:ev.allDay||!ev.start } }); };
  const saveEvent = (ev) => {
    lastColor.current = ev.color;
    if (form.isNew) setEvents([...events, { ...ev, id:Date.now() }]);
    else setEvents(events.map(e=>e.id===ev.id ? { ...e, ...ev } : e));
    const d = parseISODate(ev.date); if (d) setCursor(d);
    setForm(null);
  };
  const deleteEvent = () => {
    const ev = form.initial;
    setEvents(events.filter(e=>e.id!==ev.id));
    setForm(null);
    notify?.(t.eventDeleted, { kind:"restoreEvent", item:ev });
  };

  // ── double tap (or double click) → new event; `start` pre-fills the time in the day view ──
  // `onTap` runs at once; `onSingle` waits a moment, so a double tap on a busy day doesn't open its pop-up first.
  const lastTap = useRef({ key:null, time:0, timer:null });
  useEffect(()=>()=>clearTimeout(lastTap.current.timer),[]);
  const pressable = (key, date, start="", onTap, onSingle) => ({
    onClick: () => {
      const now = performance.now(), lt = lastTap.current;
      clearTimeout(lt.timer);
      if (lt.key===key && now-lt.time < 320) {
        lastTap.current = { key:null, time:0, timer:null };
        setCursor(date); openNew(date, start);
        return;
      }
      lastTap.current = { key, time:now, timer: onSingle ? setTimeout(onSingle, 260) : null };
      onTap?.();
    },
    // no double-tap zoom / text selection on the cells
    style: { userSelect:"none", WebkitUserSelect:"none", touchAction:"manipulation", transition:"background-color 0.15s, border-color 0.15s" },
  });

  // ── navigation ──
  const step = (dir) => {
    if (view==="day") setCursor(addDays(cursor, dir));
    else if (view==="week") setCursor(addDays(cursor, 7*dir));
    else if (view==="month") { const y=cursor.getFullYear(), m=cursor.getMonth()+dir; setCursor(new Date(y, m, Math.min(cursor.getDate(), new Date(y, m+1, 0).getDate()))); }
    else setCursor(new Date(cursor.getFullYear()+dir, cursor.getMonth(), Math.min(cursor.getDate(), 28)));
  };
  const ws = weekStart(cursor), we = addDays(ws, 6);
  const title =
    view==="day"   ? cursor.toLocaleDateString(locale, { weekday:"long", day:"numeric", month:"long", year:"numeric" }) :
    view==="week"  ? `${ws.toLocaleDateString(locale, { day:"numeric", ...(ws.getMonth()!==we.getMonth()?{ month:"short" }:{}) })} – ${we.toLocaleDateString(locale, { day:"numeric", month:"short", year:"numeric" })}` :
    view==="month" ? cursor.toLocaleDateString(locale, { month:"long", year:"numeric" }) :
                     String(cursor.getFullYear());
  const inView =
    view==="day" ? sameDay(cursor, today) :
    view==="week" ? sameDay(ws, weekStart(today)) :
    view==="month" ? cursor.getFullYear()===today.getFullYear() && cursor.getMonth()===today.getMonth() :
    cursor.getFullYear()===today.getFullYear();

  // ── helpers for rows / chips ──
  const dayNames = lang==="el" ? ["Δ","Τ","Τ","Π","Π","Σ","Κ"] : ["M","T","W","T","F","S","S"];
  const areaName = (idx) => T[lang].areas[idx] ?? T[lang].areas[0];
  const goalName = (g) => lang==="el" ? g.titleEl : g.titleEn;
  const goalColor = (g) => AREA_COLORS[areaName(g.areaIdx)] || "#60a5fa";
  const evColor = (ev) => ev.color || EVENT_COLORS[0];
  const SUN = "#f87171";   // Sundays in red
  const isSun = (d) => d.getDay()===0;
  const urgencyOf = (days) => days<=3 ? "#f87171" : days<=7 ? "#fbbf24" : "#34d399";
  const daysLabel = (days) => days<0 ? t.overdue : days===0 ? t.today : days===1 ? t.tomorrow : `${days}d`;
  const sectionTitle = { fontSize:fz(11), color:theme.textMuted, fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:10, display:"flex", alignItems:"center", gap:6 };
  const navBtn = { background:theme.input, border:`1px solid ${theme.border}`, borderRadius:8, color:theme.text, width:34, height:32, fontFamily:"inherit", cursor:"pointer", fontSize:fz(19), lineHeight:1, display:"inline-flex", alignItems:"center", justifyContent:"center", padding:0, flexShrink:0 };
  const chipsFor = ({ evs, gs }) => [
    ...evs.map(ev=>({ key:`ev${ev.id}`, label:ev.title, time:ev.allDay||!ev.start?"":ev.start, color:evColor(ev), onClick:()=>openEdit(ev) })),
    ...gs.map(g=>({ key:`g${g.id}`, label:goalName(g), time:"", color:goalColor(g), onClick:()=>openGoalSheet(g.id) })),
  ];
  const chip = (c, big=false, clickable=true) => (
    <div key={c.key} onClick={clickable ? (e=>{ e.stopPropagation(); c.onClick(); }) : undefined} title={c.label}
      style={{ marginTop:2, fontSize:fz(big?12:10), fontWeight:600, color:"#fff", background:c.color, borderRadius:4, padding:big?"3px 6px":"1px 5px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", lineHeight:1.5, cursor:"pointer" }}>
      {c.time && <span style={{ opacity:0.85, fontFamily:NUM_FONT, marginRight:4 }}>{c.time}</span>}{c.label}
    </div>
  );
  const fixedChip = (fx, light) => fx.length>0 && (
    <div style={{ marginTop:2, fontSize:fz(10), fontWeight:600, color:light?"#fff":"#f87171", background:light?"#f8717166":"#f8717122", borderRadius:4, padding:"1px 5px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", lineHeight:1.5, fontFamily:NUM_FONT }}>
      <Icon name="lock" size={10}/> {fmtMoney(fx.reduce((s,tx)=>s+Math.abs(tx.amount),0), lang)}
    </div>
  );

  const eventRow = (ev, key=ev.id) => {
    const c = evColor(ev);
    return (
      <div key={key} onClick={()=>openEdit(ev)} className="cal-ev"
        style={{ display:"flex", alignItems:"stretch", gap:10, padding:"9px 12px", background:theme.surface, border:`1px solid ${c}33`, borderRadius:10, marginBottom:6, cursor:"pointer", backgroundImage:`linear-gradient(90deg, ${c}12, transparent 60%)` }}>
        <div style={{ width:3, borderRadius:2, background:c, flexShrink:0 }}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:fz(14), fontWeight:500, color:theme.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ev.title}</div>
          <div style={{ fontSize:fz(12), color:theme.textMuted, display:"flex", flexWrap:"wrap", gap:"0 8px" }}>
            <span style={{ fontFamily:NUM_FONT }}>{timeLabel(ev, t)}</span>
            {ev.location && <span>· {ev.location}</span>}
            {ev.repeat && ev.repeat!=="none" && <span>· {t.repeatOpts[ev.repeat]}</span>}
          </div>
        </div>
      </div>
    );
  };
  const goalRow = (g) => {
    const c = goalColor(g), d = goalDue(g), days = daysUntil(d), urg = urgencyOf(days);
    return (
      <div key={g.id} onClick={()=>openGoalSheet(g.id)} className="cal-ev" style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", background:theme.surface, border:`1px solid ${c}33`, borderRadius:10, marginBottom:6, cursor:"pointer" }}>
        <Icon name="target" size={14} style={{ color:c }}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:fz(14), fontWeight:500, color:theme.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{goalName(g)}</div>
          <div style={{ fontSize:fz(12), color:theme.textMuted }}>{t.deadlinesTitle} · {g.progress}%</div>
        </div>
        {g.progress<100 && <span style={{ fontSize:fz(11), padding:"2px 8px", borderRadius:8, background:urg+"20", color:urg, fontWeight:600, whiteSpace:"nowrap", flexShrink:0 }}>{daysLabel(days)}</span>}
      </div>
    );
  };
  const fixedRow = (tx) => (
    <div key={tx.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", background:isDark?"#1a0a0a":"#fff5f5", border:"1px solid #f8717130", borderRadius:10, marginBottom:6 }}>
      <Icon name="lock" size={13} style={{ color:"#f87171" }}/>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:fz(14), fontWeight:500, color:theme.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tx.label}</div>
        <div style={{ fontSize:fz(12), color:theme.textMuted }}>{t.fixedPayments} · {t.budgetCategories[tx.catIdx]||""}</div>
      </div>
      <span style={{ fontSize:fz(14), color:"#f87171", fontFamily:NUM_FONT, whiteSpace:"nowrap" }}>{fmtMoney(Math.abs(tx.amount), lang)}</span>
    </div>
  );
  const dayList = (d) => {
    const { evs, gs, fx } = itemsOn(d);
    if (!evs.length && !gs.length && !fx.length) return <div style={{ fontSize:fz(13), color:theme.textMuted, padding:"2px 0" }}>{t.dayEmpty}</div>;
    return <>{evs.map(ev=>eventRow(ev))}{gs.map(goalRow)}{fx.map(fixedRow)}</>;
  };

  // ── MONTH: full weeks (neighbouring days dimmed), cells stretch to fill the height on desktop ──
  const monthView = () => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = weekStart(first);
    const weeks = Math.ceil((((first.getDay()+6)%7) + new Date(cursor.getFullYear(), cursor.getMonth()+1, 0).getDate()) / 7);
    return (
      <div className="cal-month-wrap" style={{ flex:1, minHeight:0, display:"flex", flexDirection:"column", gap:4 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,minmax(0,1fr))", gap:4, flexShrink:0 }}>
          {dayNames.map((d,i)=><div key={i} style={{ textAlign:"center", fontSize:fz(11), color:i===6?SUN:theme.textMuted, fontWeight:600 }}>{d}</div>)}
        </div>
        <div className="cal-month" style={{ flex:1, minHeight:0, display:"grid", gridTemplateColumns:"repeat(7,minmax(0,1fr))", gridTemplateRows:`repeat(${weeks}, minmax(72px, 1fr))`, gap:4 }}>
          {Array.from({ length:weeks*7 }).map((_,i)=>{
            const d = addDays(start, i), key = toISO(d);
            const out = d.getMonth()!==cursor.getMonth(), isToday = sameDay(d, today), isSel = sameDay(d, cursor);
            const items = itemsOn(d), chips = chipsFor(items);
            const p = pressable(key, d, "", ()=>{ setCursor(d); if (chips.length || items.fx.length) setDayPop(d); });
            return (
              <div key={key} {...p}
                style={{ ...p.style, display:"flex", flexDirection:"column", padding:"4px 5px", borderRadius:10, minWidth:0, overflow:"hidden", cursor:"pointer", opacity:out?0.38:1,
                  background: isToday ? "#2563eb" : chips.length ? (isDark?"#101b30":"#e9eef6") : (isDark?"#0b1424":theme.surface),
                  border:`1px solid ${isSel?"#60a5fa":isToday?"#3b82f6":theme.border}`, boxShadow:isSel?"0 0 0 1px #60a5fa":"none" }}>
                <span style={{ fontSize:fz(12), fontWeight:isToday||isSel?700:500, color:isToday?"#fff":isSun(d)?SUN:d<today?theme.textDim:theme.text, lineHeight:1.4 }}>{d.getDate()}</span>
                {chips.slice(0,3).map(c=>chip(c, false, false))}
                {chips.length>3 && <div style={{ fontSize:fz(9), color:isToday?"#fff":theme.textMuted, marginTop:1 }}>+{chips.length-3}</div>}
                {fixedChip(items.fx, isToday)}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── WEEK: 7 columns on desktop, 7 rows on phones ──
  const weekView = () => (
    <div className="cal-week" style={{ flex:1, minHeight:0, display:"grid", gridTemplateColumns:"repeat(7,minmax(0,1fr))", gap:6 }}>
      {Array.from({ length:7 }).map((_,i)=>{
        const d = addDays(ws, i), key = toISO(d), isToday = sameDay(d, today), isSel = sameDay(d, cursor);
        const items = itemsOn(d), chips = chipsFor(items);
        const p = pressable(key, d, "", ()=>setCursor(d));
        return (
          <div key={key} {...p} className="cal-week-day"
            style={{ ...p.style, display:"flex", flexDirection:"column", gap:2, padding:8, borderRadius:12, minWidth:0, minHeight:0, overflowY:"auto", cursor:"pointer",
              background:isToday?(isDark?"#0f1f3d":"#e3ecfb"):theme.surface, border:`1px solid ${isSel?"#60a5fa":isToday?"#3b82f6":theme.border}` }}>
            <div className="cal-week-head" style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:4 }}>
              <span style={{ fontSize:fz(11), color:isToday?"#60a5fa":isSun(d)?SUN:theme.textMuted, fontWeight:600, textTransform:"uppercase" }}>{d.toLocaleDateString(locale,{ weekday:"short" })}</span>
              <span style={{ fontSize:fz(18), fontWeight:700, color:isToday?"#60a5fa":isSun(d)?SUN:theme.text, fontFamily:NUM_FONT }}>{d.getDate()}</span>
            </div>
            <div style={{ minWidth:0, flex:1 }}>
              {chips.map(c=>chip(c, true))}
              {fixedChip(items.fx)}
              {!chips.length && !items.fx.length && <div style={{ fontSize:fz(12), color:theme.textDim }}>—</div>}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── DAY: all-day items on top, then an hour list (07:00–23:00, wider if events fall outside) ──
  // ── Day view timeline ──
  const ROW = 48;   // px per hour
  const toMin = (hhmm) => { const [h,m] = String(hhmm).split(":").map(Number); return (h||0)*60 + (m||0); };
  // Rows run 01:00 … 23:00, then 00:00 last → a start's row index, in minutes from the top
  const rowMin = (m) => { const h = Math.floor(m/60); return ((h===0 ? 23 : h-1) * 60) + (m % 60); };
  // Position events and put overlapping ones side by side (lanes)
  const layoutTimed = (list) => {
    const items = list.map(ev=>{
      const s0 = toMin(ev.start), e0 = ev.end ? toMin(ev.end) : s0 + 60;
      const startY = rowMin(s0), endY = Math.min(24*60, startY + Math.max(15, (e0 > s0 ? e0 : 24*60) - s0));
      return { ev, startY, endY };
    }).sort((a,b)=>a.startY-b.startY || b.endY-a.endY);
    const out = []; let group = [], groupEnd = -1;
    const flush = () => { const lanes = Math.max(...group.map(g=>g.lane+1)); group.forEach(g=>out.push({ ...g, lanes })); group = []; };
    for (const it of items) {
      if (group.length && it.startY >= groupEnd) { flush(); groupEnd = -1; }
      const used = new Set(group.filter(g=>g.endY > it.startY).map(g=>g.lane));
      let lane = 0; while (used.has(lane)) lane++;
      group.push({ ev:it.ev, top:it.startY/60*ROW, height:(it.endY-it.startY)/60*ROW, lane, startY:it.startY, endY:it.endY });
      groupEnd = Math.max(groupEnd, it.endY);
    }
    if (group.length) flush();
    return out;
  };

  const dayView = () => {
    const { evs, gs, fx } = itemsOn(cursor);
    const timed = evs.filter(ev=>!ev.allDay && ev.start), allDay = evs.filter(ev=>ev.allDay || !ev.start);
    // 24-hour clock, 01:00 → 23:00 then 00:00 (midnight) last, like a phone calendar
    const HOURS = [...Array.from({ length:23 }, (_,i)=>i+1), 0];
    return (
      <div ref={dayScrollRef} style={{ flex:1, minHeight:0, overflowY:"auto", display:"flex", flexDirection:"column", gap:10 }}>
        {(allDay.length>0 || gs.length>0 || fx.length>0) && (
          <div style={{ flexShrink:0, background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:12, padding:"10px 12px 4px" }}>
            <div style={sectionTitle}>{t.allDay}</div>
            {allDay.map(ev=>eventRow(ev))}{gs.map(goalRow)}{fx.map(fixedRow)}
          </div>
        )}
        {/* Timeline: hour rows, with timed events laid over them at their real start and length */}
        <div style={{ flexShrink:0, position:"relative", background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:12, overflow:"hidden" }}>
          {HOURS.map((h,i)=>{
            const hh = `${String(h).padStart(2,"0")}:00`, key = `${toISO(cursor)}-${h}`;
            const p = pressable(key, cursor, hh);
            return (
              <div key={h} data-hour={h} {...p} style={{ ...p.style, display:"flex", gap:10, height:ROW, boxSizing:"border-box", padding:"6px 10px", borderTop:i?`1px solid ${theme.border}`:"none", background:"transparent" }}>
                <div style={{ width:42, flexShrink:0, fontSize:fz(11), color:theme.textMuted, fontFamily:NUM_FONT, paddingTop:2 }}>{hh}</div>
              </div>
            );
          })}
          {layoutTimed(timed).map(({ ev, top, height, lane, lanes })=>{
            const c = evColor(ev);
            return (
              <div key={ev.id} onClick={()=>openEdit(ev)} className="cal-ev"
                style={{ position:"absolute", top:top+2, height:Math.max(26, height-4), boxSizing:"border-box",
                  left:`calc(62px + (100% - 70px) * ${lane} / ${lanes})`, width:`calc((100% - 70px) / ${lanes} - 4px)`,
                  display:"flex", gap:8, padding:"6px 10px", overflow:"hidden", cursor:"pointer",
                  background:theme.surface, backgroundImage:`linear-gradient(90deg, ${c}26, ${c}10)`, border:`1px solid ${c}55`, borderLeft:`3px solid ${c}`, borderRadius:8 }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:fz(13), fontWeight:600, color:theme.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ev.title}</div>
                  {height >= 40 && <div style={{ fontSize:fz(11.5), color:theme.textMuted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    <span style={{ fontFamily:NUM_FONT }}>{timeLabel(ev, t)}</span>{ev.location ? ` · ${ev.location}` : ""}
                  </div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── YEAR: 12 mini months; tap a month → month view, tap a day → day view ──
  const yearView = () => (
    <div className="cal-year" style={{ flex:1, minHeight:0, overflowY:"auto", display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))", gap:12, alignContent:"start" }}>
      {Array.from({ length:12 }).map((_,m)=>{
        const first = new Date(cursor.getFullYear(), m, 1), n = new Date(cursor.getFullYear(), m+1, 0).getDate(), lead = (first.getDay()+6)%7;
        const isCur = today.getFullYear()===cursor.getFullYear() && today.getMonth()===m;
        return (
          <div key={m} style={{ background:theme.surface, border:`1px solid ${isCur?"#3b82f655":theme.border}`, borderRadius:12, padding:10 }}>
            <button onClick={()=>{ setCursor(new Date(cursor.getFullYear(), m, 1)); setView("month"); }}
              style={{ background:"none", border:"none", padding:"0 2px 6px", color:isCur?"#60a5fa":theme.text, fontSize:fz(13), fontWeight:600, fontFamily:"inherit", cursor:"pointer", textTransform:"capitalize" }}>
              {first.toLocaleDateString(locale,{ month:"long" })}
            </button>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
              {dayNames.map((d,i)=><div key={`h${i}`} style={{ textAlign:"center", fontSize:fz(9), color:i===6?SUN:theme.textDim }}>{d}</div>)}
              {Array.from({ length:lead }).map((_,i)=><div key={`e${i}`}/>)}
              {Array.from({ length:n }).map((_,i)=>{
                const d = new Date(cursor.getFullYear(), m, i+1), isToday = sameDay(d, today);
                const { evs, gs, fx } = itemsOn(d), dot = evs[0] ? evColor(evs[0]) : gs[0] ? goalColor(gs[0]) : fx.length ? "#f87171" : null;
                return (
                  <button key={i} onClick={()=>{ setCursor(d); setView("day"); }}
                    style={{ position:"relative", aspectRatio:"1", border:"none", borderRadius:6, padding:0, fontSize:fz(10), fontFamily:NUM_FONT, cursor:"pointer",
                      background:isToday?"#2563eb":dot?dot+"26":"transparent", color:isToday?"#fff":isSun(d)?SUN:dot?theme.text:theme.textMuted, fontWeight:isToday||dot?700:400 }}>
                    {i+1}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── Upcoming: events + goal deadlines in one agenda (next 30 days) ──
  const agenda = [
    ...upcomingOccurrences(events, today, 30, 12).map(({ ev, date })=>({ key:`ev${ev.id}-${toISO(date)}`, date, color:evColor(ev), title:ev.title, sub:`${timeLabel(ev, t)}${ev.location?` · ${ev.location}`:""}`, onClick:()=>{ setCursor(date); openEdit(ev); } })),
    ...goals.filter(g=>goalDue(g) && g.progress<100 && daysUntil(goalDue(g))>=0 && daysUntil(goalDue(g))<=30)
      .map(g=>({ key:`g${g.id}`, date:goalDue(g), color:goalColor(g), title:goalName(g), sub:`${t.deadlinesTitle} · ${g.progress}%`, onClick:()=>openGoalSheet(g.id) })),
  ].sort((a,b)=>a.date-b.date).slice(0, 8);

  const showDayPanel = view==="month" || view==="year";
  const dayScrollRef = useRef(null);
  const dayKey = toISO(cursor);
  useEffect(()=>{
    const box = dayScrollRef.current;
    if (view!=="day" || !box || box.scrollHeight <= box.clientHeight + 4) return;   // phones: the page scrolls instead
    const firstEv = eventsOn(events, cursor).find(ev=>!ev.allDay && ev.start);
    const h = sameDay(cursor, today) ? Math.max(0, new Date().getHours()-1) : firstEv ? parseInt(firstEv.start,10) : 7;
    const row = box.querySelector(`[data-hour="${h}"]`);
    if (row) box.scrollTop += row.getBoundingClientRect().top - box.getBoundingClientRect().top - 8;
  },[view, dayKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    // Desktop: the calendar fills the left side, details on the right. Phones (≤ 900px): one scrolling column.
    <div className="cal-layout" style={{ height:"100%", minHeight:0, display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(280px,340px)", gridTemplateRows:"minmax(0,1fr)", gap:20 }}>

    {/* ── LEFT: toolbar + the chosen view ── */}
    <div className="cal-col cal-main" style={{ minHeight:0, display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", flexShrink:0 }}>
        <button onClick={()=>step(-1)} aria-label="‹" style={navBtn}>‹</button>
        <button onClick={()=>step(1)} aria-label="›" style={navBtn}>›</button>
        <div style={{ fontSize:fz(18), fontWeight:600, color:theme.text, textTransform:"capitalize", minWidth:0, padding:"0 4px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{title}</div>
        {!inView && <button onClick={()=>setCursor(today)} style={{ padding:"4px 12px", borderRadius:20, border:"1px solid #60a5fa66", background:"#60a5fa18", color:"#60a5fa", fontSize:fz(12), fontFamily:"inherit", cursor:"pointer" }}>{t.today}</button>}
        <div className="cal-views" style={{ marginLeft:"auto", display:"flex", border:`1px solid ${theme.border}`, borderRadius:20, overflow:"hidden", background:theme.surface }}>
          {VIEWS.map(v=>(
            <button key={v} onClick={()=>setView(v)} style={{ flex:1, padding:"6px 12px", border:"none", background:view===v?"#60a5fa22":"transparent", color:view===v?"#60a5fa":theme.textMuted, fontSize:fz(12), fontFamily:"inherit", fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }}>{t.calViews[v]}</button>
          ))}
        </div>
      </div>

      {view==="month" && monthView()}
      {view==="week"  && weekView()}
      {view==="day"   && dayView()}
      {view==="year"  && yearView()}

      {view!=="year" && <div style={{ fontSize:fz(11), color:theme.textDim, textAlign:"center", flexShrink:0 }}>{t.longPressHint}</div>}
    </div>

    {/* ── RIGHT: the selected day (month/year views) + upcoming ── */}
    <div className="cal-col" style={{ minHeight:0, overflowY:"auto", WebkitOverflowScrolling:"touch", overscrollBehavior:"contain", display:"flex", flexDirection:"column", gap:14 }}>
      {showDayPanel && (
        <div key={toISO(cursor)} style={{ background:theme.surface, border:"1px solid #60a5fa44", borderRadius:14, padding:14, flexShrink:0, animation:"slideDown 0.2s ease" }}>
          <button onClick={()=>setView("day")} style={{ background:"none", border:"none", padding:0, marginBottom:10, textTransform:"capitalize", fontSize:fz(14), fontWeight:600, color:theme.text, fontFamily:"inherit", cursor:"pointer", textAlign:"left" }}>
            {cursor.toLocaleDateString(locale,{ weekday:"long", day:"numeric", month:"long" })}
          </button>
          {dayList(cursor)}
        </div>
      )}

      <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, boxShadow:theme.shadow, borderRadius:14, padding:16, flexShrink:0, backgroundImage:"linear-gradient(180deg, #2dd4bf12, transparent 110px)" }}>
        <div style={sectionTitle}><Icon name="upcoming" size={13} style={{ color:"#2dd4bf" }}/> {t.upcoming}</div>
        {agenda.length===0 && <div style={{ fontSize:fz(13), color:theme.textMuted }}>{t.noEventsSoon}</div>}
        {agenda.map(a=>{
          const n = daysUntil(a.date);
          return (
            <div key={a.key} onClick={a.onClick} className="cal-ev" style={{ display:"flex", alignItems:"center", gap:12, padding:"7px 6px", borderRadius:10, cursor:"pointer" }}>
              <div style={{ width:42, flexShrink:0, textAlign:"center", borderRadius:10, padding:"4px 0", background:a.color+"1f", color:a.color }}>
                <div style={{ fontSize:fz(10), fontWeight:600, textTransform:"uppercase", letterSpacing:"0.04em" }}>{a.date.toLocaleDateString(locale,{ weekday:"short" })}</div>
                <div style={{ fontSize:fz(17), fontWeight:700, lineHeight:1.1, fontFamily:NUM_FONT }}>{a.date.getDate()}</div>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:fz(14), fontWeight:500, color:theme.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.title}</div>
                <div style={{ fontSize:fz(12), color:theme.textMuted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {n===0 ? t.today : n===1 ? t.tomorrow : a.date.toLocaleDateString(locale,{ day:"numeric", month:"short" })} · {a.sub}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* Day pop-up (Android-style): that day's events, deadlines and payments; pick one to open it */}
    {dayPop && (
      <div onClick={onPopBackdrop} style={{ position:"fixed", inset:0, zIndex:85, background:isDark?"rgba(2,6,15,0.6)":"rgba(15,23,42,0.45)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:16, animation:popClosing?"fadeOut 0.28s cubic-bezier(.4,0,.2,1) forwards":popInstant?"none":"fadeIn 0.32s cubic-bezier(.4,0,.2,1)" }}>
        <div onClick={e=>e.stopPropagation()} role="dialog"
          style={{ opacity:sheetOpen&&!formLeaving?0:1, transform:sheetOpen&&!formLeaving?"translateY(8px)":"translateY(0)", pointerEvents:sheetOpen?"none":"auto", transition:"opacity 0.2s ease, transform 0.2s ease",
            width:"100%", maxWidth:420, maxHeight:"calc(100vh - 32px)", overflowY:"auto", background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:18, padding:"16px 16px 10px", boxShadow:"0 24px 60px rgba(0,0,0,0.45)", animation:popClosing?"popOut 0.24s ease forwards":popInstant?"none":"popIn 0.3s cubic-bezier(.2,.8,.2,1)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ width:46, flexShrink:0, textAlign:"center", borderRadius:12, padding:"5px 0", background:sameDay(dayPop,today)?"#2563eb":"#60a5fa1f", color:sameDay(dayPop,today)?"#fff":isSun(dayPop)?SUN:"#60a5fa" }}>
              <div style={{ fontSize:fz(10), fontWeight:600, textTransform:"uppercase", letterSpacing:"0.04em" }}>{dayPop.toLocaleDateString(locale,{ weekday:"short" })}</div>
              <div style={{ fontSize:fz(20), fontWeight:700, lineHeight:1.1, fontFamily:NUM_FONT }}>{dayPop.getDate()}</div>
            </div>
            <button onClick={()=>{ setCursor(dayPop); setView("day"); setDayPop(null); }}
              style={{ flex:1, minWidth:0, background:"none", border:"none", padding:0, textAlign:"left", cursor:"pointer", fontFamily:"inherit", color:theme.text, fontSize:fz(15), fontWeight:600, textTransform:"capitalize" }}>
              {dayPop.toLocaleDateString(locale,{ weekday:"long", day:"numeric", month:"long" })}
              <div style={{ fontSize:fz(12), fontWeight:400, color:"#60a5fa", textTransform:"none" }}>{t.openDay} →</div>
            </button>
            <button onClick={()=>closePop()} aria-label={t.cancel} style={{ background:"none", border:"none", color:theme.textMuted, padding:4, display:"inline-flex", cursor:"pointer" }}><Icon name="close" size={18}/></button>
          </div>
          {dayList(dayPop)}
        </div>
      </div>
    )}

    {sheetGoal && <GoalSheet theme={theme} t={t} lang={lang} goal={sheetGoal} stacked={!!dayPop} onLeaving={()=>setFormLeaving(true)}
      onClose={()=>setGoalSheetIdRaw(null)}
      onToggleStep={(i)=>toggleGoalStep(sheetGoal, i)} onSetProgress={(v)=>setGoalProgress(sheetGoal, v)}
      onOpenFull={()=>{ const id = sheetGoal.id; setGoalSheetIdRaw(null); setDayPopRaw(null); openGoal(id); }}/>}
    {form && <EventForm theme={theme} t={t} initial={form.initial} isNew={form.isNew} stacked={!!dayPop} onLeaving={()=>setFormLeaving(true)} onSave={saveEvent} onDelete={deleteEvent} onClose={()=>setForm(null)}/>}
    </div>
  );
}
