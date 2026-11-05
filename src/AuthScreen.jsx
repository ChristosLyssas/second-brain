// src/AuthScreen.jsx
// Login / sign-up screen: short intro to the app on the left (top on phones), form on the right.

import { useState } from 'react'
import { auth } from './lib/supabase'
import { Icon } from './components/Icon'

const C = {
  bg: '#080f1a', surface: '#0c1525', border: '#1e293b', borderStrong: '#334155',
  text: '#f1f5f9', textMuted: '#94a3b8', input: '#111c2e', blue: '#60a5fa',
}

const TXT = {
  el: {
    tagline: 'Ο δεύτερος εγκέφαλός σου.',
    intro: 'Στόχοι, σημειώσεις, οικονομικά και ημερολόγιο — όλα σε ένα μέρος, στα ελληνικά.',
    features: [
      ['goals', 'Στόχοι με βήματα', 'Σπάσε κάθε στόχο σε βήματα και δες την πρόοδο να γεμίζει.'],
      ['whisperer', 'Γρήγορες σημειώσεις', 'Ιδέες, λίστες με ☑ και links — βρες τα όλα με αναζήτηση.'],
      ['budget', 'Budget & αποταμίευση', 'Έσοδα, πάγια, έξοδα και πόσα μένουν ελεύθερα κάθε μήνα.'],
      ['calendar', 'Ημερολόγιο', 'Προθεσμίες και πληρωμές, μέρα με τη μέρα.'],
    ],
    login: 'Σύνδεση', signup: 'Εγγραφή',
    welcomeBack: 'Καλώς ήρθες πίσω', createAccount: 'Φτιάξε δωρεάν λογαριασμό',
    email: 'Email', password: 'Κωδικός', passwordHint: 'Τουλάχιστον 6 χαρακτήρες',
    show: 'Εμφάνιση κωδικού', hide: 'Απόκρυψη κωδικού',
    submitLogin: 'Είσοδος →', submitSignup: 'Δημιουργία λογαριασμού →',
    forgot: 'Ξέχασες τον κωδικό;', forgotTitle: 'Επαναφορά κωδικού',
    forgotIntro: 'Γράψε το email σου και θα σου στείλουμε link για να ορίσεις νέο κωδικό.',
    sendLink: 'Αποστολή link →', backToLogin: '← Πίσω στη σύνδεση',
    resetSent: 'Αν υπάρχει λογαριασμός με αυτό το email, σου στείλαμε link επαναφοράς. Έλεγξε και τα spam.',
    resetTitle: 'Όρισε νέο κωδικό', newPassword: 'Νέος κωδικός', savePassword: 'Αποθήκευση & είσοδος →',
    linkExpired: 'Το link έληξε ή έχει ήδη χρησιμοποιηθεί. Ζήτα καινούργιο.',
    checkEmail: 'Σχεδόν έτοιμο! Έλεγξε το email σου για να επιβεβαιώσεις τον λογαριασμό.',
    privacy: 'Τα δεδομένα σου είναι ιδιωτικά — μόνο εσύ τα βλέπεις.',
    install: 'Μετά τη σύνδεση μπορείς να την εγκαταστήσεις στο κινητό σαν εφαρμογή.',
    preview: { goal: 'Τρέξιμο 10 χλμ', steps: '3/5 βήματα', free: 'Ελεύθερα για ξόδεμα', note: 'Ψώνια', items: ['Γάλα', 'Καφές', 'Ψωμί'] },
    errors: {
      'Invalid login credentials': 'Λάθος email ή κωδικός.',
      'User already registered': 'Υπάρχει ήδη λογαριασμός με αυτό το email — κάνε σύνδεση.',
      'Email not confirmed': 'Δεν έχεις επιβεβαιώσει ακόμα το email σου.',
      'Password should be at least 6 characters': 'Ο κωδικός θέλει τουλάχιστον 6 χαρακτήρες.',
      'rate limit': 'Πολλές προσπάθειες — δοκίμασε ξανά σε λίγο.',
    },
  },
  en: {
    tagline: 'Your second brain.',
    intro: 'Goals, notes, money and calendar — all in one place.',
    features: [
      ['goals', 'Goals with steps', 'Break each goal into steps and watch the progress fill up.'],
      ['whisperer', 'Quick notes', 'Ideas, ☑ checklists and links — find everything with search.'],
      ['budget', 'Budget & savings', 'Income, fixed costs, spending and what’s free to spend each month.'],
      ['calendar', 'Calendar', 'Deadlines and payments, day by day.'],
    ],
    login: 'Sign in', signup: 'Sign up',
    welcomeBack: 'Welcome back', createAccount: 'Create a free account',
    email: 'Email', password: 'Password', passwordHint: 'At least 6 characters',
    show: 'Show password', hide: 'Hide password',
    submitLogin: 'Sign in →', submitSignup: 'Create account →',
    forgot: 'Forgot your password?', forgotTitle: 'Reset password',
    forgotIntro: "Enter your email and we'll send you a link to set a new password.",
    sendLink: 'Send link →', backToLogin: '← Back to sign in',
    resetSent: "If an account exists for this email, we've sent a reset link. Check your spam folder too.",
    resetTitle: 'Set a new password', newPassword: 'New password', savePassword: 'Save & sign in →',
    linkExpired: 'This link has expired or was already used. Request a new one.',
    checkEmail: 'Almost there! Check your email to confirm your account.',
    privacy: 'Your data is private — only you can see it.',
    install: 'After signing in you can install it on your phone like an app.',
    preview: { goal: 'Run 10 km', steps: '3/5 steps', free: 'Free to spend', note: 'Groceries', items: ['Milk', 'Coffee', 'Bread'] },
    errors: {
      'Invalid login credentials': 'Wrong email or password.',
      'User already registered': 'An account with this email already exists — sign in instead.',
      'Email not confirmed': 'You haven’t confirmed your email yet.',
      'Password should be at least 6 characters': 'Password needs at least 6 characters.',
      'rate limit': 'Too many attempts — please try again shortly.',
    },
  },
}

