import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, LogOut, Menu, PenSquare, Settings, X } from 'lucide-react'
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
  const mobileBottomItems = NAV_ITEMS.filter((item) => item.to !== '/settings')
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
            className={`mobile-header__menu${mobileMenuOpen ? ' mobile-header__menu--open' : ''}`}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls='mobile-options-menu'
          >
            {mobileMenuOpen ? <X size={19} strokeWidth={2} /> : <Menu size={19} strokeWidth={2} />}
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <>
          <div
            className='mobile-menu-backdrop'
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden='true'
          />
          <div
            id='mobile-options-menu'
            className='mobile-menu-dropdown'
            role='menu'
            aria-label='Opciones de cuenta'
          >
            <NavLink
              to='/settings'
              role='menuitem'
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `mobile-menu-dropdown__item${isActive ? ' mobile-menu-dropdown__item--active' : ''}`
              }
            >
              <Settings size={18} strokeWidth={2} />
              <span>Configuracion</span>
            </NavLink>
            <button
              type='button'
              role='menuitem'
              className='mobile-menu-dropdown__item mobile-menu-dropdown__item--danger'
              onClick={() => {
                setMobileMenuOpen(false)
                setShowLogoutModal(true)
              }}
            >
              <LogOut size={18} strokeWidth={2} />
              <span>Cerrar sesion</span>
            </button>
          </div>
        </>
      )}

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
        {mobileBottomItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={(event) => {
              if (to === '/' && location.pathname === '/') {
                event.preventDefault()
                window.scrollTo({ top: 0, behavior: 'smooth' })
                window.dispatchEvent(new CustomEvent('loop:feed-refresh'))
              }
            }}
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
