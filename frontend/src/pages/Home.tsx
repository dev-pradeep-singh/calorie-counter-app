import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowRight, Camera } from '@phosphor-icons/react'
import { Screen } from '../components/Screen'
import { CalorieHero, MacroGrid } from '../components/Progress'
import { MealRow, MealRowSkeleton } from '../components/MealRow'
import { QuickAdd } from '../components/QuickAdd'
import { useToast } from '../components/Toast'
import { useProfile } from '../auth/useProfile'
import { useAddMeal, useMealHistory, useTodayMeals, useUndoableDelete } from '../hooks/data'
import { macroTargets, type Macros } from '../lib/nutrition'
import { haptic } from '../lib/haptics'
import type { PastMeal } from '../lib/api'

function greeting() {
  const hr = new Date().getHours()
  return hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening'
}

export default function Home() {
  const navigate = useNavigate()
  const toast = useToast()
  const { data: profile } = useProfile()
  const meals = useTodayMeals()
  const history = useMealHistory()
  const addMeal = useAddMeal()
  const remove = useUndoableDelete()
  const [openId, setOpenId] = useState<string | null>(null)

  if (!profile) return null
  const list = meals.data ?? []
  const loading = meals.isLoading
  const sum = (k: keyof Macros | 'calories') => list.reduce((s, m) => s + (m[k] || 0), 0)
  const totals: Macros = { protein: sum('protein'), carbs: sum('carbs'), fat: sum('fat'), fiber: sum('fiber') }
  const name = profile.name || 'Friend'
  const date = new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })

  const logPast = (m: PastMeal) =>
    addMeal.mutate(
      { name: m.name, calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat, fiber: m.fiber, emoji: m.emoji },
      {
        onSuccess: () => { haptic(); toast(`${m.name} added`) },
        onError: (e) => toast(`Couldn't add ${m.name}: ${e.message}`, { kind: 'error' }),
      },
    )

  return (
    <Screen id="screen-home" label="Today" nav>
      <header className="home-header">
        <div>
          <div className="date">{date}</div>
          <h1>{greeting()}, {name.split(' ')[0]}</h1>
        </div>
        <button className="avatar" onClick={() => navigate('/profile')} aria-label="Profile and goals">{name[0].toUpperCase()}</button>
      </header>

      <CalorieHero eaten={sum('calories')} goal={profile.goal_calories || 2000} loading={loading} />
      <MacroGrid totals={totals} targets={macroTargets(profile)} />

      <button className="cta-card" onClick={() => navigate('/scan')}>
        <span className="cta-icon" aria-hidden><Camera size={26} weight="fill" /></span>
        <span>
          <span className="cta-title" style={{ display: 'block' }}>Log a meal</span>
          <span className="cta-sub">Snap a photo or describe it</span>
        </span>
        <ArrowRight className="chev" size={22} weight="bold" aria-hidden />
      </button>

      <QuickAdd meals={history.data ?? []} onPick={logPast} />

      <section aria-labelledby="log-title" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
        <div className="section-head">
          <h2 className="section-title" id="log-title">Today's log</h2>
          {list.length > 0 && <span className="section-meta num">{list.length} {list.length === 1 ? 'meal' : 'meals'} · {sum('calories').toLocaleString()} kcal</span>}
        </div>
        {loading ? (
          <ul className="meal-list"><MealRowSkeleton /><MealRowSkeleton /></ul>
        ) : list.length === 0 ? (
          <div className="card empty">
            <img src="/logo.png" alt="" width={60} height={60} />
            <h3>Nothing logged yet</h3>
            <p>Snap your first meal of the day and Calzy will do the maths.</p>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/scan')}><Camera size={18} weight="fill" aria-hidden /> Log a meal</button>
          </div>
        ) : (
          <>
            <ul className="meal-list">
              {list.map((m, i) => (
                <MealRow key={m.id} meal={m} index={i} open={openId === m.id}
                  onOpenChange={(o) => setOpenId(o ? m.id : null)}
                  onDelete={(meal) => { setOpenId(null); remove(meal) }} />
              ))}
            </ul>
            <p className="field-hint" style={{ textAlign: 'center' }}>Swipe left or tap a meal to delete it</p>
          </>
        )}
      </section>
    </Screen>
  )
}
