import type { WeekStats } from '../lib/api'

const DAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function WeekChart({ week, goal }: { week: WeekStats | undefined; goal: number }) {
  const days = week?.days ?? []
  const max = Math.max(...days.map((d) => d.calories), goal, 1)
  return (
    <div className="week-chart">
      <div className="chart-title">Weekly Calories</div>
      <div className="chart-sub">Last 7 days vs your goal</div>
      <div className="bar-chart">
        {days.map((d, i) => {
          const h = d.calories ? Math.max((d.calories / max) * 80, 4) : 0
          const label = DAY[new Date(`${d.date}T12:00:00`).getDay()]
          return (
            <div className="bar-col" key={d.date}>
              <div className={`bar-fill ${i === days.length - 1 ? 'today' : 'past'}`} style={{ height: h, marginTop: 80 - h }} />
              <div className="bar-day">{label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
