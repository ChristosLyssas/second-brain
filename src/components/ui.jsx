import { useState, useEffect } from "react";
import { fz, URL_RE, CHECK_RE, escapeRe, NUM_FONT } from "../lib/helpers";

// ─── ProgressRing ──────────────────────────────────────────────────────────────
export function ProgressRing({ progress, color, size=60, theme }) {
  const r=(size-10)/2, circ=2*Math.PI*r, offset=circ-(progress/100)*circ;
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)", flexShrink:0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={theme.ring} strokeWidth={6}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition:"stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1)" }}/>
      <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
        style={{ transform:`rotate(90deg) translate(0,-${size}px)`, transformOrigin:`${size/2}px ${size/2}px`, fill:theme.text, fontSize:fz(12), fontWeight:700, fontFamily:"inherit" }}>
        {progress}%
      </text>
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
              <span style={{ textDecoration:done?"line-through":"none", opacity:done?0.55:1 }}>{richText(m[3], search, "#a78bfa")}</span>
            </div>
          );
        }
        return <div key={i} style={{ minHeight:line.trim()?undefined:"0.8em", whiteSpace:"pre-wrap", wordBreak:"break-word" }}>{richText(line, search, "#a78bfa")}</div>;
      })}
    </div>
  );
}

// ─── Donut chart (plain SVG) ──────────────────────────────────────────────────
export function Donut({ data, total, theme, active, setActive, centerLabel, centerValue, centerSub, size=150 }) {
  const stroke = 18, r = size/2 - stroke/2 - 4, c = 2*Math.PI*r, mid = size/2;
  const gap = data.length>1 ? 2 : 0;
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
      <text x={mid} y={mid-(centerSub?14:8)} textAnchor="middle" fill={theme.textMuted} style={{ fontSize:fz(10), textTransform:"uppercase", letterSpacing:"0.08em" }}>{centerLabel}</text>
      <text x={mid} y={mid+8} textAnchor="middle" fill={theme.text} style={{ fontSize:fz(16), fontWeight:500, fontFamily:NUM_FONT }}>{centerValue}</text>
      {centerSub && <text x={mid} y={mid+24} textAnchor="middle" fill={theme.textMuted} style={{ fontSize:fz(11), fontFamily:NUM_FONT }}>{centerSub}</text>}
    </svg>
  );
}
