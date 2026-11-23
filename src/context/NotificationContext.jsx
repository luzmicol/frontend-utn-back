import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { getUnreadCount } from '../services/notificationService'

const NotificationContext = createContext(null)
const POLL_INTERVAL_MS = 15000

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const userId = user?._id || null
  const [unreadCount, setUnreadCount] = useState(0)
  const inFlightRef = useRef(false)

  const refreshUnreadCount = useCallback(async () => {
    if (!userId) {
      setUnreadCount(0)
      return
    }
    if (inFlightRef.current) return
    inFlightRef.current = true
    try {
      const res = await getUnreadCount()
      setUnreadCount(res.data?.unread_count ?? 0)
    } catch {
      // Silencioso en polling
    } finally {
      inFlightRef.current = false
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return

    let isMounted = true

    async function pollUnread() {
      if (inFlightRef.current) return
      inFlightRef.current = true
      try {
        const res = await getUnreadCount()
        if (isMounted) {
          setUnreadCount(res.data?.unread_count ?? 0)
        }
      } catch {
        // Silencioso
      } finally {
        inFlightRef.current = false
      }
    }

    pollUnread()

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        pollUnread()
      }
    }, POLL_INTERVAL_MS)

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        pollUnread()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isMounted = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [userId])

  const decrementUnread = useCallback(() => {
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }, [])

  const effectiveUnreadCount = user ? unreadCount : 0

  return (
    <NotificationContext.Provider
      value={{
        unreadCount: effectiveUnreadCount,
        setUnreadCount,
        refreshUnreadCount,
        decrementUnread
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  return useContext(NotificationContext)
}
