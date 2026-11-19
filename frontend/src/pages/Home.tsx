import { useNavigate } from 'react-router'
import { Screen } from '../components/Screen'
import { CalorieRing, MacroDonuts } from '../components/CalorieRing'
import { MealRow } from '../components/MealRow'
import { PastMealsPicker } from '../components/PastMealsPicker'
import { useToast } from '../components/Toast'
import { useProfile } from '../auth/useProfile'
import { useAddMeal, useDeleteMeal, useMealHistory, useTodayMeals } from '../hooks/data'
import { macroTargets, type Macros } from '../lib/nutrition'
import type { Meal, PastMeal } from '../lib/api'

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
  const deleteMeal = useDeleteMeal()

  if (!profile) return null
  const list = meals.data ?? []
  const sum = (k: keyof Macros | 'calories') => list.reduce((s, m) => s + (m[k] || 0), 0)
  const totals: Macros = { protein: sum('protein'), carbs: sum('carbs'), fat: sum('fat'), fiber: sum('fiber') }
  const goal = profile.goal_calories || 2000
  const name = profile.name || 'Friend'

  const remove = (m: Meal) =>
    deleteMeal.mutate(m, {
      onSuccess: () => toast(`🗑️ ${m.name} removed`),
      onError: () => toast('❌ Failed to delete'),
    })

  const logPast = (m: PastMeal) =>
    addMeal.mutate(
      { name: m.name, calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat, fiber: m.fiber, emoji: m.emoji },
      { onSuccess: () => toast(`✅ ${m.name} added!`), onError: (e) => toast(`❌ ${e.message}`) },
    )

  return (
    <Screen id="screen-home">
      <div className="home-header">
        <div>
          <div className="home-greeting">{greeting()}</div>
          <div className="home-name">{name}</div>
        </div>
        <button className="avatar-btn" onClick={() => navigate('/profile')}>{name[0].toUpperCase()}</button>
      </div>

      <CalorieRing eaten={sum('calories')} goal={goal} totals={totals} targets={macroTargets(profile)} />
      <MacroDonuts totals={totals} targets={macroTargets(profile)} />

      <div className="snap-section">
        <button className="snap-btn" onClick={() => navigate('/scan')}>
          <div className="snap-icon">📸</div>
          <div className="snap-text">
            <div className="snap-title">Snap Your Meal</div>
            <div className="snap-sub">AI analyzes calories instantly</div>
          </div>
          <div style={{ color: 'rgba(0,0,0,0.4)', fontSize: 20, marginLeft: 'auto' }}>→</div>
        </button>
      </div>

      <PastMealsPicker meals={history.data ?? []} onPick={logPast} />

      <div className="log-section">
        <div className="section-header">
          <div className="section-title">Today's Log</div>
          <button className="see-all" onClick={() => toast('📋 Full log coming soon!')}>See all</button>
        </div>
        <div className="meals-list">
          {list.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🍽️</div>
              <div className="empty-text">{meals.isLoading ? 'Loading…' : 'No meals logged yet'}</div>
              {!meals.isLoading && <div className="empty-sub">Snap a photo to get started</div>}
            </div>
          ) : (
            list.map((m) => <MealRow key={m.id} meal={m} onDelete={remove} />)
          )}
        </div>
      </div>
    </Screen>
  )
}
