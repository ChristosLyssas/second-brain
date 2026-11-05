import { useState, useEffect } from "react";
import { T } from "../lib/i18n";
import { AREA_COLORS, fz, daysUntil, goalDue, encodeStep, goalSteps, PRIO_RANK, FINANCE_AREA, SAVINGS_COLOR, NUM_FONT, lsGet, lsSet, fmtMoney } from "../lib/helpers";
import { ProgressRing, FadeCard, EmptyState } from "../components/ui";
import { Icon } from "../components/Icon";

// ─── GOALS TAB ────────────────────────────────────────────────────────────────
export default function GoalsTab({ theme, isDark, lang, goals, setGoals, notify, focusGoalId, onFocusHandled }) {
  const t = T[lang];
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newGoal, setNewGoal] = useState({ title:"", areaIdx:0, priority:"high", due:"", targetAmount:"" });
  const [editDraft, setEditDraft] = useState({});
  const [sortBy, setSortByRaw] = useState(()=>lsGet("sb_goal_sort","due"));
  const [showDone, setShowDone] = useState(false);
  const [stepDraft, setStepDraft] = useState("");
  const setSortBy = v=>{ setSortByRaw(v); lsSet("sb_goal_sort",v); };

  const areaName = (idx) => t.areas[idx] ?? t.areas[0];
  const goalTitle = (g) => lang==="el" ? g.titleEl : g.titleEn;
  const sel = selected ? goals.find(g=>g.id===selected.id) : null;

  // Opened from Calendar / Today → select that goal
  useEffect(()=>{
    if (focusGoalId==null) return;
    const g = goals.find(x=>x.id===focusGoalId);
    if (g) { setFilter("all"); setSelected(g); setEditing(false); if (g.progress>=100) setShowDone(true); }
    onFocusHandled?.();
  },[focusGoalId, goals]); // eslint-disable-line react-hooks/exhaustive-deps

  const dueTime = (g) => goalDue(g)?.getTime() ?? Infinity;   // no due date → last
  const sorters = {
    due:      (a,b)=>dueTime(a)-dueTime(b) || PRIO_RANK[a.priority]-PRIO_RANK[b.priority],
    priority: (a,b)=>PRIO_RANK[a.priority]-PRIO_RANK[b.priority] || dueTime(a)-dueTime(b),
    progress: (a,b)=>b.progress-a.progress,
  };
  const inArea = filter==="all" ? goals : goals.filter(g=>g.areaIdx===parseInt(filter));
  const activeGoals = inArea.filter(g=>g.progress<100).sort(sorters[sortBy]||sorters.due);
  const doneGoals   = inArea.filter(g=>g.progress>=100);

  function deleteGoal(goal) {
    setGoals(goals.filter(g=>g.id!==goal.id));
    if (sel?.id===goal.id) { setSelected(null); setEditing(false); }
    notify(t.goalDeleted, { kind:"restoreGoal", item:goal });
  }

  // Steps: saving them also recalculates progress
  function saveSteps(steps) {
    setGoals(goals.map(g=>g.id===sel.id ? { ...g, tasks:steps.map(encodeStep), progress:steps.length ? Math.round(steps.filter(s=>s.done).length/steps.length*100) : g.progress } : g));
  }
  function addStep() {
    const text = stepDraft.trim(); if (!text || !sel) return;
    saveSteps([...goalSteps(sel), { text, done:false }]); setStepDraft("");
  }

  function addGoal() {
    if (!newGoal.title.trim()) return;
    const amt = newGoal.areaIdx===FINANCE_AREA ? parseFloat(String(newGoal.targetAmount).replace(",",".")) : NaN;
    setGoals([...goals, { id:Date.now(), areaIdx:newGoal.areaIdx, priority:newGoal.priority, progress:0, due:newGoal.due, tasks:[], titleEl:newGoal.title, titleEn:newGoal.title, ...(amt>0?{ targetAmount:amt }:{}) }]);
    setNewGoal({ title:"", areaIdx:0, priority:"high", due:"", targetAmount:"" });
    setAdding(false);
  }

  function startEdit() {
    if (!sel) return;
    setEditDraft({ title:goalTitle(sel), areaIdx:sel.areaIdx, priority:sel.priority, due:sel.due||"", targetAmount:sel.targetAmount?String(sel.targetAmount):"" });
    setEditing(true);
  }

  function saveEdit() {
    if (!sel) return;
    const amt = editDraft.areaIdx===FINANCE_AREA ? parseFloat(String(editDraft.targetAmount).replace(",",".")) : NaN;
    // A number links the goal to savings; null clears an existing link; undefined leaves the field untouched
    const targetAmount = amt>0 ? amt : (sel.targetAmount!=null ? null : undefined);
    setGoals(goals.map(g=>g.id===sel.id?{...g,titleEl:editDraft.title,titleEn:editDraft.title,areaIdx:editDraft.areaIdx,priority:editDraft.priority,due:editDraft.due,targetAmount}:g));
    setEditing(false);
  }

  const iStyle = { background:theme.input, border:`1px solid ${theme.borderStrong}`, borderRadius:8, padding:"10px 14px", color:theme.text, fontSize:fz(14), fontFamily:"inherit" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14, height:"100%", minHeight:0 }}>
      {/* Filter row */}
      <div className="txn-toolbar" style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", flexShrink:0 }}>
        <div className="txn-chips" style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        <button onClick={()=>setFilter("all")} style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${filter==="all"?"#60a5fa":theme.border}`, background:filter==="all"?"#60a5fa22":"transparent", color:filter==="all"?"#60a5fa":theme.textMuted, fontSize:fz(13), fontFamily:"inherit", cursor:"pointer", fontWeight:filter==="all"?600:400 }}>{t.allAreas}</button>
        {t.areas.map((a,i)=>{ const color=AREA_COLORS[a]||"#60a5fa", active=filter===String(i); return <button key={i} onClick={()=>setFilter(String(i))} style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${active?color:theme.border}`, background:active?color+"22":"transparent", color:active?color:theme.textMuted, fontSize:fz(13), fontFamily:"inherit", cursor:"pointer", fontWeight:active?600:400 }}>{a}</button>; })}
        </div>
        <div className="txn-actions" style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
        <select className="sort-select" value={sortBy} onChange={e=>setSortBy(e.target.value)} aria-label={t.sortLabel}
          style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:20, color:theme.textMuted, fontSize:fz(12), padding:"6px 10px", fontFamily:"inherit" }}>
          <option value="due">{t.sortDue}</option>
          <option value="priority">{t.sortPriority}</option>
          <option value="progress">{t.sortProgress}</option>
        </select>
        <button onClick={()=>setAdding(true)} style={{ padding:"6px 16px", borderRadius:20, border:`1px solid ${isDark?"#1d4ed8":"#3b82f6"}`, background:isDark?"#1e3a8a":"#eff6ff", color:isDark?"#93c5fd":"#2563eb", fontSize:fz(13), fontFamily:"inherit", cursor:"pointer", fontWeight:500 }}>{t.newGoal}</button>
        </div>
      </div>

      <div className="goals-split" style={{ flex:1, minHeight:0, display:"grid", gridTemplateColumns:sel?"1fr min(380px,42%)":"1fr", gap:16, transition:"grid-template-columns 0.3s" }}>
        {/* Goals grid */}
        <div style={{ overflowY:"auto", minHeight:0, WebkitOverflowScrolling:"touch", overscrollBehavior:"contain" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:14, alignContent:"start", padding:"6px 6px 16px" }}>
            {adding && (
              <div style={{ background:theme.surface, border:`1px solid ${isDark?"#1d4ed8":"#93c5fd"}`, borderRadius:16, padding:20, gridColumn:"1/-1", animation:"slideDown 0.2s ease" }}>
                <div style={{ fontSize:fz(11), color:"#60a5fa", letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:14, fontWeight:600 }}>{t.newGoalTitle}</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <input placeholder={t.goalPlaceholder} value={newGoal.title} onChange={e=>setNewGoal({...newGoal,title:e.target.value})} style={{ ...iStyle, gridColumn:"1/-1", width:"100%" }}/>
                  <select value={newGoal.areaIdx} onChange={e=>setNewGoal({...newGoal,areaIdx:parseInt(e.target.value)})} style={iStyle}>{t.areas.map((a,i)=><option key={i} value={i}>{a}</option>)}</select>
                  <select value={newGoal.priority} onChange={e=>setNewGoal({...newGoal,priority:e.target.value})} style={iStyle}>
                    <option value="high">{t.priority.high}</option><option value="medium">{t.priority.medium}</option><option value="low">{t.priority.low}</option>
                  </select>
                  <input type="date" value={newGoal.due} onChange={e=>setNewGoal({...newGoal,due:e.target.value})} style={{ ...iStyle, gridColumn:"1/-1", width:"100%", colorScheme:isDark?"dark":"light" }}/>
                  {newGoal.areaIdx===FINANCE_AREA && (
                    <div style={{ gridColumn:"1/-1" }}>
                      <input type="number" inputMode="decimal" min="0" placeholder={t.targetAmountLabel} value={newGoal.targetAmount} onChange={e=>setNewGoal({...newGoal,targetAmount:e.target.value})} style={{ ...iStyle, width:"100%" }}/>
                      <div style={{ fontSize:fz(11), color:theme.textMuted, marginTop:4 }}><Icon name="savings" size={12}/> {t.linkedSavingsHint}</div>
                    </div>
                  )}
                </div>
                <div style={{ display:"flex", gap:8, marginTop:14 }}>
                  <button onClick={addGoal} style={{ flex:1, padding:"10px", background:"#2563eb", border:"none", borderRadius:8, color:"#fff", fontSize:fz(13), fontFamily:"inherit", cursor:"pointer", fontWeight:600 }}>{t.add}</button>
                  <button onClick={()=>setAdding(false)} style={{ padding:"10px 18px", background:theme.input, border:`1px solid ${theme.borderStrong}`, borderRadius:8, color:theme.textMuted, fontSize:fz(13), fontFamily:"inherit", cursor:"pointer" }}>{t.cancel}</button>
                </div>
              </div>
            )}
            {!adding && activeGoals.length===0 && doneGoals.length===0 && (
              <div style={{ gridColumn:"1/-1" }}>
                {goals.length===0
                  ? <EmptyState theme={theme} icon="target" title={t.emptyGoalsTitle} hint={t.emptyGoalsHint} action={t.newGoal.replace(/^\+\s*/,"")} onAction={()=>setAdding(true)}/>
                  : <EmptyState theme={theme} compact icon="search" title={t.emptyGoalsTitle} hint={t.noResultsHint}/>}
              </div>
            )}
            {[...activeGoals, ...(doneGoals.length?[{ __sep:true }]:[]), ...(showDone?doneGoals:[])].map((goal)=>{
              // Collapsible "Completed" divider between active and finished goals
              if (goal.__sep) return (
                <button key="__sep" onClick={()=>setShowDone(!showDone)} style={{ gridColumn:"1/-1", display:"flex", alignItems:"center", gap:10, background:"none", border:"none", color:theme.textMuted, fontSize:fz(12), fontFamily:"inherit", padding:"6px 2px", textAlign:"left" }}>
                  <span style={{ fontWeight:600, letterSpacing:"0.08em" }}>{t.completedGoals(doneGoals.length)}</span>
                  <span style={{ flex:1, height:1, background:theme.border }}/>
                  <span>{showDone?"▴":"▾"}</span>
                </button>
              );
              const color=AREA_COLORS[areaName(goal.areaIdx)]||"#60a5fa", isSel=sel?.id===goal.id;
              const dueDate = goalDue(goal);
              const isOverdue = dueDate && daysUntil(dueDate) < 0 && goal.progress < 100;
              const steps = goalSteps(goal), stepsDone = steps.filter(s=>s.done).length;
              return (
                <FadeCard key={goal.id} className="goal-card" onClick={()=>{ setSelected(isSel?null:goal); setEditing(false); }}
                  style={{ "--c":color, background:isSel?(isDark?"#0c1e3d":"#eff6ff"):theme.surface, backgroundImage:`linear-gradient(180deg, ${color}14, transparent 120px)`, border:`1px solid ${isSel?color+"99":isOverdue?"#f8717144":theme.border}`, borderRadius:16, padding:"20px 20px 16px", position:"relative", boxShadow:isSel?`0 0 0 1px ${color}33,0 6px 30px ${color}18`:theme.shadow }}>
                  <button className="del-btn" aria-label={t.deleteGoal} onClick={e=>{ e.stopPropagation(); deleteGoal(goal); }} style={{ position:"absolute",top:12,right:12,background:theme.input,border:"none",borderRadius:6,color:"#f87171",fontSize:fz(15),cursor:"pointer",padding:"2px 8px" }}>×</button>
                  <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
                    <ProgressRing progress={goal.progress} color={color} theme={theme}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:fz(15), fontWeight:600, color:theme.text, lineHeight:1.35, marginBottom:6, paddingRight:24, overflowWrap:"anywhere" }}>{goalTitle(goal)}</div>
                      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                        <span style={{ fontSize:fz(11), padding:"2px 8px", borderRadius:10, background:color+"20", color, fontWeight:500 }}>{areaName(goal.areaIdx)}</span>
                        <span style={{ fontSize:fz(11), padding:"2px 8px", borderRadius:10, background:goal.priority==="high"?"#f8717120":goal.priority==="medium"?"#fbbf2420":"#34d39920", color:goal.priority==="high"?"#f87171":goal.priority==="medium"?"#fbbf24":"#34d399", fontWeight:500 }}>{t.priority[goal.priority]}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ height:4, background:theme.ring, borderRadius:2, marginBottom:10, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${goal.progress}%`, background:color, borderRadius:2, transition:"width 0.6s cubic-bezier(.4,0,.2,1)" }}/>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:"4px 8px", fontSize:fz(12), color:theme.textMuted }}>
                    <span style={{ color:isOverdue?"#f87171":theme.textMuted, whiteSpace:"nowrap" }}>
                      <Icon name="date" size={13}/> {dueDate ? dueDate.toLocaleDateString(T[lang].dateLocale,{day:"numeric",month:"short",year:"numeric"}) : "—"}
                      {isOverdue && <> <Icon name="warn" size={12}/></>}
                    </span>
                    {goal.savedSoFar!=null
                      ? <span style={{ color:SAVINGS_COLOR, fontFamily:NUM_FONT, whiteSpace:"nowrap" }}><Icon name="savings" size={13}/> {fmtMoney(goal.savedSoFar,lang)} / {fmtMoney(goal.targetAmount,lang)}</span>
                      : steps.length>0 && <span><Icon name="steps" size={13}/> {stepsDone}/{steps.length}</span>}
                  </div>
                </FadeCard>
              );
            })}
          </div>
        </div>

        {/* Detail / Edit panel */}
        {sel && (
          <div className="goal-detail" style={{ overflowY:"auto", minHeight:0, WebkitOverflowScrolling:"touch" }}>
            <div style={{ background:theme.surface, border:`1px solid ${AREA_COLORS[areaName(sel.areaIdx)]||theme.border}44`, borderRadius:16, padding:24, animation:"slideIn 0.22s ease" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                <span style={{ fontSize:fz(11), color:AREA_COLORS[areaName(sel.areaIdx)], letterSpacing:"0.18em", textTransform:"uppercase", fontWeight:600 }}>{areaName(sel.areaIdx)}</span>
                <div style={{ display:"flex", gap:8 }}>
                  {!editing && <button onClick={startEdit} style={{ background:theme.input, border:`1px solid ${theme.border}`, borderRadius:8, color:theme.textMuted, cursor:"pointer", fontSize:fz(12), padding:"4px 12px", fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:6 }}><Icon name="edit" size={12}/>{t.edit}</button>}
                  <button onClick={()=>{ setSelected(null); setEditing(false); }} style={{ background:"none", border:"none", color:theme.textMuted, cursor:"pointer", fontSize:fz(20)}}>×</button>
                </div>
              </div>

              {editing ? (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  <input value={editDraft.title} onChange={e=>setEditDraft({...editDraft,title:e.target.value})} style={{ ...iStyle, fontSize:fz(17), fontWeight:600 }}/>
                  <select value={editDraft.areaIdx} onChange={e=>setEditDraft({...editDraft,areaIdx:parseInt(e.target.value)})} style={iStyle}>{t.areas.map((a,i)=><option key={i} value={i}>{a}</option>)}</select>
                  <select value={editDraft.priority} onChange={e=>setEditDraft({...editDraft,priority:e.target.value})} style={iStyle}>
                    <option value="high">{t.priority.high}</option><option value="medium">{t.priority.medium}</option><option value="low">{t.priority.low}</option>
                  </select>
                  <input type="date" value={editDraft.due} onChange={e=>setEditDraft({...editDraft,due:e.target.value})} style={{ ...iStyle, colorScheme:isDark?"dark":"light" }}/>
                  {editDraft.areaIdx===FINANCE_AREA && (
                    <div>
                      <input type="number" inputMode="decimal" min="0" placeholder={t.targetAmountLabel} value={editDraft.targetAmount} onChange={e=>setEditDraft({...editDraft,targetAmount:e.target.value})} style={{ ...iStyle, width:"100%" }}/>
                      <div style={{ fontSize:fz(11), color:theme.textMuted, marginTop:4 }}><Icon name="savings" size={12}/> {t.linkedSavingsHint}</div>
                    </div>
                  )}
                  <div style={{ display:"flex", gap:8, marginTop:6 }}>
                    <button onClick={saveEdit} style={{ flex:1, padding:"10px", background:"#2563eb", border:"none", borderRadius:8, color:"#fff", fontSize:fz(13), fontFamily:"inherit", cursor:"pointer", fontWeight:600 }}>{t.saveEdit}</button>
                    <button onClick={()=>setEditing(false)} style={{ padding:"10px 14px", background:theme.input, border:`1px solid ${theme.borderStrong}`, borderRadius:8, color:theme.textMuted, fontSize:fz(13), fontFamily:"inherit", cursor:"pointer" }}>{t.cancel}</button>
                  </div>
                  <button onClick={()=>deleteGoal(sel)} style={{ padding:"9px", background:"#f8717115", border:"1px solid #f8717144", borderRadius:8, color:"#f87171", fontSize:fz(13), fontFamily:"inherit", cursor:"pointer", display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6 }}><Icon name="trash" size={14}/>{t.deleteGoal}</button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize:fz(20), fontWeight:500, letterSpacing:"0.01em", color:theme.text, lineHeight:1.35, marginBottom:20 }}>{goalTitle(sel)}</div>
                  <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}>
                    <ProgressRing progress={sel.progress} color={AREA_COLORS[areaName(sel.areaIdx)]||"#60a5fa"} size={100} theme={theme}/>
                  </div>
                  <div style={{ marginBottom:18 }}>
                    <div style={{ fontSize:fz(11), color:theme.textMuted, marginBottom:8, letterSpacing:"0.15em", textTransform:"uppercase", fontWeight:600 }}>{t.progressLabel}</div>
                    {sel.savedSoFar!=null ? (
                      <div>
                        <div style={{ fontSize:fz(18), fontFamily:NUM_FONT, color:SAVINGS_COLOR }}>
                          {fmtMoney(sel.savedSoFar,lang)} <span style={{ fontSize:fz(13), color:theme.textMuted }}>/ {fmtMoney(sel.targetAmount,lang)}</span>
                        </div>
                        <div style={{ fontSize:fz(12), color:theme.textMuted, marginTop:2 }}>
                          <Icon name="savings" size={12}/> {t.linkedSavings}{sel.savedSoFar<sel.targetAmount && ` · ${t.stillNeeded(fmtMoney(sel.targetAmount-sel.savedSoFar,lang))}`}
                        </div>
                      </div>
                    ) : goalSteps(sel).length>0
                      ? <div>
                          <div style={{ fontSize:fz(18), fontFamily:NUM_FONT, color:theme.text }}>
                            {t.stepsOf(goalSteps(sel).filter(s=>s.done).length, goalSteps(sel).length)}
                          </div>
                          <div style={{ fontSize:fz(12), color:theme.textMuted, marginTop:2 }}><Icon name="steps" size={12}/> {t.autoProgress}</div>
                        </div>
                      : <input type="range" min={0} max={100} value={sel.progress} onChange={e=>setGoals(goals.map(g=>g.id===sel.id?{...g,progress:Number(e.target.value)}:g))} style={{ width:"100%", accentColor:AREA_COLORS[areaName(sel.areaIdx)]||"#60a5fa" }}/>}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
                    {[
                      { label:t.dueLabel, value: goalDue(sel) ? goalDue(sel).toLocaleDateString(T[lang].dateLocale,{day:"numeric",month:"short",year:"numeric"}) : "—" },
                      { label:t.priorityLabel, value:t.priority[sel.priority] }
                    ].map(m=>(
                      <div key={m.label} style={{ background:theme.input, borderRadius:10, padding:"10px 14px", border:`1px solid ${theme.border}` }}>
                        <div style={{ fontSize:fz(11), color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:4, fontWeight:600 }}>{m.label}</div>
                        <div style={{ fontSize:fz(14), color:theme.text, fontWeight:500 }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                  {/* Steps — tick them off and progress updates itself */}
                  {(()=>{
                    const steps = goalSteps(sel), color = AREA_COLORS[areaName(sel.areaIdx)]||"#60a5fa";
                    return (
                      <div>
                        <div style={{ fontSize:fz(11), color:theme.textMuted, letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:10, fontWeight:600 }}>
                          {t.stepsLabel}{steps.length>0 && ` · ${steps.filter(s=>s.done).length}/${steps.length}`}
                        </div>
                        {steps.map((st,i)=>(
                          <div key={i} className="txn-row" style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:`1px solid ${theme.border}` }}>
                            <button onClick={()=>saveSteps(steps.map((s,j)=>j===i?{ ...s, done:!s.done }:s))} aria-label={st.done?"✓":"○"}
                              style={{ width:20, height:20, flexShrink:0, borderRadius:6, border:`1.5px solid ${st.done?color:theme.borderStrong}`, background:st.done?color:"transparent", color:"#fff", fontSize:fz(12), lineHeight:1, display:"flex", alignItems:"center", justifyContent:"center", padding:0 }}>{st.done && <Icon name="check" size={13} strokeWidth={3}/>}</button>
                            <span onClick={()=>saveSteps(steps.map((s,j)=>j===i?{ ...s, done:!s.done }:s))} style={{ flex:1, fontSize:fz(13), color:st.done?theme.textMuted:theme.text, textDecoration:st.done?"line-through":"none", cursor:"pointer" }}>{st.text}</span>
                            <button className="row-action" aria-label={t.deleteGoal} onClick={()=>saveSteps(steps.filter((_,j)=>j!==i))} style={{ background:"none", border:"none", color:"#f87171", fontSize:fz(15), padding:"0 4px" }}>×</button>
                          </div>
                        ))}
                        <div style={{ display:"flex", gap:6, marginTop:10 }}>
                          <input value={stepDraft} onChange={e=>setStepDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addStep()} placeholder={t.addStepPlaceholder}
                            style={{ ...iStyle, flex:1, minWidth:0, padding:"8px 12px", fontSize:fz(13) }}/>
                          <button onClick={addStep} aria-label="+" style={{ padding:"0 14px", background:color+"22", border:`1px solid ${color}66`, borderRadius:8, color, fontSize:fz(16), fontWeight:600 }}>+</button>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
