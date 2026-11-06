import { useState, useEffect, useRef } from "react";
import { T } from "../lib/i18n";
import { tagColor, fz, encodeStep, CHECK_RE, toggleChecklistLine, lsGet, lsSet } from "../lib/helpers";
import { NoteBody, EmptyState } from "../components/ui";
import { Icon } from "../components/Icon";

// Tags are stored without "#" (typing "#idea" or "idea" is the same); old "#tag" values are cleaned on display
const cleanTag = (tg) => String(tg).trim().replace(/^#+/, "");
const parseTags = (s) => [...new Set(String(s).split(",").map(cleanTag).filter(Boolean))];

// Masonry: put each note in the currently shortest column (keeps reading order left → right)
function estimateHeight(note, text, colWidth, editing) {
  if (editing) return 320;
  const perLine = Math.max(12, Math.floor((colWidth - 36) / 8.2));
  const lines = String(text).split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length / perLine)), 0);
  return 96 + lines * 25 + (note.tags.length ? 30 : 0);
}

// ─── WHISPERER TAB ────────────────────────────────────────────────────────────
export default function WhispererTab({ theme, isDark, lang, notes, setNotes, goals, setGoals, notify }) {
  const t = T[lang];
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const [draft, setDraft] = useState("");
  const [draftTag, setDraftTag] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState("");
  // Phones: the capture form scrolls away with the notes (no resizing while scrolling → no jitter);
  // once it's out of view a slim bar appears on top that brings it back.
  const [showBar, setShowBar] = useState(false);
  const scrollRef = useRef(null);
  const captureRef = useRef(null);
  // PC: capture on the left, notes on the right (no collapsing needed there)
  const [wide, setWide] = useState(()=>typeof window!=="undefined" && window.matchMedia("(min-width:900px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(min-width:900px)");
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (wide) return;   // the bar only exists on phones
    const root = scrollRef.current, target = captureRef.current;
    if (!root || !target || typeof IntersectionObserver==="undefined") return;
    const io = new IntersectionObserver(([e])=>setShowBar(!e.isIntersecting), { root, rootMargin:"-24px 0px 0px 0px", threshold:0 });
    io.observe(target);
    return () => io.disconnect();
  }, [wide]);
  const focusCapture = () => {
    scrollRef.current?.scrollTo({ top:0, behavior:"smooth" });
    setTimeout(()=>captureRef.current?.querySelector("textarea")?.focus({ preventScroll:true }), 350);
  };

  const allTags = [...new Set(notes.flatMap(n=>n.tags.map(cleanTag)).filter(Boolean))];

  // ── Manual order (drag a note onto another). Saved on this device; pinned notes always first,
  // new notes (not in the saved order yet) on top, newest first.
  const [noteOrder, setNoteOrderRaw] = useState(()=>{ try { const v = JSON.parse(lsGet("sb_note_order", "[]")); return Array.isArray(v) ? v : []; } catch { return []; } });
  const setNoteOrder = (ids) => { setNoteOrderRaw(ids); lsSet("sb_note_order", JSON.stringify(ids)); };
  const rank = new Map(noteOrder.map((id,i)=>[String(id), i]));
  const sortedNotes = [...notes].sort((a,b)=>
    (b.pinned - a.pinned) ||
    ((rank.get(String(a.id)) ?? -1) - (rank.get(String(b.id)) ?? -1)) ||
    String(b.createdAt||"").localeCompare(String(a.createdAt||"")));
  // moving down → after the target, moving up → before it (so the very next note works too)
  const reorderNotes = (fromId, toId) => {
    if (fromId==null || toId==null || String(fromId)===String(toId)) return;
    const ids = sortedNotes.map(n=>String(n.id));
    const from = ids.indexOf(String(fromId)), to = ids.indexOf(String(toId));
    if (from<0 || to<0) return;
    ids.splice(from, 1);
    ids.splice(ids.indexOf(String(toId)) + (from < to ? 1 : 0), 0, String(fromId));
    setNoteOrder(ids);
  };

  // ── Drag: mouse (HTML drag and drop) and touch (hold ~0.35s, then drag) ──
  const [dragNote, setDragNote] = useState(null);   // { id, dx, dy } while touch-dragging; { id } with the mouse
  const [overNote, setOverNote] = useState(null);
  const overRef = useRef(null);
  const ntouch = useRef(null);   // { id, x0, y0, timer, active }
  const endNoteTouch = (drop) => {
    const t0 = ntouch.current; ntouch.current = null;
    if (t0) clearTimeout(t0.timer);
    if (drop && t0?.active) reorderNotes(t0.id, overRef.current);
    document.body.removeAttribute("data-dragging");
    setDragNote(null); setOverNote(null); overRef.current = null;
  };
  const onNoteTouchStart = (e, note) => {
    if (editingId===note.id || e.touches.length!==1 || e.target.closest("button,input,textarea,a")) return;
    const { clientX:x0, clientY:y0 } = e.touches[0];
    const t0 = { id:note.id, x0, y0, active:false };
    t0.timer = setTimeout(()=>{
      t0.active = true;
      document.body.setAttribute("data-dragging", "1");   // tells the tab-swipe gesture to stay out of it
      window.getSelection?.()?.removeAllRanges();
      navigator.vibrate?.(15);
      setDragNote({ id:note.id, dx:0, dy:0 });
    }, 350);
    ntouch.current = t0;
  };
  useEffect(()=>{
    const onMove = (e) => {
      const t0 = ntouch.current; if (!t0) return;
      const { clientX:x, clientY:y } = e.touches[0];
      if (!t0.active) { if (Math.hypot(x-t0.x0, y-t0.y0) > 10) endNoteTouch(false); return; }   // a scroll
      e.preventDefault();
      setDragNote({ id:t0.id, dx:x-t0.x0, dy:y-t0.y0 });
      const under = document.elementFromPoint(x, y)?.closest("[data-note]")?.getAttribute("data-note") ?? null;
      if (under!==overRef.current) { overRef.current = under; setOverNote(under); }
    };
    const onEnd = () => { if (ntouch.current) endNoteTouch(true); };
    window.addEventListener("touchmove", onMove, { passive:false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return ()=>{ window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onEnd); window.removeEventListener("touchcancel", onEnd); };
  }); // re-bound each render so it sees the current order

  const filtered = sortedNotes.filter(n=>{
    const content=lang==="el"?n.content:(n.contentEn||n.content);
    const tags=n.tags.map(cleanTag), q=search.toLowerCase().replace(/^#+/,"");
    const ms=!search||content.toLowerCase().includes(search.toLowerCase())||tags.some(tg=>tg.toLowerCase().includes(q));
    return ms&&(!activeTag||tags.includes(activeTag));
  });

  // Column count from the list's width: 2 on phones, ~260px per column on bigger screens
  const [listWidth, setListWidth] = useState(0);
  useEffect(()=>{
    const el = scrollRef.current; if (!el || typeof ResizeObserver==="undefined") return;
    const ro = new ResizeObserver(([e])=>setListWidth(e.contentRect.width));
    ro.observe(el);
    return ()=>ro.disconnect();
  },[]);
  const cols = listWidth ? Math.max(2, Math.min(5, Math.floor((listWidth+12)/272))) : 2;
  const narrow = listWidth>0 && listWidth<560;
  const colWidth = listWidth ? (listWidth - (cols-1)*12) / cols : 200;
  const columns = Array.from({ length:cols }, ()=>({ h:0, items:[] }));
  filtered.forEach((note,i)=>{
    const c = columns.reduce((a,b)=>b.h<a.h?b:a);
    c.items.push({ note, i });
    c.h += estimateHeight(note, lang==="el"?note.content:(note.contentEn||note.content), colWidth, editingId===note.id) + 12;
  });

  function addNote() {
    if (!draft.trim()) return;
    const tags=parseTags(draftTag);
    const today=new Date().toLocaleDateString(T[lang].dateLocale,{day:"numeric",month:"short",year:"numeric"});
    setNotes([{ id:Date.now(), content:draft, contentEn:draft, tags, pinned:false, date:today, createdAt:new Date().toISOString() },...notes]);
    setDraft(""); setDraftTag("");
  }

  const noteText = (n) => lang==="el" ? n.content : (n.contentEn||n.content);
  const noteDate = (n) => n.createdAt ? new Date(n.createdAt).toLocaleDateString(T[lang].dateLocale,{ day:"numeric", month:"short", year:"numeric" }) : n.date;

  function deleteNote(note) {
    setNotes(notes.filter(n=>n.id!==note.id));
    if (editingId===note.id) setEditingId(null);
    notify(t.noteDeleted, { kind:"restoreNote", item:note });
  }
  function toggleLine(note, idx) {
    const next = toggleChecklistLine(noteText(note), idx);
    setNotes(notes.map(n=>n.id===note.id ? { ...n, content:next, contentEn:next } : n));
  }
  // Note → Goal: first plain line becomes the title, "- [ ]" lines become steps
  function noteToGoal(note) {
    const lines = noteText(note).split("\n").map(l=>l.trim()).filter(Boolean);
    const steps = lines.filter(l=>CHECK_RE.test(l)).map(l=>{ const m=CHECK_RE.exec(l); return encodeStep({ text:m[3], done:m[2].toLowerCase()==="x" }); });
    const title = (lines.find(l=>!CHECK_RE.test(l)) || lines[0] || "").replace(CHECK_RE,"$3").slice(0,90);
    if (!title) return;
    const done = steps.filter(s=>s.startsWith("[x]")).length;
    setGoals([...goals, { id:Date.now(), areaIdx:0, priority:"medium", progress:steps.length?Math.round(done/steps.length*100):0, due:"", tasks:steps, titleEl:title, titleEn:title }]);
    notify(t.goalCreated, { kind:"goto", tab:"goals" });
  }

  function startEdit(e,note) { e.stopPropagation(); setEditingId(note.id); setEditContent(lang==="el"?note.content:(note.contentEn||note.content)); setEditTags(note.tags.map(cleanTag).join(", ")); }
  function saveEdit(e,note) { e.stopPropagation(); const tags=parseTags(editTags); setNotes(notes.map(n=>n.id===note.id?{...n,content:editContent,contentEn:editContent,tags}:n)); setEditingId(null); }

  const cs = { background:theme.input, border:`1px solid ${theme.borderStrong}`, borderRadius:8, padding:"9px 14px", color:theme.text, fontSize:fz(13), fontFamily:"inherit" };

  const capture = (
    <div ref={captureRef} style={{ flexShrink:0 }}>
      <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, boxShadow:theme.shadow, borderRadius:16, padding:16 }}>
        <div style={{ fontSize:fz(11), color:"#60a5fa", letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:8, fontWeight:600 }}>{t.quickCapture}</div>
        <textarea placeholder={t.capturePlaceholder} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(e.metaKey||e.ctrlKey)&&addNote()} rows={wide?9:2}
          style={{ ...cs, width:"100%", marginBottom:8, lineHeight:1.6, fontSize:fz(14), padding:"10px 14px", resize:wide?"vertical":"none", borderRadius:10 }}/>
        <div style={{ display:"flex", flexDirection:wide?"column":"row", gap:8 }}>
          <input placeholder={t.tagsPlaceholder} value={draftTag} onChange={e=>setDraftTag(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addNote()} style={{ ...cs, flex:wide?"none":1, width:wide?"100%":undefined, minWidth:0 }}/>
          <button onClick={addNote} style={{ padding:wide?"10px 16px":"8px 16px", background:"#2563eb", border:"none", borderRadius:8, color:"#fff", fontSize:fz(13), fontFamily:"inherit", cursor:"pointer", fontWeight:600, whiteSpace:"nowrap" }}>{t.save}</button>
        </div>
        {wide && <div style={{ marginTop:10, fontSize:fz(11), color:theme.textDim }}>Ctrl + Enter</div>}
      </div>
    </div>
  );

  const filters = (
      <div className="wh-filters" style={{ display:"flex", gap:7, flexWrap:"wrap", alignItems:"center", flexShrink:0 }}>
        <div style={{ position:"relative", flexShrink:0 }}>
          <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:theme.textMuted, pointerEvents:"none", display:"inline-flex" }}><Icon name="search" size={13}/></span>
          <input placeholder={t.searchPlaceholder} value={search} onChange={e=>setSearch(e.target.value)}
            style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:20, padding:"7px 14px 7px 30px", color:theme.text, fontSize:fz(13), fontFamily:"inherit", width:narrow?130:160, outline:"none" }}/>
        </div>
        {allTags.map(tag=>(
          <button key={tag} onClick={()=>setActiveTag(activeTag===tag?null:tag)} style={{ padding:"4px 12px", borderRadius:20, border:`1px solid ${activeTag===tag?tagColor(tag):theme.border}`, background:activeTag===tag?tagColor(tag)+"20":"transparent", color:activeTag===tag?tagColor(tag):theme.textMuted, fontSize:fz(12), fontFamily:"inherit", cursor:"pointer", transition:"all 0.15s" }}>#{tag}</button>
        ))}
        {(search||activeTag) && <button onClick={()=>{setSearch("");setActiveTag(null);}} style={{ padding:"4px 10px", borderRadius:20, border:`1px solid ${theme.border}`, background:"transparent", color:theme.textMuted, fontSize:fz(12), fontFamily:"inherit", cursor:"pointer" }}>{t.clear}</button>}
        <span className="wh-count" style={{ marginLeft:"auto", fontSize:fz(12), color:theme.textDim, whiteSpace:"nowrap" }}>{t.notesCount(filtered.length)}</span>
      </div>
  );

  return (
    <div style={{ display:"flex", gap:20, height:"100%", minHeight:0 }}>
      {wide && <div style={{ width:"clamp(300px, 28vw, 420px)", flexShrink:0, overflowY:"auto" }}>{capture}</div>}
    <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:10, height:"100%", minHeight:0 }}>

      {wide && filters}

      {/* Notes (on phones the capture form and filters scroll along with them) */}
      <div ref={scrollRef} style={{ flex:1, minHeight:0, overflowY:"auto", overflowX:"hidden", WebkitOverflowScrolling:"touch", overscrollBehavior:"contain" }}>
        {!wide && (
          <>
            {/* Slim bar, pinned to the top once the form has scrolled away (0-height sticky → no layout shift) */}
            <div style={{ position:"sticky", top:0, height:0, zIndex:5 }}>
              <button onClick={focusCapture} tabIndex={showBar?0:-1} aria-hidden={!showBar}
                style={{ position:"absolute", top:0, left:0, right:0, height:40, padding:"0 14px", background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:12, boxShadow:"0 8px 20px -10px rgba(0,0,0,0.5)", color:theme.textMuted, fontSize:fz(13), fontFamily:"inherit", cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:8,
                  opacity:showBar?1:0, transform:showBar?"none":"translateY(-6px)", pointerEvents:showBar?"auto":"none", transition:"opacity 0.25s ease, transform 0.25s ease" }}>
                <Icon name="plus" size={15} style={{ color:"#60a5fa" }}/>
                <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{draft.trim() || t.capturePlaceholder}</span>
              </button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:10 }}>
              {capture}
              {filters}
            </div>
          </>
        )}
        <div style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"4px 2px 32px" }}>
          {columns.map((col,ci)=>(
          <div key={ci} style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:12 }}>
          {col.items.map(({ note, i })=>{
            const editing = editingId===note.id;
            const actBtn = { background:"none", border:"none", cursor:"pointer", color:theme.textMuted, padding:4, display:"inline-flex", borderRadius:6 };
            return (
            <div key={note.id} className={`note-card${dragNote ? "" : " lift-card"}`} data-note={note.id}
              onTouchStart={e=>onNoteTouchStart(e, note)}
              onContextMenu={e=>{ if (!editing && window.matchMedia("(pointer:coarse)").matches) e.preventDefault(); }}
              draggable={!editing}
              onDragStart={e=>{ setDragNote({ id:note.id }); e.dataTransfer.effectAllowed="move"; }}
              onDragOver={e=>{ if (!dragNote) return; e.preventDefault(); if (overNote!==String(note.id)) setOverNote(String(note.id)); }}
              onDrop={e=>{ e.preventDefault(); reorderNotes(dragNote?.id, note.id); setDragNote(null); setOverNote(null); }}
              onDragEnd={()=>{ setDragNote(null); setOverNote(null); }}
              style={{ background:note.pinned?theme.pinBg:theme.surface, border:`1px solid ${note.pinned?theme.pinBorder:theme.border}`, borderRadius:14, padding:narrow?"14px 14px 8px":"16px 18px 10px", position:"relative", boxShadow:note.pinned?`${theme.shadow}, 0 0 28px ${isDark?"#3b82f618":"#60a5fa22"}`:theme.shadow, animation:"fadeUp 0.3s ease backwards", animationDelay:`${Math.min(i,12)*35}ms`,
                ...(overNote===String(note.id) && dragNote && String(dragNote.id)!==String(note.id) ? { outline:"2px solid #60a5fa", outlineOffset:2 } : {}),
                ...(dragNote && String(dragNote.id)===String(note.id)
                  ? (dragNote.dx!=null
                      ? { transform:`translate(${dragNote.dx}px, ${dragNote.dy}px) scale(1.03)`, zIndex:20, pointerEvents:"none", boxShadow:"0 20px 44px rgba(0,0,0,0.4)", opacity:0.95 }
                      : { opacity:0.4 })
                  : {}) }}>
              {editing ? (
                <div onClick={e=>e.stopPropagation()} style={{ paddingBottom:6 }}>
                  <textarea value={editContent} onChange={e=>setEditContent(e.target.value)} rows={5} style={{ ...cs, width:"100%", boxSizing:"border-box", marginBottom:8, lineHeight:1.6, fontSize:fz(14), padding:"10px 12px", resize:"vertical", borderRadius:10 }}/>
                  <input value={editTags} onChange={e=>setEditTags(e.target.value)} placeholder={t.tagsPlaceholder} style={{ ...cs, width:"100%", boxSizing:"border-box", marginBottom:10 }}/>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    <button onClick={e=>saveEdit(e,note)} style={{ flex:1, padding:"8px", background:"#2563eb", border:"none", borderRadius:8, color:"#fff", fontSize:fz(13), fontFamily:"inherit", cursor:"pointer", fontWeight:600 }}>{t.saveEdit}</button>
                    <button onClick={e=>{e.stopPropagation();setEditingId(null);}} style={{ padding:"8px 14px", background:theme.input, border:`1px solid ${theme.borderStrong}`, borderRadius:8, color:theme.textMuted, fontSize:fz(13), fontFamily:"inherit", cursor:"pointer" }}>{t.cancel}</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize:fz(narrow?14:15), color:theme.text, lineHeight:1.65, marginBottom:10, overflowWrap:"anywhere" }}>
                    <NoteBody text={noteText(note)} search={search.trim()} theme={theme} clamp={false} onToggleLine={(idx)=>toggleLine(note, idx)}/>
                  </div>
                  {note.tags.length>0 && (
                    <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:6 }}>
                      {note.tags.map(cleanTag).filter(Boolean).map(tag=><span key={tag} onClick={()=>setActiveTag(activeTag===tag?null:tag)} style={{ fontSize:fz(11.5), padding:"2px 9px", borderRadius:10, background:tagColor(tag)+"20", color:tagColor(tag), fontWeight:500, cursor:"pointer", maxWidth:"100%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>#{tag}</span>)}
                    </div>
                  )}
                  {/* footer: date + actions (faint until hover on desktop, always visible on touch) */}
                  <div style={{ display:"flex", alignItems:"center", gap:2, marginLeft:-4 }}>
                    <span style={{ fontSize:fz(11.5), color:theme.textDim, flex:1, minWidth:0, paddingLeft:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{noteDate(note)}</span>
                    <div className="note-actions" style={{ display:"flex", gap:0, marginRight:-4 }}>
                      <button className="na-btn" aria-label="edit" onClick={e=>startEdit(e,note)} style={actBtn}><Icon name="edit" size={14}/></button>
                      <button className="na-btn" aria-label="pin" onClick={e=>{e.stopPropagation();setNotes(notes.map(n=>n.id===note.id?{...n,pinned:!n.pinned}:n));}} style={{ ...actBtn, color:note.pinned?"#60a5fa":theme.textMuted }}><Icon name="pin" size={14} style={note.pinned?{ fill:"currentColor" }:undefined}/></button>
                      <button className="na-btn" title={t.makeGoal} aria-label={t.makeGoal} onClick={e=>{ e.stopPropagation(); noteToGoal(note); }} style={actBtn}><Icon name="toGoal" size={14}/></button>
                      <button className="na-btn na-del" aria-label={t.deleteGoal} onClick={e=>{ e.stopPropagation(); deleteNote(note); }} style={actBtn}><Icon name="close" size={15}/></button>
                    </div>
                  </div>
                </>
              )}
            </div>
            );
          })}
          </div>
          ))}
        </div>
        {filtered.length===0 && (notes.length===0
          ? <EmptyState theme={theme} icon="notes" title={t.emptyNotesTitle} hint={t.emptyNotesHint} action={t.writeNote} onAction={focusCapture}/>
          : <EmptyState theme={theme} compact icon="search" title={t.noNotes} hint={t.noResultsHint}/>)}
      </div>
    </div>
    </div>
  );
}
