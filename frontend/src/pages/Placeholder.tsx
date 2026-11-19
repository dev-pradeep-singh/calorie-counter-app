import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { useProfile } from '../auth/useProfile'
import { api } from '../lib/api'
import { localDate } from '../lib/date'
import { Screen } from '../components/Screen'

/**
 * Phase 2 stand-in for screens that are ported in Phase 3. It also proves the
 * data path end to end: Supabase session → FastAPI → Supabase with RLS.
 */
export default function Placeholder({ id, title }: { id: string; title: string }) {
  const { session, signOut } = useAuth()
  const profile = useProfile()
  const today = localDate()
  const meals = useQuery({ queryKey: ['meals', today], queryFn: () => api.listMeals(today), enabled: !!session })

  return (
    <Screen id={id}>
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2>{title}</h2>
        <p style={{ color: 'var(--text-muted)' }}>This screen is ported in Phase 3.</p>
        <p>Signed in as {session?.user.email}</p>
        <p>
          {profile.isLoading ? 'Loading profile…' : profile.data ? `Hi ${profile.data.name ?? 'there'} · goal ${profile.data.goal_calories} kcal` : 'No profile yet'}
        </p>
        <p>{meals.isLoading ? 'Loading meals…' : meals.error ? `Error: ${meals.error.message}` : `${meals.data?.length ?? 0} meals logged today`}</p>
        <button className="btn-primary" onClick={signOut}>Sign out</button>
      </div>
    </Screen>
  )
}
