import { NavLink } from 'react-router'

const items = [
  { to: '/', icon: '🏠', label: 'Home' },
  { to: '/scan', icon: '📸', label: 'Snap' },
  { to: '/stats', icon: '📊', label: 'Progress' },
]

export function BottomNav() {
  return (
    <div className="bottom-nav">
      {items.map((it) => (
        <NavLink key={it.to} to={it.to} end className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <div className="nav-icon">{it.icon}</div>
          <div className="nav-label">{it.label}</div>
        </NavLink>
      ))}
    </div>
  )
}
