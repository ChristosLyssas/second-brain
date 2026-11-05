import { T } from "./i18n";

export const AREA_COLORS = {
  "Ανάπτυξη":"#60a5fa","Υγεία":"#34d399","Γνώση":"#fbbf24","Δημιουργία":"#f472b6","Οικονομικά":"#a78bfa",
  "Development":"#60a5fa","Health":"#34d399","Knowledge":"#fbbf24","Creativity":"#f472b6","Finance":"#a78bfa",
};
export const CAT_COLORS = {
  "Κατοικία":"#60a5fa","Τρόφιμα":"#34d399","Φαγητό":"#fbbf24","Μεταφορά":"#fb923c","Υγεία":"#f472b6","Συνδρομές":"#a78bfa","Ψυχαγωγία":"#22d3ee","Άλλο":"#94a3b8","Εισόδημα":"#34d399","Αποταμίευση":"#2dd4bf",
  "Housing":"#60a5fa","Groceries":"#34d399","Dining":"#fbbf24","Transport":"#fb923c","Health":"#f472b6","Subscriptions":"#a78bfa","Entertainment":"#22d3ee","Other":"#94a3b8","Income":"#34d399","Savings":"#2dd4bf",
};
export const TAG_PALETTE = ["#60a5fa","#34d399","#fbbf24","#f472b6","#a78bfa","#22d3ee","#f87171","#fb923c"];
export function tagColor(tag){ let h=0; for(let c of tag) h=(h*31+c.charCodeAt(0))%TAG_PALETTE.length; return TAG_PALETTE[h]; }

// Font size that follows the --fs scale (1 on phones, larger on desktop — see the <style> block)
export const fz = (n) => `calc(${n}px * var(--fs, 1))`;

