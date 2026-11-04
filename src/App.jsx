import { useState, useEffect, useRef, useCallback } from "react";
import { auth, goalsDB, notesDB, txnsDB } from "./lib/supabase";
import { T } from "./lib/i18n";
import { fz, DARK, LIGHT, isSaving } from "./lib/helpers";
import AuthScreen from "./AuthScreen";
import GoalsTab from "./tabs/GoalsTab";
import CalendarTab from "./tabs/CalendarTab";
import WhispererTab from "./tabs/WhispererTab";
import BudgetTab from "./tabs/BudgetTab";
import TodayTab from "./tabs/TodayTab";
import ProfileTab from "./tabs/ProfileTab";

let Analytics = () => null;
try { const mod = await import("@vercel/analytics/react").catch(()=>null); if(mod) Analytics=mod.Analytics; } catch {}

// ─── useSupabaseData ───────────────────────────────────────────────────────────
function useSupabaseData(dbHelpers, userId, localKey) {
  const [data, setDataRaw] = useState(()=>{ try{ const s=localStorage.getItem(localKey); return s?JSON.parse(s):[]; }catch{ return []; } });
  const [loading, setLoading] = useState(true);
  const setData = useCallback((v)=>{ setDataRaw(prev=>{ const next=typeof v==="function"?v(prev):v; try{ localStorage.setItem(localKey,JSON.stringify(next)); }catch{} return next; }); },[localKey]);
  useEffect(()=>{ if(!userId){ setLoading(false); return; } setLoading(true); dbHelpers.fetch(userId).then(rows=>{ setData(rows); setLoading(false); }).catch(err=>{ console.error(err); setLoading(false); }); },[userId]); // eslint-disable-line
  return [data,setData,loading];
}

