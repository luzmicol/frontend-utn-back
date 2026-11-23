import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { getUnreadMessagesCount } from '../services/conversationService'

const UnreadMessagesContext = createContext(null)
const POLL_INTERVAL_MS = 15000

export function UnreadMessagesProvider({ children }) {
  const { user } = useAuth()
  const userId = user?._id || null
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const inFlightRef = useRef(false)

  const refreshUnreadMessagesCount = useCallback(async () => {
    if (!userId) {
      setUnreadMessagesCount(0)
      return
    }
    if (inFlightRef.current) return
    inFlightRef.current = true
    try {
      const res = await getUnreadMessagesCount()
      setUnreadMessagesCount(res.data?.unread_count ?? 0)
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
        const res = await getUnreadMessagesCount()
        if (isMounted) {
          setUnreadMessagesCount(res.data?.unread_count ?? 0)
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

  const effectiveUnreadCount = user ? unreadMessagesCount : 0

  return (
    <UnreadMessagesContext.Provider
      value={{
        unreadMessagesCount: effectiveUnreadCount,
        setUnreadMessagesCount,
        refreshUnreadMessagesCount
      }}
    >
      {children}
    </UnreadMessagesContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUnreadMessages() {
  return useContext(UnreadMessagesContext)
}
