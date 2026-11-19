import { useState } from 'react'
import type { PastMeal } from '../lib/api'

/** "Log from past meals": search previously logged meals and add one in a tap. */
export function PastMealsPicker({ meals, onPick }: { meals: PastMeal[]; onPick: (m: PastMeal) => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  if (meals.length === 0) return null

  const needle = query.trim().toLowerCase()
  const shown = needle ? meals.filter((m) => m.name.toLowerCase().includes(needle)) : meals

  return (
    <div className="past-meals-section" style={{ padding: '0 20px' }}>
      <div className="past-meals-label">🕒 Log from past meals</div>
      <input className="past-meals-search" type="text" placeholder="Search past meals..." autoComplete="off"
        value={query} onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 200)} />
      {open && (
        <div className="past-meals-list" style={{ display: 'flex' }}>
          {shown.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' }}>No matches found</div>
          ) : (
            shown.map((m) => (
              <div key={m.name} className="past-meal-item" onClick={() => { setQuery(''); setOpen(false); onPick(m) }}>
                <div className="past-meal-emoji">{m.emoji || '🍽️'}</div>
                <div className="past-meal-info">
                  <div className="past-meal-name">{m.name}</div>
                  <div className="past-meal-macros">P: {m.protein}g &nbsp;C: {m.carbs}g &nbsp;F: {m.fat}g &nbsp;Fibre: {m.fiber || 0}g</div>
                </div>
                <div className="past-meal-cal">{m.calories}<br /><span style={{ fontSize: 10, fontWeight: 400 }}>kcal</span></div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
