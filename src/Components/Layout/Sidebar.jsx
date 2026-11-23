import { NavLink, useNavigate } from 'react-router-dom'
import { PenSquare, LogOut, Infinity as InfinityIcon } from 'lucide-react'
import { NAV_ITEMS } from './navItems'
import './Sidebar.css'

export default function Sidebar({ onLogoutRequest }) {
  const navigate = useNavigate()

  function handleCreatePostClick() {
    navigate('/', { state: { focusComposer: Date.now() } })
  }

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

        <button type='button' className='sidebar__cta' onClick={handleCreatePostClick}>
          <PenSquare size={18} strokeWidth={2} />
          <span>Crear publicacion</span>
        </button>
      </div>

      <button type='button' className='sidebar__logout' onClick={onLogoutRequest}>
        <LogOut size={18} strokeWidth={2} />
        <span>Cerrar sesion</span>
      </button>
    </aside>
  )
}
