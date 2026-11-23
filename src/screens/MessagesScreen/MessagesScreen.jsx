import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MessageSquare, Search } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  createOrGetConversation,
  getConversations
} from '../../services/conversationService'
import { searchUsers } from '../../services/userService'
import Avatar from '../../Components/UI/Avatar'
import Alert from '../../Components/Alert/Alert'
import ConversationView from '../../Components/Messages/ConversationView'
import './MessagesScreen.css'

const INBOX_POLL_MS = 10000

function formatShortDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short'
  })
}

export default function MessagesScreen() {
  const { user: currentUser } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [conversations, setConversations] = useState([])
  const [selectedId, setSelectedId] = useState(() => location.state?.conversationId || null)

  // Detecta cambios posteriores en location.state.conversationId y limpia el estado de navegacion
  useEffect(() => {
    const incomingId = location.state?.conversationId
    if (!incomingId) return

    const frame = requestAnimationFrame(() => {
      setSelectedId(incomingId)
    })
    navigate('/messages', { replace: true, state: null })

    return () => cancelAnimationFrame(frame)
  }, [location.state?.conversationId, navigate])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [startingChat, setStartingChat] = useState(false)

  const inboxInFlightRef = useRef(false)

  useEffect(() => {
    let isMounted = true

    async function fetchInbox(silent) {
      if (inboxInFlightRef.current) return
      inboxInFlightRef.current = true
      try {
        const res = await getConversations()
        if (isMounted) {
          setConversations(res.data?.conversations ?? [])
          if (!silent) setError(null)
        }
      } catch (err) {
        if (isMounted && !silent) {
          setError(err.message || 'No se pudieron cargar las conversaciones.')
        }
      } finally {
        inboxInFlightRef.current = false
        if (isMounted && !silent) setLoading(false)
      }
    }

    fetchInbox(false)

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchInbox(true)
      }
    }, INBOX_POLL_MS)

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        fetchInbox(true)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isMounted = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Busqueda de usuarios para iniciar conversacion
  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (!trimmed) return

    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const res = await searchUsers(trimmed, 6)
        if (cancelled) return
        const filtered = (res.data?.users ?? []).filter(
          (u) => u._id !== currentUser?._id
        )
        setSearchResults(filtered)
      } catch {
        if (!cancelled) setSearchResults([])
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [searchQuery, currentUser?._id])

  async function handleStartConversation(targetUser) {
    if (startingChat || !targetUser?._id || targetUser._id === currentUser?._id) return

    try {
      setStartingChat(true)
      setError(null)
      const res = await createOrGetConversation(targetUser._id)
      const conv = res.data?.conversation
      if (conv) {
        setConversations((prev) => {
          const exists = prev.some((c) => c._id === conv._id)
          return exists ? prev : [conv, ...prev]
        })
        setSelectedId(conv._id)
        setSearchQuery('')
        setSearchResults([])
      }
    } catch (err) {
      setError(err.message || 'No se pudo iniciar la conversacion.')
    } finally {
      setStartingChat(false)
    }
  }

  const handleConversationActivity = useCallback((conversationId, previewText) => {
    const nowIso = new Date().toISOString()
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c._id === conversationId
          ? { ...c, ultimo_mensaje: previewText, ultima_actualizacion: nowIso }
          : c
      )
      return updated.sort(
        (a, b) =>
          new Date(b.ultima_actualizacion).getTime() -
          new Date(a.ultima_actualizacion).getTime()
      )
    })
  }, [])

  const selectedConversation =
    conversations.find((c) => c._id === selectedId) || null

  return (
    <section className='messages-page'>
      <div
        className={`messages-shell${selectedConversation ? ' messages-shell--chat-open' : ''}`}
      >
        <aside className='messages-inbox'>
          <header className='messages-inbox__header'>
            <h1 className='messages-inbox__title'>Mensajes</h1>

            <div className='messages-search'>
              <Search size={15} className='messages-search__icon' />
              <input
                type='search'
                className='messages-search__input'
                placeholder='Buscar usuario para chatear...'
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value
                  setSearchQuery(val)
                  if (!val.trim()) setSearchResults([])
                }}
                aria-label='Buscar usuario para iniciar conversacion'
              />
            </div>

            {searchQuery.trim() && (
              <div className='messages-search-results'>
                {searchResults.length === 0 ? (
                  <p className='messages-search-results__empty'>
                    Sin usuarios encontrados.
                  </p>
                ) : (
                  searchResults.map((u) => (
                    <button
                      key={u._id}
                      type='button'
                      className='messages-search-results__item'
                      onClick={() => handleStartConversation(u)}
                      disabled={startingChat}
                    >
                      <Avatar name={u.nombre} avatarUrl={u.avatar_url} size='xs' />
                      <div className='messages-search-results__meta'>
                        <span>{u.nombre}</span>
                        {u.username && (
                          <span className='messages-search-results__username'>
                            @{u.username}
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </header>

          {error && (
            <div className='messages-inbox__error'>
              <Alert variant='error'>{error}</Alert>
            </div>
          )}

          {loading ? (
            <p className='messages-inbox__empty'>Cargando conversaciones...</p>
          ) : conversations.length === 0 ? (
            <div className='messages-inbox__empty'>
              <MessageSquare size={22} />
              <p>Todavia no tenes conversaciones. Busca un usuario arriba para empezar.</p>
            </div>
          ) : (
            <ul className='messages-list'>
              {conversations.map((conv) => {
                const other = conv.participantes?.find(
                  (p) => p._id !== currentUser?._id
                )
                const isActive = conv._id === selectedId
                return (
                  <li key={conv._id}>
                    <button
                      type='button'
                      className={`messages-list__item${isActive ? ' messages-list__item--active' : ''}`}
                      onClick={() => setSelectedId(conv._id)}
                    >
                      <Avatar
                        name={other?.nombre || 'Usuario'}
                        avatarUrl={other?.avatar_url}
                        size='sm'
                      />
                      <div className='messages-list__meta'>
                        <div className='messages-list__top'>
                          <span className='messages-list__name'>
                            {other?.nombre || 'Usuario'}
                          </span>
                          <time className='messages-list__date'>
                            {formatShortDate(conv.ultima_actualizacion)}
                          </time>
                        </div>
                        {other?.username && (
                          <span className='messages-list__username'>@{other.username}</span>
                        )}
                        <span className='messages-list__preview'>
                          {conv.ultimo_mensaje || 'Sin mensajes todavia'}
                        </span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        <div className='messages-chat-pane'>
          {selectedConversation ? (
            <ConversationView
              conversation={selectedConversation}
              onBack={() => setSelectedId(null)}
              onConversationActivity={handleConversationActivity}
            />
          ) : (
            <div className='messages-placeholder'>
              <MessageSquare size={28} />
              <p>Selecciona una conversacion o busca un usuario para chatear.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
