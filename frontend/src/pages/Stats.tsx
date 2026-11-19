import { Barbell, Fire, ForkKnife, Lightning, Target } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { Screen } from '../components/Screen'
import { useProfile } from '../auth/useProfile'
import { useStatsSummary, useStatsWeek } from '../hooks/data'
import type { WeekStats } from '../lib/api'

export default function Stats() {
  const { data: profile } = useProfile()
  const summary = useStatsSummary()
  const week = useStatsWeek()
  const s = summary.data
  const goal = profile?.goal_calories || 2000

  return (
    <Screen id="screen-stats" label="Progress" nav>
      <div className="page-intro">
        <h1>Your progress</h1>
        <p>Patterns from everything you've logged.</p>
      </div>

      <section className="card streak" aria-label="Streak">
        <div className="flame" aria-hidden><Fire size={32} weight="fill" /></div>
        <div>
          {s ? <div className="v num">{s.streak}</div> : <div className="skeleton" style={{ width: 48, height: 40 }} />}
          <div className="l">{s && s.streak === 0 ? 'Log a meal today to start a streak' : `day${s?.streak === 1 ? '' : 's'} in a row — keep it going!`}</div>
        </div>
      </section>

      <WeekChart week={week.data} goal={goal} />

      <section className="stat-grid" aria-label="All-time stats">
        <Stat icon={<ForkKnife size={22} weight="fill" />} tone="brand" value={s?.total_meals} label="Meals logged" />
        <Stat icon={<Target size={22} weight="fill" />} tone="protein" value={s?.days_on_track} label="Days on track" />
        <Stat icon={<Barbell size={22} weight="fill" />} tone="fiber" value={s?.avg_protein} unit="g" label="Avg protein / day" />
        <Stat icon={<Lightning size={22} weight="fill" />} tone="carbs" value={s?.avg_calories} unit="kcal" label="Avg calories / day" />
      </section>
    </Screen>
  )
}

function Stat({ icon, tone, value, unit, label }: { icon: ReactNode; tone: string; value?: number; unit?: string; label: string }) {
  return (
    <div className="card stat">
      <div className="ic" style={{ background: `var(--${tone}-soft)`, color: `var(--${tone === 'brand' ? 'brand-strong' : tone})` }} aria-hidden>{icon}</div>
      {value === undefined ? <div className="skeleton" style={{ height: 32, width: '60%' }} /> : (
        <div className="v num">{value.toLocaleString()}{unit && <small> {unit}</small>}</div>
      )}
      <div className="l">{label}</div>
    </div>
  )
}

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const SKELETON = Array.from({ length: 7 }, (_, i) => ({ date: `s${i}`, calories: 0 }))

function WeekChart({ week, goal }: { week?: WeekStats; goal: number }) {
  const days = week?.days ?? []
  const max = Math.max(...days.map((d) => d.calories), goal, 1) * 1.08
  const summary = days.map((d) => `${DAY[new Date(`${d.date}T12:00:00`).getDay()]} ${d.calories} kcal`).join(', ')
  return (
    <section className="card chart" aria-labelledby="week-title">
      <div className="chart-head">
        <div>
          <h2 id="week-title">This week</h2>
          <p>Daily calories vs your goal</p>
        </div>
        <div className="legend" aria-hidden>
          <span><i style={{ background: 'var(--brand)' }} />On track</span>
          <span><i style={{ background: 'var(--fat)' }} />Over</span>
          <span><i className="goal" />Goal</span>
        </div>
      </div>
      <p className="visually-hidden">Goal {goal} kcal. {summary}</p>
      <div aria-hidden>
        <div className="plot">
          {days.length > 0 && (
            <div className="goal-line" style={{ bottom: `${(goal / max) * 100}%` }}><span className="num">{goal.toLocaleString()}</span></div>
          )}
          {(days.length ? days : SKELETON).map((d, i) => {
            const isToday = days.length > 0 && i === days.length - 1
            const over = d.calories > goal
            return (
              <div className="bar" key={d.date}>
                {days.length ? (
                  <div className={`col${d.calories ? (over ? ' over' : ' on') : ''}${isToday ? ' today' : ''}`}
                    style={{ height: d.calories ? `${Math.max((d.calories / max) * 100, 3)}%` : 4, animationDelay: `${i * 50}ms` }}>
                    {isToday && d.calories > 0 && <span className="tag num">{d.calories.toLocaleString()}</span>}
                  </div>
                ) : (
                  <div className="col skeleton" style={{ height: `${30 + ((i * 37) % 50)}%` }} />
                )}
              </div>
            )
          })}
        </div>
        <div className="days">
          {(days.length ? days : SKELETON).map((d, i) => {
            const isToday = days.length > 0 && i === days.length - 1
            return <span key={d.date} className={isToday ? 'today' : undefined}>{days.length ? (isToday ? 'Today' : DAY[new Date(`${d.date}T12:00:00`).getDay()].slice(0, 1)) : ''}</span>
          })}
        </div>
      </div>
    </section>
  )
}
