import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { MessageSquare, Search, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  createOrGetConversation,
  getConversations
} from '../../services/conversationService'
import { searchUsers } from '../../services/userService'
import { fetchWithCache, getCachedData, setCachedData } from '../../utils/memoryCache'
import Avatar from '../../Components/UI/Avatar'
import Alert from '../../Components/Alert/Alert'
import ConversationView from '../../Components/Messages/ConversationView'
import CreateGroupModal from '../../Components/Messages/CreateGroupModal'
import './MessagesScreen.css'

const INBOX_POLL_MS = 10000

function formatShortDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short'
  })
}

const CONVERSATIONS_CACHE_KEY = 'messages:conversations'

export default function MessagesScreen() {
  const { user: currentUser } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const cachedConversations = getCachedData(CONVERSATIONS_CACHE_KEY)?.data
  const [conversations, setConversations] = useState(() => cachedConversations ?? [])
  const selectedId = searchParams.get('chat') || null

  const setSelectedId = useCallback(
    (nextId) => {
      if (nextId) {
        setSearchParams({ chat: nextId })
      } else {
        setSearchParams({})
      }
    },
    [setSearchParams]
  )

  // Detecta cambios posteriores en location.state.conversationId y limpia el estado de navegacion
  useEffect(() => {
    const incomingId = location.state?.conversationId
    if (!incomingId) return

    navigate(`/messages?chat=${encodeURIComponent(incomingId)}`, { replace: true, state: null })
  }, [location.state?.conversationId, navigate])
  const [loading, setLoading] = useState(() => !cachedConversations)
  const [error, setError] = useState(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [startingChat, setStartingChat] = useState(false)
  const [inboxTab, setInboxTab] = useState('primary')
  const [showCreateGroup, setShowCreateGroup] = useState(false)

  const inboxInFlightRef = useRef(false)

  useEffect(() => {
    let isMounted = true

    async function fetchInbox(silent) {
      if (inboxInFlightRef.current) return
      inboxInFlightRef.current = true
      const hasCached = Boolean(getCachedData(CONVERSATIONS_CACHE_KEY)?.data)
      try {
        const list = await fetchWithCache(CONVERSATIONS_CACHE_KEY, async () => {
          const res = await getConversations()
          return res.data?.conversations ?? []
        })
        if (isMounted) {
          setConversations(list)
          if (!silent) setError(null)
        }
      } catch (err) {
        if (isMounted && !silent && !hasCached) {
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

  const handleConversationRead = useCallback((conversationId) => {
    setConversations((prev) => {
      const next = prev.map((c) => (c._id === conversationId ? { ...c, unread_count: 0 } : c))
      setCachedData(CONVERSATIONS_CACHE_KEY, next)
      return next
    })
  }, [])

  const receivedRequests = conversations.filter(
    (c) =>
      c.estado === 'pending' &&
      String(c.solicitada_por) !== String(currentUser?._id)
  )
  const primaryConversations = conversations.filter(
    (c) =>
      c.estado !== 'pending' ||
      String(c.solicitada_por) === String(currentUser?._id)
  )
  const displayedConversations =
    inboxTab === 'requests' ? receivedRequests : primaryConversations

  const selectedConversation =
    conversations.find((c) => c._id === selectedId) || null

  return (
    <section className='messages-page'>
      <div
        className={`messages-shell${selectedConversation ? ' messages-shell--chat-open' : ''}`}
      >
        <aside className='messages-inbox'>
          <header className='messages-inbox__header'>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <h1 className='messages-inbox__title'>Mensajes</h1>
              <button
                type='button'
                className='messages-tab'
                style={{ flex: 'none', padding: '5px 10px' }}
                onClick={() => setShowCreateGroup(true)}
                aria-label='Crear grupo'
              >
                <Users size={14} />
                <span>Nuevo grupo</span>
              </button>
            </div>

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
            <div className='messages-tabs' role='tablist' aria-label='Bandejas de mensajes'>
              <button
                type='button'
                role='tab'
                aria-selected={inboxTab === 'primary'}
                className={`messages-tab${inboxTab === 'primary' ? ' messages-tab--active' : ''}`}
                onClick={() => setInboxTab('primary')}
              >
                <span>Principal</span>
              </button>
              <button
                type='button'
                role='tab'
                aria-selected={inboxTab === 'requests'}
                className={`messages-tab${inboxTab === 'requests' ? ' messages-tab--active' : ''}`}
                onClick={() => setInboxTab('requests')}
              >
                <span>Solicitudes</span>
                {receivedRequests.length > 0 && (
                  <span className='messages-tab__badge'>{receivedRequests.length}</span>
                )}
              </button>
            </div>
          </header>

          {error && (
            <div className='messages-inbox__error'>
              <Alert variant='error'>{error}</Alert>
            </div>
          )}

          {loading ? (
            <p className='messages-inbox__empty'>Cargando conversaciones...</p>
          ) : displayedConversations.length === 0 ? (
            <div className='messages-inbox__empty'>
              <MessageSquare size={22} />
              <p>
                {inboxTab === 'requests'
                  ? 'No tenes solicitudes de mensajes pendientes.'
                  : 'Todavia no tenes conversaciones. Busca un usuario arriba para empezar.'}
              </p>
            </div>
          ) : (
            <ul className='messages-list'>
              {displayedConversations.map((conv) => {
                const isGroup =
                  conv.tipo === 'group' ||
                  (Array.isArray(conv.miembros_grupo) && conv.miembros_grupo.length > 0)
                const other = !isGroup
                  ? conv.participantes?.find((p) => p._id !== currentUser?._id)
                  : null
                const isActive = conv._id === selectedId
                return (
                  <li key={conv._id}>
                    <button
                      type='button'
                      className={`messages-list__item${isActive ? ' messages-list__item--active' : ''}`}
                      onClick={() => setSelectedId(conv._id)}
                    >
                      {isGroup ? (
                        conv.imagen_url ? (
                          <Avatar name={conv.nombre || 'Grupo'} avatarUrl={conv.imagen_url} size='sm' />
                        ) : (
                          <span className='group-avatar-fallback' aria-hidden='true'>
                            <Users size={18} />
                          </span>
                        )
                      ) : (
                        <Avatar
                          name={other?.nombre || 'Usuario'}
                          avatarUrl={other?.avatar_url}
                          size='sm'
                        />
                      )}
                      <div className='messages-list__meta'>
                        <div className='messages-list__top'>
                          <span className='messages-list__name'>
                            {isGroup ? conv.nombre || 'Grupo' : other?.nombre || 'Usuario'}
                          </span>
                          <time className='messages-list__date'>
                            {formatShortDate(conv.ultima_actualizacion)}
                          </time>
                        </div>
                        {isGroup ? (
                          <span className='messages-list__username'>
                            Grupo · {conv.participantes?.length || 0} miembros
                          </span>
                        ) : (
                          other?.username && (
                            <span className='messages-list__username'>@{other.username}</span>
                          )
                        )}
                        <div className='messages-list__bottom'>
                          <span className='messages-list__preview'>
                            {conv.ultimo_mensaje || 'Sin mensajes todavia'}
                          </span>
                          {(conv.unread_count ?? 0) > 0 && (
                            <span className='messages-list__badge'>
                              {conv.unread_count > 99 ? '99+' : conv.unread_count}
                            </span>
                          )}
                        </div>
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
              onConversationRead={handleConversationRead}
              onRequestAccepted={(acceptedConv) => {
                setConversations((prev) => {
                  const next = prev.map((c) =>
                    c._id === acceptedConv._id ? { ...c, ...acceptedConv, estado: 'accepted', solicitada_por: null } : c
                  )
                  setCachedData(CONVERSATIONS_CACHE_KEY, next)
                  return next
                })
                setInboxTab('primary')
              }}
              onRequestDeleted={(deletedId) => {
                setConversations((prev) => {
                  const next = prev.filter((c) => c._id !== deletedId)
                  setCachedData(CONVERSATIONS_CACHE_KEY, next)
                  return next
                })
                setSelectedId(null)
              }}
              onGroupUpdated={(updatedGroup) => {
                setConversations((prev) => {
                  const next = prev.map((c) =>
                    c._id === updatedGroup._id ? { ...c, ...updatedGroup } : c
                  )
                  setCachedData(CONVERSATIONS_CACHE_KEY, next)
                  return next
                })
              }}
              onGroupLeft={(leftId) => {
                setConversations((prev) => {
                  const next = prev.filter((c) => c._id !== leftId)
                  setCachedData(CONVERSATIONS_CACHE_KEY, next)
                  return next
                })
                setSelectedId(null)
              }}
            />
          ) : (
            <div className='messages-placeholder'>
              <MessageSquare size={28} />
              <p>Selecciona una conversacion o busca un usuario para chatear.</p>
            </div>
          )}
        </div>
      </div>

      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onGroupCreated={(newGroup) => {
            setConversations((prev) => {
              const next = [newGroup, ...prev]
              setCachedData(CONVERSATIONS_CACHE_KEY, next)
              return next
            })
            setInboxTab('primary')
            setSelectedId(newGroup._id)
          }}
        />
      )}
    </section>
  )
}
