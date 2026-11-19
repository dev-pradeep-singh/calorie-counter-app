import type { Macros } from '../lib/nutrition'

const CIRC = 314 // 2π × 50

export function CalorieRing({ eaten, goal, totals, targets }: { eaten: number; goal: number; totals: Macros; targets: Macros }) {
  const pct = Math.min(eaten / goal, 1)
  const rows: { key: keyof Macros; name: string }[] = [
    { key: 'protein', name: 'Protein' },
    { key: 'carbs', name: 'Carbs' },
    { key: 'fat', name: 'Fat' },
    { key: 'fiber', name: 'Fibre' },
  ]
  return (
    <div className="ring-section">
      <div className="ring-card">
        <div className="ring-wrapper">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="var(--surface2)" strokeWidth="10" />
            <circle cx="60" cy="60" r="50" fill="none" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={CIRC} strokeDashoffset={CIRC - CIRC * pct}
              style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.34,1.56,0.64,1)' }} />
          </svg>
          <div className="ring-center">
            <div className="ring-cal">{eaten}</div>
            <div className="ring-label">eaten</div>
          </div>
        </div>
        <div className="ring-info">
          <div className="ring-goal">Daily goal: <strong>{goal}</strong> kcal</div>
          <div className="ring-remaining">{Math.max(goal - eaten, 0)} <span>kcal left</span></div>
          <div className="macro-bars">
            {rows.map(({ key, name }) => (
              <div className="macro-row" key={key}>
                <div className="macro-name" style={{ color: `var(--${key})` }}>{name}</div>
                <div className="macro-bar-bg">
                  <div className="macro-bar-fill" style={{ width: `${Math.min((totals[key] / targets[key]) * 100, 100)}%`, background: `var(--${key})` }} />
                </div>
                <div className="macro-val" style={{ color: `var(--${key})` }}>{totals[key]}g</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const DONUT_CIRC = 113 // 2π × 18

export function MacroDonuts({ totals, targets }: { totals: Macros; targets: Macros }) {
  const items: { key: keyof Macros; label: string }[] = [
    { key: 'protein', label: 'Protein' },
    { key: 'carbs', label: 'Carbs' },
    { key: 'fat', label: 'Fat' },
    { key: 'fiber', label: 'Fibre' },
  ]
  return (
    <div className="macro-donuts-section">
      {items.map(({ key, label }) => (
        <div className="macro-donut-card" key={key}>
          <svg className="donut-svg" viewBox="0 0 44 44">
            <circle className="donut-bg" cx="22" cy="22" r="18" />
            <circle className="donut-fill" cx="22" cy="22" r="18" stroke={`var(--${key})`}
              strokeDasharray={`${Math.min(totals[key] / targets[key], 1) * DONUT_CIRC} ${DONUT_CIRC}`} />
          </svg>
          <div className="donut-label">{label}</div>
          <div className="donut-val" style={{ color: `var(--${key})` }}>{totals[key]}g</div>
          <div className="donut-goal">/ {targets[key]}g</div>
        </div>
      ))}
    </div>
  )
}
