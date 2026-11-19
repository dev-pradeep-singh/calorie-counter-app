import { useEffect, useRef } from 'react'
import type { AnalysisResult } from '../lib/api'

export function AnalysisCard({ result, adding, onAdd }: { result: AnalysisResult; adding: boolean; onAdd: () => void }) {
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    // Scroll "Add to Log" into view, as before.
    const t = window.setTimeout(() => btn.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100)
    return () => window.clearTimeout(t)
  }, [result])

  const macros = [
    { key: 'protein', label: 'Protein', value: result.protein },
    { key: 'carbs', label: 'Carbs', value: result.carbs },
    { key: 'fat', label: 'Fat', value: result.fat },
    { key: 'fiber', label: 'Fibre', value: result.fiber || 0 },
  ]
  return (
    <div className="result-card">
      <div className="result-header">
        <div>
          <div style={{ fontSize: 32, marginBottom: 8 }}>{result.emoji || '🍽️'}</div>
          <div className="result-name">{result.name}</div>
        </div>
        <div className="result-cal-badge">
          <div className="result-cal-num">{result.calories}</div>
          <div className="result-cal-label">KCAL</div>
        </div>
      </div>
      <div className="result-macros">
        {macros.map((m) => (
          <div className="result-macro" key={m.key}>
            <div className="rm-num" style={{ color: `var(--${m.key})` }}>{m.value}g</div>
            <div className="rm-label">{m.label}</div>
          </div>
        ))}
      </div>
      <div className="result-tip">
        <div className="tip-label">💡 Nutrition Tip</div>
        {result.tip}
      </div>
      <button ref={btn} className="add-to-log-btn" onClick={onAdd} disabled={adding}>+ Add to Today's Log</button>
    </div>
  )
}
