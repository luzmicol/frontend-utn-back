import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Infinity as InfinityIcon, LogOut, PenSquare } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Sidebar from './Sidebar'
import { NAV_ITEMS } from './navItems'
import LogoutConfirmModal from './LogoutConfirmModal'
import './AppLayout.css'

export default function AppLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  function handleCreatePostClick() {
    navigate('/', { state: { focusComposer: Date.now() } })
  }

  function handleConfirmLogout() {
    setShowLogoutModal(false)
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className='app-layout'>
      <Sidebar onLogoutRequest={() => setShowLogoutModal(true)} />

      <header className='mobile-header'>
        <div className='mobile-header__brand'>
          <span className='mobile-header__logo' aria-hidden='true'>
            <InfinityIcon size={18} strokeWidth={2.2} />
          </span>
          <span className='mobile-header__name'>LOOP</span>
        </div>

        <div className='mobile-header__actions'>
          <button
            type='button'
            className='mobile-header__create'
            onClick={handleCreatePostClick}
            aria-label='Crear publicacion'
          >
            <PenSquare size={17} strokeWidth={2} />
          </button>

          <button
            type='button'
            className='mobile-header__logout'
            onClick={() => setShowLogoutModal(true)}
            aria-label='Cerrar sesion'
          >
            <LogOut size={18} strokeWidth={2} />
          </button>
        </div>
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

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />
    </div>
  )
}
