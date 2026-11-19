import { useRef, useState, type PointerEvent } from 'react'
import type { Meal } from '../lib/api'

const MAX = 80 // width of the delete zone
const THRESHOLD = 40

/** Swipe left to delete, as before. Pointer events cover touch and mouse. */
export function MealRow({ meal, onDelete }: { meal: Meal; onDelete: (m: Meal) => void }) {
  const [offset, setOffset] = useState(0)
  const start = useRef<number | null>(null)
  const time = new Date(meal.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const down = (e: PointerEvent) => {
    start.current = e.clientX
  }
  const move = (e: PointerEvent) => {
    if (start.current === null) return
    const diff = start.current - e.clientX
    setOffset(diff > 0 ? Math.min(diff, MAX) : 0)
  }
  const up = () => {
    if (start.current === null) return
    start.current = null
    if (offset > THRESHOLD) {
      setOffset(MAX)
      window.setTimeout(() => onDelete(meal), 600) // brief pause showing the delete zone
    } else {
      setOffset(0)
    }
  }

  return (
    <div className="meal-row">
      <div className="meal-delete-bg">🗑️</div>
      <div className="meal-entry" style={{ transform: `translateX(-${offset}px)` }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}>
        <div className="meal-emoji">{meal.emoji || '🍽️'}</div>
        <div className="meal-info">
          <div className="meal-name">{meal.name}</div>
          <div className="meal-macros">
            <div className="meal-macro"><span style={{ color: 'var(--protein)' }}>{meal.protein}g</span> P</div>
            <div className="meal-macro"><span style={{ color: 'var(--carbs)' }}>{meal.carbs}g</span> C</div>
            <div className="meal-macro"><span style={{ color: 'var(--fat)' }}>{meal.fat}g</span> F</div>
            <div className="meal-macro"><span style={{ color: 'var(--fiber)' }}>{meal.fiber || 0}g</span> Fi</div>
          </div>
        </div>
        <div>
          <div className="meal-cal">{meal.calories}</div>
          <div className="meal-time">{time}</div>
        </div>
      </div>
    </div>
  )
}
