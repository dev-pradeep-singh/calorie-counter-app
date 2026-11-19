import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import { useAuth } from './auth/AuthProvider'
import { useProfile } from './auth/useProfile'
import { BottomNav } from './components/BottomNav'
import Auth from './pages/Auth'
import Home from './pages/Home'

// Home and Auth load with the app; the other screens load on first visit.
const Onboard = lazy(() => import('./pages/Onboard'))
const Setup = lazy(() => import('./pages/Setup'))
const Scan = lazy(() => import('./pages/Scan'))
const Stats = lazy(() => import('./pages/Stats'))
const Profile = lazy(() => import('./pages/Profile'))

function Loading() {
  return (
    <div className="screen centered" style={{ alignItems: 'center' }} aria-busy="true" aria-label="Loading">
      <div className="brand-mark"><img src="/logo.png" alt="" width={64} height={64} /></div>
    </div>
  )
}

function LoadError({ message, retry }: { message: string; retry: () => void }) {
  const { signOut } = useAuth()
  return (
    <div className="screen centered">
      <div className="auth">
        <div className="auth-head">
          <div className="brand-mark"><img src="/logo.png" alt="" width={64} height={64} /></div>
          <h1>Couldn't load your profile</h1>
        </div>
        <div className="alert alert-error" role="alert">{message}</div>
        <button className="btn btn-primary block" onClick={retry}>Try again</button>
        <button className="btn btn-danger block" onClick={signOut}>Sign out</button>
      </div>
    </div>
  )
}

/** Signed-in users only. */
function RequireAuth() {
  const { session, loading } = useAuth()
  if (loading) return <Loading />
  if (!session) return <Navigate to="/auth" replace />
  return <Outlet />
}

/** Users without a profile go to onboarding first; others get the bottom nav. */
function RequireProfile() {
  const profile = useProfile()
  const { pathname } = useLocation()
  if (profile.isLoading) return <Loading />
  if (profile.error) return <LoadError message={profile.error.message} retry={() => profile.refetch()} />
  if (profile.data === null && pathname !== '/onboard' && pathname !== '/setup') return <Navigate to="/onboard" replace />
  return (
    <>
      <Suspense fallback={<Loading />}>
        <Outlet />
      </Suspense>
      {profile.data && !['/onboard', '/setup', '/profile'].includes(pathname) && <BottomNav />}
    </>
  )
}

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route element={<RequireAuth />}>
          <Route element={<RequireProfile />}>
            <Route path="/onboard" element={<Onboard />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/" element={<Home />} />
            <Route path="/scan" element={<Scan />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
