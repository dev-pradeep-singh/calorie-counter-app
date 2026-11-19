import { Screen } from '../components/Screen'
import { WeekChart } from '../components/WeekChart'
import { useProfile } from '../auth/useProfile'
import { useStatsSummary, useStatsWeek } from '../hooks/data'

export default function Stats() {
  const { data: profile } = useProfile()
  const { data: s } = useStatsSummary()
  const week = useStatsWeek()

  return (
    <Screen id="screen-stats">
      <div className="stats-header">
        <h2>Your Progress</h2>
        <p>Track patterns, find insights</p>
      </div>
      <div className="stats-scroll">
        <div className="streak-card">
          <div className="streak-fire">🔥</div>
          <div>
            <div className="streak-num">{s?.streak ?? 0}</div>
            <div className="streak-label">day streak — keep it up!</div>
          </div>
        </div>

        <WeekChart week={week.data} goal={profile?.goal_calories || 2000} />

        <div className="stats-grid">
          <StatCard icon="🍽️" value={s?.total_meals ?? 0} label="Meals logged" />
          <StatCard icon="🎯" value={s?.days_on_track ?? 0} label="Days on track" />
          <StatCard icon="💪" value={`${s?.avg_protein ?? 0}g`} label="Avg protein/day" />
          <StatCard icon="⚡" value={s?.avg_calories ?? 0} label="Avg kcal/day" />
        </div>
      </div>
    </Screen>
  )
}

function StatCard({ icon, value, label }: { icon: string; value: number | string; label: string }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-num">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
