import { useState, useEffect, useRef } from "react";
import { T } from "../lib/i18n";
import { CAT_COLORS, fz, INCOME_CAT, OTHER_CAT, SAVINGS_CAT, SAVINGS_COLOR, isSaving, NUM_FONT, lsGet, lsSet, fmtMoney, toISO, parseTxnDate } from "../lib/helpers";
import { Donut, CountUp, EmptyState } from "../components/ui";
import { Icon, CatIcon } from "../components/Icon";

// ─── BUDGET TAB ───────────────────────────────────────────────────────────────
export default function BudgetTab({ theme, isDark, lang, txns, setTxns, savingsTarget, setSavingsTarget }) {
  const t = T[lang];
  const locale = t.dateLocale;
  const money = (n) => fmtMoney(n, lang);
  const emptyDraft = () => ({ label:"", amount:"", type:"expense", catIdx:1, date:toISO(new Date()) });

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [formError, setFormError] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetDraft, setTargetDraft] = useState(String(savingsTarget));
  const [viewMonth, setViewMonth] = useState(()=>{ const n=new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [breakdownView, setBreakdownViewRaw] = useState(()=>lsGet("sb_breakdown_view","donut"));
  const [sortMode, setSortModeRaw] = useState(()=>lsGet("sb_cat_sort","amountDesc"));
  const [customOrder, setCustomOrderRaw] = useState(()=>{ try { return JSON.parse(localStorage.getItem("sb_cat_order"))||[]; } catch { return []; } });
  const [activeCat, setActiveCat] = useState(null);
  const [txnSort, setTxnSortRaw] = useState(()=>lsGet("sb_txn_sort","dateDesc"));
  const setTxnSort = (v) => { setTxnSortRaw(v); lsSet("sb_txn_sort", v); };
  const [undo, setUndo] = useState(null);
  const undoTimer = useRef(null);
  useEffect(()=>()=>clearTimeout(undoTimer.current),[]);
  // Swipe state — panel 0=transactions, 1=breakdown
  const [panel, setPanel] = useState(0);
  const swipeRef = useRef(null);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  // Touch handlers for swipe
  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    // Only register horizontal swipes (dx > 40px, more horizontal than vertical)
    if (Math.abs(dx) > 40 && Math.abs(dx) > dy * 1.5) {
      if (dx < 0 && panel === 0) setPanel(1); // swipe left → breakdown
      if (dx > 0 && panel === 1) setPanel(0); // swipe right → transactions
    }
    touchStartX.current = null;
  };

  // ── Month view ──────────────────────────────────────────────────────────────
  const now = new Date();
  const vy = viewMonth.getFullYear(), vm = viewMonth.getMonth();
  const isCurrentMonth = vy===now.getFullYear() && vm===now.getMonth();
  const monthName = viewMonth.toLocaleDateString(locale, { month:"long", year:"numeric" });
  // _d is display-only; never written back (edits/deletes always work on the original `txns`)
  const monthTxns = txns
    .map(tx=>({ ...tx, _d: parseTxnDate(tx.date, tx.createdAt) || now }))
    .filter(tx=>tx._d.getFullYear()===vy && tx._d.getMonth()===vm)
    .sort((a,b)=>b._d-a._d);

  const income      = monthTxns.filter(tx=>tx.type==="income").reduce((s,tx)=>s+Math.abs(tx.amount),0);
  const savedTotal  = monthTxns.filter(isSaving).reduce((s,tx)=>s+Math.abs(tx.amount),0);
  const fixedTotal  = monthTxns.filter(tx=>tx.type==="fixed"   && !isSaving(tx)).reduce((s,tx)=>s+Math.abs(tx.amount),0);
  const varExpenses = monthTxns.filter(tx=>tx.type==="expense" && !isSaving(tx)).reduce((s,tx)=>s+Math.abs(tx.amount),0);
  const expenses    = fixedTotal+varExpenses;                            // real spending (savings excluded)
  const balance     = income-expenses-savedTotal;                        // what's actually left in the account
  const afterFixed  = income-fixedTotal;
  const leftRate    = income>0 ? Math.round((balance/income)*100) : 0;
  const targetAmt   = income*savingsTarget/100;                          // savings goal for the month
  const remaining   = Math.max(0, targetAmt-savedTotal);                 // still needed to reach the goal
  const freeToSpend = balance-remaining;                                 // left over once the goal is filled
  const coverage    = targetAmt>0 ? Math.min(100, (savedTotal/targetAmt)*100) : 0;
  const pctOfIncome = (v) => income>0 ? t.ofIncome(Math.round(v/income*100)) : null;

  const filterFns = {
    income:  tx=>tx.type==="income",
    expense: tx=>tx.type==="expense" && !isSaving(tx),
    fixed:   tx=>tx.type==="fixed"   && !isSaving(tx),
    saving:  isSaving,
  };
  const txnSorters = {
    dateDesc:(a,b)=>b._d-a._d, dateAsc:(a,b)=>a._d-b._d,
    amountDesc:(a,b)=>Math.abs(b.amount)-Math.abs(a.amount), amountAsc:(a,b)=>Math.abs(a.amount)-Math.abs(b.amount),
  };
  const filtered = (filterFns[filterType] ? monthTxns.filter(filterFns[filterType]) : [...monthTxns]).sort(txnSorters[txnSort]||txnSorters.dateDesc);

  // ── Category breakdown (keyed by catIdx so the order survives a language switch) ──
  const catTotals = {};
  monthTxns.filter(tx=>tx.type!=="income" && !isSaving(tx)).forEach(tx=>{ catTotals[tx.catIdx]=(catTotals[tx.catIdx]||0)+Math.abs(tx.amount); });
  const cats = Object.entries(catTotals).map(([idx,amt])=>{
    const name = t.budgetCategories[idx] || t.budgetCategories[OTHER_CAT];
    return { idx:Number(idx), name, amt, color:CAT_COLORS[name]||"#94a3b8", pct:expenses>0?(amt/expenses)*100:0 };
  });
  const sorters = {
    amountDesc:(a,b)=>b.amt-a.amt,
    amountAsc: (a,b)=>a.amt-b.amt,
    alpha:     (a,b)=>a.name.localeCompare(b.name, locale),
    custom:    (a,b)=>{ const ia=customOrder.indexOf(a.idx), ib=customOrder.indexOf(b.idx); return ((ia<0?999:ia)-(ib<0?999:ib)) || (b.amt-a.amt); },
  };
  cats.sort(sorters[sortMode]||sorters.amountDesc);
  const activeC = cats.find(c=>c.idx===activeCat);

  const setBreakdownView = v=>{ setBreakdownViewRaw(v); lsSet("sb_breakdown_view",v); };
  const setCustomOrder   = v=>{ setCustomOrderRaw(v); lsSet("sb_cat_order",JSON.stringify(v)); };
  const setSortMode      = v=>{ setSortModeRaw(v); lsSet("sb_cat_sort",v); if (v==="custom" && !customOrder.length) setCustomOrder(cats.map(c=>c.idx)); };
  function moveCat(i, dir) {
    const order = cats.map(c=>c.idx), j = i+dir;
    if (j<0 || j>=order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    setCustomOrder([...order, ...customOrder.filter(x=>!order.includes(x))]);
  }

  // ── Where income went (stacked bar) ─────────────────────────────────────────
  const flowBase = Math.max(income, expenses+savedTotal) || 1;
  const flowSegs = [
    { key:"fixed", label:t.fixed,         value:fixedTotal,           color:"#f87171" },
    { key:"var",   label:t.variableLabel, value:varExpenses,          color:"#fb923c" },
    { key:"save",  label:t.savingOpt,     value:savedTotal,           color:SAVINGS_COLOR },
    { key:"left",  label:t.leftLabel,     value:Math.max(0,balance),  color:"#64748b" },
  ];

  // ── Add / edit / delete ─────────────────────────────────────────────────────
  function openAdd() { setEditingId(null); setDraft(emptyDraft()); setFormError(""); setAdding(a=>!a); }
  function openEdit(tx) {
    setAdding(false); setFormError(""); setEditingId(tx.id);
    setDraft({ label:tx.label, amount:String(Math.abs(tx.amount)), type:isSaving(tx)?"saving":tx.type, catIdx:tx.catIdx, date:toISO(tx._d) });
  }
  function closeForm() { setAdding(false); setEditingId(null); setFormError(""); }
  function changeType(type) {
    // Income always goes in the "Income" category; leaving income falls back to "Other"
    // Income → "Income" category, Savings → "Savings" category; leaving either falls back to "Other"
    setDraft(d=>({ ...d, type, catIdx:
      type==="income" ? INCOME_CAT :
      type==="saving" ? SAVINGS_CAT :
      (d.catIdx===INCOME_CAT || d.catIdx===SAVINGS_CAT) ? OTHER_CAT : d.catIdx }));
  }
  function submitDraft() {
    const amt = parseFloat(String(draft.amount).replace(",", "."));
    if (!draft.label.trim()) { setFormError(t.needLabel); return; }
    if (!Number.isFinite(amt) || amt<=0) { setFormError(t.invalidAmount); return; }
    const signed = draft.type==="income" ? amt : -amt;
    const isSav = draft.type==="saving";
    const fields = { label:draft.label.trim(), amount:Math.round(signed*100)/100, type:isSav?"expense":draft.type, catIdx:isSav?SAVINGS_CAT:draft.catIdx, date:draft.date||toISO(new Date()) };
    if (editingId!=null) setTxns(txns.map(tx=>tx.id===editingId?{ ...tx, ...fields }:tx));
    else setTxns([{ id:Date.now(), ...fields }, ...txns]);
    // Jump to the month of the saved transaction so it stays visible
    const d = parseTxnDate(fields.date);
    if (d) setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    closeForm(); setDraft(emptyDraft());
  }
  function deleteTxn(tx) {
    const original = txns.find(x=>x.id===tx.id); if (!original) return;
    setTxns(txns.filter(x=>x.id!==tx.id));
    if (editingId===tx.id) closeForm();
    clearTimeout(undoTimer.current);
    setUndo(original);
    undoTimer.current = setTimeout(()=>setUndo(null), 5000);
  }
  function undoDelete() {
    if (!undo) return;
    const { id, createdAt, ...rest } = undo; // eslint-disable-line no-unused-vars
    setTxns([{ ...rest, id:Date.now() }, ...txns]);
    clearTimeout(undoTimer.current); setUndo(null);
  }

  const iStyle = { background:theme.input, border:`1px solid ${theme.borderStrong}`, borderRadius:8, padding:"9px 12px", color:theme.text, fontSize:fz(13), fontFamily:"inherit", width:"100%" };
  const sectionTitle = { fontSize:fz(11), color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:600 };
  const navBtn = { background:theme.input, border:`1px solid ${theme.border}`, borderRadius:8, color:theme.text, padding:"2px 12px", fontFamily:"inherit", fontSize:fz(18), lineHeight:1.4 };
  const arrowBtn = (disabled) => ({ background:"none", border:"none", color:theme.textMuted, fontSize:fz(11), lineHeight:1, padding:"4px 5px", cursor:disabled?"default":"pointer", opacity:disabled?0.2:0.8 });

  // Rendered via a function call (not <Component/>) so inputs keep focus while typing
  const renderForm = () => (
    <div style={{ background:theme.surface, border:`1px solid ${editingId!=null?"#60a5fa66":theme.border}`, borderRadius:12, padding:10, marginBottom:6, animation:"slideDown 0.2s ease", flexShrink:0 }}>
      {editingId!=null && <div style={{ ...sectionTitle, color:"#60a5fa", marginBottom:10 }}><Icon name="edit" size={12}/> {t.editTxn}</div>}
      <div className="txn-form">
        <input autoFocus className="f-desc" placeholder={t.descPlaceholder} value={draft.label} onChange={e=>setDraft({ ...draft, label:e.target.value })} onKeyDown={e=>e.key==="Enter"&&submitDraft()} style={iStyle}/>
        <input placeholder={t.amountPlaceholder} type="number" inputMode="decimal" min="0" step="0.01" value={draft.amount} onChange={e=>setDraft({ ...draft, amount:e.target.value })} onKeyDown={e=>e.key==="Enter"&&submitDraft()} style={iStyle}/>
        <select value={draft.type} onChange={e=>changeType(e.target.value)} style={iStyle}>
          <option value="expense">{t.expenseOpt}</option>
          <option value="income">{t.incomeOpt}</option>
          <option value="fixed">{t.fixedOpt}</option>
          <option value="saving">{t.savingOpt}</option>
        </select>
        <select value={draft.catIdx} disabled={draft.type==="saving"} onChange={e=>{ const catIdx=parseInt(e.target.value); setDraft({ ...draft, catIdx, type:catIdx===SAVINGS_CAT?"saving":draft.type }); }} style={{ ...iStyle, opacity:draft.type==="saving"?0.6:1 }}>
          {t.budgetCategories.map((c,i)=><option key={i} value={i}>{c}</option>)}
        </select>
        <input type="date" value={draft.date} onChange={e=>setDraft({ ...draft, date:e.target.value })} style={{ ...iStyle, colorScheme:isDark?"dark":"light" }}/>
      <div className="f-actions">
        <button onClick={submitDraft} style={{ flex:1, padding:"9px 18px", whiteSpace:"nowrap", background:"#2563eb", border:"none", borderRadius:8, color:"#fff", fontSize:fz(13), fontFamily:"inherit", fontWeight:600 }}>{editingId!=null?t.saveEdit:t.add}</button>
        <button onClick={closeForm} style={{ padding:"9px 14px", background:theme.input, border:`1px solid ${theme.borderStrong}`, borderRadius:8, color:theme.textMuted, fontSize:fz(13), fontFamily:"inherit" }}>{t.cancel}</button>
      </div>
      </div>
      {formError && <div style={{ fontSize:fz(12), color:"#f87171", marginTop:8 }}>{formError}</div>}
    </div>
  );

  // ── Transactions panel content ───────────────────────────────────────────────
  const TransactionsPanel = (
    <div className="budget-fill" style={{ display:"flex", flexDirection:"column", gap:10, height:"100%", minHeight:0 }}>
      <div className="txn-toolbar" style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap", flexShrink:0 }}>
        <div className="txn-chips" style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {[["all",t.allFilter],["income",t.incomeFilter],["expense",t.expenseFilter],["fixed",t.fixedFilter],["saving",t.savingsFilter]].map(([v,l])=>{
          const clr=v==="income"?"#34d399":v==="expense"?"#fb923c":v==="fixed"?"#f87171":v==="saving"?SAVINGS_COLOR:"#60a5fa";
          return <button key={v} onClick={()=>setFilterType(v)} style={{ padding:"5px 12px", borderRadius:20, border:`1px solid ${filterType===v?clr:theme.border}`, background:filterType===v?clr+"20":"transparent", color:filterType===v?clr:theme.textMuted, fontSize:fz(12), fontFamily:"inherit", cursor:"pointer", transition:"all 0.15s" }}>{l}</button>;
        })}
        </div>
        <div className="txn-actions" style={{ marginLeft:"auto", display:"flex", gap:6, alignItems:"center" }}>
        <select className="sort-select" aria-label={t.sortLabel} value={txnSort} onChange={e=>setTxnSort(e.target.value)} style={{ background:theme.input, border:`1px solid ${theme.border}`, borderRadius:20, color:theme.text, fontSize:fz(12), padding:"5px 10px", fontFamily:"inherit" }}>
          {Object.entries(t.txnSortOpts).map(([k,l])=><option key={k} value={k}>{l}</option>)}
        </select>
        <button onClick={openAdd} style={{ padding:"5px 14px", borderRadius:20, border:`1px solid ${isDark?"#1d4ed8":"#3b82f6"}`, background:isDark?"#1e3a8a":"#eff6ff", color:isDark?"#93c5fd":"#2563eb", fontSize:fz(12), fontFamily:"inherit", cursor:"pointer", fontWeight:500 }}>{t.newTransaction}</button>
        </div>
      </div>
      {adding && renderForm()}
      <div className="budget-scroll" style={{ flex:1, minHeight:0, overflowY:"auto", WebkitOverflowScrolling:"touch", overscrollBehavior:"contain" }}>
        {filtered.map((txn)=>{
          if (txn.id===editingId) return <div key={txn.id}>{renderForm()}</div>;
          const cat=t.budgetCategories[txn.catIdx]||"", color=CAT_COLORS[cat]||"#94a3b8";
          const isSav=isSaving(txn), isFixed=txn.type==="fixed" && !isSav;
          return (
            <div key={txn.id} className="note-card txn-row" onClick={()=>openEdit(txn)} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background:theme.surface, boxShadow:theme.shadow, border:`1px solid ${isFixed?"#f8717130":theme.border}`, borderRadius:12, marginBottom:6, cursor:"pointer" }}>
              <div style={{ width:32, height:32, borderRadius:9, background:color+"20", display:"flex", alignItems:"center", justifyContent:"center", fontSize:fz(14), flexShrink:0 }}><CatIcon idx={txn.catIdx} size={16} color={color}/></div>
              <div style={{ flex:1, minWidth:0, display:"flex", alignItems:"baseline", flexWrap:"wrap", columnGap:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, minWidth:0, maxWidth:"100%" }}>
                  <div style={{ fontSize:fz(14), fontWeight:500, color:theme.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{txn.label}</div>
                  {isFixed && <span style={{ fontSize:fz(10), padding:"1px 5px", borderRadius:5, background:"#f8717122", color:"#f87171", fontWeight:600, flexShrink:0, display:"inline-flex" }}><Icon name="lock" size={11}/></span>}
                </div>
                <div style={{ fontSize:fz(12), color:theme.textMuted, whiteSpace:"nowrap" }}>{cat} · {txn._d.toLocaleDateString(locale,{ day:"numeric", month:"short" })}</div>
              </div>
              <div style={{ fontSize:fz(15), fontWeight:500, color:txn.type==="income"?"#34d399":isSav?SAVINGS_COLOR:isFixed?"#f87171":"#fb923c", fontFamily:NUM_FONT, fontVariantNumeric:"tabular-nums", whiteSpace:"nowrap", flexShrink:0 }}>{txn.type==="income"?"+":""}{money(txn.amount)}</div>
              <button className="row-action" aria-label={t.edit} onClick={e=>{ e.stopPropagation(); openEdit(txn); }} style={{ background:"none", border:"none", color:theme.textMuted, fontSize:fz(13), padding:"2px 4px", flexShrink:0, display:"inline-flex" }}><Icon name="edit" size={14}/></button>
              <button className="row-action" aria-label={t.deleteGoal} onClick={e=>{ e.stopPropagation(); deleteTxn(txn); }} style={{ background:"none", border:"none", color:"#f87171", fontSize:fz(16), padding:"2px 4px", flexShrink:0, display:"inline-flex" }}><Icon name="close" size={15}/></button>
            </div>
          );
        })}
        {filtered.length===0 && (monthTxns.length===0
          ? <EmptyState theme={theme} icon="transactions" title={t.noTxnsMonth} hint={t.emptyTxnsHint} action={adding?null:t.newTransaction.replace(/^\+\s*/,"")} onAction={openAdd}/>
          : <EmptyState theme={theme} compact icon="search" title={t.noTxnsMonth} hint={t.noResultsHint}/>)}
      </div>
    </div>
  );

  // ── Breakdown panel content ──────────────────────────────────────────────────
  const BreakdownPanel = (
    <div className="budget-scroll budget-fill" style={{ overflowY:"auto", WebkitOverflowScrolling:"touch", overscrollBehavior:"contain", height:"100%" }}>
      <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, boxShadow:theme.shadow, borderRadius:14, padding:18 }}>
        {/* Where income went — one stacked bar */}
        {income>0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ ...sectionTitle, marginBottom:8 }}>{t.whereMoneyWent}</div>
            <div style={{ display:"flex", height:10, borderRadius:5, overflow:"hidden", background:theme.ring, gap:2 }}>
              {flowSegs.filter(s=>s.value>0).map(s=>(
                <div key={s.key} title={`${s.label}: ${money(s.value)}`} style={{ width:`${(s.value/flowBase)*100}%`, background:s.color, transition:"width 0.6s" }}/>
              ))}
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"4px 12px", marginTop:8 }}>
              {flowSegs.map(s=>(
                <span key={s.key} style={{ display:"flex", alignItems:"center", gap:5, fontSize:fz(11), color:theme.textMuted }}>
                  <span style={{ width:7, height:7, borderRadius:2, background:s.color }}/>
                  {s.label} <span style={{ color:theme.text, fontFamily:NUM_FONT }}>{money(s.value)}</span>
                </span>
              ))}
            </div>
            {balance<0 && <div style={{ fontSize:fz(11), color:"#f87171", marginTop:6 }}><Icon name="warn" size={12}/> {t.overspent(money(-balance))}</div>}
          </div>
        )}

        {fixedTotal>0 && (
          <div style={{ marginBottom:16, padding:"12px 14px", background:isDark?"#1a0a0a":"#fff5f5", border:"1px solid #f8717130", borderRadius:10 }}>
            <div style={{ fontSize:fz(11), color:"#f87171", textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:600, marginBottom:8 }}><Icon name="lock" size={11}/> {t.fixedTotal}</div>
            {monthTxns.filter(tx=>tx.type==="fixed" && !isSaving(tx)).map(tx=>(
              <div key={tx.id} style={{ display:"flex", justifyContent:"space-between", gap:8, marginBottom:4 }}>
                <span style={{ fontSize:fz(12), color:theme.textMuted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tx.label}</span>
                <span style={{ fontSize:fz(12), color:"#f87171", fontWeight:500, fontFamily:NUM_FONT, whiteSpace:"nowrap" }}>{money(Math.abs(tx.amount))}</span>
              </div>
            ))}
            <div style={{ borderTop:"1px solid #f8717130", marginTop:8, paddingTop:8, display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:fz(12), color:theme.text, fontWeight:600 }}>{t.afterFixed}</span>
              <span style={{ fontSize:fz(13), fontWeight:500, fontFamily:NUM_FONT, color:afterFixed>=0?"#60a5fa":"#f87171" }}>{money(afterFixed)}</span>
            </div>
          </div>
        )}

        {/* Breakdown header: title + view toggle + order */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, marginBottom:10, flexWrap:"wrap" }}>
          <div style={sectionTitle}>{t.breakdown}</div>
          {cats.length>0 && (
            <div style={{ display:"flex", border:`1px solid ${theme.border}`, borderRadius:8, overflow:"hidden" }}>
              {[["donut",t.viewDonut],["bars",t.viewBars]].map(([v,l])=>(
                <button key={v} onClick={()=>setBreakdownView(v)} style={{ padding:"3px 8px", fontSize:fz(11), fontFamily:"inherit", border:"none", background:breakdownView===v?"#60a5fa22":"transparent", color:breakdownView===v?"#60a5fa":theme.textMuted, display:"inline-flex", alignItems:"center", gap:5 }}><Icon name={v} size={12}/>{l}</button>
              ))}
            </div>
          )}
        </div>
        {cats.length>1 && (
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:12 }}>
            <span style={{ fontSize:fz(11), color:theme.textMuted }}>{t.sortLabel}</span>
            <select value={sortMode} onChange={e=>setSortMode(e.target.value)} style={{ background:theme.input, border:`1px solid ${theme.border}`, borderRadius:6, color:theme.text, fontSize:fz(11), padding:"3px 6px", fontFamily:"inherit" }}>
              {Object.entries(t.sortOpts).map(([k,l])=><option key={k} value={k}>{l}</option>)}
            </select>
          </div>
        )}

        {breakdownView==="donut" && cats.length>0 && (
          <div style={{ display:"flex", justifyContent:"center", marginBottom:14 }}>
            <Donut data={cats} total={expenses} theme={theme} active={activeCat} setActive={setActiveCat}
              centerLabel={activeC?activeC.name:t.total} centerValue={money(activeC?activeC.amt:expenses)}
              centerSub={activeC?`${Math.round(activeC.pct)}%`:null}/>
          </div>
        )}

        {cats.map((c,i)=>{
          const isActive = activeCat===c.idx;
          return (
            <div key={c.idx} onMouseEnter={()=>setActiveCat(c.idx)} onMouseLeave={()=>setActiveCat(null)} onClick={()=>setActiveCat(isActive?null:c.idx)}
              style={{ margin:`0 -6px ${breakdownView==="bars"?8:2}px`, padding:"4px 6px", borderRadius:8, background:isActive?theme.input:"transparent", transition:"background 0.15s" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ width:8, height:8, borderRadius:2, background:c.color, flexShrink:0 }}/>
                <span style={{ flex:1, minWidth:0, textAlign:"left", fontSize:fz(13), color:theme.text, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</span>
                <span style={{ fontSize:fz(12), color:theme.text, fontFamily:NUM_FONT, whiteSpace:"nowrap" }}>{money(c.amt)}</span>
                <span style={{ fontSize:fz(10), color:theme.textMuted, fontFamily:NUM_FONT, width:30, textAlign:"right" }}>{Math.round(c.pct)}%</span>
                {sortMode==="custom" && (
                  <span style={{ display:"flex", flexShrink:0 }}>
                    <button aria-label={t.moveUp} disabled={i===0} onClick={e=>{ e.stopPropagation(); moveCat(i,-1); }} style={arrowBtn(i===0)}>▲</button>
                    <button aria-label={t.moveDown} disabled={i===cats.length-1} onClick={e=>{ e.stopPropagation(); moveCat(i,1); }} style={arrowBtn(i===cats.length-1)}>▼</button>
                  </span>
                )}
              </div>
              {breakdownView==="bars" && (
                <div style={{ height:5, background:theme.ring, borderRadius:3, overflow:"hidden", marginTop:5 }}>
                  <div style={{ height:"100%", width:`${c.pct}%`, background:c.color, borderRadius:3, transition:"width 0.6s" }}/>
                </div>
              )}
            </div>
          );
        })}
        {cats.length===0 && <div style={{ fontSize:fz(13), color:theme.textMuted, textAlign:"center", padding:"12px 0" }}>{t.noExpenses}</div>}

        <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${theme.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div style={sectionTitle}>{t.savingsGoal}</div>
            {editingTarget ? (
              <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                <input type="number" min={1} max={100} value={targetDraft} onChange={e=>setTargetDraft(e.target.value)}
                  style={{ width:48, background:theme.input, border:`1px solid ${theme.borderStrong}`, borderRadius:6, padding:"3px 6px", color:theme.text, fontSize:fz(12), fontFamily:"inherit", textAlign:"center" }}/>
                <span style={{ fontSize:fz(12), color:theme.textMuted }}>%</span>
                <button onClick={()=>{ setSavingsTarget(Math.max(1,Math.min(100,parseInt(targetDraft)||20))); setEditingTarget(false); }} style={{ background:"#2563eb", border:"none", borderRadius:6, color:"#fff", fontSize:fz(11), padding:"3px 8px", cursor:"pointer", display:"inline-flex" }}><Icon name="check" size={12} strokeWidth={2.4}/></button>
              </div>
            ) : (
              <button onClick={()=>{ setTargetDraft(String(savingsTarget)); setEditingTarget(true); }} style={{ background:"none", border:"none", color:theme.textMuted, cursor:"pointer", fontSize:fz(12), fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:5 }}><Icon name="target" size={12}/>{savingsTarget}%<Icon name="edit" size={11}/></button>
            )}
          </div>
          {/* Target = % of income; Saved = sum of "Savings" transactions this month */}
          <div style={{ display:"flex", justifyContent:"space-between", gap:8, marginBottom:4 }}>
            <span style={{ fontSize:fz(12), color:theme.textMuted }}>{t.targetLabel} ({savingsTarget}%)</span>
            <span style={{ fontSize:fz(13), color:theme.text, fontFamily:NUM_FONT, whiteSpace:"nowrap" }}>{money(targetAmt)}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", gap:8, marginBottom:8 }}>
            <span style={{ fontSize:fz(12), color:theme.textMuted }}><Icon name="savings" size={13}/> {t.savedLabel}</span>
            <span style={{ fontSize:fz(13), fontWeight:500, color:SAVINGS_COLOR, fontFamily:NUM_FONT, whiteSpace:"nowrap" }}>{money(savedTotal)}</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ flex:1, height:7, background:theme.ring, borderRadius:4, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${coverage}%`, background:coverage>=100?"#34d399":coverage>=50?"#fbbf24":"#f87171", borderRadius:4, transition:"width 0.6s" }}/>
            </div>
            <span style={{ fontSize:fz(11), color:theme.textMuted, fontFamily:NUM_FONT }}>{Math.round(coverage)}%</span>
          </div>
          {income>0 && (
            <div style={{ fontSize:fz(11), marginTop:6, color:remaining===0?"#34d399":"#fbbf24" }}>
              {remaining===0 ? t.goalReached : t.toGoal(money(remaining))}
            </div>
          )}
          {/* What's left after expenses + savings, and what's truly free once the goal is filled */}
          <div style={{ marginTop:10, paddingTop:10, borderTop:`1px dashed ${theme.border}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", gap:8, marginBottom:4 }}>
              <span style={{ fontSize:fz(12), color:theme.textMuted }}>{t.leftoverLabel}</span>
              <span style={{ fontSize:fz(13), color:balance>=0?theme.text:"#f87171", fontFamily:NUM_FONT, whiteSpace:"nowrap" }}>{money(balance)}</span>
            </div>
            {income>0 && (freeToSpend>=0 ? (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", gap:8 }}>
                  <span style={{ fontSize:fz(13), color:theme.text, fontWeight:600 }}>{t.freeLabel}</span>
                  <span style={{ fontSize:fz(14), fontWeight:500, color:"#60a5fa", fontFamily:NUM_FONT, whiteSpace:"nowrap" }}>{money(freeToSpend)}</span>
                </div>
                {remaining>0 && <div style={{ fontSize:fz(10), color:theme.textMuted, marginTop:2 }}>{t.afterGoal(money(remaining))}</div>}
              </>
            ) : (
              <div style={{ fontSize:fz(11), color:"#f87171" }}><Icon name="warn" size={12}/> {t.notEnoughLeft}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    // On phones (.budget-root rules in App.jsx) the whole tab scrolls as one page instead of
    // nesting a small scrolling list under the summary cards.
    <div className="budget-root" style={{ display:"flex", flexDirection:"column", gap:12, height:"100%", minHeight:0 }}>

      {/* Month selector */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, flexShrink:0 }}>
        <button onClick={()=>setViewMonth(new Date(vy,vm-1,1))} style={navBtn} aria-label="‹">‹</button>
        <div style={{ fontSize:fz(16), fontWeight:500, letterSpacing:"0.01em", color:theme.text, minWidth:170, textAlign:"center", textTransform:"capitalize" }}>{monthName}</div>
        <button onClick={()=>setViewMonth(new Date(vy,vm+1,1))} style={navBtn} aria-label="›">›</button>
        {!isCurrentMonth && (
          <button onClick={()=>setViewMonth(new Date(now.getFullYear(),now.getMonth(),1))} style={{ padding:"4px 10px", borderRadius:20, border:"1px solid #60a5fa66", background:"#60a5fa18", color:"#60a5fa", fontSize:fz(11), fontFamily:"inherit" }}>{t.today}</button>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(105px,1fr))", gap:8, flexShrink:0, padding:"4px 3px 2px" }}>
        {[
          { label:t.income,     value:income,      color:"#34d399", filter:"income" },
          { label:t.fixed,      value:fixedTotal,  color:"#f87171", badge:<Icon name="lock" size={11}/>, sub:pctOfIncome(fixedTotal), filter:"fixed" },
          { label:t.afterFixed, value:afterFixed,  color:afterFixed>=0?"#60a5fa":"#f87171" },
          { label:t.expenses,   value:varExpenses, color:"#fb923c", sub:pctOfIncome(varExpenses), filter:"expense" },
          { label:t.savingOpt,  value:savedTotal,  color:SAVINGS_COLOR, sub:targetAmt>0?`${t.targetLabel} ${money(targetAmt)}`:null, filter:"saving" },
          { label:t.balance,    value:balance,     color:balance>=0?theme.text:"#f87171", sub:income>0?t.leftPct(leftRate):null },
        ].map(s=>{
          const on = s.filter && filterType===s.filter;
          return (
          <div key={s.label} className="stat-card"
            onClick={s.filter ? ()=>{ setFilterType(on?"all":s.filter); setPanel(0); } : undefined}
            title={s.filter ? t.statFilterHint : undefined}
            style={{ "--c":s.color, background:on?s.color+"14":theme.surface, boxShadow:theme.shadow, border:`1px solid ${on?s.color:s.badge?s.color+"44":theme.border}`, borderRadius:12, padding:"10px 14px", position:"relative", minWidth:0, overflow:"hidden", cursor:s.filter?"pointer":"default" }}>
            {s.badge && <span style={{ position:"absolute", top:8, right:10, color:s.color, opacity:0.8, display:"inline-flex" }}>{s.badge}</span>}
            <div style={{ fontSize:fz(10), color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600, marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:"clamp(16px, 2vw, 24px)", fontWeight:500, fontFamily:NUM_FONT, fontVariantNumeric:"tabular-nums", letterSpacing:"-0.01em", lineHeight:1.15, color:s.color, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}><CountUp value={s.value} format={money}/></div>
            {s.sub && <div style={{ fontSize:fz(10), color:theme.textMuted, marginTop:4, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.sub}</div>}
          </div>
          );
        })}
      </div>

      {/* ── DESKTOP: side-by-side grid ── */}
      <div className="budget-desktop" style={{ flex:1, minHeight:0, display:"grid", gridTemplateColumns:"1fr 300px", gap:14 }}>
        {TransactionsPanel}
        {BreakdownPanel}
      </div>

      {/* ── MOBILE: Transactions | Breakdown switch (sticky), one panel at a time, swipe still works ── */}
      <div className="budget-mobile" style={{ display:"none", flexDirection:"column", gap:10 }}>
        <div style={{ position:"sticky", top:0, zIndex:5, background:theme.bg, padding:"4px 0 6px", display:"flex", gap:6 }}>
          {[[0,t.transactionsLabel,"transactions"],[1,t.breakdown,"breakdown"]].map(([p,l,ic])=>(
            <button key={p} onClick={()=>setPanel(p)} style={{ flex:1, padding:"9px 8px", borderRadius:10, border:`1px solid ${panel===p?"#60a5fa":theme.border}`, background:panel===p?"#60a5fa22":theme.surface, color:panel===p?"#60a5fa":theme.textMuted, fontSize:fz(13), fontFamily:"inherit", fontWeight:panel===p?600:400, display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}><Icon name={ic} size={15}/>{l}</button>
          ))}
        </div>
        <div ref={swipeRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} key={panel} style={{ animation:"fadeUp 0.2s ease" }}>
          {panel===0 ? TransactionsPanel : BreakdownPanel}
        </div>
      </div>

      {/* Undo toast after delete */}
      {undo && (
        <div style={{ position:"fixed", left:"50%", transform:"translateX(-50%)", bottom:"calc(84px + env(safe-area-inset-bottom,0px))", zIndex:60, display:"flex", alignItems:"center", gap:14, padding:"10px 16px", background:isDark?"#1e293b":"#0f172a", color:"#f1f5f9", borderRadius:12, boxShadow:"0 8px 30px rgba(0,0,0,0.3)", fontSize:fz(13), animation:"fadeUp 0.2s ease", whiteSpace:"nowrap" }}>
          <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}><Icon name="trash" size={14}/>{t.deleted}</span>
          <button onClick={undoDelete} style={{ background:"none", border:"none", color:"#60a5fa", fontWeight:600, fontSize:fz(13), fontFamily:"inherit" }}>{t.undo}</button>
        </div>
      )}

    </div>
  );
}
