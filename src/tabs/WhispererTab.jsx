import { useState, useEffect, useRef } from "react";
import { T } from "../lib/i18n";
import { tagColor, fz, encodeStep, CHECK_RE, toggleChecklistLine } from "../lib/helpers";
import { NoteBody } from "../components/ui";

// ─── WHISPERER TAB ────────────────────────────────────────────────────────────
export default function WhispererTab({ theme, isDark, lang, notes, setNotes, goals, setGoals, notify }) {
  const t = T[lang];
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const [draft, setDraft] = useState("");
  const [draftTag, setDraftTag] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState("");
  // Collapsible quick capture: hides on scroll down, reappears on scroll up
  const [captureCollapsed, setCaptureCollapsed] = useState(false);
  const scrollRef = useRef(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    const onScroll = () => {
      const y = el.scrollTop;
      if (y > lastScrollY.current + 8) setCaptureCollapsed(true);
      else if (y < lastScrollY.current - 8) setCaptureCollapsed(false);
      lastScrollY.current = y;
    };
    el.addEventListener("scroll", onScroll, { passive:true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const allTags = [...new Set(notes.flatMap(n=>n.tags))];
  const filtered = notes.filter(n=>{
    const content=lang==="el"?n.content:(n.contentEn||n.content);
    const ms=!search||content.toLowerCase().includes(search.toLowerCase())||n.tags.some(tg=>tg.includes(search.toLowerCase()));
    return ms&&(!activeTag||n.tags.includes(activeTag));
  }).sort((a,b)=>b.pinned-a.pinned);

  function addNote() {
    if (!draft.trim()) return;
    const tags=draftTag.split(",").map(tg=>tg.trim()).filter(Boolean);
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

  function startEdit(e,note) { e.stopPropagation(); setEditingId(note.id); setEditContent(lang==="el"?note.content:(note.contentEn||note.content)); setEditTags(note.tags.join(", ")); }
  function saveEdit(e,note) { e.stopPropagation(); const tags=editTags.split(",").map(tg=>tg.trim()).filter(Boolean); setNotes(notes.map(n=>n.id===note.id?{...n,content:editContent,contentEn:editContent,tags}:n)); setEditingId(null); }

  const cs = { background:isDark?"#160d2a":"#faf5ff", border:`1px solid ${isDark?"#2d1b4e":"#e9d5ff"}`, borderRadius:8, padding:"9px 14px", color:theme.text, fontSize:fz(13), fontFamily:"inherit" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10, height:"100%", minHeight:0 }}>

      {/* Quick Capture — collapses to slim bar on scroll down */}
      <div style={{ flexShrink:0, overflow:"hidden",
        maxHeight: captureCollapsed ? 38 : 200,
        transition:"max-height 0.3s cubic-bezier(.4,0,.2,1), opacity 0.2s",
        opacity: captureCollapsed ? 0.8 : 1 }}>
        {captureCollapsed ? (
          <button onClick={()=>{ setCaptureCollapsed(false); }}
            style={{ width:"100%", padding:"8px 16px", background:theme.surface, border:`1px solid ${isDark?"#2d1b4e":"#e9d5ff"}`, borderRadius:12, color:theme.textMuted, fontSize:fz(12), fontFamily:"inherit", cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ color:"#c084fc" }}>⚡</span>
            <span style={{ flex:1 }}>{t.capturePlaceholder}</span>
            <span style={{ fontSize:fz(10)}}>↑</span>
          </button>
        ) : (
          <div style={{ background:theme.surface, border:`1px solid ${isDark?"#2d1b4e":"#e9d5ff"}`, borderRadius:16, padding:16 }}>
            <div style={{ fontSize:fz(11), color:"#c084fc", letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:8, fontWeight:600 }}>{t.quickCapture}</div>
            <textarea placeholder={t.capturePlaceholder} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(e.metaKey||e.ctrlKey)&&addNote()} rows={2}
              style={{ ...cs, width:"100%", marginBottom:8, lineHeight:1.6, fontSize:fz(14), padding:"10px 14px", resize:"none", borderRadius:10 }}/>
            <div style={{ display:"flex", gap:8 }}>
              <input placeholder={t.tagsPlaceholder} value={draftTag} onChange={e=>setDraftTag(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addNote()} style={{ ...cs, flex:1 }}/>
              <button onClick={addNote} style={{ padding:"8px 16px", background:"#7c3aed", border:"none", borderRadius:8, color:"#ede9fe", fontSize:fz(13), fontFamily:"inherit", cursor:"pointer", fontWeight:600, whiteSpace:"nowrap" }}>{t.save}</button>
            </div>
          </div>
        )}
      </div>

      {/* Tag filters */}
      <div style={{ display:"flex", gap:7, flexWrap:"wrap", alignItems:"center", flexShrink:0 }}>
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", fontSize:fz(12), pointerEvents:"none" }}>🔍</span>
          <input placeholder={t.searchPlaceholder} value={search} onChange={e=>setSearch(e.target.value)}
            style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:20, padding:"7px 14px 7px 30px", color:theme.text, fontSize:fz(13), fontFamily:"inherit", width:160, outline:"none" }}/>
        </div>
        {allTags.map(tag=>(
          <button key={tag} onClick={()=>setActiveTag(activeTag===tag?null:tag)} style={{ padding:"4px 12px", borderRadius:20, border:`1px solid ${activeTag===tag?tagColor(tag):theme.border}`, background:activeTag===tag?tagColor(tag)+"20":"transparent", color:activeTag===tag?tagColor(tag):theme.textMuted, fontSize:fz(12), fontFamily:"inherit", cursor:"pointer", transition:"all 0.15s" }}>#{tag}</button>
        ))}
        {(search||activeTag) && <button onClick={()=>{setSearch("");setActiveTag(null);}} style={{ padding:"4px 10px", borderRadius:20, border:`1px solid ${theme.border}`, background:"transparent", color:theme.textMuted, fontSize:fz(12), fontFamily:"inherit", cursor:"pointer" }}>{t.clear}</button>}
        <span style={{ marginLeft:"auto", fontSize:fz(12), color:theme.textDim }}>{t.notesCount(filtered.length)}</span>
      </div>

      {/* Notes — scrollRef here drives the collapse logic */}
      <div ref={scrollRef} style={{ flex:1, minHeight:0, overflowY:"auto", WebkitOverflowScrolling:"touch", overscrollBehavior:"contain" }}>
        <div style={{ columns:"290px", columnGap:14, paddingBottom:32 }}>
          {filtered.map((note,i)=>(
            <div key={note.id} className="note-card"
              style={{ breakInside:"avoid", marginBottom:14, background:note.pinned?theme.pinBg:theme.surface, border:`1px solid ${note.pinned?theme.pinBorder:theme.border}`, borderRadius:14, padding:18, position:"relative", boxShadow:note.pinned?`0 0 28px ${isDark?"#7c3aed18":"#a78bfa22"}`:"none", transition:"transform 0.18s", animation:"fadeUp 0.3s ease both", animationDelay:`${i*40}ms` }}>
              <div style={{ position:"absolute", top:12, right:12, display:"flex", gap:4 }}>
                <button onClick={e=>startEdit(e,note)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:fz(13), color:theme.textMuted, opacity:editingId===note.id?1:0.3, transition:"opacity 0.15s", padding:"2px 5px" }} onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity=editingId===note.id?"1":"0.3"}>✏️</button>
                <button onClick={e=>{e.stopPropagation();setNotes(notes.map(n=>n.id===note.id?{...n,pinned:!n.pinned}:n));}} style={{ background:"none", border:"none", cursor:"pointer", fontSize:fz(13), opacity:note.pinned?1:0.2, transition:"opacity 0.18s,transform 0.15s" }} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.2)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>📌</button>
                <button title={t.makeGoal} aria-label={t.makeGoal} onClick={e=>{ e.stopPropagation(); noteToGoal(note); }} style={{ background:"none", border:"none", cursor:"pointer", fontSize:fz(13), opacity:0.3, transition:"opacity 0.15s", padding:"2px 3px" }} onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity="0.3"}>🎯</button>
                <button aria-label={t.deleteGoal} onClick={e=>{ e.stopPropagation(); deleteNote(note); }} style={{ background:"none", border:"none", cursor:"pointer", fontSize:fz(15), color:"#f87171", opacity:0.3, transition:"opacity 0.15s" }} onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity="0.3"}>×</button>
              </div>
              {editingId===note.id ? (
                <div onClick={e=>e.stopPropagation()}>
                  <textarea value={editContent} onChange={e=>setEditContent(e.target.value)} rows={4} style={{ ...cs, width:"100%", marginBottom:8, lineHeight:1.6, fontSize:fz(14), padding:"10px 14px", resize:"none", borderRadius:10 }}/>
                  <input value={editTags} onChange={e=>setEditTags(e.target.value)} placeholder={t.tagsPlaceholder} style={{ ...cs, width:"100%", marginBottom:10 }}/>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={e=>saveEdit(e,note)} style={{ flex:1, padding:"8px", background:"#7c3aed", border:"none", borderRadius:8, color:"#ede9fe", fontSize:fz(13), fontFamily:"inherit", cursor:"pointer", fontWeight:600 }}>{t.saveEdit}</button>
                    <button onClick={e=>{e.stopPropagation();setEditingId(null);}} style={{ padding:"8px 14px", background:theme.input, border:`1px solid ${theme.borderStrong}`, borderRadius:8, color:theme.textMuted, fontSize:fz(13), fontFamily:"inherit", cursor:"pointer" }}>{t.cancel}</button>
                  </div>
                </div>
              ) : (
                <div onClick={()=>setExpanded(expanded===note.id?null:note.id)} style={{ cursor:"pointer" }}>
                  <div style={{ fontSize:fz(15), color:theme.text, lineHeight:1.7, marginBottom:12, paddingRight:100 }}>
                    <NoteBody text={noteText(note)} search={search.trim()} theme={theme} clamp={expanded!==note.id} onToggleLine={(idx)=>toggleLine(note, idx)}/>
                  </div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                    {note.tags.map(tag=><span key={tag} style={{ fontSize:fz(12), padding:"3px 10px", borderRadius:10, background:tagColor(tag)+"20", color:tagColor(tag), fontWeight:500 }}>#{tag}</span>)}
                    <span style={{ fontSize:fz(12), color:theme.textDim, marginLeft:"auto" }}>{noteDate(note)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        {filtered.length===0 && <div style={{ textAlign:"center", padding:"40px 0", color:theme.textDim, fontSize:fz(14)}}>{t.noNotes}</div>}
      </div>
    </div>
  );
}
