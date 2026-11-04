import { useState, useRef } from "react";
import { supabase, auth } from "../lib/supabase";
import { T } from "../lib/i18n";
import { fz, isSaving, toISO, parseTxnDate, downloadFile } from "../lib/helpers";

// ─── PROFILE TAB ──────────────────────────────────────────────────────────────
export default function ProfileTab({ theme, isDark, lang, session, setLang, setIsDark, savingsTarget, setSavingsTarget, goals, notes, txns }) {
  const t = T[lang];
  const [displayName, setDisplayName] = useState(session.user.user_metadata?.display_name||"");
  const [avatarUrl, setAvatarUrl] = useState(session.user.user_metadata?.avatar_url||"");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef();

  const initials = (displayName||session.user.email||"?").slice(0,2).toUpperCase();
  const [targetDraft, setTargetDraft] = useState(String(savingsTarget));
  const commitTarget = () => { const v=Math.max(1, Math.min(100, parseInt(targetDraft)||20)); setSavingsTarget(v); setTargetDraft(String(v)); };

  function exportJSON() {
    const data = { exportedAt:new Date().toISOString(), goals, notes, transactions:txns };
    downloadFile(`secondbrain-${toISO(new Date())}.json`, JSON.stringify(data, null, 2), "application/json");
  }
  function exportCSV() {
    const q = (v) => `"${String(v ?? "").replace(/"/g,'""')}"`;
    const rows = [["date","label","type","category","amount"]];
    txns.forEach(tx=>{
      const d = parseTxnDate(tx.date, tx.createdAt);
      rows.push([d?toISO(d):tx.date, tx.label, isSaving(tx)?"saving":tx.type, t.budgetCategories[tx.catIdx]||"", tx.amount]);
    });
    // BOM so Excel opens Greek text correctly
    downloadFile(`secondbrain-transactions-${toISO(new Date())}.csv`, "﻿"+rows.map(r=>r.map(q).join(",")).join("\r\n"), "text/csv;charset=utf-8");
  }

  const labelStyle = { fontSize:fz(11), color:theme.textMuted, letterSpacing:"0.14em", textTransform:"uppercase", fontWeight:600 };
  const seg = (options, value, onChange) => (
    <div style={{ display:"flex", border:`1px solid ${theme.border}`, borderRadius:10, overflow:"hidden" }}>
      {options.map(([v,l])=>(
        <button key={String(v)} onClick={()=>onChange(v)} style={{ padding:"7px 12px", border:"none", background:value===v?"#60a5fa22":"transparent", color:value===v?"#60a5fa":theme.textMuted, fontSize:fz(13), fontFamily:"inherit", fontWeight:value===v?600:400 }}>{l}</button>
      ))}
    </div>
  );
  const settingRow = (label, control) => (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
      <span style={{ fontSize:fz(13), color:theme.text }}>{label}</span>{control}
    </div>
  );

  async function handleSave() {
    setSaving(true); setMsg(""); setError("");
    try {
      const updates = { data:{ display_name:displayName } };
      if (newPass) {
        if (newPass!==confirmPass) { setError(lang==="el"?"Τα passwords δεν ταιριάζουν":"Passwords don't match"); setSaving(false); return; }
        updates.password = newPass;
      }
      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;
      setMsg(t.profileSaved); setNewPass(""); setConfirmPass("");
    } catch(e) { setError(e.message); }
    setSaving(false);
  }

  async function handleAvatar(e) {
    const file=e.target.files?.[0]; if(!file) return;
    setSaving(true); setMsg(""); setError("");
    try {
      const ext=file.name.split(".").pop();
      const path=`${session.user.id}/avatar.${ext}`;
      const { error:upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert:true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url=data.publicUrl+"?t="+Date.now();
      await supabase.auth.updateUser({ data:{ avatar_url:url } });
      setAvatarUrl(url); setMsg(t.profileSaved);
    } catch(e) { setError(e.message); }
    setSaving(false);
  }

  const iStyle = { width:"100%", background:theme.input, border:`1px solid ${theme.borderStrong}`, borderRadius:10, padding:"13px 16px", color:theme.text, fontSize:fz(14), fontFamily:"'DM Mono',monospace", outline:"none", transition:"border-color 0.18s", boxSizing:"border-box" };

  return (
    <div style={{ height:"100%", minHeight:0, overflowY:"auto", WebkitOverflowScrolling:"touch" }}>
      <div style={{ maxWidth:460, margin:"0 auto", paddingBottom:40 }}>
        <div style={{ fontSize:fz(11), color:theme.textMuted, letterSpacing:"0.18em", textTransform:"uppercase", fontWeight:600, marginBottom:24 }}>{t.profileTitle}</div>

        {/* Avatar */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:28 }}>
          <div onClick={()=>fileRef.current?.click()} style={{ width:90, height:90, borderRadius:"50%", background:avatarUrl?"transparent":(isDark?"#1e3a8a":"#dbeafe"), border:`2px solid ${theme.borderStrong}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:fz(32), fontWeight:700, fontFamily:"'Syne',sans-serif", color:"#60a5fa", overflow:"hidden", marginBottom:10, cursor:"pointer" }}>
            {avatarUrl ? <img src={avatarUrl} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : initials}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatar} style={{ display:"none" }}/>
          <button onClick={()=>fileRef.current?.click()} style={{ background:"none", border:"none", color:"#60a5fa", fontSize:fz(13), cursor:"pointer", fontFamily:"inherit" }}>{t.uploadAvatar}</button>
          <div style={{ marginTop:5, fontSize:fz(13), color:theme.textMuted }}>{session.user.email}</div>
        </div>

        {/* Settings — language, theme and savings target live here (header ones hide on phones) */}
        <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:14, padding:16, marginBottom:24, display:"flex", flexDirection:"column", gap:14 }}>
          <div style={labelStyle}>⚙️ {t.settings}</div>
          {settingRow(t.languageLabel, seg([["el","🇬🇷 Ελληνικά"],["en","🇬🇧 English"]], lang, setLang))}
          {settingRow(t.themeLabel, seg([[true,t.darkMode],[false,t.lightMode]], isDark, setIsDark))}
          {settingRow(`🎯 ${t.savingsGoal}`, (
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <input type="number" min={1} max={100} value={targetDraft} onChange={e=>setTargetDraft(e.target.value)} onBlur={commitTarget} onKeyDown={e=>e.key==="Enter"&&commitTarget()}
                style={{ width:70, background:theme.input, border:`1px solid ${theme.borderStrong}`, borderRadius:8, padding:"7px 8px", color:theme.text, fontSize:fz(13), fontFamily:"inherit", textAlign:"center" }}/>
              <span style={{ color:theme.textMuted }}>%</span>
            </div>
          ))}
          <div style={{ borderTop:`1px solid ${theme.border}`, paddingTop:14, display:"flex", flexDirection:"column", gap:10 }}>
            <div style={labelStyle}>⬇️ {t.exportTitle}</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {[[t.exportJson, exportJSON],[t.exportCsv, exportCSV]].map(([l,fn])=>(
                <button key={l} onClick={fn} style={{ flex:1, minWidth:150, padding:"9px 12px", background:theme.input, border:`1px solid ${theme.borderStrong}`, borderRadius:8, color:theme.text, fontSize:fz(13), fontFamily:"inherit" }}>{l}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={labelStyle}>👤 {t.accountTitle}</div>
          <div>
            <label style={{ fontSize:fz(11), color:theme.textMuted, letterSpacing:"0.14em", textTransform:"uppercase", fontWeight:600, display:"block", marginBottom:7 }}>{t.displayName}</label>
            <input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Your name..." style={iStyle} className="auth-input"/>
          </div>
          <div style={{ borderTop:`1px solid ${theme.border}`, paddingTop:18, marginTop:4 }}>
            <div style={{ fontSize:fz(11), color:theme.textMuted, letterSpacing:"0.14em", textTransform:"uppercase", fontWeight:600, marginBottom:12 }}>{t.changePassword}</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="••••••••" style={iStyle} className="auth-input"/>
              <input type="password" value={confirmPass} onChange={e=>setConfirmPass(e.target.value)} placeholder="••••••••" style={iStyle} className="auth-input"/>
            </div>
          </div>
          {msg && <div style={{ background:"#34d39918", border:"1px solid #34d39944", borderRadius:8, padding:"10px 14px", fontSize:fz(13), color:"#34d399" }}>{msg}</div>}
          {error && <div style={{ background:"#f8717118", border:"1px solid #f8717144", borderRadius:8, padding:"10px 14px", fontSize:fz(13), color:"#f87171" }}>{error}</div>}
          <button onClick={handleSave} disabled={saving} style={{ padding:"13px", background:saving?"#1e3a8a":"#2563eb", border:"none", borderRadius:10, color:"#fff", fontSize:fz(14), fontFamily:"inherit", fontWeight:600, cursor:saving?"not-allowed":"pointer" }}>
            {saving?"...":t.updateProfile}
          </button>
          <button onClick={()=>auth.signOut()} style={{ padding:"11px", background:"transparent", border:"1px solid #f8717166", borderRadius:10, color:"#f87171", fontSize:fz(14), fontFamily:"inherit" }}>{t.signOut}</button>
        </div>
      </div>
    </div>
  );
}
