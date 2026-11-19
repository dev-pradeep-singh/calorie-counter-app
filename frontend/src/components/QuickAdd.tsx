import { useId, useState } from 'react'
import { ClockCounterClockwise, MagnifyingGlass, Plus } from '@phosphor-icons/react'
import type { PastMeal } from '../lib/api'

/** Search previously logged meals and add one in a tap (combobox pattern). */
export function QuickAdd({ meals, onPick }: { meals: PastMeal[]; onPick: (m: PastMeal) => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()
  if (meals.length === 0) return null

  const needle = query.trim().toLowerCase()
  const shown = (needle ? meals.filter((m) => m.name.toLowerCase().includes(needle)) : meals).slice(0, 30)
  const pick = (m: PastMeal) => {
    setQuery('')
    setOpen(false)
    onPick(m)
  }

  return (
    <section className="quick" aria-label="Quick add from past meals">
      <div className="input-wrap">
        <span className="input-icon" aria-hidden>{needle ? <MagnifyingGlass size={20} /> : <ClockCounterClockwise size={20} />}</span>
        <input
          className="input has-icon" type="search" placeholder="Quick add a past meal…" autoComplete="off"
          role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={open && shown[active] ? `${listId}-${active}` : undefined}
          aria-label="Search past meals"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, shown.length - 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
            if (e.key === 'Enter' && open && shown[active]) { e.preventDefault(); pick(shown[active]) }
            if (e.key === 'Escape') setOpen(false)
          }}
        />
      </div>
      {open && (
        <ul className="quick-list" id={listId} role="listbox" aria-label="Past meals">
          {shown.length === 0 ? (
            <li className="quick-empty">No past meals match “{query}”</li>
          ) : (
            shown.map((m, i) => (
              <li key={m.name} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                <button type="button" className="quick-item" tabIndex={-1}
                  style={i === active ? { background: 'var(--surface-2)' } : undefined}
                  onMouseDown={(e) => e.preventDefault()} onClick={() => pick(m)}>
                  <span className="meal-emoji" style={{ width: 40, height: 40, fontSize: 20 }} aria-hidden>{m.emoji || '🍽️'}</span>
                  <span className="info">
                    <span className="title" style={{ display: 'block' }}>{m.name}</span>
                    <span className="sub num">{m.calories} kcal · P {m.protein}g · C {m.carbs}g · F {m.fat}g</span>
                  </span>
                  <span className="add" aria-hidden><Plus size={18} weight="bold" /></span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </section>
  )
}
