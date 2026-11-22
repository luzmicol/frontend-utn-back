import { NavLink } from 'react-router-dom'
import { Home, Compass, Users, User, PenSquare, LogOut, Infinity as InfinityIcon } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import './Sidebar.css'

export const NAV_ITEMS = [
  { to: '/', label: 'Feed', icon: Home, end: true },
  { to: '/explore', label: 'Explorar', icon: Compass },
  { to: '/communities', label: 'Comunidades', icon: Users },
  { to: '/profile', label: 'Perfil', icon: User }
]

export default function Sidebar() {
  const { logout } = useAuth()

  return (
    <aside className='sidebar' aria-label='Navegacion principal'>
      <div className='sidebar__top'>
        <div className='sidebar__brand'>
          <span className='sidebar__logo' aria-hidden='true'>
            <InfinityIcon size={22} strokeWidth={2.2} />
          </span>
          <span className='sidebar__name'>LOOP</span>
        </div>

        <nav className='sidebar__nav'>
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
              }
            >
              <Icon size={20} strokeWidth={2} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <button type='button' className='sidebar__cta'>
          <PenSquare size={18} strokeWidth={2} />
          <span>Crear publicacion</span>
        </button>
      </div>

      <button type='button' className='sidebar__logout' onClick={logout}>
        <LogOut size={18} strokeWidth={2} />
        <span>Cerrar sesion</span>
      </button>
    </aside>
  )
}
