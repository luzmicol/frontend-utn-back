import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Bell, PenSquare, LogOut } from 'lucide-react'
import { useNotifications } from '../../context/NotificationContext'
import { useUnreadMessages } from '../../context/UnreadMessagesContext'
import { NAV_ITEMS } from './navItems'
import './Sidebar.css'

export default function Sidebar({ onLogoutRequest, onBrandClick }) {
  const navigate = useNavigate()
  const { unreadCount } = useNotifications()
  const { unreadMessagesCount } = useUnreadMessages()
  const badgeText = unreadCount > 99 ? '99+' : String(unreadCount)
  const messagesBadgeText =
    unreadMessagesCount > 99 ? '99+' : String(unreadMessagesCount)

  function handleCreatePostClick() {
    navigate('/', { state: { focusComposer: Date.now() } })
  }

  return (
    <aside className='sidebar' aria-label='Navegacion principal'>
      <div className='sidebar__top'>
        <Link
          to='/'
          className='sidebar__brand'
          aria-label='Ir al inicio de LOOP'
          onClick={onBrandClick}
        >
          <img
            src='/loop-wordmark.png'
            alt='LOOP'
            className='sidebar__brand-img'
          />
        </Link>

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
              {to === '/messages' && unreadMessagesCount > 0 && (
                <span className='sidebar__badge'>{messagesBadgeText}</span>
              )}
            </NavLink>
          ))}

          <NavLink
            to='/notifications'
            className={({ isActive }) =>
              `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
            }
          >
            <Bell size={20} strokeWidth={2} />
            <span>Notificaciones</span>
            {unreadCount > 0 && (
              <span className='sidebar__badge'>{badgeText}</span>
            )}
          </NavLink>
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
