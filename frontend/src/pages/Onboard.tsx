import { Navigate, useNavigate } from 'react-router'
import { Screen } from '../components/Screen'
import { useProfile } from '../auth/useProfile'

export default function Onboard() {
  const navigate = useNavigate()
  const profile = useProfile()
  if (profile.data) return <Navigate to="/" replace />

  return (
    <Screen id="screen-onboard">
      <div className="onboard">
        <div>
          <div className="logo-mark"><img src="/logo.png" alt="Calzy" /></div>
        </div>
        <div>
          <h1 className="onboard-title">AI Calorie<br /><span>Tracking</span><br />Made Easy</h1>
          <p className="onboard-sub">Snap a photo of your meal and let AI do the rest. No more manual logging.</p>
        </div>
        <div className="feature-pills">
          <Pill icon="📸" color="green" label="Snap & Track" desc="Instant AI nutrition analysis from photos" />
          <Pill icon="💡" color="blue" label="Smart Tips" desc="Actionable advice for every meal you log" />
          <Pill icon="📊" color="yellow" label="Progress Stats" desc="Track patterns and level up your habits" />
        </div>
        <button className="btn-primary" onClick={() => navigate('/setup')}>Get Started →</button>
      </div>
    </Screen>
  )
}

function Pill({ icon, color, label, desc }: { icon: string; color: string; label: string; desc: string }) {
  return (
    <div className="feature-pill">
      <div className={`pill-icon ${color}`}>{icon}</div>
      <div>
        <div className="pill-label">{label}</div>
        <div className="pill-desc">{desc}</div>
      </div>
    </div>
  )
}
