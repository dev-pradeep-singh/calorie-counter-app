import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { Screen } from '../components/Screen'

type Mode = 'signin' | 'signup'
type Msg = { text: string; type: 'error' | 'success' } | null

export default function Auth() {
  const { session } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)

  if (session) return <Navigate to="/" replace />

  const switchMode = (m: Mode) => {
    setMode(m)
    setMsg(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setMsg({ text: 'Please enter your email and password.', type: 'error' })
      return
    }
    setBusy(true)
    setMsg(null)
    const creds = { email: email.trim(), password }
    const { data, error } =
      mode === 'signup'
        ? await supabase.auth.signUp({ ...creds, options: { emailRedirectTo: window.location.origin } })
        : await supabase.auth.signInWithPassword(creds)
    setBusy(false)
    if (error) return setMsg({ text: error.message, type: 'error' })
    if (mode === 'signup' && data.user && !data.session) {
      setMsg({ text: 'Account created! Check your email to confirm.', type: 'success' })
    }
    // On success the auth listener updates the session and the redirect above kicks in.
  }

  const label = mode === 'signin' ? 'Sign In' : 'Create Account'

  return (
    <Screen id="screen-auth">
      <form className="auth-wrap" onSubmit={submit} noValidate>
        <div className="logo-mark">
          <img src="/logo.png" alt="Calzy" />
        </div>
        <h2 className="auth-title">Welcome to Calzy</h2>
        <p className="auth-sub">Your AI calorie tracking companion</p>
        <div className="auth-tabs">
          <button type="button" className={`auth-tab${mode === 'signin' ? ' active' : ''}`} onClick={() => switchMode('signin')}>
            Sign In
          </button>
          <button type="button" className={`auth-tab${mode === 'signup' ? ' active' : ''}`} onClick={() => switchMode('signup')}>
            Sign Up
          </button>
        </div>
        {msg && <div className={msg.type === 'error' ? 'auth-error' : 'auth-success'}>{msg.text}</div>}
        <div className="input-group" style={{ width: '100%' }}>
          <label className="input-label" htmlFor="auth-email">Email</label>
          <input id="auth-email" type="email" className="input-field" placeholder="you@example.com" autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="input-group" style={{ width: '100%' }}>
          <label className="input-label" htmlFor="auth-password">Password</label>
          <input id="auth-password" type="password" className="input-field" placeholder="Min. 6 characters"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary" disabled={busy} style={{ width: '100%', marginTop: 8 }}>
          {busy ? '...' : label}
        </button>
      </form>
    </Screen>
  )
}
