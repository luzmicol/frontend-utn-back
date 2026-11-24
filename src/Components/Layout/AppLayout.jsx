import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, LogOut, Menu, PenSquare, X } from 'lucide-react'
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!mobileMenuOpen) return
    function handleKeyDown(event) {
      if (event.key === 'Escape') setMobileMenuOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mobileMenuOpen])

  const isMessagesRoute = location.pathname.startsWith('/messages')
  const isFeedRoute = location.pathname === '/'
  const badgeText = unreadCount > 99 ? '99+' : String(unreadCount)
  const messagesBadgeText =
    unreadMessagesCount > 99 ? '99+' : String(unreadMessagesCount)

  function handleBrandClick(event) {
    if (location.pathname === '/') {
      event.preventDefault()
      window.location.reload()
    }
  }

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
      <Sidebar
        onLogoutRequest={() => setShowLogoutModal(true)}
        onBrandClick={handleBrandClick}
      />

      <header className='mobile-header'>
        <Link
          to='/'
          className='mobile-header__brand'
          aria-label='Ir al inicio de LOOP'
          onClick={handleBrandClick}
        >
          <img
            src='/loop-icon.png'
            alt='LOOP'
            className='mobile-header__brand-img'
          />
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

          <button
            type='button'
            className={`mobile-header__menu${mobileMenuOpen ? ' mobile-header__menu--open' : ''}`}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Cerrar menu de navegacion' : 'Abrir menu de navegacion'}
            aria-expanded={mobileMenuOpen}
            aria-controls='mobile-nav-drawer'
          >
            {mobileMenuOpen ? <X size={19} strokeWidth={2} /> : <Menu size={19} strokeWidth={2} />}
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div
          className='mobile-drawer__backdrop'
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden='true'
        />
      )}

      <nav
        id='mobile-nav-drawer'
        className={`mobile-drawer${mobileMenuOpen ? ' mobile-drawer--open' : ''}`}
        aria-label='Navegacion movil'
      >
        <div className='mobile-drawer__list'>
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `mobile-drawer__link${isActive ? ' mobile-drawer__link--active' : ''}`
              }
            >
              <span className='mobile-drawer__icon-wrap'>
                <Icon size={20} strokeWidth={2} />
              </span>
              <span className='mobile-drawer__label'>{label}</span>
              {to === '/messages' && unreadMessagesCount > 0 && (
                <span className='mobile-drawer__badge'>{messagesBadgeText}</span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

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

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />
    </div>
  )
}
