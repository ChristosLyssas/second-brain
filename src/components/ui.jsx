import { useState, useEffect, useRef } from "react";
import { fz, URL_RE, CHECK_RE, escapeRe, NUM_FONT } from "../lib/helpers";
import { Icon } from "./Icon";

// ─── ProgressRing ──────────────────────────────────────────────────────────────
export function ProgressRing({ progress, color, size=60, theme }) {
  const p = Math.max(0, Math.min(100, Number(progress)||0)), done = p>=100;
  const r=(size-10)/2, circ=2*Math.PI*r, offset=circ-(p/100)*circ, mid=size/2;
  const stroke = done ? "#34d399" : color;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink:0 }} role="img" aria-label={`${p}%`}>
      <circle cx={mid} cy={mid} r={r} fill={done?"#34d39918":"none"} stroke={theme.ring} strokeWidth={6} style={{ transition:"fill 0.4s" }}/>
      {/* only the arc is rotated so it starts at 12 o'clock; the text stays upright */}
      <circle cx={mid} cy={mid} r={r} fill="none" stroke={stroke} strokeWidth={6} transform={`rotate(-90 ${mid} ${mid})`}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition:"stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1), stroke 0.4s" }}/>
      {done ? (
        <path d={`M ${mid-size*0.16} ${mid+size*0.01} L ${mid-size*0.04} ${mid+size*0.13} L ${mid+size*0.18} ${mid-size*0.12}`}
          fill="none" stroke="#34d399" strokeWidth={size*0.07} strokeLinecap="round" strokeLinejoin="round"/>
      ) : (
        <text x={mid} y={mid} textAnchor="middle" dominantBaseline="central"
          style={{ fill:theme.text, fontSize:Math.round(size*0.22), fontWeight:700, fontFamily:"inherit" }}>
          {p}%
        </text>
      )}
    </svg>
  );
}

