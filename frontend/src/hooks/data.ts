// Server state for the screens. TanStack Query caches it; mutations refresh what they affect.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Meal, type MealIn, type Profile, type ProfileIn } from '../lib/api'
import { localDate } from '../lib/date'
import { useAuth } from '../auth/AuthProvider'
import { useToast } from '../components/Toast'
import { haptic } from '../lib/haptics'

const useUserId = () => useAuth().session?.user.id

export const keys = {
  profile: (uid?: string) => ['profile', uid] as const,
  meals: (uid: string | undefined, date: string) => ['meals', uid, date] as const,
  history: (uid?: string) => ['history', uid] as const,
  summary: (uid: string | undefined, today: string) => ['stats', uid, 'summary', today] as const,
  week: (uid: string | undefined, end: string) => ['stats', uid, 'week', end] as const,
  usage: (uid?: string) => ['usage', uid] as const,
}

export function useTodayMeals() {
  const uid = useUserId()
  const today = localDate()
  return useQuery({ queryKey: keys.meals(uid, today), queryFn: () => api.listMeals(today), enabled: !!uid })
}

export function useMealHistory() {
  const uid = useUserId()
  return useQuery({ queryKey: keys.history(uid), queryFn: () => api.mealHistory(), enabled: !!uid })
}

export function useStatsSummary() {
  const uid = useUserId()
  const today = localDate()
  return useQuery({ queryKey: keys.summary(uid, today), queryFn: () => api.statsSummary(today), enabled: !!uid })
}

export function useStatsWeek() {
  const uid = useUserId()
  const end = localDate()
  return useQuery({ queryKey: keys.week(uid, end), queryFn: () => api.statsWeek(end), enabled: !!uid })
}

/** Today's AI scans and the daily limit (limit is null when there is none). */
export function useScanUsage() {
  const uid = useUserId()
  return useQuery({ queryKey: keys.usage(uid), queryFn: () => api.usage(), enabled: !!uid })
}

/** Adds a meal to today's log (the client's local date). */
export function useAddMeal() {
  const qc = useQueryClient()
  const uid = useUserId()
  return useMutation({
    mutationFn: (meal: Omit<MealIn, 'date'>) => api.addMeal({ ...meal, date: localDate() }),
    onSuccess: (created) => {
      // Show the new meal right away, but only on a list we already have: seeding an empty
      // cache would make Home show just this meal until the next refetch.
      qc.setQueryData<Meal[]>(keys.meals(uid, created.date), (old) => (old ? [created, ...old] : old))
      qc.invalidateQueries({ queryKey: ['meals', uid] })
      qc.invalidateQueries({ queryKey: ['history', uid] })
      qc.invalidateQueries({ queryKey: ['stats', uid] })
    },
  })
}

/**
 * Delete with Undo: the meal disappears at once and a toast offers Undo for 5 s.
 * The server delete runs when the toast window ends, or immediately if the page is closed.
 */
export function useUndoableDelete() {
  const qc = useQueryClient()
  const uid = useUserId()
  const toast = useToast()
  return (meal: Meal) => {
    const key = keys.meals(uid, meal.date)
    qc.setQueryData<Meal[]>(key, (old) => (old ?? []).filter((m) => m.id !== meal.id))
    haptic(12)

    let settled = false
    const finish = () => {
      settled = true
      window.clearTimeout(timer)
      window.removeEventListener('pagehide', commit)
    }
    const commit = () => {
      if (settled) return
      finish()
      api.deleteMeal(meal.id)
        .then(() => {
          qc.invalidateQueries({ queryKey: ['history', uid] })
          qc.invalidateQueries({ queryKey: ['stats', uid] })
        })
        .catch(() => {
          qc.invalidateQueries({ queryKey: ['meals', uid] }) // put the server's truth back
          toast(`Couldn't delete ${meal.name}`, { kind: 'error' })
        })
    }
    const undo = () => {
      if (settled) return
      finish()
      qc.setQueryData<Meal[]>(key, (old) =>
        [...(old ?? []), meal].sort((a, b) => b.logged_at.localeCompare(a.logged_at)),
      )
    }
    const timer = window.setTimeout(commit, 5000)
    window.addEventListener('pagehide', commit)
    toast(`${meal.name} removed`, { kind: 'info', action: { label: 'Undo', onClick: undo }, duration: 5000 })
  }
}

export function useSaveProfile() {
  const qc = useQueryClient()
  const uid = useUserId()
  return useMutation({
    mutationFn: (body: ProfileIn) => api.saveProfile(body),
    onSuccess: (saved) => {
      qc.setQueryData<Profile | null>(keys.profile(uid), saved)
      qc.invalidateQueries({ queryKey: ['stats', uid] }) // days-on-track depends on the goal
    },
  })
}
