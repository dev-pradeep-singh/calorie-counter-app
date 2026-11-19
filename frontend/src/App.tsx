import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import { useAuth } from './auth/AuthProvider'
import { useProfile } from './auth/useProfile'
import { BottomNav } from './components/BottomNav'
import Auth from './pages/Auth'
import Placeholder from './pages/Placeholder'

function Loading() {
  return <div className="screen active" style={{ alignItems: 'center', justifyContent: 'center' }}><div className="loader-ring" /></div>
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
  if (profile.error) return <Placeholder id="screen-error" title="Couldn't load your profile" />
  if (profile.data === null && pathname !== '/onboard' && pathname !== '/setup') return <Navigate to="/onboard" replace />
  return (
    <>
      <Outlet />
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
            <Route path="/onboard" element={<Placeholder id="screen-onboard" title="Welcome" />} />
            <Route path="/setup" element={<Placeholder id="screen-setup" title="Set up your goals" />} />
            <Route path="/" element={<Placeholder id="screen-home" title="Home" />} />
            <Route path="/scan" element={<Placeholder id="screen-scan" title="Log a Meal" />} />
            <Route path="/stats" element={<Placeholder id="screen-stats" title="Progress" />} />
            <Route path="/profile" element={<Placeholder id="screen-profile" title="Profile" />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
