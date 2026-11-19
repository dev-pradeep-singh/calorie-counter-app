import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { Screen } from '../components/Screen'
import { GOAL_OPTIONS, SEX_OPTIONS, ToggleGroup } from '../components/ToggleGroup'
import { useToast } from '../components/Toast'
import { useProfile } from '../auth/useProfile'
import { useSaveProfile } from '../hooks/data'
import { calcCalorieGoal, calcIdealWeightRange, effectiveGoal, floatOrNull, intOrNull, type GoalType, type Sex } from '../lib/nutrition'

export default function Setup() {
  const navigate = useNavigate()
  const toast = useToast()
  const profile = useProfile()
  const save = useSaveProfile()

  const [name, setName] = useState('')
  const [sex, setSex] = useState<Sex>('male')
  const [age, setAge] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [goalType, setGoalType] = useState<GoalType>('maintain')
  const [target, setTarget] = useState('')
  const [calories, setCalories] = useState('')

  // Live recommendation, as before: needs age, height and weight.
  const suggestion = useMemo(() => {
    const a = intOrNull(age), h = intOrNull(height), w = floatOrNull(weight)
    if (!a || !h || !w) return null
    const range = calcIdealWeightRange(h)
    const displayTarget = floatOrNull(target) ?? range?.ideal ?? null
    const goal = effectiveGoal(w, displayTarget)
    return { range, displayTarget, goal, calories: calcCalorieGoal(w, h, a, sex, goal) }
  }, [age, height, weight, target, sex])

  // The old screen auto-selected the goal toggle whenever the suggestion changed.
  const [lastGoal, setLastGoal] = useState<GoalType | null>(null)
  if (suggestion && suggestion.goal !== lastGoal) {
    setLastGoal(suggestion.goal)
    setGoalType(suggestion.goal)
  }

  if (profile.data) return <Navigate to="/" replace />

  const apply = () => {
    if (!suggestion) return
    setCalories(String(suggestion.calories))
    if (suggestion.displayTarget) setTarget(String(suggestion.displayTarget))
  }

  const complete = () => {
    save.mutate(
      {
        name: name.trim() || 'Friend',
        goal_calories: intOrNull(calories) || 2000,
        age: intOrNull(age),
        height_cm: intOrNull(height),
        weight_kg: floatOrNull(weight),
        target_weight_kg: floatOrNull(target),
        sex,
        goal_type: goalType,
      },
      {
        onSuccess: () => navigate('/', { replace: true }),
        onError: (e) => toast(`❌ Failed to save profile: ${e.message}`),
      },
    )
  }

  return (
    <Screen id="screen-setup">
      <div className="setup-header">
        <div className="setup-step">Almost there</div>
        <h2>Tell us about<br />yourself</h2>
      </div>
      <div className="setup-body">
        <div className="input-group">
          <label className="input-label">Your Name</label>
          <input type="text" className="input-field" placeholder="e.g. Alex" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="input-group">
          <label className="input-label">Sex</label>
          <ToggleGroup options={SEX_OPTIONS} value={sex} onChange={setSex} />
        </div>
        <div className="inline-fields">
          <div className="input-group">
            <label className="input-label">Age</label>
            <input type="number" className="input-field" placeholder="25" min={10} max={100} value={age} onChange={(e) => setAge(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">Height (cm)</label>
            <input type="number" className="input-field" placeholder="170" min={100} max={250} value={height} onChange={(e) => setHeight(e.target.value)} />
          </div>
        </div>
        <div className="input-group">
          <label className="input-label">Current Weight (kg)</label>
          <input type="number" className="input-field" placeholder="70" min={30} max={300} step={0.1} value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
        <div className="input-group">
          <label className="input-label">Your Goal</label>
          <ToggleGroup options={GOAL_OPTIONS} value={goalType} onChange={setGoalType} />
        </div>
        <div className="input-group">
          <label className="input-label">Target Weight (kg)</label>
          <input type="number" className="input-field" placeholder="e.g. 65" min={30} max={300} step={0.1} value={target} onChange={(e) => setTarget(e.target.value)} />
        </div>
        {suggestion && (
          <div className="suggestion-card">
            <div className="suggestion-label">
              🤖 AI Recommendation <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>based on your stats</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
              <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Daily Calories</div>
                <div className="suggestion-value" style={{ fontSize: 22 }}>{suggestion.calories}</div>
                <div className="suggestion-desc">kcal / day</div>
              </div>
              <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Target Weight</div>
                <div className="suggestion-value" style={{ fontSize: 22 }}>{suggestion.displayTarget || '—'}</div>
                <div className="suggestion-desc">kg</div>
              </div>
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
              ⚖️ Ideal weight range:{' '}
              <span style={{ color: 'var(--accent2)', fontWeight: 600 }}>
                {suggestion.range ? `${suggestion.range.min} – ${suggestion.range.max} kg` : '—'}
              </span>
            </div>
            <button type="button" className="toggle-btn active" style={{ width: '100%', marginTop: 12, padding: 10, fontSize: 13 }} onClick={apply}>
              Apply Recommendations
            </button>
          </div>
        )}
        <div className="input-group">
          <label className="input-label">Daily Calorie Goal</label>
          <input type="number" className="input-field" placeholder="2000" min={1000} max={5000} value={calories} onChange={(e) => setCalories(e.target.value)} />
        </div>
      </div>
      <div className="setup-footer">
        <button className="btn-primary" onClick={complete} disabled={save.isPending}>Start Tracking 🎯</button>
      </div>
    </Screen>
  )
}
