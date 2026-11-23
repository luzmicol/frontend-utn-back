import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { getUnreadCount } from '../services/notificationService'

const NotificationContext = createContext(null)
const POLL_INTERVAL_MS = 15000

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0)
      return
    }
    try {
      const res = await getUnreadCount()
      setUnreadCount(res.data?.unread_count ?? 0)
    } catch {
      // Silencioso en polling
    }
  }, [user])

  useEffect(() => {
    if (!user) return

    let isMounted = true

    async function fetchInitial() {
      try {
        const res = await getUnreadCount()
        if (isMounted) {
          setUnreadCount(res.data?.unread_count ?? 0)
        }
      } catch {
        // Silencioso
      }
    }

    fetchInitial()

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchInitial()
      }
    }, POLL_INTERVAL_MS)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [user])

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
