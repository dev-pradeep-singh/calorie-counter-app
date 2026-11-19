import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Screen } from '../components/Screen'
import { GOAL_OPTIONS, SEX_OPTIONS, ToggleGroup } from '../components/ToggleGroup'
import { useToast } from '../components/Toast'
import { useAuth } from '../auth/AuthProvider'
import { useProfile } from '../auth/useProfile'
import { useSaveProfile } from '../hooks/data'
import type { Profile as ProfileT } from '../lib/api'
import {
  calcCalorieGoal, calcIdealWeightRange, calcMacroGoals, effectiveGoal, floatOrNull, intOrNull,
  type GoalType, type Macros, type Sex,
} from '../lib/nutrition'

const str = (v: number | string | null | undefined) => (v === null || v === undefined || v === 0 ? '' : String(v))

export default function Profile() {
  const { data: profile } = useProfile()
  if (!profile) return null
  // Keyed so the form resets if the stored profile is replaced (e.g. after saving).
  return <ProfileForm key={profile.id} profile={profile} />
}

type Rec = { calories: number; target: number | null; macros: Macros; goal: GoalType }

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

  // As before, the recommendation uses the saved age/height/weight/sex and the target typed here.
  const rec: Rec | null = (() => {
    const { age: a, height_cm: h, weight_kg: w } = profile
    if (!a || !h || !w) return null
    const s: Sex = profile.sex === 'female' ? 'female' : 'male'
    const targetWt = floatOrNull(target) ?? calcIdealWeightRange(h)?.ideal ?? null
    const goal = effectiveGoal(w, targetWt)
    const cal = calcCalorieGoal(w, h, a, s, goal)
    return { calories: cal, target: targetWt, macros: calcMacroGoals(w, cal, s, goal), goal }
  })()

  // While the card is open, the goal toggle follows the recommendation (old behaviour).
  const [lastGoal, setLastGoal] = useState<GoalType | null>(null)
  if (showRec && rec && rec.goal !== lastGoal) {
    setLastGoal(rec.goal)
    setGoalType(rec.goal)
  }

  const openRec = () => {
    if (!rec) return toast('⚠️ Fill in your age, height and weight first')
    setShowRec(true)
  }

  const applyRec = () => {
    if (!rec) return
    setCalories(String(rec.calories))
    if (rec.target) setTarget(String(rec.target))
    setGp(String(rec.macros.protein))
    setGc(String(rec.macros.carbs))
    setGf(String(rec.macros.fat))
    setGfi(String(rec.macros.fiber))
  }

  const submit = () => {
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
        goal_protein: intOrNull(gp),
        goal_carbs: intOrNull(gc),
        goal_fat: intOrNull(gf),
        goal_fiber: intOrNull(gfi),
      },
      {
        onSuccess: () => {
          toast('✅ Profile saved!')
          navigate('/')
        },
        onError: (e) => toast(`❌ Failed to save: ${e.message}`),
      },
    )
  }

  const displayName = profile.name || '—'
  const recCell = { background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: 10 }
  const macroCell = { background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: 8, textAlign: 'center' as const }

  return (
    <Screen id="screen-profile">
      <div className="profile-header">
        <button className="back-btn" onClick={() => navigate('/')} style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>←</button>
        <h2>My Profile</h2>
      </div>
      <div className="profile-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="profile-avatar">{(profile.name || 'U')[0].toUpperCase()}</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Clash Display',sans-serif" }}>{displayName}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{session?.user.email || '—'}</div>
          </div>
        </div>

        <div className="section-title">Personal Details</div>
        <Field label="Name"><input type="text" className="input-field" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Sex"><ToggleGroup options={SEX_OPTIONS} value={sex} onChange={setSex} /></Field>
        <div className="inline-fields">
          <Field label="Age"><input type="number" className="input-field" placeholder="25" min={10} max={100} value={age} onChange={(e) => setAge(e.target.value)} /></Field>
          <Field label="Height (cm)"><input type="number" className="input-field" placeholder="170" value={height} onChange={(e) => setHeight(e.target.value)} /></Field>
        </div>
        <Field label="Current Weight (kg)"><input type="number" className="input-field" placeholder="70" step={0.1} value={weight} onChange={(e) => setWeight(e.target.value)} /></Field>
        <Field label="Goal"><ToggleGroup options={GOAL_OPTIONS} value={goalType} onChange={setGoalType} /></Field>
        <Field label="Target Weight (kg)"><input type="number" className="input-field" placeholder="e.g. 65" step={0.1} value={target} onChange={(e) => setTarget(e.target.value)} /></Field>
        <Field label="Daily Calorie Goal"><input type="number" className="input-field" placeholder="2000" value={calories} onChange={(e) => setCalories(e.target.value)} /></Field>

        <div className="section-title">Macro Goals (g/day)</div>
        <div className="inline-fields">
          <Field label="Protein" color="protein"><input type="number" className="input-field" placeholder="—" min={0} value={gp} onChange={(e) => setGp(e.target.value)} /></Field>
          <Field label="Carbs" color="carbs"><input type="number" className="input-field" placeholder="—" min={0} value={gc} onChange={(e) => setGc(e.target.value)} /></Field>
        </div>
        <div className="inline-fields">
          <Field label="Fat" color="fat"><input type="number" className="input-field" placeholder="—" min={0} value={gf} onChange={(e) => setGf(e.target.value)} /></Field>
          <Field label="Fibre" color="fiber"><input type="number" className="input-field" placeholder="—" min={0} value={gfi} onChange={(e) => setGfi(e.target.value)} /></Field>
        </div>

        {!showRec || !rec ? (
          <button type="button" className="toggle-btn" style={{ width: '100%', padding: 12, fontSize: 13 }} onClick={openRec}>🤖 Show AI Recommendation</button>
        ) : (
          <div className="suggestion-card">
            <div className="suggestion-label">
              🤖 AI Recommendation <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>based on your stats</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
              <div style={recCell}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Calorie Goal</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', fontFamily: "'Clash Display',sans-serif" }}>{rec.calories}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>kcal/day</div>
              </div>
              <div style={recCell}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Target Weight</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent2)', fontFamily: "'Clash Display',sans-serif" }}>{rec.target ? `${rec.target} kg` : '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>kg</div>
              </div>
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Macro Goals</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                {(['protein', 'carbs', 'fat', 'fiber'] as const).map((k) => (
                  <div style={macroCell} key={k}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: `var(--${k})` }}>{rec.macros[k]}g</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{k === 'fiber' ? 'Fibre' : k[0].toUpperCase() + k.slice(1)}</div>
                  </div>
                ))}
              </div>
            </div>
            <button type="button" className="toggle-btn active" style={{ width: '100%', marginTop: 10, padding: 8, fontSize: 12 }} onClick={applyRec}>Apply Recommendations</button>
          </div>
        )}
        <button className="btn-primary" onClick={submit} disabled={save.isPending}>Save Changes</button>
        <button className="signout-btn" onClick={signOut}>Sign Out</button>
      </div>
    </Screen>
  )
}

function Field({ label, color, children }: { label: string; color?: string; children: React.ReactNode }) {
  return (
    <div className="input-group">
      <label className="input-label" style={color ? { color: `var(--${color})` } : undefined}>{label}</label>
      {children}
    </div>
  )
}
