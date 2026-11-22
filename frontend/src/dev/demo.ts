// Dev-only demo mode: http://localhost:5173/?demo — fake session + in-memory API so every
// signed-in screen can be designed and checked locally. Never included in production builds.
import { supabase } from '../lib/supabase'
import { localDate } from '../lib/date'

const KEY = 'calzy-demo'

export function demoRequested(): boolean {
  const q = new URLSearchParams(location.search)
  if (q.has('demo')) sessionStorage.setItem(KEY, q.get('demo') || 'full')
  if (q.has('nodemo')) sessionStorage.removeItem(KEY)
  return !!sessionStorage.getItem(KEY)
}

const now = Date.now()
const iso = (minsAgo: number) => new Date(now - minsAgo * 60_000).toISOString()
const today = localDate()
const day = (offset: number) => localDate(new Date(now - offset * 86_400_000))

let profile: Record<string, unknown> | null = {
  id: 'demo-user', name: 'Alex', goal_calories: 2000, age: 29, height_cm: 175, weight_kg: 72,
  target_weight_kg: 70, sex: 'male', goal_type: 'lose', goal_protein: 130, goal_carbs: 210, goal_fat: 62, goal_fiber: 34,
}
let meals = [
  { id: 'm3', date: today, name: 'Grilled chicken salad', calories: 420, protein: 38, carbs: 18, fat: 21, fiber: 6, emoji: '🥗', logged_at: iso(40) },
  { id: 'm2', date: today, name: 'Greek yogurt with berries', calories: 210, protein: 17, carbs: 24, fat: 5, fiber: 3, emoji: '🫐', logged_at: iso(260) },
  { id: 'm1', date: today, name: 'Oats with banana & peanut butter', calories: 480, protein: 16, carbs: 62, fat: 18, fiber: 9, emoji: '🥣', logged_at: iso(420) },
]
const history = [
  ...meals.map(({ name, calories, protein, carbs, fat, fiber, emoji }) => ({ name, calories, protein, carbs, fat, fiber, emoji })),
  { name: 'Dal makhani with rice', calories: 610, protein: 19, carbs: 82, fat: 22, fiber: 11, emoji: '🍛' },
  { name: 'Paneer tikka wrap', calories: 520, protein: 27, carbs: 48, fat: 24, fiber: 5, emoji: '🌯' },
  { name: 'Boiled egg', calories: 78, protein: 6, carbs: 1, fat: 5, fiber: 0, emoji: '🥚' },
  { name: 'Salmon with quinoa', calories: 560, protein: 41, carbs: 44, fat: 22, fiber: 6, emoji: '🐟' },
]
const SCAN_LIMIT = 3
let scansUsed = 1
const resetsAt = () => { const d = new Date(); d.setUTCHours(24, 0, 0, 0); return d.toISOString() }
const week = [1820, 2140, 0, 1960, 1710, 2380]

const json = (body: unknown, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function handle(method: string, url: URL, body: any): Promise<Response> {
  const p = url.pathname.replace('/api/v1', '')
  await wait(method === 'GET' ? 350 : 250)
  if (p === '/profile' && method === 'GET') return profile ? json(profile) : json({ detail: 'Profile not found' }, 404)
  if (p === '/profile' && method === 'PUT') return json((profile = { ...(profile ?? {}), ...body, id: 'demo-user' }))
  if (p === '/meals' && method === 'GET') return json(meals.filter((m) => m.date === url.searchParams.get('date')))
  if (p === '/meals' && method === 'POST') {
    const r = (n: number) => Math.round(n)
    const m = { ...body, id: crypto.randomUUID(), calories: r(body.calories), protein: r(body.protein), carbs: r(body.carbs), fat: r(body.fat), fiber: r(body.fiber ?? 0), logged_at: new Date().toISOString() }
    meals = [m, ...meals]
    return json(m, 201)
  }
  if (p.startsWith('/meals/') && method === 'DELETE') {
    meals = meals.filter((m) => m.id !== p.slice(7))
    return json(null, 204)
  }
  if (p === '/meals/history') return json(history)
  if (p === '/usage') return json({ used: scansUsed, limit: SCAN_LIMIT, remaining: Math.max(0, SCAN_LIMIT - scansUsed), resets_at: resetsAt() })
  if (p === '/analyze') {
    if (scansUsed >= SCAN_LIMIT) return json({ detail: `You've used all ${SCAN_LIMIT} AI scans for today. They reset at midnight UTC.` }, 429)
    scansUsed++
    await wait(1800)
    return json({ name: 'Chicken tikka with naan', calories: 640, protein: 42, carbs: 58, fat: 24, fiber: 4, emoji: '🍗',
      tip: 'Swap the naan for a small portion of brown rice and add a side salad to boost fibre and keep you fuller for longer.' })
  }
  if (p === '/stats/summary') return json({ total_meals: 214, streak: 6, avg_calories: 1904, avg_protein: 104, days_on_track: 41 })
  if (p === '/stats/week') {
    const todayTotal = meals.filter((m) => m.date === today).reduce((s, m) => s + m.calories, 0)
    return json({ days: [...week.map((c, i) => ({ date: day(6 - i), calories: c })), { date: today, calories: todayTotal }] })
  }
  return json({ detail: 'Not found' }, 404)
}

export function installDemo() {
  const mode = sessionStorage.getItem(KEY)
  if (mode === 'new') profile = null // ?demo=new shows onboarding
  if (mode === 'empty') meals = []

  const session = {
    access_token: 'demo', refresh_token: 'demo', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(now / 1000) + 3600,
    user: { id: 'demo-user', email: 'alex@example.com', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: iso(0) },
  } as any
  let signedIn = true
  const listeners = new Set<(e: string, s: unknown) => void>()
  const auth = supabase.auth as any
  auth.getSession = async () => ({ data: { session: signedIn ? session : null }, error: null })
  auth.onAuthStateChange = (cb: (e: string, s: unknown) => void) => {
    listeners.add(cb)
    return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } }
  }
  auth.signOut = async () => { signedIn = false; listeners.forEach((cb) => cb('SIGNED_OUT', null)); return { error: null } }
  auth.signInWithPassword = async () => { signedIn = true; listeners.forEach((cb) => cb('SIGNED_IN', session)); return { data: { session, user: session.user }, error: null } }

  const realFetch = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.origin)
    if (!url.pathname.startsWith('/api/v1')) return realFetch(input, init)
    return handle((init?.method || 'GET').toUpperCase(), url, init?.body ? JSON.parse(String(init.body)) : undefined)
  }
  console.info('[calzy] demo mode on (?nodemo to turn off, ?demo=new for onboarding, ?demo=empty for an empty day)')
}