export function FadeCard({ children, style, className, onClick }) {
  const [vis,setVis]=useState(false);
  useEffect(()=>{ const t=setTimeout(()=>setVis(true),30); return ()=>clearTimeout(t); },[]);
  return <div className={className} onClick={onClick} style={{ ...style, opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(10px)", transition:"opacity 0.3s ease,transform 0.3s ease,box-shadow 0.18s,border-color 0.18s" }}>{children}</div>;
}


// ─── Note body (checklists, links, highlight) ─────────────────────────────────
export function richText(text, search, linkColor) {
  return String(text).split(URL_RE).map((part, i) => {
    if (i % 2 === 1) return <a key={i} href={part} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{ color:linkColor, textDecoration:"underline", wordBreak:"break-all" }}>{part}</a>;
    if (!search) return <span key={i}>{part}</span>;
    return <span key={i}>{part.split(new RegExp(`(${escapeRe(search)})`, "gi")).map((h, j) =>
      j % 2 === 1 ? <mark key={j} style={{ background:"#fbbf2455", color:"inherit", borderRadius:3, padding:"0 1px" }}>{h}</mark> : h
    )}</span>;
  });
}

export function NoteBody({ text, search, theme, clamp, onToggleLine }) {
  const lines = String(text).split("\n");
  return (
    <div style={{ maxHeight:clamp?"calc(1.7em * 3)":"none", overflow:"hidden" }}>
      {lines.map((line, i) => {
        const m = CHECK_RE.exec(line);
        if (m) {
          const done = m[2].toLowerCase()==="x";
          return (
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
              <button onClick={e=>{ e.stopPropagation(); onToggleLine(i); }} aria-label={done?"✓":"○"}
                style={{ marginTop:"0.3em", width:"1.05em", height:"1.05em", flexShrink:0, borderRadius:4, border:`1.5px solid ${done?"#34d399":theme.borderStrong}`, background:done?"#34d399":"transparent", color:"#06281c", fontSize:"0.75em", lineHeight:1, display:"flex", alignItems:"center", justifyContent:"center", padding:0 }}>{done?"✓":""}</button>
              <span style={{ textDecoration:done?"line-through":"none", opacity:done?0.55:1 }}>{richText(m[3], search, "#60a5fa")}</span>
            </div>
          );
        }
        return <div key={i} style={{ minHeight:line.trim()?undefined:"0.8em", whiteSpace:"pre-wrap", wordBreak:"break-word" }}>{richText(line, search, "#60a5fa")}</div>;
      })}
    </div>
  );
}

// ─── Donut chart (plain SVG) ──────────────────────────────────────────────────
export function Donut({ data, total, theme, active, setActive, centerLabel, centerValue, centerSub, size=150 }) {
  const stroke = 18, r = size/2 - stroke/2 - 4, c = 2*Math.PI*r, mid = size/2;
  const gap = data.length>1 ? 2 : 0;
  // Keep the centre text inside the hole: shrink long labels/amounts to fit
  const inner = 2*(r - stroke/2) - 18;
  const labelPx = Math.min(11, inner / (String(centerLabel||"").length*0.72 || 1));
  const valuePx = Math.min(19, inner / (String(centerValue||"").length*0.6 || 1));
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${centerLabel} ${centerValue}`}>
      <circle cx={mid} cy={mid} r={r} fill="none" stroke={theme.ring} strokeWidth={stroke}/>
      <g transform={`rotate(-90 ${mid} ${mid})`}>
        {data.map(d=>{
          const len = total>0 ? (d.amt/total)*c : 0;
          const seg = Math.max(0, len-gap);
          const isActive = active===d.idx;
          const el = (
            <circle key={d.idx} cx={mid} cy={mid} r={r} fill="none" stroke={d.color}
              strokeWidth={isActive?stroke+4:stroke} strokeDasharray={`${seg} ${c-seg}`} strokeDashoffset={-acc}
              opacity={active==null||isActive?1:0.3}
              style={{ cursor:"pointer", transition:"opacity 0.2s, stroke-width 0.2s" }}
              onMouseEnter={()=>setActive(d.idx)} onMouseLeave={()=>setActive(null)}
              onClick={()=>setActive(isActive?null:d.idx)}>
              <title>{d.name}</title>
            </circle>
          );
          acc += len;
          return el;
        })}
      </g>
      <text x={mid} y={mid-(centerSub?14:8)} textAnchor="middle" fill={theme.textMuted} style={{ fontSize:labelPx, textTransform:"uppercase", letterSpacing:"0.04em" }}>{centerLabel}</text>
      <text x={mid} y={mid+8} textAnchor="middle" fill={theme.text} style={{ fontSize:valuePx, fontWeight:600, fontFamily:NUM_FONT }}>{centerValue}</text>
      {centerSub && <text x={mid} y={mid+24} textAnchor="middle" fill={theme.textMuted} style={{ fontSize:fz(11), fontFamily:NUM_FONT }}>{centerSub}</text>}
    </svg>
  );
}

// ─── CountUp: numbers that "count" to their value (0 → value on mount) ─────────
const reducedMotion = () => typeof window!=="undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
export function CountUp({ value, format=(n)=>n, duration=750 }) {
  const to = Number(value)||0;
  const [shown, setShown] = useState(()=>reducedMotion()?to:0);
  const cur = useRef(reducedMotion()?to:0);
  useEffect(()=>{
    const from = cur.current;
    if (reducedMotion() || from===to) { cur.current=to; setShown(to); return; }
    let raf, start;
    const step = (ts) => {
      if (start===undefined) start = ts;
      const k = Math.min(1, (ts-start)/duration), e = 1-Math.pow(1-k,3);
      // whole numbers while moving (no flickering cents), exact value at the end
      const v = k<1 ? Math.round(from+(to-from)*e) : to;
      cur.current = v; setShown(v);
      if (k<1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return ()=>cancelAnimationFrame(raf);
  },[to,duration]);
  return <>{format(shown)}</>;
}

// ─── EmptyState: big faint icon, a sentence, an action ────────────────────────
export function EmptyState({ icon, title, hint, action, onAction, theme, compact }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", gap:compact?6:8, padding:compact?"20px 12px":"48px 16px", animation:"fadeUp 0.35s ease backwards" }}>
      <div style={{ width:compact?52:72, height:compact?52:72, borderRadius:"50%", display:"grid", placeItems:"center", marginBottom:compact?4:8,
        background:"radial-gradient(circle, #60a5fa1f, transparent 70%)", color:"#60a5fa", opacity:0.8 }}>
        <Icon name={icon} size={compact?26:36} strokeWidth={1.4}/>
      </div>
      <div style={{ fontSize:fz(compact?14:16), fontWeight:600, color:theme.text }}>{title}</div>
      {hint && <div style={{ fontSize:fz(13), color:theme.textMuted, maxWidth:320, lineHeight:1.5 }}>{hint}</div>}
      {action && <button onClick={onAction} style={{ marginTop:compact?6:10, padding:"8px 18px", borderRadius:20, border:"none", background:"#2563eb", color:"#fff", fontSize:fz(13), fontFamily:"inherit", fontWeight:600, cursor:"pointer" }}>{action}</button>}
    </div>
  );
}

// ─── Skeleton: pulsing placeholder cards while data loads the first time ──────
export function SkeletonGrid({ theme, count=4 }) {
  const bar = (w, h=10, mt=0) => <div style={{ width:w, height:h, marginTop:mt, borderRadius:6, background:theme.border }}/>;
  return (
    <div aria-busy="true" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(260px,100%),1fr))", gap:14, alignItems:"start", paddingTop:8 }}>
      {Array.from({ length:count }).map((_,i)=>(
        <div key={i} style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:16, padding:18, animation:`skPulse 1.4s ease-in-out ${i*0.12}s infinite` }}>
          {bar("40%", 9)}
          {bar("70%", 22, 18)}
          {bar("100%", 6, 18)}
          {bar("55%", 10, 14)}
        </div>
      ))}
    </div>
  );
}
