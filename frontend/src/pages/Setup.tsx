import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { ArrowLeft, Target } from '@phosphor-icons/react'
import { Screen } from '../components/Screen'
import { Field, NumberField } from '../components/Field'
import { GOAL_OPTIONS, SEX_OPTIONS, Segmented } from '../components/Segmented'
import { Recommendation } from '../components/Recommendation'
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

  const suggestion = useMemo(() => {
    const a = intOrNull(age), h = intOrNull(height), w = floatOrNull(weight)
    if (!a || !h || !w) return null
    const range = calcIdealWeightRange(h)
    const displayTarget = floatOrNull(target) ?? range?.ideal ?? null
    const goal = effectiveGoal(w, displayTarget)
    return { range, displayTarget, goal, calories: calcCalorieGoal(w, h, a, sex, goal) }
  }, [age, height, weight, target, sex])

  // The goal follows the recommendation whenever it changes (as on the old screen).
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
    toast('Recommendation applied')
  }

  const complete = () =>
    save.mutate(
      {
        name: name.trim() || 'Friend',
        goal_calories: intOrNull(calories) || suggestion?.calories || 2000,
        age: intOrNull(age),
        height_cm: intOrNull(height),
        weight_kg: floatOrNull(weight),
        target_weight_kg: floatOrNull(target),
        sex,
        goal_type: goalType,
      },
      {
        onSuccess: () => navigate('/', { replace: true }),
        onError: (e) => toast(`Couldn't save your profile: ${e.message}`, { kind: 'error' }),
      },
    )

  return (
    <Screen id="screen-setup" label="Set up your goals">
      <header className="page-head">
        <button className="icon-btn" onClick={() => navigate('/onboard')} aria-label="Back"><ArrowLeft size={20} weight="bold" aria-hidden /></button>
        <div className="spacer" />
        <div className="progress-dots" aria-label="Step 2 of 2"><span /><span className="on" /></div>
      </header>
      <div className="page-intro">
        <h1>Tell us about you</h1>
        <p>We'll suggest a daily goal. You can change everything later.</p>
      </div>

      <section className="card form-card" aria-label="About you">
        <Field label="Your name" autoComplete="given-name" placeholder="e.g. Alex" value={name} onChange={setName} />
        <div className="field">
          <span className="field-label" id="sex-label">Sex</span>
          <Segmented label="Sex" options={SEX_OPTIONS} value={sex} onChange={setSex} />
        </div>
        <div className="field-row">
          <NumberField label="Age" placeholder="25" min={10} max={100} value={age} onChange={setAge} suffix="yrs" />
          <NumberField label="Height" placeholder="170" min={100} max={250} value={height} onChange={setHeight} suffix="cm" />
        </div>
        <div className="field-row">
          <NumberField label="Weight" decimal placeholder="70" min={30} max={300} value={weight} onChange={setWeight} suffix="kg" />
          <NumberField label="Target weight" decimal placeholder="65" min={30} max={300} value={target} onChange={setTarget} suffix="kg" />
        </div>
        <div className="field">
          <span className="field-label">Goal</span>
          <Segmented label="Goal" options={GOAL_OPTIONS} value={goalType} onChange={setGoalType} />
        </div>
      </section>

      {suggestion ? (
        <Recommendation calories={suggestion.calories} target={suggestion.displayTarget} range={suggestion.range} onApply={apply} />
      ) : (
        <p className="field-hint" style={{ textAlign: 'center' }}>Add your age, height and weight to get a personalised goal.</p>
      )}

      <section className="card form-card" aria-label="Daily goal">
        <NumberField label="Daily calorie goal" placeholder={suggestion ? String(suggestion.calories) : '2000'} min={1000} max={5000}
          value={calories} onChange={setCalories} suffix="kcal" icon={<Target size={20} />}
          hint={suggestion && !calories ? 'Leave empty to use the recommendation.' : undefined} />
      </section>

      <div className="sticky-cta">
        <button className="btn btn-primary block" onClick={complete} disabled={save.isPending} aria-busy={save.isPending}>
          {save.isPending && <span className="spinner" aria-hidden />} Start tracking
        </button>
      </div>
    </Screen>
  )
}
