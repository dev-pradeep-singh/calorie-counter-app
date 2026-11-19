import { Flame, Target } from '@phosphor-icons/react'
import type { Macros } from '../lib/nutrition'

const fmt = (n: number) => Math.round(n).toLocaleString()

/** Daily calories: ring shows progress to goal; centre shows what's left (or how much over). */
export function CalorieHero({ eaten, goal, loading }: { eaten: number; goal: number; loading?: boolean }) {
  const r = 64
  const c = 2 * Math.PI * r
  const pct = goal > 0 ? Math.min(eaten / goal, 1) : 0
  const left = goal - eaten
  const over = left < 0
  return (
    <section className="card hero" aria-label="Today's calories">
      <div className="ring">
        <svg viewBox="0 0 148 148" aria-hidden>
          <defs>
            <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--brand)" />
              <stop offset="1" stopColor="var(--brand-strong)" />
            </linearGradient>
          </defs>
          <circle className="ring-track" cx="74" cy="74" r={r} fill="none" strokeWidth="12" />
          <circle className="ring-value" cx="74" cy="74" r={r} fill="none" strokeWidth="12" strokeLinecap="round"
            stroke={over ? 'var(--fat)' : 'url(#ring-grad)'} strokeDasharray={c} strokeDashoffset={loading ? c : c * (1 - pct)} />
        </svg>
        <div className={`ring-center${over ? ' over' : ''}`}>
          {loading ? (
            <div className="skeleton" style={{ width: 72, height: 34, margin: '0 auto' }} />
          ) : (
            <div className="big num">{fmt(Math.abs(left))}</div>
          )}
          <div className="small">{over ? 'kcal over' : 'kcal left'}</div>
        </div>
      </div>
      <div className="hero-stats">
        <div className="hero-stat">
          <div className="label"><Flame size={14} weight="fill" color="var(--fat)" aria-hidden /> Eaten</div>
          <div className="value num">{loading ? '—' : fmt(eaten)} <small>kcal</small></div>
        </div>
        <div className="hero-stat">
          <div className="label"><Target size={14} weight="fill" color="var(--brand)" aria-hidden /> Daily goal</div>
          <div className="value num">{fmt(goal)} <small>kcal</small></div>
        </div>
        <div className="visually-hidden" aria-live="polite">{loading ? '' : `${fmt(eaten)} of ${fmt(goal)} calories eaten today`}</div>
      </div>
    </section>
  )
}

const MACROS: { key: keyof Macros; label: string }[] = [
  { key: 'protein', label: 'Protein' },
  { key: 'carbs', label: 'Carbs' },
  { key: 'fat', label: 'Fat' },
  { key: 'fiber', label: 'Fibre' },
]

export function MacroGrid({ totals, targets }: { totals: Macros; targets: Macros }) {
  const r = 18
  const c = 2 * Math.PI * r
  return (
    <section className="macro-grid" aria-label="Macros today">
      {MACROS.map(({ key, label }) => {
        const pct = Math.min(totals[key] / (targets[key] || 1), 1)
        return (
          <div className="card macro" key={key} aria-label={`${label}: ${totals[key]} of ${targets[key]} grams`}>
            <div className="mini-ring" aria-hidden>
              <svg viewBox="0 0 44 44">
                <circle cx="22" cy="22" r={r} fill="none" stroke={`var(--${key}-soft)`} strokeWidth="5" />
                <circle cx="22" cy="22" r={r} fill="none" stroke={`var(--${key})`} strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
              </svg>
            </div>
            <div className="name" aria-hidden>{label}</div>
            <div className="val num" style={{ color: `var(--${key})` }} aria-hidden>{totals[key]}g</div>
            <div className="goal num" aria-hidden>of {targets[key]}g</div>
          </div>
        )
      })}
    </section>
  )
}
