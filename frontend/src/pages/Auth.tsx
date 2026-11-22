import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router'
import { CheckCircle, Envelope, Eye, EyeSlash, LockSimple, WarningCircle } from '@phosphor-icons/react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { Screen } from '../components/Screen'
import { Field } from '../components/Field'
import { Segmented } from '../components/Segmented'

type Mode = 'signin' | 'signup'
type Msg = { text: string; type: 'error' | 'success' } | null

const MODES = [
  { value: 'signin', label: 'Sign in' },
  { value: 'signup', label: 'Create account' },
] as const

export default function Auth() {
  const { session } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)

  if (session) return <Navigate to="/" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return setMsg({ text: 'Enter your email and password to continue.', type: 'error' })
    if (mode === 'signup' && password.length < 6) return setMsg({ text: 'Use at least 6 characters for your password.', type: 'error' })
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
      setMsg({ text: 'Account created! Check your inbox to confirm your email.', type: 'success' })
    }
  }

  return (
    <Screen id="screen-auth" label="Sign in" centered>
      <div className="auth">
        <div className="auth-head">
          <div className="brand-mark"><img src="/logo.png" alt="" width={56} height={56} /></div>
          <h1>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>
          <p>Snap a meal. Calzy does the counting.</p>
        </div>

        <Segmented label="Account" options={MODES} value={mode} onChange={(m) => { setMode(m); setMsg(null) }} />

        <form onSubmit={submit} noValidate>
          {msg && (
            <div className={`alert alert-${msg.type}`} role={msg.type === 'error' ? 'alert' : 'status'}>
              {msg.type === 'error' ? <WarningCircle size={18} weight="fill" aria-hidden /> : <CheckCircle size={18} weight="fill" aria-hidden />}
              {msg.text}
            </div>
          )}
          <Field label="Email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com"
            icon={<Envelope size={20} />} value={email} onChange={setEmail} />
          <Field label="Password" type={showPw ? 'text' : 'password'} placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            icon={<LockSimple size={20} />} value={password} onChange={setPassword}
            action={
              <button type="button" className="icon-btn" style={{ border: 'none', background: 'transparent' }}
                onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Hide password' : 'Show password'} aria-pressed={showPw}>
                {showPw ? <EyeSlash size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
              </button>
            } />
          <button type="submit" className="btn btn-primary block" disabled={busy} aria-busy={busy}>
            {busy ? <span className="spinner" aria-hidden /> : null}
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <p className="auth-foot">Your data is private to your account.</p>
      </div>
    </Screen>
  )
}
