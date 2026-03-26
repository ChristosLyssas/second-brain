// src/AuthScreen.jsx
// Drop-in login/signup screen that matches the Second Brain aesthetic

import { useState } from 'react'
import { auth } from './lib/supabase'

const DARK = {
  bg: '#080f1a', surface: '#0c1525', border: '#1e293b',
  borderStrong: '#334155', text: '#f1f5f9', textMuted: '#64748b',
  input: '#1e293b',
}

export default function AuthScreen({ onAuth }) {
  const [mode, setMode]       = useState('login')   // 'login' | 'signup'
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  const t = DARK

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)

    try {
      if (mode === 'login') {
        const { data, error } = await auth.signIn(email, password)
        if (error) throw error
        onAuth(data.session)
      } else {
        const { error } = await auth.signUp(email, password)
        if (error) throw error
        setSuccess('Έλεγξε το email σου για επιβεβαίωση! / Check your email to confirm.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const iStyle = {
    width: '100%',
    background: t.input,
    border: `1px solid ${t.borderStrong}`,
    borderRadius: 10,
    padding: '13px 16px',
    color: t.text,
    fontSize: 15,
    fontFamily: "'DM Mono','Courier New',monospace",
    outline: 'none',
    transition: 'border-color 0.18s',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: t.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Mono','Courier New',monospace",
      color: t.text,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        .auth-input:focus { border-color:#60a5fa !important; }
        .auth-btn:hover { opacity:0.9; transform:translateY(-1px); }
        .auth-btn { transition:opacity 0.15s,transform 0.15s; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{
        width: '100%', maxWidth: 420,
        margin: '0 16px',
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: 20,
        padding: '40px 36px',
        animation: 'fadeUp 0.35s ease',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontFamily: "'Syne',sans-serif", lineHeight: 1.05 }}>
            <span style={{ fontSize: 16, fontWeight: 700, opacity: 0.6 }}>Second </span>
            <span style={{ fontSize: 34, fontWeight: 800, color: '#60a5fa' }}>Brain</span>
          </h1>
          <p style={{ fontSize: 13, color: t.textMuted, marginTop: 6 }}>
            {mode === 'login'
              ? 'Καλωσόρισες πίσω · Welcome back'
              : 'Δημιούργησε λογαριασμό · Create account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: t.textMuted, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 7 }}>
              Email
            </label>
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={iStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: t.textMuted, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 7 }}>
              Password
            </label>
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={e => setPass(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              style={iStyle}
            />
          </div>

          {error && (
            <div style={{ background: '#f8717118', border: '1px solid #f8717144', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#f87171' }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ background: '#34d39918', border: '1px solid #34d39944', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#34d399' }}>
              {success}
            </div>
          )}

          <button
            className="auth-btn"
            type="submit"
            disabled={loading}
            style={{
              marginTop: 6,
              padding: '14px',
              background: loading ? '#1e3a8a' : '#2563eb',
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              fontSize: 14,
              fontFamily: "'DM Mono',monospace",
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.04em',
            }}
          >
            {loading
              ? '...'
              : mode === 'login'
                ? '→ Είσοδος / Sign In'
                : '→ Εγγραφή / Sign Up'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: t.textMuted }}>
          {mode === 'login' ? (
            <>Δεν έχεις λογαριασμό; {' '}
              <button onClick={() => { setMode('signup'); setError(''); setSuccess('') }}
                style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', fontWeight: 600 }}>
                Εγγράψου / Sign Up
              </button>
            </>
          ) : (
            <>Έχεις ήδη λογαριασμό; {' '}
              <button onClick={() => { setMode('login'); setError(''); setSuccess('') }}
                style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', fontWeight: 600 }}>
                Σύνδεση / Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}