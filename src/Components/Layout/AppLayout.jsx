import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, Infinity as InfinityIcon, LogOut, PenSquare } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import { useUnreadMessages } from '../../context/UnreadMessagesContext'
import Sidebar from './Sidebar'
import { NAV_ITEMS } from './navItems'
import LogoutConfirmModal from './LogoutConfirmModal'
import './AppLayout.css'

export default function AppLayout() {
  const { logout } = useAuth()
  const { unreadCount } = useNotifications()
  const { unreadMessagesCount } = useUnreadMessages()
  const navigate = useNavigate()
  const location = useLocation()
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const isMessagesRoute = location.pathname.startsWith('/messages')
  const isFeedRoute = location.pathname === '/'
  const badgeText = unreadCount > 99 ? '99+' : String(unreadCount)
  const messagesBadgeText =
    unreadMessagesCount > 99 ? '99+' : String(unreadMessagesCount)

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
        <Link
          to='/'
          className='mobile-header__brand'
          aria-label='Ir al inicio de LOOP'
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <span className='mobile-header__logo' aria-hidden='true'>
            <InfinityIcon size={18} strokeWidth={2.2} />
          </span>
          <span className='mobile-header__name'>LOOP</span>
        </Link>

        <div className='mobile-header__actions'>
          <NavLink
            to='/notifications'
            className='mobile-header__notif'
            aria-label='Notificaciones'
          >
            <Bell size={18} strokeWidth={2} />
            {unreadCount > 0 && (
              <span className='mobile-header__badge'>{badgeText}</span>
            )}
          </NavLink>

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

      <main className={`app-layout__main${isMessagesRoute ? ' app-layout__main--messages' : ''}`}>
        <div
          className={`app-layout__container${
            isMessagesRoute
              ? ' app-layout__container--wide'
              : isFeedRoute
                ? ' app-layout__container--feed'
                : ''
          }`}
        >
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
            <span className='mobile-nav__icon-wrap'>
              <Icon size={20} strokeWidth={2} />
              {to === '/messages' && unreadMessagesCount > 0 && (
                <span className='mobile-nav__badge'>{messagesBadgeText}</span>
              )}
            </span>
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
