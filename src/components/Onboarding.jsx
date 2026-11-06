// ─── ONBOARDING ───────────────────────────────────────────────────────────────
// Welcome tour shown once to new accounts (and again from Profile → "See the guide again").
// Swipe, arrow keys or the buttons move between the cards; Esc / "Skip" closes it.
import { useState, useEffect, useRef } from "react";
import { T } from "../lib/i18n";
import { fz } from "../lib/helpers";
import { Icon } from "./Icon";

const ACCENTS = ["#60a5fa", "#60a5fa", "#2dd4bf", "#fbbf24", "#34d399", "#f472b6"];

export default function Onboarding({ theme, lang, onClose }) {
  const t = T[lang];
  const slides = t.tour;
  const [i, setI] = useState(0);
  const [closing, setClosing] = useState(false);
  const last = i === slides.length - 1;
  const close = () => { if (closing) return; setClosing(true); setTimeout(onClose, 200); };
  const go = (d) => setI(v => Math.max(0, Math.min(slides.length - 1, v + d)));

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // swipe left / right
  const touch = useRef(null);
  const onTouchStart = (e) => { touch.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touch.current == null) return;
    const dx = e.changedTouches[0].clientX - touch.current; touch.current = null;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  };

  const s = slides[i], c = ACCENTS[i % ACCENTS.length];
  return (
    <div style={{ position:"fixed", inset:0, zIndex:120, background:"rgba(2,6,15,0.6)", display:"flex", alignItems:"center", justifyContent:"center", padding:16,
      animation: closing ? "fadeOut 0.2s ease forwards" : "fadeIn 0.25s ease" }}>
      <div role="dialog" aria-modal="true" aria-label={s.title} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        style={{ width:"100%", maxWidth:420, background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:22, padding:"22px 22px 18px",
          boxShadow:"0 30px 70px rgba(0,0,0,0.45)", backgroundImage:`linear-gradient(180deg, ${c}1a, transparent 190px)`, transition:"background-image 0.3s",
          animation: closing ? "popOut 0.2s ease forwards" : "popIn 0.3s cubic-bezier(.2,.8,.2,1)" }}>

        <div style={{ display:"flex", justifyContent:"flex-end", minHeight:24 }}>
          {!last && <button onClick={close} style={{ background:"none", border:"none", color:theme.textMuted, fontSize:fz(13), fontFamily:"inherit", cursor:"pointer", padding:"2px 4px" }}>{t.tourSkip}</button>}
        </div>

        {/* the slide (re-keyed so each one fades in) */}
        <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", gap:12, padding:"6px 4px 18px", minHeight:250, animation:"fadeUp 0.3s ease" }}>
          <div style={{ width:84, height:84, borderRadius:24, display:"grid", placeItems:"center", background:`${c}1f`, color:c, marginBottom:6 }}>
            {s.icon === "logo"
              ? <img src="/app-icon.svg" alt="" width="84" height="84" style={{ borderRadius:24 }}/>
              : <Icon name={s.icon} size={38} strokeWidth={1.6}/>}
          </div>
          <div style={{ fontSize:fz(21), fontWeight:700, color:theme.text, letterSpacing:"-0.01em", textWrap:"balance" }}>{s.title}</div>
          <div style={{ fontSize:fz(14.5), color:theme.textMuted, lineHeight:1.6, maxWidth:330 }}>{s.text}</div>
          {s.tip && (
            <div style={{ marginTop:4, fontSize:fz(13), color:theme.text, background:theme.input, border:`1px solid ${theme.border}`, borderRadius:12, padding:"8px 12px", display:"flex", alignItems:"center", gap:8, textAlign:"left" }}>
              <Icon name="idea" size={15} style={{ color:c }}/>{s.tip}
            </div>
          )}
        </div>

        {/* dots */}
        <div style={{ display:"flex", justifyContent:"center", gap:6, marginBottom:16 }}>
          {slides.map((_, k) => (
            <button key={k} onClick={() => setI(k)} aria-label={`${k + 1}/${slides.length}`}
              style={{ width:k === i ? 22 : 7, height:7, borderRadius:4, border:"none", padding:0, cursor:"pointer", background:k === i ? c : theme.borderStrong, transition:"all 0.25s ease" }}/>
          ))}
        </div>

        <div style={{ display:"flex", gap:8 }}>
          {i > 0 && (
            <button onClick={() => go(-1)} style={{ padding:"11px 18px", background:theme.input, border:`1px solid ${theme.borderStrong}`, borderRadius:12, color:theme.textMuted, fontSize:fz(14), fontFamily:"inherit", cursor:"pointer" }}>{t.tourBack}</button>
          )}
          <button onClick={() => last ? close() : go(1)} autoFocus
            style={{ flex:1, padding:"11px", background:"#2563eb", border:"none", borderRadius:12, color:"#fff", fontSize:fz(14), fontFamily:"inherit", fontWeight:600, cursor:"pointer" }}>
            {last ? t.tourStart : t.tourNext}
          </button>
        </div>
      </div>
    </div>
  );
}
