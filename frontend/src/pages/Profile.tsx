import { useState } from 'react'
import { useNavigate } from 'react-router'
import { SignOut, Sparkle, Target } from '@phosphor-icons/react'
import { Screen } from '../components/Screen'
import { BackHeader } from '../components/BackHeader'
import { Field, NumberField } from '../components/Field'
import { GOAL_OPTIONS, SEX_OPTIONS, Segmented } from '../components/Segmented'
import { Recommendation } from '../components/Recommendation'
import { useToast } from '../components/Toast'
import { useAuth } from '../auth/AuthProvider'
import { useProfile } from '../auth/useProfile'
import { useSaveProfile } from '../hooks/data'
import type { Profile as ProfileT } from '../lib/api'
import {
  calcCalorieGoal, calcIdealWeightRange, calcMacroGoals, effectiveGoal, floatOrNull, intOrNull,
  type GoalType, type Sex,
} from '../lib/nutrition'

const str = (v: number | string | null | undefined) => (v === null || v === undefined || v === 0 ? '' : String(v))

export default function Profile() {
  const { data: profile } = useProfile()
  if (!profile) return null
  return <ProfileForm key={profile.id} profile={profile} />
}

function ProfileForm({ profile }: { profile: ProfileT }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { session, signOut } = useAuth()
  const save = useSaveProfile()

  const [name, setName] = useState(profile.name ?? '')
  const [sex, setSex] = useState<Sex>(profile.sex === 'female' ? 'female' : 'male')
  const [age, setAge] = useState(str(profile.age))
  const [height, setHeight] = useState(str(profile.height_cm))
  const [weight, setWeight] = useState(str(profile.weight_kg))
  const [goalType, setGoalType] = useState<GoalType>((profile.goal_type as GoalType) || 'maintain')
  const [target, setTarget] = useState(str(profile.target_weight_kg))
  const [calories, setCalories] = useState(str(profile.goal_calories || 2000))
  const [gp, setGp] = useState(str(profile.goal_protein))
  const [gc, setGc] = useState(str(profile.goal_carbs))
  const [gf, setGf] = useState(str(profile.goal_fat))
  const [gfi, setGfi] = useState(str(profile.goal_fiber))
  const [showRec, setShowRec] = useState(false)
  const [confirmOut, setConfirmOut] = useState(false)

  // The recommendation now follows what's typed here (age, height, weight, sex, target).
  const a = intOrNull(age), h = intOrNull(height), w = floatOrNull(weight)
  const rec = (() => {
    if (!a || !h || !w) return null
    const range = calcIdealWeightRange(h)
    const targetWt = floatOrNull(target) ?? range?.ideal ?? null
    const goal = effectiveGoal(w, targetWt)
    const cal = calcCalorieGoal(w, h, a, sex, goal)
    return { calories: cal, target: targetWt, range, macros: calcMacroGoals(w, cal, sex, goal), goal }
  })()

  const [lastGoal, setLastGoal] = useState<GoalType | null>(null)
  if (showRec && rec && rec.goal !== lastGoal) {
    setLastGoal(rec.goal)
    setGoalType(rec.goal)
  }

  const applyRec = () => {
    if (!rec) return
    setCalories(String(rec.calories))
    if (rec.target) setTarget(String(rec.target))
    setGp(String(rec.macros.protein))
    setGc(String(rec.macros.carbs))
    setGf(String(rec.macros.fat))
    setGfi(String(rec.macros.fiber))
    toast('Recommendation applied — save to keep it')
  }

  const submit = () =>
    save.mutate(
      {
        name: name.trim() || 'Friend',
        goal_calories: intOrNull(calories) || 2000,
        age: a, height_cm: h, weight_kg: w,
        target_weight_kg: floatOrNull(target),
        sex, goal_type: goalType,
        goal_protein: intOrNull(gp), goal_carbs: intOrNull(gc), goal_fat: intOrNull(gf), goal_fiber: intOrNull(gfi),
      },
      {
        onSuccess: () => { toast('Profile saved'); navigate('/') },
        onError: (e) => toast(`Couldn't save: ${e.message}`, { kind: 'error' }),
      },
    )

  const dot = (k: string) => <span className="macro-label"><i style={{ background: `var(--${k})` }} aria-hidden />{k === 'fiber' ? 'Fibre' : k[0].toUpperCase() + k.slice(1)}</span>

  return (
    <Screen id="screen-profile" label="Profile and goals">
      <BackHeader title="Profile & goals" />

      <section className="card identity" aria-label="Account">
        <div className="avatar" aria-hidden>{(profile.name || 'U')[0].toUpperCase()}</div>
        <div style={{ minWidth: 0 }}>
          <h2>{profile.name || 'Your profile'}</h2>
          <p>{session?.user.email}</p>
        </div>
      </section>

      <h2 className="group-title">About you</h2>
      <section className="card form-card">
        <Field label="Name" autoComplete="given-name" placeholder="Your name" value={name} onChange={setName} />
        <div className="field"><span className="field-label">Sex</span><Segmented label="Sex" options={SEX_OPTIONS} value={sex} onChange={setSex} /></div>
        <div className="field-row">
          <NumberField label="Age" placeholder="25" value={age} onChange={setAge} suffix="yrs" />
          <NumberField label="Height" placeholder="170" value={height} onChange={setHeight} suffix="cm" />
        </div>
        <div className="field-row">
          <NumberField label="Weight" decimal placeholder="70" value={weight} onChange={setWeight} suffix="kg" />
          <NumberField label="Target weight" decimal placeholder="65" value={target} onChange={setTarget} suffix="kg" />
        </div>
      </section>

      <h2 className="group-title">Daily goal</h2>
      <section className="card form-card">
        <div className="field"><span className="field-label">Goal</span><Segmented label="Goal" options={GOAL_OPTIONS} value={goalType} onChange={setGoalType} /></div>
        <NumberField label="Calories" placeholder="2000" value={calories} onChange={setCalories} suffix="kcal" icon={<Target size={20} />} />
      </section>

      <h2 className="group-title">Macro goals</h2>
      <section className="card form-card">
        <div className="field-row">
          <NumberField label={dot('protein')} placeholder="—" min={0} value={gp} onChange={setGp} suffix="g" />
          <NumberField label={dot('carbs')} placeholder="—" min={0} value={gc} onChange={setGc} suffix="g" />
        </div>
        <div className="field-row">
          <NumberField label={dot('fat')} placeholder="—" min={0} value={gf} onChange={setGf} suffix="g" />
          <NumberField label={dot('fiber')} placeholder="—" min={0} value={gfi} onChange={setGfi} suffix="g" />
        </div>
        <p className="field-hint">Leave empty to use an estimate based on your calorie goal.</p>
      </section>

      {showRec && rec ? (
        <Recommendation calories={rec.calories} target={rec.target} range={rec.range} macros={rec.macros} onApply={applyRec} />
      ) : (
        <button type="button" className="btn btn-secondary block"
          onClick={() => (rec ? setShowRec(true) : toast('Add your age, height and weight first', { kind: 'info' }))}>
          <Sparkle size={20} weight="fill" color="var(--brand)" aria-hidden /> Get a recommendation
        </button>
      )}

      <div className="sticky-cta">
        <button className="btn btn-primary block" onClick={submit} disabled={save.isPending} aria-busy={save.isPending}>
          {save.isPending && <span className="spinner" aria-hidden />} Save changes
        </button>
      </div>

      <section aria-label="Account actions" style={{ marginTop: 'var(--s4)' }}>
        {confirmOut ? (
          <div className="field-row" role="group" aria-label="Confirm sign out">
            <button className="btn btn-secondary" onClick={() => setConfirmOut(false)} autoFocus>Cancel</button>
            <button className="btn btn-danger" onClick={signOut}>Sign out</button>
          </div>
        ) : (
          <button className="btn btn-danger block" onClick={() => setConfirmOut(true)}><SignOut size={20} weight="bold" aria-hidden /> Sign out</button>
        )}
      </section>
    </Screen>
  )
}
