import { NavLink } from 'react-router'
import { Camera, ChartBar, House } from '@phosphor-icons/react'

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main">
      <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
        {({ isActive }) => (
          <>
            <House size={24} weight={isActive ? 'fill' : 'regular'} aria-hidden />
            Home
          </>
        )}
      </NavLink>
      <NavLink to="/scan" className="nav-fab" aria-label="Log a meal">
        <Camera size={28} weight="fill" aria-hidden />
      </NavLink>
      <NavLink to="/stats" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
        {({ isActive }) => (
          <>
            <ChartBar size={24} weight={isActive ? 'fill' : 'regular'} aria-hidden />
            Progress
          </>
        )}
      </NavLink>
    </nav>
  )
}
