import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Trash } from '@phosphor-icons/react'
import type { Meal } from '../lib/api'

const OPEN = 88    // revealed width of the delete action
const SLOP = 8     // px of movement before a drag starts (avoids accidental swipes)

/**
 * A logged meal. Swipe left (touch or mouse) or tap the row to reveal Delete; the Delete
 * button is a real button, so keyboard and screen-reader users get the same action.
 */
export function MealRow({ meal, open, onOpenChange, onDelete, index }: {
  meal: Meal
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: (m: Meal) => void
  index: number
}) {
  const [drag, setDrag] = useState<number | null>(null)
  const start = useRef<{ x: number; y: number; base: number } | null>(null)
  const moved = useRef(false)
  const time = new Date(meal.logged_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const offset = drag ?? (open ? OPEN : 0)

  const down = (e: PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY, base: open ? OPEN : 0 }
    moved.current = false
  }
  const move = (e: PointerEvent) => {
    const s = start.current
    if (!s) return
    const dx = s.x - e.clientX
    if (!moved.current && Math.abs(dx) < SLOP) return
    if (!moved.current && Math.abs(e.clientY - s.y) > Math.abs(dx)) { start.current = null; return } // vertical scroll wins
    moved.current = true
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    setDrag(Math.max(0, Math.min(OPEN + 24, s.base + dx)))
  }
  const up = () => {
    if (!start.current) return
    start.current = null
    if (drag !== null) onOpenChange(drag > OPEN / 2)
    setDrag(null)
  }
  const click = () => {
    if (moved.current) return // the gesture already decided
    onOpenChange(!open)
  }
  const key = (e: KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') onDelete(meal)
    if (e.key === 'Escape') onOpenChange(false)
  }

  return (
    <li className="meal" style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}>
      <div className="meal-actions" aria-hidden={!open}>
        <button className="meal-delete" onClick={() => onDelete(meal)} tabIndex={open ? 0 : -1} aria-label={`Delete ${meal.name}`}>
          <Trash size={20} weight="bold" aria-hidden />
          Delete
        </button>
      </div>
      <button
        className={`meal-body${drag !== null ? ' dragging' : ''}`}
        style={{ transform: `translateX(-${offset}px)` }}
        aria-expanded={open}
        aria-label={`${meal.name}, ${meal.calories} calories at ${time}. ${open ? 'Delete option shown' : 'Show delete option'}`}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onClick={click} onKeyDown={key}
      >
        <span className="meal-emoji" aria-hidden>{meal.emoji || '🍽️'}</span>
        <span className="meal-info" aria-hidden>
          <span className="meal-name">{meal.name}</span>
          <span className="chips">
            <span className="chip protein">P {meal.protein}g</span>
            <span className="chip carbs">C {meal.carbs}g</span>
            <span className="chip fat">F {meal.fat}g</span>
            <span className="chip fiber">Fi {meal.fiber || 0}g</span>
          </span>
        </span>
        <span className="meal-kcal" aria-hidden>
          <span className="v num" style={{ display: 'block' }}>{meal.calories}</span>
          <span className="t">{time}</span>
        </span>
      </button>
    </li>
  )
}

export function MealRowSkeleton() {
  return (
    <li className="meal" aria-hidden>
      <div className="meal-body">
        <span className="meal-emoji skeleton" />
        <span className="meal-info" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="skeleton" style={{ height: 16, width: '70%' }} />
          <span className="skeleton" style={{ height: 14, width: '50%' }} />
        </span>
      </div>
    </li>
  )
}
