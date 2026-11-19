import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import { useAuth } from './auth/AuthProvider'
import { useProfile } from './auth/useProfile'
import { BottomNav } from './components/BottomNav'
import Auth from './pages/Auth'
import Home from './pages/Home'
import Onboard from './pages/Onboard'
import Profile from './pages/Profile'
import Scan from './pages/Scan'
import Setup from './pages/Setup'
import Stats from './pages/Stats'

function Loading() {
  return <div className="screen active" style={{ alignItems: 'center', justifyContent: 'center' }}><div className="loader-ring" /></div>
}

function LoadError({ message, retry }: { message: string; retry: () => void }) {
  const { signOut } = useAuth()
  return (
    <div className="screen active">
      <div className="auth-wrap">
        <h2 className="auth-title">Couldn't load your profile</h2>
        <div className="auth-error">{message}</div>
        <button className="btn-primary" style={{ width: '100%' }} onClick={retry}>Try again</button>
        <button className="signout-btn" style={{ width: '100%' }} onClick={signOut}>Sign Out</button>
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
      <Outlet />
      {profile.data && !['/onboard', '/setup'].includes(pathname) && <BottomNav />}
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
