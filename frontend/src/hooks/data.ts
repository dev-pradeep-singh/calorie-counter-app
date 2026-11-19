// Server state for the screens. TanStack Query caches it; mutations refresh what they affect.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Meal, type MealIn, type Profile, type ProfileIn } from '../lib/api'
import { localDate } from '../lib/date'
import { useAuth } from '../auth/AuthProvider'

const useUserId = () => useAuth().session?.user.id

export const keys = {
  profile: (uid?: string) => ['profile', uid] as const,
  meals: (uid: string | undefined, date: string) => ['meals', uid, date] as const,
  history: (uid?: string) => ['history', uid] as const,
  summary: (uid: string | undefined, today: string) => ['stats', uid, 'summary', today] as const,
  week: (uid: string | undefined, end: string) => ['stats', uid, 'week', end] as const,
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

/** Deletes by id, removing the row right away and restoring it if the request fails. */
export function useDeleteMeal() {
  const qc = useQueryClient()
  const uid = useUserId()
  return useMutation({
    mutationFn: (meal: Meal) => api.deleteMeal(meal.id),
    onMutate: async (meal) => {
      const key = keys.meals(uid, meal.date)
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<Meal[]>(key)
      qc.setQueryData<Meal[]>(key, (old) => (old ?? []).filter((m) => m.id !== meal.id))
      return { key, previous }
    },
    onError: (_e, _meal, ctx) => {
      if (ctx) qc.setQueryData(ctx.key, ctx.previous)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['history', uid] })
      qc.invalidateQueries({ queryKey: ['stats', uid] })
    },
  })
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
