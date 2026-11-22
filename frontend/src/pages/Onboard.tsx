import type { ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { ArrowRight, Camera, ChartLineUp, Lightbulb } from '@phosphor-icons/react'
import { Screen } from '../components/Screen'
import { useProfile } from '../auth/useProfile'

export default function Onboard() {
  const navigate = useNavigate()
  const profile = useProfile()
  if (profile.data) return <Navigate to="/" replace />

  return (
    <Screen id="screen-onboard" label="Welcome">
      <div className="brand-mark"><img src="/logo.png" alt="Calzy" width={56} height={56} /></div>
      <div className="onboard-hero">
        <h1>Calorie tracking,<br /><em>without the counting.</em></h1>
        <p>Snap a photo or describe your meal. Calzy estimates calories and macros in seconds.</p>
      </div>
      <div className="feature-list">
        <Feature icon={<Camera size={24} weight="duotone" />} tone="brand" title="Snap & track" text="Instant nutrition from a photo or a sentence" />
        <Feature icon={<Lightbulb size={24} weight="duotone" />} tone="carbs" title="Smart tips" text="One practical tip for every meal you log" />
        <Feature icon={<ChartLineUp size={24} weight="duotone" />} tone="protein" title="Progress you can see" text="Streaks, weekly trends and daily goals" />
      </div>
      <div className="spacer" />
      <button className="btn btn-primary block" onClick={() => navigate('/setup')}>
        Get started <ArrowRight size={20} weight="bold" aria-hidden />
      </button>
    </Screen>
  )
}

function Feature({ icon, tone, title, text }: { icon: ReactNode; tone: 'brand' | 'carbs' | 'protein'; title: string; text: string }) {
  return (
    <div className="card feature">
      <div className="feature-icon" style={{ background: `var(--${tone}-soft)`, color: `var(--${tone === 'brand' ? 'brand-strong' : tone})` }} aria-hidden>{icon}</div>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  )
}
