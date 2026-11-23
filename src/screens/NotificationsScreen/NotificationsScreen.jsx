import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, RefreshCw, Trash2 } from 'lucide-react'
import { useNotifications } from '../../context/NotificationContext'
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead
} from '../../services/notificationService'
import Avatar from '../../Components/UI/Avatar'
import Alert from '../../Components/Alert/Alert'
import './NotificationsScreen.css'

const PAGE_LIMIT = 20

const TYPE_TEXT = {
  follow: 'comenzo a seguirte',
  like: 'le gusto tu publicacion',
  comment: 'comento tu publicacion',
  repost: 'reposteo tu publicacion',
  mention: 'te menciono',
  message: 'te envio un mensaje'
}

function formatRelativeDate(dateString) {
  if (!dateString) return ''
  const diffMs = Date.now() - new Date(dateString).getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'hace un momento'
  if (diffMin < 60) return `hace ${diffMin} min`

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `hace ${diffHours} h`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'ayer'
  if (diffDays < 7) return `hace ${diffDays} dias`

  return new Date(dateString).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short'
  })
}

function mergeUnique(prev, next) {
  const map = new Map()
  for (const item of prev) map.set(item._id, item)
  for (const item of next) map.set(item._id, item)
  return Array.from(map.values())
}

export default function NotificationsScreen() {
  const navigate = useNavigate()
  const { unreadCount, setUnreadCount, decrementUnread } = useNotifications()

  const [notifications, setNotifications] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [markingAll, setMarkingAll] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const loadPage = useCallback(async (targetPage, append = false) => {
    try {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
        setError(null)
      }

      const res = await getNotifications({ page: targetPage, limit: PAGE_LIMIT })
      const incoming = res.data?.notifications ?? []
      const more = Boolean(res.data?.pagination?.has_more)

      setNotifications((prev) => (append ? mergeUnique(prev, incoming) : incoming))
      setPage(targetPage)
      setHasMore(more)
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las notificaciones.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function fetchInitial() {
      try {
        const res = await getNotifications({ page: 1, limit: PAGE_LIMIT })
        if (cancelled) return
        const incoming = res.data?.notifications ?? []
        const more = Boolean(res.data?.pagination?.has_more)
        setNotifications(incoming)
        setPage(1)
        setHasMore(more)
      } catch (err) {
        if (cancelled) return
        setError(err.message || 'No se pudieron cargar las notificaciones.')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchInitial()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleOpenNotification(notification) {
    if (!notification.leida) {
      setNotifications((prev) =>
        prev.map((n) => (n._id === notification._id ? { ...n, leida: true } : n))
      )
      decrementUnread()
      try {
        await markNotificationAsRead(notification._id)
      } catch {
        // No bloquear navegacion
      }
    }

    if (notification.tipo === 'follow') {
      if (notification.fk_id_emisor?._id) {
        navigate(`/users/${notification.fk_id_emisor._id}`)
      }
      return
    }

    if (notification.tipo === 'message') {
      navigate('/messages', {
        state: { conversationId: notification.fk_id_conversacion || null }
      })
      return
    }

    if (notification.fk_id_publicacion) {
      navigate('/', { state: { highlightPostId: notification.fk_id_publicacion } })
    } else if (notification.fk_id_emisor?._id) {
      navigate(`/users/${notification.fk_id_emisor._id}`)
    }
  }

  async function handleMarkAllRead() {
    if (markingAll || unreadCount === 0) return
    try {
      setMarkingAll(true)
      setError(null)
      await markAllNotificationsAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, leida: true })))
      setUnreadCount(0)
    } catch (err) {
      setError(err.message || 'No se pudieron marcar todas como leidas.')
    } finally {
      setMarkingAll(false)
    }
  }

  async function handleDelete(event, notification) {
    event.stopPropagation()
    if (deletingId) return

    try {
      setDeletingId(notification._id)
      setError(null)
      await deleteNotification(notification._id)
      setNotifications((prev) => prev.filter((n) => n._id !== notification._id))
      if (!notification.leida) {
        decrementUnread()
      }
    } catch (err) {
      setError(err.message || 'No se pudo eliminar la notificacion.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className='loop-page'>
      <header className='notifications-header'>
        <div className='loop-page__header'>
          <h1 className='loop-page__title'>Notificaciones</h1>
          <p className='loop-page__subtitle'>Actividad reciente en tu cuenta</p>
        </div>

        {unreadCount > 0 && (
          <button
            type='button'
            className='notifications-header__read-all'
            onClick={handleMarkAllRead}
            disabled={markingAll}
          >
            <CheckCheck size={16} />
            <span>{markingAll ? 'Marcando...' : 'Marcar todas como leidas'}</span>
          </button>
        )}
      </header>

      {loading && (
        <div className='loop-empty'>
          <p className='loop-empty__text'>Cargando notificaciones...</p>
        </div>
      )}

      {!loading && error && (
        <div className='notifications-error-box'>
          <Alert variant='error'>{error}</Alert>
          <button
            type='button'
            className='notifications-retry-btn'
            onClick={() => loadPage(1, false)}
          >
            <RefreshCw size={15} />
            <span>Reintentar</span>
          </button>
        </div>
      )}

      {!loading && !error && notifications.length === 0 && (
        <div className='loop-empty'>
          <span className='loop-empty__icon' aria-hidden='true'>
            <Bell size={22} />
          </span>
          <h2 className='loop-empty__title'>No tenes notificaciones</h2>
          <p className='loop-empty__text'>
            Cuando alguien interactue con tus publicaciones, te siga o te envie un mensaje, aparecera aqui.
          </p>
        </div>
      )}

      {!loading && notifications.length > 0 && (
        <>
          <ul className='notifications-list'>
            {notifications.map((notif) => {
              const actor = notif.fk_id_emisor
              const actionText = TYPE_TEXT[notif.tipo] || 'interactuo contigo'

              return (
                <li
                  key={notif._id}
                  className={`notification-item${!notif.leida ? ' notification-item--unread' : ''}`}
                  onClick={() => handleOpenNotification(notif)}
                  role='button'
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleOpenNotification(notif)
                    }
                  }}
                >
                  <Avatar
                    name={actor?.nombre || 'Usuario'}
                    avatarUrl={actor?.avatar_url}
                    size='sm'
                  />

                  <div className='notification-item__body'>
                    <p className='notification-item__text'>
                      <strong>{actor?.nombre || 'Usuario'}</strong>
                      {actor?.username && (
                        <span className='notification-item__username'> @{actor.username}</span>
                      )}{' '}
                      {actionText}
                    </p>
                    <time className='notification-item__time' dateTime={notif.fecha_creacion}>
                      {formatRelativeDate(notif.fecha_creacion)}
                    </time>
                  </div>

                  <div className='notification-item__right'>
                    {!notif.leida && (
                      <span className='notification-item__dot' aria-label='No leida' />
                    )}
                    <button
                      type='button'
                      className='notification-item__delete'
                      onClick={(e) => handleDelete(e, notif)}
                      disabled={deletingId === notif._id}
                      aria-label='Eliminar notificacion'
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>

          {hasMore && (
            <button
              type='button'
              className='notifications-load-more'
              onClick={() => loadPage(page + 1, true)}
              disabled={loadingMore}
            >
              {loadingMore ? 'Cargando mas...' : 'Cargar mas notificaciones'}
            </button>
          )}
        </>
      )}
    </section>
  )
}
