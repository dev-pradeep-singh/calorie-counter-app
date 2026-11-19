import { Sparkle } from '@phosphor-icons/react'
import type { Macros } from '../lib/nutrition'

/** "Recommended for you" card shared by Setup and Profile. */
export function Recommendation({ calories, target, range, macros, onApply }: {
  calories: number
  target: number | null
  range?: { min: number; max: number } | null
  macros?: Macros
  onApply: () => void
}) {
  return (
    <section className="rec" aria-label="Recommendation">
      <div className="rec-head">
        <Sparkle size={18} weight="fill" aria-hidden /> Recommended for you
        <small>based on your stats</small>
      </div>
      <div className="rec-grid">
        <div className="rec-stat">
          <div className="label">Daily calories</div>
          <div className="value num">{calories.toLocaleString()}</div>
          <div className="unit">kcal / day</div>
        </div>
        <div className="rec-stat">
          <div className="label">Target weight</div>
          <div className="value num">{target ?? '—'}</div>
          <div className="unit">kg</div>
        </div>
      </div>
      {macros && (
        <div className="rec-grid four">
          {(['protein', 'carbs', 'fat', 'fiber'] as const).map((k) => (
            <div className="rec-stat" key={k}>
              <div className="value num" style={{ color: `var(--${k})` }}>{macros[k]}g</div>
              <div className="label">{k === 'fiber' ? 'Fibre' : k[0].toUpperCase() + k.slice(1)}</div>
            </div>
          ))}
        </div>
      )}
      {range && <p className="rec-note">Healthy weight range for your height: <strong>{range.min}–{range.max} kg</strong></p>}
      <button type="button" className="btn btn-secondary btn-sm" onClick={onApply}>Apply recommendation</button>
    </section>
  )
}
