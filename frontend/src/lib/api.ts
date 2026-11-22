// Typed fetch wrapper for the FastAPI backend. Attaches the Supabase access token.
import { supabase } from './supabase'
import type { components } from './api-types'

type S = components['schemas']
export type Profile = S['Profile']
export type ProfileIn = S['ProfileIn']
export type Meal = S['Meal']
export type MealIn = S['MealIn']
export type PastMeal = S['PastMeal']
export type AnalyzeIn = S['AnalyzeIn']
export type AnalysisResult = S['AnalysisResult']
export type StatsSummary = S['StatsSummary']
export type WeekStats = S['WeekStats']
export type ScanUsage = S['ScanUsage']

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function request<T>(method: string, path: string, body?: unknown, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const res = await fetch(`/api/v1${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  })
  if (res.status === 204) return undefined as T
  const payload = await res.json().catch(() => null)
  if (!res.ok) {
    const detail = payload?.detail
    const message = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail[0]?.msg : res.statusText
    throw new ApiError(res.status, message || `Request failed (${res.status})`)
  }
  return payload as T
}

const q = (params: Record<string, string | undefined>) => {
  const s = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1])).toString()
  return s ? `?${s}` : ''
}

export const api = {
  getProfile: () => request<Profile>('GET', '/profile'),
  saveProfile: (body: ProfileIn) => request<Profile>('PUT', '/profile', body),
  listMeals: (date: string) => request<Meal[]>('GET', `/meals${q({ date })}`),
  addMeal: (body: MealIn) => request<Meal>('POST', '/meals', body),
  // keepalive lets a pending (undoable) delete finish even if the page is closing.
  deleteMeal: (id: string) => request<void>('DELETE', `/meals/${encodeURIComponent(id)}`, undefined, { keepalive: true }),
  mealHistory: (search?: string) => request<PastMeal[]>('GET', `/meals/history${q({ q: search })}`),
  analyze: (body: AnalyzeIn) => request<AnalysisResult>('POST', '/analyze', body),
  usage: () => request<ScanUsage>('GET', '/usage'),
  statsSummary: (today: string) => request<StatsSummary>('GET', `/stats/summary${q({ today })}`),
  statsWeek: (end: string) => request<WeekStats>('GET', `/stats/week${q({ end })}`),
}
