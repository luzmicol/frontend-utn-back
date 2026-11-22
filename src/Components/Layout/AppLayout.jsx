import { NavLink, Outlet } from 'react-router-dom'
import { Infinity as InfinityIcon, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Sidebar, { NAV_ITEMS } from './Sidebar'
import './AppLayout.css'

export default function AppLayout() {
  const { logout } = useAuth()

  return (
    <div className='app-layout'>
      <Sidebar />

      <header className='mobile-header'>
        <div className='mobile-header__brand'>
          <span className='mobile-header__logo' aria-hidden='true'>
            <InfinityIcon size={18} strokeWidth={2.2} />
          </span>
          <span className='mobile-header__name'>LOOP</span>
        </div>

        <button
          type='button'
          className='mobile-header__logout'
          onClick={logout}
          aria-label='Cerrar sesion'
        >
          <LogOut size={18} strokeWidth={2} />
        </button>
      </header>

      <main className='app-layout__main'>
        <div className='app-layout__container'>
          <Outlet />
        </div>
      </main>

      <nav className='mobile-nav' aria-label='Navegacion movil'>
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `mobile-nav__link${isActive ? ' mobile-nav__link--active' : ''}`
            }
          >
            <Icon size={20} strokeWidth={2} />
            <span className='mobile-nav__label'>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