// ─── LiveStats ─────────────────────────────────────────────────────────────────
function LiveStats({ theme, t, goalCount, noteCount }) {
  return (
    <div style={{ display:"flex", gap:16 }}>
      {[{label:t.goals,value:goalCount,color:"#60a5fa"},{label:t.notes,value:noteCount,color:"#a78bfa"}].map(s=>(
        <div key={s.label} style={{ textAlign:"right" }}>
          <div style={{ fontSize:fz(22), fontWeight:500, color:s.color, lineHeight:1 }}>{s.value}</div>
          <div style={{ fontSize:fz(10), color:theme.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginTop:2, fontWeight:500 }}>{s.label}</div>
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

  const [tab,    setTabRaw]    = useState(()=>{ const l=localStorage.getItem("sb_tab"); return l||"today"; });
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
  const TABS = ["today","goals","whisperer","budget","calendar"];

  // ── Finance goals with a target amount track total savings ──────────────────
  // goalsView adds a computed progress + savedSoFar for display; setGoalsView strips them again
  // before saving, so the DB `progress` of a linked goal is never overwritten by the computed value.
  const totalSaved = txns.filter(isSaving).reduce((s,tx)=>s+Math.abs(tx.amount),0);
  const isLinked = (g) => Number(g.targetAmount) > 0;
  const linkedProgress = (g) => Math.min(100, Math.round((totalSaved/Number(g.targetAmount))*100));
  const goalsView = goals.map(g => isLinked(g) ? { ...g, progress:linkedProgress(g), savedSoFar:totalSaved } : g);
  const setGoalsView = (u) => setGoals(prev => {
    const next = typeof u==="function" ? u(goalsView) : u;
    return next.map(g => {
      const clean = { ...g }; delete clean.savedSoFar;
      const raw = prev.find(x=>x.id===g.id);
      if (raw && isLinked(clean) && clean.progress===linkedProgress(clean)) clean.progress = raw.progress;
      return clean;
    });
  });

  // Open a specific goal from Calendar / Today
  const [focusGoalId, setFocusGoalId] = useState(null);
  const openGoal = (id) => { setFocusGoalId(id); setTab("goals"); };

  // Shared toast with an optional action (undo delete / go to tab)
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  useEffect(()=>()=>clearTimeout(toastTimer.current),[]);
  const notify = (text, action=null) => {
    clearTimeout(toastTimer.current);
    setToast({ text, action });
    toastTimer.current = setTimeout(()=>setToast(null), 5000);
  };
  function runToastAction() {
    const a = toast?.action; if (!a) return;
    if (a.kind==="restoreGoal" || a.kind==="restoreNote") {
      const item = { ...a.item, id:Date.now() }; delete item.createdAt;   // re-inserted as a new row
      if (a.kind==="restoreGoal") setGoalsView([...goalsView, item]);
      else setNotes([item, ...notes]);
    } else if (a.kind==="goto") setTab(a.tab);
    clearTimeout(toastTimer.current); setToast(null);
  }

  return (
    <div style={{ position:"fixed", inset:0, background:theme.bg, fontFamily:"'DM Mono','Courier New',monospace", color:theme.text, textAlign:"left", display:"flex", flexDirection:"column", overflow:"hidden", transition:"background 0.3s,color 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        :root { --fs:1; }
        @media (min-width:641px)  { :root { --fs:1.15; } }
        @media (min-width:1600px) { :root { --fs:1.22; } }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:${theme.scrollThumb}; border-radius:4px; }
        .goal-card:hover { transform:translateY(-3px) !important; box-shadow:0 10px 36px rgba(0,0,0,0.18) !important; }
        .note-card:hover { transform:translateY(-2px); }
        .del-btn { opacity:0; transition:opacity 0.15s; } .goal-card:hover .del-btn { opacity:1; }
        .row-action { opacity:0.35; transition:opacity 0.15s; } .txn-row:hover .row-action, .row-action:focus-visible { opacity:1; }
        @media (hover:none) { .row-action { opacity:0.7; } .del-btn { opacity:0.8; } }
        /* Calendar: side-by-side on wide screens, one scrolling column on narrow ones */
        @media (max-width:900px) {
          .cal-layout { display:flex !important; flex-direction:column; overflow-y:auto; -webkit-overflow-scrolling:touch; }
          .cal-col    { overflow:visible !important; min-height:auto !important; flex-shrink:0; }
        }
        input,select,textarea { outline:none; transition:border-color 0.18s; font-size:calc(14px * var(--fs, 1)); }
        input:focus,textarea:focus { border-color:#7c3aed !important; }
        .auth-input:focus { border-color:#60a5fa !important; }
        textarea { resize:none; } button { cursor:pointer; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(12px)} to{opacity:1;transform:translateX(0)} }
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(400%)} }
        /* ── MOBILE ── */
        @media (max-width:640px) {
          .desktop-tabs { display:none !important; }
          .hdr-extra    { display:none !important; }   /* language, theme, profile, sign out → "Me" tab on phones */
          .mobile-nav   { display:flex !important; }
          .hpad { padding:14px 16px 0 !important; }
          .cpad { padding:10px 14px 0 !important; }
          ::-webkit-scrollbar { width:0px; }
          /* Budget: hide desktop grid, show swipeable on mobile */
          .budget-desktop { display:none !important; }
          .budget-mobile  { display:flex !important; }
          /* Budget: one page scroll on phones — no small nested scroll boxes */
          .budget-root    { display:block !important; overflow-y:auto; -webkit-overflow-scrolling:touch; overscroll-behavior:contain; padding-bottom:16px; }
          .budget-root > * + * { margin-top:12px; }
          .budget-fill    { height:auto !important; }
          .budget-scroll  { overflow:visible !important; flex:none !important; min-height:0 !important; }
          /* Goals: the detail panel opens full-screen instead of squeezing next to the cards */
          .goals-split    { grid-template-columns:1fr !important; }
          .goal-detail    { position:fixed; top:0; left:0; right:0; bottom:calc(65px + env(safe-area-inset-bottom,0px)); z-index:40; background:${theme.bg}; padding:14px; }
        }
        @media (min-width:641px) {
          .mobile-nav    { display:none !important; }
          .budget-mobile { display:none !important; }
          .hpad { padding:20px 40px 0; }
          .tpad { padding:14px 40px 0; }
          .cpad { padding:16px 40px 20px; }
        }
      `}</style>

      {isLoading && (
        <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:theme.border, zIndex:100, overflow:"hidden" }}>
          <div style={{ position:"absolute", top:0, left:0, width:"40%", height:"100%", background:"linear-gradient(90deg,transparent,#60a5fa,transparent)", animation:"shimmer 1.2s infinite" }}/>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="hpad" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"nowrap", gap:8, flexShrink:0 }}>
        <div>
          <div style={{ fontSize:fz(11), letterSpacing:"0.12em", color:theme.textMuted, marginBottom:2, textTransform:"uppercase", fontWeight:500 }}>
            {new Date().toLocaleDateString(t.dateLocale,{ weekday:"long", day:"numeric", month:"long", year:"numeric" })}
          </div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", lineHeight:1.05, color:theme.text }}>
            <span style={{ fontSize:fz(16), fontWeight:700, opacity:0.55 }}>{t.appTitle[0]} </span>
            <span style={{ fontSize:fz(30), fontWeight:800, color:"#60a5fa" }}>{t.appTitle[1]}</span>
          </h1>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <LiveStats theme={theme} t={t} goalCount={goals.length} noteCount={notes.length}/>

          <button className="hdr-extra" onClick={()=>setLang(lang==="el"?"en":"el")} style={{ padding:"5px 10px", borderRadius:20, border:`1px solid ${theme.border}`, background:theme.surface, color:theme.text, fontSize:fz(12), fontFamily:"inherit", fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
            <span>{lang==="el"?"🇬🇷":"🇬🇧"}</span><span style={{ fontSize:fz(10), color:theme.textMuted }}>{lang==="el"?"EN":"ΕΛ"}</span>
          </button>

          <button className="hdr-extra" onClick={()=>setIsDark(!isDark)} style={{ width:42, height:22, borderRadius:11, background:isDark?"#1e3a8a":"#e0e7ff", border:`1px solid ${isDark?"#3b82f6":"#a5b4fc"}`, cursor:"pointer", position:"relative", transition:"background 0.3s", flexShrink:0 }}>
            <div style={{ position:"absolute", top:2, left:isDark?2:19, width:16, height:16, borderRadius:"50%", background:isDark?"#60a5fa":"#6366f1", transition:"left 0.25s cubic-bezier(.4,0,.2,1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:fz(9)}}>{isDark?"🌙":"☀️"}</div>
          </button>

          {/* Profile button */}
          <button className="hdr-extra" onClick={()=>setTab("profile")} style={{ width:32, height:32, borderRadius:"50%", background:tab==="profile"?"#2563eb":theme.input, border:`2px solid ${tab==="profile"?"#2563eb":theme.borderStrong}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:fz(14), transition:"all 0.18s", flexShrink:0, overflow:"hidden" }}>
            {session.user.user_metadata?.avatar_url
              ? <img src={session.user.user_metadata.avatar_url} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
              : "👤"}
          </button>

          <button className="hdr-extra" onClick={()=>auth.signOut()} style={{ padding:"5px 12px", borderRadius:20, border:`1px solid ${theme.border}`, background:"transparent", color:theme.textMuted, fontSize:fz(11), fontFamily:"inherit", cursor:"pointer", transition:"all 0.18s" }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor="#f87171"; e.currentTarget.style.color="#f87171"; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor=theme.border; e.currentTarget.style.color=theme.textMuted; }}>
            {t.signOut}
          </button>
        </div>
      </div>

      {/* ── DESKTOP TABS ── */}
      <div className="tpad desktop-tabs" style={{ display:"flex", gap:4, flexShrink:0 }}>
        {TABS.map(id=>(
          <button key={id} onClick={()=>setTab(id)} style={{ padding:"7px 16px", border:`1px solid ${theme.border}`, borderBottom:tab===id?`1px solid ${theme.bg}`:`1px solid ${theme.border}`, borderRadius:"10px 10px 0 0", background:tab===id?theme.surface:"transparent", color:tab===id?theme.text:theme.textMuted, fontSize:fz(13), fontFamily:"inherit", fontWeight:tab===id?500:400, transition:"all 0.18s" }}>
            {t.tabs[id]}
          </button>
        ))}
        {tab==="profile" && (
          <button style={{ padding:"7px 16px", border:`1px solid ${theme.border}`, borderBottom:`1px solid ${theme.bg}`, borderRadius:"10px 10px 0 0", background:theme.surface, color:theme.text, fontSize:fz(13), fontFamily:"inherit", fontWeight:500 }}>{t.tabs.profile}</button>
        )}
        <div style={{ flex:1, borderBottom:`1px solid ${theme.border}` }}/>
      </div>

      {/* ── CONTENT ── */}
      <div className="cpad" style={{ flex:1, minHeight:0, display:"flex", flexDirection:"column" }}>
        {tab==="today"     && <TodayTab     theme={theme} lang={lang} goals={goalsView} notes={notes} txns={txns} savingsTarget={savingsTarget} displayName={session.user.user_metadata?.display_name} setTab={setTab} openGoal={openGoal}/>}
        {tab==="goals"     && <GoalsTab     theme={theme} isDark={isDark} lang={lang} goals={goalsView} setGoals={setGoalsView} notify={notify} focusGoalId={focusGoalId} onFocusHandled={()=>setFocusGoalId(null)}/>}
        {tab==="whisperer" && <WhispererTab theme={theme} isDark={isDark} lang={lang} notes={notes} setNotes={setNotes} goals={goalsView} setGoals={setGoalsView} notify={notify}/>}
        {tab==="budget"    && <BudgetTab    theme={theme} isDark={isDark} lang={lang} txns={txns} setTxns={setTxns} savingsTarget={savingsTarget} setSavingsTarget={setSavingsTarget}/>}
        {tab==="calendar"  && <CalendarTab  theme={theme} isDark={isDark} lang={lang} goals={goalsView} txns={txns} openGoal={openGoal}/>}
        {tab==="profile"   && <ProfileTab   theme={theme} isDark={isDark} lang={lang} session={session} setLang={setLang} setIsDark={setIsDark} savingsTarget={savingsTarget} setSavingsTarget={setSavingsTarget} goals={goals} notes={notes} txns={txns}/>}
      </div>

      {/* Shared toast (undo / go to) */}
      {toast && (
        <div style={{ position:"fixed", left:"50%", transform:"translateX(-50%)", bottom:"calc(84px + env(safe-area-inset-bottom,0px))", zIndex:60, display:"flex", alignItems:"center", gap:14, padding:"10px 16px", background:isDark?"#1e293b":"#0f172a", color:"#f1f5f9", borderRadius:12, boxShadow:"0 8px 30px rgba(0,0,0,0.3)", fontSize:fz(13), animation:"fadeUp 0.2s ease", whiteSpace:"nowrap" }}>
          <span>{toast.text}</span>
          {toast.action && (
            <button onClick={runToastAction} style={{ background:"none", border:"none", color:"#60a5fa", fontWeight:600, fontSize:fz(13), fontFamily:"inherit" }}>
              {toast.action.kind==="goto" ? t.view : t.undo}
            </button>
          )}
        </div>
      )}

      {/* ── MOBILE BOTTOM NAV ── */}
      <div className="mobile-nav" style={{ display:"none", position:"fixed", bottom:0, left:0, right:0, background:theme.surface, borderTop:`1px solid ${theme.border}`, padding:"6px 0 calc(6px + env(safe-area-inset-bottom,0px))", zIndex:50, justifyContent:"space-around", alignItems:"center" }}>
        {[...TABS,"profile"].map(id=>{
          const icons={ today:"☀️", goals:"🎯", whisperer:"🌀", budget:"💸", calendar:"📅", profile:"👤" };
          const labels={ today:t.todayLabel, goals:t.goals, whisperer:"Whisperer", budget:"Budget", calendar:"Calendar", profile:"Me" };
          const active=tab===id;
          return (
            <button key={id} onClick={()=>setTab(id)}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2, background:"none", border:"none", padding:"4px 4px", borderRadius:10, cursor:"pointer", color:active?"#60a5fa":theme.textMuted, minWidth:44, flex:1 }}>
              {id==="profile"&&session.user.user_metadata?.avatar_url
                ? <img src={session.user.user_metadata.avatar_url} style={{ width:22, height:22, borderRadius:"50%", objectFit:"cover", border:`2px solid ${active?"#60a5fa":theme.border}` }}/>
                : <span style={{ fontSize:fz(20)}}>{icons[id]}</span>}
              <span style={{ fontSize:fz(10), fontWeight:active?600:400 }}>{labels[id]}</span>
              {active && <div style={{ width:3, height:3, borderRadius:"50%", background:"#60a5fa" }}/>}
            </button>
          );
        })}
      </div>

      {/* Spacer so content isn't behind mobile nav */}
      <div className="mobile-nav" style={{ display:"none", height:65, flexShrink:0 }}/>

      <Analytics/>
    </div>
  );
}