function readLang() {
  try { const l = localStorage.getItem('sb_lang'); return l === 'en' ? 'en' : 'el' } catch { return 'el' }
}

// Small decorative preview of the app (desktop only)
function Preview({ p }) {
  const card = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.35)' }
  const r = 20, circ = 2 * Math.PI * r
  return (
    <div className="auth-preview" aria-hidden="true" style={{ position: 'relative', height: 190, marginTop: 30 }}>
      <div style={{ ...card, position: 'absolute', left: 0, top: 0, width: 240, display: 'flex', alignItems: 'center', gap: 12, transform: 'rotate(-2deg)' }}>
        <svg width="50" height="50" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
          <circle cx="25" cy="25" r={r} fill="none" stroke={C.border} strokeWidth="6" />
          <circle cx="25" cy="25" r={r} fill="none" stroke="#34d399" strokeWidth="6" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * 0.4} />
        </svg>
        <div>
          <div style={{ fontSize: 14, color: C.text }}>{p.goal}</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}><Icon name="steps" size={12} /> {p.steps} · 60%</div>
        </div>
      </div>
      <div style={{ ...card, position: 'absolute', right: 0, top: 26, width: 210, transform: 'rotate(2deg)' }}>
        <div style={{ fontSize: 11, color: C.textMuted }}>{p.free}</div>
        <div style={{ fontSize: 24, color: C.blue, marginTop: 2 }}>1.025&nbsp;€</div>
        <div style={{ height: 6, background: C.border, borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
          <div style={{ width: '43%', height: '100%', background: '#2dd4bf', borderRadius: 3 }} />
        </div>
      </div>
      <div style={{ ...card, position: 'absolute', left: 50, top: 104, width: 200, transform: 'rotate(-1deg)', background: '#0b1730', borderColor: '#3b82f666' }}>
        <div style={{ fontSize: 13, color: C.text, marginBottom: 6 }}><Icon name="pin" size={12} /> {p.note}</div>
        {p.items.map((it, i) => (
          <div key={it} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: i === 0 ? C.textMuted : C.text, textDecoration: i === 0 ? 'line-through' : 'none' }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, border: `1.5px solid ${i === 0 ? '#34d399' : C.borderStrong}`, background: i === 0 ? '#34d399' : 'transparent', display: 'inline-block' }} />
            {it}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AuthScreen({ onAuth, recovery = false, linkExpired = false, onRecovered }) {
  const [lang, setLangRaw]    = useState(readLang)
  const [mode, setMode]       = useState(recovery ? 'reset' : linkExpired ? 'forgot' : 'login')   // 'login' | 'signup' | 'forgot' | 'reset'
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(linkExpired ? TXT[readLang()].linkExpired : '')
  const [success, setSuccess] = useState('')
  const t = TXT[lang]

  // Same key the app uses, so it opens in the language picked here
  const setLang = (l) => { setLangRaw(l); try { localStorage.setItem('sb_lang', l) } catch {} }
  const switchMode = (m) => { setMode(m); setError(''); setSuccess('') }

  const friendlyError = (msg = '') => {
    const hit = Object.keys(t.errors).find(k => msg.toLowerCase().includes(k.toLowerCase()))
    return hit ? t.errors[hit] : msg
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (mode === 'forgot') {
        const { error } = await auth.resetPassword(email.trim())
        if (error) throw error
        setSuccess(t.resetSent)
      } else if (mode === 'reset') {
        const { error } = await auth.updatePassword(password)
        if (error) throw error
        onRecovered?.()
      } else if (mode === 'login') {
        const { data, error } = await auth.signIn(email.trim(), password)
        if (error) throw error
        onAuth(data.session)
      } else {
        const { data, error } = await auth.signUp(email.trim(), password)
        if (error) throw error
        // With "Confirm email" off, Supabase returns a session right away → straight into the app
        if (data.session) onAuth(data.session)
        else setSuccess(t.checkEmail)
      }
    } catch (err) {
      setError(friendlyError(err.message))
    } finally {
      setLoading(false)
    }
  }

  const label = { fontSize: 11, color: C.textMuted, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 7 }
  const iStyle = {
    width: '100%', background: C.input, border: `1px solid ${C.borderStrong}`, borderRadius: 10,
    padding: '13px 16px', color: C.text, fontSize: 15, fontFamily: "'Commissioner',system-ui,sans-serif",
    outline: 'none', transition: 'border-color 0.18s',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      background: `radial-gradient(900px 500px at 15% 10%, #1e3a8a33, transparent 60%), radial-gradient(700px 400px at 90% 90%, #0ea5e914, transparent 60%), ${C.bg}`,
      fontFamily: "'Commissioner',system-ui,sans-serif", color: C.text, textAlign: 'left',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Commissioner:wght@300..800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        .auth-input:focus { border-color:#60a5fa !important; box-shadow:0 0 0 3px #60a5fa22; }
        .auth-btn { transition:opacity 0.15s, transform 0.15s; }
        .auth-btn:hover:not(:disabled) { opacity:0.92; transform:translateY(-1px); }
        @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        .auth-wrap { display:grid; grid-template-columns:minmax(0,1.1fr) minmax(0,420px); gap:64px; align-items:center; }
        @media (max-width:900px) {
          .auth-wrap { grid-template-columns:1fr; gap:28px; }
          .auth-preview { display:none; }
          .auth-features { grid-template-columns:1fr 1fr !important; }
          .auth-feature-desc { display:none; }
        }
      `}</style>

      {/* Language switch */}
      <div style={{ position: 'absolute', top: 'calc(14px + env(safe-area-inset-top, 0px))', right: 16, display: 'flex', border: `1px solid ${C.border}`, borderRadius: 20, overflow: 'hidden', zIndex: 2 }}>
        {[['el', 'ΕΛ'], ['en', 'EN']].map(([l, lbl]) => (
          <button key={l} onClick={() => setLang(l)} style={{ padding: '5px 12px', border: 'none', background: lang === l ? '#60a5fa22' : 'transparent', color: lang === l ? C.blue : C.textMuted, fontSize: 12, fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer' }}>{lbl}</button>
        ))}
      </div>

      <div className="auth-wrap" style={{ maxWidth: 1060, margin: '0 auto', minHeight: '100%', padding: 'calc(56px + env(safe-area-inset-top, 0px)) 20px 40px' }}>

        {/* ── Intro ── */}
        <div style={{ animation: 'fadeUp 0.4s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src="/app-icon.svg" alt="" width="52" height="52" style={{ borderRadius: 14, boxShadow: '0 8px 30px #60a5fa33' }} />
            <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
              Second <span style={{ color: C.blue }}>Brain</span>
            </h1>
          </div>
          <p style={{ fontSize: 22, fontWeight: 500, color: C.text, marginTop: 22, lineHeight: 1.35 }}>{t.tagline}</p>
          <p style={{ fontSize: 15, color: C.textMuted, marginTop: 8, lineHeight: 1.6, maxWidth: 480 }}>{t.intro}</p>

          <div className="auth-features" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 24 }}>
            {t.features.map(([icon, title, desc]) => (
              <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.blue, flexShrink: 0 }}><Icon name={icon} size={17} /></div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: C.text, fontWeight: 500, lineHeight: 1.4, paddingTop: 2 }}>{title}</div>
                  <div className="auth-feature-desc" style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5, marginTop: 2 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <Preview p={t.preview} />
        </div>

        {/* ── Form ── */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: '28px 26px', boxShadow: '0 20px 60px rgba(0,0,0,0.35)', animation: 'fadeUp 0.45s ease' }}>
          {/* Sign in / Sign up tabs */}
          {(mode === 'login' || mode === 'signup') && <div style={{ display: 'flex', background: C.input, borderRadius: 12, padding: 4, marginBottom: 22 }}>
            {[['login', t.login], ['signup', t.signup]].map(([m, lbl]) => (
              <button key={m} onClick={() => switchMode(m)} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: mode === m ? '#2563eb' : 'transparent', color: mode === m ? '#fff' : C.textMuted, fontSize: 14, fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>{lbl}</button>
            ))}
          </div>}

          <div style={{ fontSize: 17, fontWeight: 500, marginBottom: (mode === 'forgot') ? 6 : 18 }}>
            {{ login: t.welcomeBack, signup: t.createAccount, forgot: t.forgotTitle, reset: t.resetTitle }[mode]}
          </div>
          {mode === 'forgot' && <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5, marginBottom: 18 }}>{t.forgotIntro}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode !== 'reset' && <div>
              <label htmlFor="auth-email" style={label}>{t.email}</label>
              <input id="auth-email" className="auth-input" type="email" autoComplete="email" inputMode="email"
                value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={iStyle} />
            </div>}

            {mode !== 'forgot' && <div>
              <label htmlFor="auth-pass" style={label}>{mode === 'reset' ? t.newPassword : t.password}</label>
              <div style={{ position: 'relative' }}>
                <input id="auth-pass" className="auth-input" type={showPass ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'} autoFocus={mode === 'reset'}
                  value={password} onChange={e => setPass(e.target.value)} placeholder="••••••••" required minLength={6}
                  style={{ ...iStyle, paddingRight: 48 }} />
                <button type="button" onClick={() => setShowPass(s => !s)} aria-label={showPass ? t.hide : t.show} title={showPass ? t.hide : t.show}
                  style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.textMuted, fontSize: 16, padding: '6px 8px', cursor: 'pointer', opacity: showPass ? 1 : 0.7 }}>
                  <Icon name={showPass ? 'eyeOff' : 'eye'} size={17} />
                </button>
              </div>
              {(mode === 'signup' || mode === 'reset') && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>{t.passwordHint}</div>}
              {mode === 'login' && (
                <button type="button" onClick={() => switchMode('forgot')}
                  style={{ display: 'block', marginLeft: 'auto', marginTop: 8, background: 'none', border: 'none', padding: 0, color: C.blue, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
                  {t.forgot}
                </button>
              )}
            </div>}

            {error && (
              <div role="alert" style={{ background: '#f8717118', border: '1px solid #f8717144', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#f87171' }}>{error}</div>
            )}
            {success && (
              <div role="status" style={{ background: '#34d39918', border: '1px solid #34d39944', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#34d399' }}>{success}</div>
            )}

            <button className="auth-btn" type="submit" disabled={loading}
              style={{ marginTop: 4, padding: '14px', background: loading ? '#1e3a8a' : 'linear-gradient(135deg,#2563eb,#3b82f6)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontFamily: 'inherit', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.02em' }}>
              {loading ? '…' : { login: t.submitLogin, signup: t.submitSignup, forgot: t.sendLink, reset: t.savePassword }[mode]}
            </button>
            {mode === 'forgot' && (
              <button type="button" onClick={() => switchMode('login')}
                style={{ alignSelf: 'center', background: 'none', border: 'none', padding: 4, color: C.textMuted, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
                {t.backToLogin}
              </button>
            )}
          </form>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}><Icon name="shield" size={14} style={{ marginTop: 2 }} /><span>{t.privacy}</span></div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}><Icon name="phone" size={14} style={{ marginTop: 2 }} /><span>{t.install}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