// ─── Dates ────────────────────────────────────────────────────────────────────
export const startOfDay = (d=new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const daysUntil  = (d) => Math.round((startOfDay(d) - startOfDay()) / 86400000);   // 0 = today, <0 = past
// Goal due dates are "YYYY-MM-DD"; parsed as *local* dates (new Date("2026-11-04") would be UTC)
export const goalDue = (g) => g?.due ? parseTxnDate(g.due) : null;

// ─── Goal steps ───────────────────────────────────────────────────────────────
// Stored as plain strings ("[x] text" = done, "[ ] text" = open) so they fit any `tasks`
// column type. Older steps without a prefix count as not done.
export function parseStep(s) {
  const str = String(s ?? "");
  const m = /^\[( |x)\]\s?/i.exec(str);
  return { text: m ? str.slice(m[0].length) : str, done: !!m && m[1].toLowerCase()==="x" };
}
export const encodeStep = (st) => `[${st.done?"x":" "}] ${st.text}`;
export const goalSteps  = (g) => (Array.isArray(g?.tasks) ? g.tasks : []).map(parseStep).filter(s=>s.text.trim());
export const PRIO_RANK  = { high:0, medium:1, low:2 };
export const FINANCE_AREA = 4;   // index of "Οικονομικά" / "Finance" in T[lang].areas

// ─── Note rendering: "- [ ]" checklists, clickable links, search highlight ────
export const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;
export const CHECK_RE = /^(\s*[-*]\s*)\[( |x)\]\s?(.*)$/i;
export const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Flip "[ ]" ↔ "[x]" on one line of a note
export function toggleChecklistLine(text, idx) {
  const lines = String(text).split("\n");
  lines[idx] = lines[idx].replace(CHECK_RE, (_, pre, mark, rest) => `${pre}[${mark.toLowerCase()==="x"?" ":"x"}] ${rest}`);
  return lines.join("\n");
}

export const DARK  = { bg:"#080f1a",surface:"#0e1829",border:"#172235",shadow:"0 1px 2px rgba(0,0,0,0.3), 0 8px 24px -12px rgba(0,0,0,0.55)",borderStrong:"#334155",text:"#f1f5f9",textMuted:"#94a3b8",textDim:"#64748b",input:"#1e293b",ring:"#1e293b",scrollThumb:"#1e293b",pinBg:"#0b1730",pinBorder:"#3b82f666" };
export const LIGHT = { bg:"#f0f4ff",surface:"#ffffff",border:"#e8edf5",shadow:"0 1px 2px rgba(15,23,42,0.05), 0 8px 24px -14px rgba(15,23,42,0.18)",borderStrong:"#cbd5e1",text:"#0f172a",textMuted:"#475569",textDim:"#94a3b8",input:"#f8fafc",ring:"#e2e8f0",scrollThumb:"#cbd5e1",pinBg:"#eff6ff",pinBorder:"#93c5fd" };

// ─── BUDGET HELPERS ───────────────────────────────────────────────────────────
export const INCOME_CAT = 8, OTHER_CAT = 7, SAVINGS_CAT = 9;
export const SAVINGS_COLOR = "#2dd4bf";
// Savings are stored as type "expense" + category "Savings" (no DB schema change needed),
// but are treated as money put aside — never as spending.
export const isSaving = (tx) => tx.type!=="income" && Number(tx.catIdx)===SAVINGS_CAT;
// One family for the whole UI (full Greek support); swap it here to try another
export const UI_FONT  = "'Commissioner',system-ui,-apple-system,'Segoe UI',sans-serif";
export const NUM_FONT = UI_FONT;
export const GR_MONTHS = ["ιαν","φεβ","μαρ","απρ","μαι","ιουν","ιουλ","αυγ","σεπ","οκτ","νοε","δεκ"];
export const EN_MONTHS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

export function lsGet(key, fallback) { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }
export function lsSet(key, value) { try { localStorage.setItem(key, value); } catch {} }

// 1750 → "1.750 €" (el) / "1,750 €" (en); decimals only when the amount has cents
export function fmtMoney(n, lang) {
  const v = Math.round((Number(n)||0)*100)/100;
  const s = new Intl.NumberFormat(T[lang].dateLocale, { minimumFractionDigits:Number.isInteger(v)?0:2, maximumFractionDigits:2 }).format(v);
  return `${s} €`;
}

export function toISO(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

// New transactions store ISO dates (YYYY-MM-DD). Older ones were saved as localized
// text ("4 Νοε 2026" / "4 Nov 2026"), so those are parsed as a fallback.
export function parseTxnDate(value, fallback) {
  if (value) {
    const s = String(value).trim();
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (iso) return new Date(+iso[1], +iso[2]-1, +iso[3]);
    const m = /^(\d{1,2})\s+([^\s\d]+?)\.?\s+(\d{4})/.exec(s);
    if (m) {
      const word = m[2].normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
      let mi = GR_MONTHS.findIndex(p=>word.startsWith(p));
      if (mi<0) mi = EN_MONTHS.findIndex(p=>word.startsWith(p));
      if (mi>=0) return new Date(+m[3], mi, +m[1]);
    }
    const d = new Date(s);
    if (!isNaN(d)) return d;
  }
  if (fallback) { const d = new Date(fallback); if (!isNaN(d)) return d; }
  return null;
}

// ─── TODAY TAB ────────────────────────────────────────────────────────────────
// Same rules as the Budget tab: savings aren't spending; "free to spend" = left over − what the goal still needs
export function monthBudget(txns, savingsTarget, date=new Date()) {
  const y = date.getFullYear(), m = date.getMonth();
  const inMonth = txns.filter(tx=>{ const d=parseTxnDate(tx.date, tx.createdAt)||date; return d.getFullYear()===y && d.getMonth()===m; });
  const sum = (f) => inMonth.filter(f).reduce((s,tx)=>s+Math.abs(tx.amount),0);
  const income = sum(tx=>tx.type==="income"), saved = sum(isSaving);
  const expenses = sum(tx=>tx.type!=="income" && !isSaving(tx));
  const balance = income-expenses-saved, target = income*savingsTarget/100, remaining = Math.max(0, target-saved);
  return { income, saved, expenses, balance, target, remaining, freeToSpend:balance-remaining, coverage:target>0?Math.min(100,(saved/target)*100):0 };
}


// ─── Download helper (Profile export) ─────────────────────────────────────────
export function downloadFile(filename, text, mime) {
  const url = URL.createObjectURL(new Blob([text], { type:mime }));
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
