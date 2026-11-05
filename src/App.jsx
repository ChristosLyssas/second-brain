import { useState, useEffect, useRef, useCallback } from "react";
import { auth, goalsDB, notesDB, txnsDB, isRecoveryLink } from "./lib/supabase";
import { T } from "./lib/i18n";
import { Icon } from "./components/Icon";
import { fz, DARK, LIGHT, isSaving, UI_FONT } from "./lib/helpers";
import AuthScreen from "./AuthScreen";
import GoalsTab from "./tabs/GoalsTab";
import CalendarTab from "./tabs/CalendarTab";
import WhispererTab from "./tabs/WhispererTab";
import BudgetTab from "./tabs/BudgetTab";
import TodayTab from "./tabs/TodayTab";
import ProfileTab from "./tabs/ProfileTab";
import { SkeletonGrid } from "./components/ui";

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

// ─── AUTH GATE ────────────────────────────────────────────────────────────────
export default function SecondBrainApp() {
  const [session, setSession] = useState(undefined);
  const [recovery, setRecovery] = useState(isRecoveryLink);   // came from a reset-password email
  useEffect(()=>{
    auth.getSession().then(({ data })=>setSession(data.session??null));
    const { data:{ subscription } } = auth.onAuthStateChange((event,s)=>{ if (event==="PASSWORD_RECOVERY") setRecovery(true); setSession(s??null); });
    return ()=>subscription.unsubscribe();
  },[]);
  useEffect(()=>{ const timer=setTimeout(()=>setSession(prev=>prev===undefined?null:prev),3000); return ()=>clearTimeout(timer); },[]);
  if (session===undefined) return null;
  const endRecovery = () => { setRecovery(false); try { window.history.replaceState(null, "", window.location.pathname); } catch { /* ignore */ } };
  // Reset link -> "set a new password" (needs the recovery session; without one the link expired)
  if (recovery) return <AuthScreen onAuth={setSession} recovery={!!session} linkExpired={!session} onRecovered={endRecovery}/>;
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

  const [tab,    setTabRaw]    = useState("today");   // always open on Today (after login and on every app start)
  const [isDark, setIsDarkRaw] = useState(()=>localStorage.getItem("sb_dark")!=="false");
  const [lang,   setLangRaw]   = useState(()=>{ const l=localStorage.getItem("sb_lang"); return (l==="el"||l==="en")?l:"el"; });
  const [savingsTarget, setSavingsTargetRaw] = useState(()=>parseInt(localStorage.getItem("sb_savings_target")||"20"));

  const setTab    = v=>{ setTabRaw(v); };
  const setIsDark = v=>{ setIsDarkRaw(v); localStorage.setItem("sb_dark",String(v)); };
  const setLang   = v=>{ setLangRaw(v);   localStorage.setItem("sb_lang",v); };
  const setSavingsTarget = v=>{ setSavingsTargetRaw(v); localStorage.setItem("sb_savings_target",String(v)); };

  const theme = isDark ? DARK : LIGHT;
  const t = T[lang];
  const isLoading = goalsLoading||notesLoading||txnsLoading;
  const showSkeleton = isLoading && tab!=="profile" && !goals.length && !notes.length && !txns.length;
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
  // Celebrate when a goal crosses into 100% (steps ticked or savings target reached).
  // Goals that appear for the first time (initial load, undo-restore) are ignored.
  const prevProgress = useRef(new Map());
  useEffect(() => {
    const prev = prevProgress.current;
    const hit = goalsView.find(g => g.progress>=100 && prev.has(g.id) && prev.get(g.id)<100);
    prevProgress.current = new Map(goalsView.map(g=>[g.id, g.progress]));
    if (hit) {
      const words = T[lang].goalDoneWords;
      const word = words[Math.floor(Math.random()*words.length)];
      notify(`${word} · ${lang==="el" ? hit.titleEl : hit.titleEn}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals, totalSaved]);

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
    <div style={{ position:"fixed", inset:0, background:theme.bg, backgroundImage:isDark
      ? "radial-gradient(900px 600px at 0% 0%, rgba(59,130,246,0.10), transparent 60%), radial-gradient(800px 600px at 100% 100%, rgba(20,184,166,0.07), transparent 60%), radial-gradient(600px 400px at 85% 10%, rgba(99,102,241,0.05), transparent 60%)"
      : "radial-gradient(900px 600px at 0% 0%, rgba(59,130,246,0.08), transparent 60%), radial-gradient(800px 600px at 100% 100%, rgba(20,184,166,0.06), transparent 60%)", fontFamily:UI_FONT, color:theme.text, textAlign:"left", display:"flex", flexDirection:"column", overflow:"hidden", transition:"background 0.3s,color 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Commissioner:wght@300..800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; font-variant-numeric:tabular-nums; }
        :root { --fs:1; }
        @media (min-width:641px)  { :root { --fs:1.15; } }
        @media (min-width:1600px) { :root { --fs:1.22; } }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:${theme.scrollThumb}; border-radius:4px; }
        .goal-card:hover { transform:translateY(-3px) !important; border-color:color-mix(in srgb, var(--c) 45%, transparent) !important; box-shadow:0 14px 34px -14px color-mix(in srgb, var(--c) 45%, transparent) !important; }
        .note-card:hover { transform:translateY(-2px); }
        /* Desktop tabs: hover on the inactive ones */
        .desk-tab svg { transition:transform 0.25s cubic-bezier(.2,.8,.2,1), color 0.2s; }
        .desk-tab:not(.active):hover { color:${theme.text} !important; background:${isDark?"#0e182980":"#ffffff99"} !important; border-color:${theme.borderStrong} !important; border-bottom-color:${theme.border} !important; }
        .desk-tab:not(.active):hover svg { color:#60a5fa; transform:translateY(-1px) scale(1.08); }
        .desk-tab.active svg { color:#60a5fa; }
        /* Today cards: accent-coloured section icon */
        .sec-title svg { color:var(--accent); }
        /* Soft lift for whisper notes and Today cards */
        .lift-card { transition:transform 0.3s cubic-bezier(.2,.8,.2,1), box-shadow 0.3s ease, border-color 0.3s ease, opacity 0.2s !important; }
        .lift-card:hover { transform:translateY(-2px); border-color:${isDark?"#3b82f655":"#93c5fd"} !important; box-shadow:0 1px 2px rgba(0,0,0,${isDark?0.3:0.05}), 0 14px 32px -14px ${isDark?"rgba(59,130,246,0.35)":"rgba(37,99,235,0.25)"} !important; }
        .lift-card .note-actions { opacity:0.55; transition:opacity 0.2s; } .lift-card:hover .note-actions { opacity:1; }
        @media (hover:none) { .lift-card .note-actions { opacity:1; } }
        .del-btn { opacity:0; transition:opacity 0.15s; } .goal-card:hover .del-btn { opacity:1; }
        .row-action { opacity:0.35; transition:opacity 0.15s; } .txn-row:hover .row-action, .row-action:focus-visible { opacity:1; }
        @media (hover:none) { .row-action { opacity:0.7; } .del-btn { opacity:0.8; } }
        /* Calendar: side-by-side on wide screens, one scrolling column on narrow ones */
        @media (max-width:900px) {
          .cal-layout { display:flex !important; flex-direction:column; overflow-y:auto; -webkit-overflow-scrolling:touch; }
          .cal-col    { overflow:visible !important; min-height:auto !important; flex-shrink:0; }
        }
        /* Budget: stat cards react on hover; add/edit form is one row on wide screens */
        .stat-card { transition:transform 0.35s cubic-bezier(.2,.8,.2,1), box-shadow 0.35s ease, border-color 0.35s ease, background-color 0.35s ease; will-change:transform; }
        .stat-card::before { content:""; position:absolute; inset:0; background:linear-gradient(135deg, var(--c), transparent 70%); opacity:0; transition:opacity 0.35s ease; pointer-events:none; }
        .stat-card:hover { transform:translateY(-1px); border-color:color-mix(in srgb, var(--c) 55%, transparent) !important; box-shadow:0 10px 26px -14px var(--c) !important; }
        .stat-card:hover::before { opacity:0.07; }
        .note-card.txn-row { transition:background-color 0.3s ease, border-color 0.3s ease; }
        .note-card.txn-row:hover { transform:none; background-color:${theme.input} !important; }
        /* Dropdowns: own chevron with breathing room (inline background shorthands would reset it, hence !important) */
        select { appearance:none; -webkit-appearance:none; cursor:pointer; padding-right:34px !important;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none' stroke='${encodeURIComponent(theme.textMuted)}' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 4.5l3 3 3-3'/%3E%3C/svg%3E") !important;
          background-repeat:no-repeat !important; background-position:right 12px center !important; background-size:12px !important; }
        select:disabled { cursor:default; }
        select option { background:${theme.surface}; color:${theme.text}; }
        /* Sort menus: a small "sort" icon on the left instead of an arrow glyph squeezed into the text */
        select.sort-select { padding-left:32px !important;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14' fill='none' stroke='${encodeURIComponent(theme.textMuted)}' stroke-width='1.5' stroke-linecap='round'%3E%3Cpath d='M2 4h10M3.5 7h7M5 10h4'/%3E%3C/svg%3E"), url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none' stroke='${encodeURIComponent(theme.textMuted)}' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 4.5l3 3 3-3'/%3E%3C/svg%3E") !important;
          background-position:left 12px center, right 12px center !important; background-size:13px, 12px !important; }
        .txn-form { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .txn-form .f-desc, .txn-form .f-actions { grid-column:1/-1; }
        .txn-form .f-actions { display:flex; gap:8px; }
        @media (min-width:1280px) {
          .txn-form { grid-template-columns:minmax(150px,2fr) minmax(90px,0.8fr) minmax(110px,1fr) minmax(140px,1.2fr) minmax(130px,1fr) auto; }
          .txn-form .f-desc, .txn-form .f-actions { grid-column:auto; }
        }
        input,select,textarea { outline:none; transition:border-color 0.18s; font-size:calc(14px * var(--fs, 1)); }
        input:focus,textarea:focus { border-color:#3b82f6 !important; }
        .auth-input:focus { border-color:#60a5fa !important; }
        textarea { resize:none; } button { cursor:pointer; }
        @keyframes skPulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
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
          .budget-root    { display:block !important; overflow-y:auto; overflow-x:hidden; -webkit-overflow-scrolling:touch; overscroll-behavior:contain; padding-bottom:16px; }
          .budget-root > * + * { margin-top:12px; }
          .budget-fill    { height:auto !important; }
          .budget-scroll  { overflow:visible !important; flex:none !important; min-height:0 !important; }
          /* Goals: the detail panel opens full-screen instead of squeezing next to the cards */
          .goals-split    { grid-template-columns:1fr !important; }
          /* Budget toolbar: chips scroll sideways on one line; sort + new share a full-width row */
          .txn-toolbar    { flex-direction:column; align-items:stretch !important; gap:8px !important; }
          .txn-chips      { flex-wrap:nowrap !important; overflow-x:auto; scrollbar-width:none; }
          .txn-chips > *  { flex-shrink:0; }
          /* centred when they fit; auto margins (unlike justify-content:center) never cut off the first chip when they overflow */
          .txn-chips > :first-child { margin-left:auto; }
          .txn-chips > :last-child  { margin-right:auto; }
          .txn-actions    { margin-left:0 !important; }
          .txn-actions > * { flex:1; min-width:0; padding-top:8px !important; padding-bottom:8px !important; }
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
        {/* Logo: same SB mark as the app icon and the login screen */}
        <div style={{ display:"flex", alignItems:"center", gap:12, minWidth:0 }}>
          <img src="/app-icon.svg" alt="" width="42" height="42" style={{ borderRadius:12, flexShrink:0, boxShadow:"0 4px 18px #60a5fa26" }}/>
          <h1 style={{ fontSize:fz(26), fontWeight:800, letterSpacing:"-0.02em", lineHeight:1, color:theme.text, whiteSpace:"nowrap" }}>
            {t.appTitle[0]} <span style={{ color:"#60a5fa" }}>{t.appTitle[1]}</span>
          </h1>
        </div>

        {/* Right side: language · theme · profile — same size and style (hidden on phones → "Me" tab) */}
        <div className="hdr-extra" style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div role="group" aria-label={t.languageLabel} style={{ display:"flex", height:34, padding:3, borderRadius:17, border:`1px solid ${theme.border}`, background:theme.surface }}>
            {[["en","EN"],["el","ΕΛ"]].map(([l,lbl])=>(
              <button key={l} onClick={()=>setLang(l)} aria-pressed={lang===l}
                style={{ padding:"0 10px", borderRadius:14, border:"none", background:lang===l?"#60a5fa22":"transparent", color:lang===l?"#60a5fa":theme.textMuted, fontSize:fz(12), fontWeight:600, fontFamily:"inherit", transition:"all 0.2s" }}>{lbl}</button>
            ))}
          </div>
          <button onClick={()=>setIsDark(!isDark)} aria-label={isDark?t.lightMode:t.darkMode} title={isDark?t.lightMode:t.darkMode}
            style={{ width:34, height:34, borderRadius:"50%", border:`1px solid ${theme.border}`, background:theme.surface, color:theme.textMuted, display:"flex", alignItems:"center", justifyContent:"center", padding:0, transition:"all 0.2s" }}>
            <Icon name={isDark?"moon":"sun"} size={16}/>
          </button>
          <button onClick={()=>setTab("profile")} aria-label={t.tabs.profile} title={t.tabs.profile}
            style={{ width:34, height:34, borderRadius:"50%", border:`1px solid ${tab==="profile"?"#60a5fa":theme.border}`, background:tab==="profile"?"#60a5fa22":theme.surface, color:tab==="profile"?"#60a5fa":theme.textMuted, display:"flex", alignItems:"center", justifyContent:"center", padding:0, overflow:"hidden", transition:"all 0.2s" }}>
            {session.user.user_metadata?.avatar_url
              ? <img src={session.user.user_metadata.avatar_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
              : <Icon name="profile" size={16}/>}
          </button>
        </div>
      </div>

      {/* ── DESKTOP TABS ── */}
      <div className="tpad desktop-tabs" style={{ display:"flex", gap:4, flexShrink:0 }}>
        {TABS.map(id=>(
          <button key={id} onClick={()=>setTab(id)} className={tab===id?"desk-tab active":"desk-tab"} style={{ padding:"7px 16px", border:`1px solid ${theme.border}`, borderBottom:tab===id?`1px solid ${theme.bg}`:`1px solid ${theme.border}`, borderRadius:"10px 10px 0 0", background:tab===id?theme.surface:"transparent", color:tab===id?theme.text:theme.textMuted, fontSize:fz(13), fontFamily:"inherit", fontWeight:tab===id?500:400, transition:"all 0.18s" }}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:7 }}><Icon name={id} size={15}/>{t.tabs[id]}</span>
          </button>
        ))}
        {tab==="profile" && (
          <button style={{ padding:"7px 16px", border:`1px solid ${theme.border}`, borderBottom:`1px solid ${theme.bg}`, borderRadius:"10px 10px 0 0", background:theme.surface, color:theme.text, fontSize:fz(13), fontFamily:"inherit", fontWeight:500 }}>{t.tabs.profile}</button>
        )}
        <div style={{ flex:1, borderBottom:`1px solid ${theme.border}` }}/>
      </div>

      {/* ── CONTENT ── */}
      <div className="cpad" style={{ flex:1, minHeight:0, display:"flex", flexDirection:"column" }}>
        {/* First load with nothing cached yet: pulsing placeholders instead of an empty page */}
        {showSkeleton && <SkeletonGrid theme={theme}/>}
        {!showSkeleton && tab==="today"     && <TodayTab     theme={theme} lang={lang} goals={goalsView} notes={notes} txns={txns} savingsTarget={savingsTarget} displayName={session.user.user_metadata?.display_name} setTab={setTab} openGoal={openGoal}/>}
        {!showSkeleton && tab==="goals"     && <GoalsTab     theme={theme} isDark={isDark} lang={lang} goals={goalsView} setGoals={setGoalsView} notify={notify} focusGoalId={focusGoalId} onFocusHandled={()=>setFocusGoalId(null)}/>}
        {!showSkeleton && tab==="whisperer" && <WhispererTab theme={theme} isDark={isDark} lang={lang} notes={notes} setNotes={setNotes} goals={goalsView} setGoals={setGoalsView} notify={notify}/>}
        {!showSkeleton && tab==="budget"    && <BudgetTab    theme={theme} isDark={isDark} lang={lang} txns={txns} setTxns={setTxns} savingsTarget={savingsTarget} setSavingsTarget={setSavingsTarget}/>}
        {!showSkeleton && tab==="calendar"  && <CalendarTab  theme={theme} isDark={isDark} lang={lang} goals={goalsView} txns={txns} openGoal={openGoal}/>}
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
          const labels={ today:t.todayLabel, goals:t.goals, whisperer:"Whisperer", budget:"Budget", calendar:"Calendar", profile:"Me" };
          const active=tab===id;
          return (
            <button key={id} onClick={()=>setTab(id)}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2, background:"none", border:"none", padding:"4px 4px", borderRadius:10, cursor:"pointer", color:active?"#60a5fa":theme.textMuted, minWidth:44, flex:1 }}>
              {id==="profile"&&session.user.user_metadata?.avatar_url
                ? <img src={session.user.user_metadata.avatar_url} style={{ width:22, height:22, borderRadius:"50%", objectFit:"cover", border:`2px solid ${active?"#60a5fa":theme.border}` }}/>
                : <Icon name={id} size={21} strokeWidth={active?2.1:1.7}/>}
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
