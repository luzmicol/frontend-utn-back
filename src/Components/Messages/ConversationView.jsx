import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Send, Trash2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useUnreadMessages } from '../../context/UnreadMessagesContext'
import {
  deleteMessage,
  getConversationMessages,
  markConversationAsRead,
  sendMessage
} from '../../services/conversationService'
import Avatar from '../UI/Avatar'
import Alert from '../Alert/Alert'
import './ConversationView.css'

const PAGE_LIMIT = 30
const POLL_INTERVAL_MS = 6000
const MAX_MESSAGE_LENGTH = 2000

function formatTime(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function sortMessagesChronologically(list) {
  return [...list].sort((a, b) => {
    const diff = new Date(a.fecha_creacion).getTime() - new Date(b.fecha_creacion).getTime()
    if (diff !== 0) return diff
    return String(a._id).localeCompare(String(b._id))
  })
}

function mergeMessagesUnique(existing, incoming) {
  const map = new Map()
  for (const m of existing) map.set(m._id, m)
  for (const m of incoming) map.set(m._id, m)
  return sortMessagesChronologically(Array.from(map.values()))
}

function reconcilePolledMessages(existing, polledMessages, { isCompleteConversation, total }) {
  if (total === 0) return []
  if (isCompleteConversation) {
    return mergeMessagesUnique([], polledMessages)
  }
  if (polledMessages.length === 0) {
    return existing
  }

  const sortedPolled = sortMessagesChronologically(polledMessages)
  const windowStartTime = new Date(sortedPolled[0].fecha_creacion).getTime()

  // Conservamos el historial anterior a la ventana consultada y reconciliamos
  // cualquier mensaje eliminado dentro de la ventana más reciente.
  const keptOlder = existing.filter(
    (m) => new Date(m.fecha_creacion).getTime() < windowStartTime
  )

  return mergeMessagesUnique(keptOlder, sortedPolled)
}

export default function ConversationView({ conversation, onBack, onConversationActivity }) {
  const { user: currentUser } = useAuth()
  const { setUnreadMessagesCount } = useUnreadMessages()
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const latestPageRef = useRef(1)
  const pollingInFlightRef = useRef(false)
  const activeConversationIdRef = useRef(conversation?._id || null)

  const [messages, setMessages] = useState([])
  const [oldestLoadedPage, setOldestLoadedPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)

  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const otherUser = conversation?.participantes?.find(
    (p) => p._id !== currentUser?._id
  )

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight
      }
    })
  }, [])

  // Carga inicial al cambiar de conversacion
  useEffect(() => {
    const conversationId = conversation?._id
    activeConversationIdRef.current = conversationId || null
    pollingInFlightRef.current = false

    if (!conversationId) return

    let isMounted = true

    async function loadInitial() {
      try {
        setLoading(true)
        setError(null)
        setConfirmDeleteId(null)
        setMessages([])
        setHasMore(false)
        setOldestLoadedPage(1)
        latestPageRef.current = 1

        const firstRes = await getConversationMessages(conversationId, {
          page: 1,
          limit: PAGE_LIMIT
        })
        if (!isMounted || activeConversationIdRef.current !== conversationId) return

        const total = firstRes.data?.pagination?.total ?? 0
        const lastPage = Math.max(1, Math.ceil(total / PAGE_LIMIT))

        if (lastPage > 1) {
          const lastRes = await getConversationMessages(conversationId, {
            page: lastPage,
            limit: PAGE_LIMIT
          })
          if (!isMounted || activeConversationIdRef.current !== conversationId) return
          setMessages(sortMessagesChronologically(lastRes.data?.messages ?? []))
          setOldestLoadedPage(lastPage)
          latestPageRef.current = lastPage
          setHasMore(true)
        } else {
          setMessages(sortMessagesChronologically(firstRes.data?.messages ?? []))
          setOldestLoadedPage(1)
          latestPageRef.current = 1
          setHasMore(false)
        }
        scrollToBottom()

        // Marcar como leidos los mensajes recibidos de esta conversacion
        markConversationAsRead(conversationId)
          .then((readRes) => {
            if (isMounted && activeConversationIdRef.current === conversationId) {
              setUnreadMessagesCount(readRes.data?.unread_count ?? 0)
            }
          })
          .catch(() => {
            // Silencioso
          })
      } catch (err) {
        if (isMounted && activeConversationIdRef.current === conversationId) {
          setError(err.message || 'No se pudieron cargar los mensajes.')
        }
      } finally {
        if (isMounted && activeConversationIdRef.current === conversationId) {
          setLoading(false)
        }
      }
    }

    loadInitial()

    return () => {
      isMounted = false
    }
  }, [conversation?._id, scrollToBottom, setUnreadMessagesCount])

  // Polling periodico de mensajes recientes cuando la pestaña esta visible
  useEffect(() => {
    const conversationId = conversation?._id
    if (!conversationId) return

    let isMounted = true

    const pollLatest = async () => {
      if (document.visibilityState !== 'visible') return
      if (pollingInFlightRef.current) return
      if (activeConversationIdRef.current !== conversationId) return

      pollingInFlightRef.current = true
      try {
        const targetPage = latestPageRef.current
        const res = await getConversationMessages(conversationId, {
          page: targetPage,
          limit: PAGE_LIMIT
        })
        if (!isMounted || activeConversationIdRef.current !== conversationId) return

        const total = res.data?.pagination?.total ?? 0
        const serverLastPage = Math.max(1, Math.ceil(total / PAGE_LIMIT))
        let polledMessages = res.data?.messages ?? []

        if (serverLastPage > targetPage) {
          // Nuevos mensajes cruzaron el limite de pagina: traemos tambien la nueva ultima pagina
          const nextRes = await getConversationMessages(conversationId, {
            page: serverLastPage,
            limit: PAGE_LIMIT
          })
          if (!isMounted || activeConversationIdRef.current !== conversationId) return
          polledMessages = mergeMessagesUnique(polledMessages, nextRes.data?.messages ?? [])
          latestPageRef.current = serverLastPage
        } else if (serverLastPage < targetPage) {
          // Eliminaciones redujeron la cantidad total de paginas
          latestPageRef.current = serverLastPage
          setOldestLoadedPage((prev) => {
            const next = Math.min(prev, serverLastPage)
            setHasMore(next > 1)
            return next
          })
          const adjustedRes = await getConversationMessages(conversationId, {
            page: serverLastPage,
            limit: PAGE_LIMIT
          })
          if (!isMounted || activeConversationIdRef.current !== conversationId) return
          polledMessages = adjustedRes.data?.messages ?? []
        }

        const isCompleteConversation = serverLastPage === 1
        setMessages((prev) =>
          reconcilePolledMessages(prev, polledMessages, {
            isCompleteConversation,
            total
          })
        )

        const hasUnreadFromOther = polledMessages.some(
          (m) =>
            m.fk_id_remitente?._id !== currentUser?._id &&
            !(m.leido_por || []).includes(currentUser?._id)
        )
        if (hasUnreadFromOther) {
          markConversationAsRead(conversationId)
            .then((readRes) => {
              if (isMounted && activeConversationIdRef.current === conversationId) {
                setUnreadMessagesCount(readRes.data?.unread_count ?? 0)
              }
            })
            .catch(() => {
              // Silencioso
            })
        }
      } catch {
        // Silencioso en polling
      } finally {
        pollingInFlightRef.current = false
      }
    }

    const interval = setInterval(pollLatest, POLL_INTERVAL_MS)

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        pollLatest()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isMounted = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [conversation?._id, currentUser?._id, setUnreadMessagesCount])

  async function handleLoadPrevious() {
    const conversationId = conversation?._id
    if (loadingMore || !hasMore || oldestLoadedPage <= 1 || !conversationId) return

    const container = listRef.current
    const prevScrollHeight = container ? container.scrollHeight : 0

    try {
      setLoadingMore(true)
      const prevPage = oldestLoadedPage - 1
      const res = await getConversationMessages(conversationId, {
        page: prevPage,
        limit: PAGE_LIMIT
      })
      if (activeConversationIdRef.current !== conversationId) return

      const older = res.data?.messages ?? []
      setMessages((prev) => mergeMessagesUnique(older, prev))
      setOldestLoadedPage(prevPage)
      setHasMore(prevPage > 1)

      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - prevScrollHeight
        }
      })
    } catch (err) {
      if (activeConversationIdRef.current === conversationId) {
        setError(err.message || 'No se pudieron cargar mensajes anteriores.')
      }
    } finally {
      setLoadingMore(false)
    }
  }

  function handleScroll(event) {
    if (event.currentTarget.scrollTop < 40 && hasMore && !loadingMore) {
      handleLoadPrevious()
    }
  }

  async function submitMessage() {
    const trimmed = text.trim()
    if (!trimmed || sending || !conversation?._id) return

    try {
      setSending(true)
      setError(null)
      const res = await sendMessage(conversation._id, trimmed)
      const created = res.data?.message
      setText('')
      if (created) {
        setMessages((prev) => mergeMessagesUnique(prev, [created]))
        scrollToBottom()
        if (onConversationActivity) {
          onConversationActivity(conversation._id, trimmed)
        }
      }
    } catch (err) {
      setError(err.message || 'No se pudo enviar el mensaje.')
    } finally {
      setSending(false)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submitMessage()
    }
  }

  async function handleConfirmDelete(messageId) {
    try {
      setDeletingId(messageId)
      setError(null)
      await deleteMessage(messageId)
      setMessages((prev) => prev.filter((m) => m._id !== messageId))
      setConfirmDeleteId(null)
    } catch (err) {
      setError(err.message || 'No se pudo eliminar el mensaje.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className='chat-view'>
      <header className='chat-view__header'>
        <button
          type='button'
          className='chat-view__back'
          onClick={onBack}
          aria-label='Volver a conversaciones'
        >
          <ArrowLeft size={18} />
        </button>

        {otherUser && (
          <Link to={`/users/${otherUser._id}`} className='chat-view__user'>
            <Avatar name={otherUser.nombre} avatarUrl={otherUser.avatar_url} size='sm' />
            <div className='chat-view__user-meta'>
              <span className='chat-view__name'>{otherUser.nombre}</span>
              {otherUser.username && (
                <span className='chat-view__username'>@{otherUser.username}</span>
              )}
            </div>
          </Link>
        )}
      </header>

      <div ref={listRef} className='chat-view__messages' onScroll={handleScroll}>
        {hasMore && (
          <button
            type='button'
            className='chat-view__load-more'
            onClick={handleLoadPrevious}
            disabled={loadingMore}
          >
            {loadingMore ? 'Cargando anteriores...' : 'Cargar mensajes anteriores'}
          </button>
        )}

        {loading && <p className='chat-view__status'>Cargando mensajes...</p>}

        {!loading && messages.length === 0 && (
          <p className='chat-view__status'>
            Todavia no hay mensajes. Envia el primero para iniciar la charla.
          </p>
        )}

        {!loading &&
          messages.map((msg) => {
            const isMine = msg.fk_id_remitente?._id === currentUser?._id
            return (
              <div
                key={msg._id}
                className={`chat-bubble-row${isMine ? ' chat-bubble-row--mine' : ''}`}
              >
                <div className={`chat-bubble${isMine ? ' chat-bubble--mine' : ''}`}>
                  <p className='chat-bubble__text'>{msg.contenido}</p>
                  <div className='chat-bubble__meta'>
                    <time className='chat-bubble__time'>{formatTime(msg.fecha_creacion)}</time>
                    {isMine && confirmDeleteId !== msg._id && (
                      <button
                        type='button'
                        className='chat-bubble__delete'
                        onClick={() => setConfirmDeleteId(msg._id)}
                        aria-label='Eliminar mensaje'
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  {isMine && confirmDeleteId === msg._id && (
                    <div className='chat-bubble__confirm'>
                      <span>¿Eliminar?</span>
                      <button
                        type='button'
                        className='chat-bubble__confirm-btn'
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={deletingId === msg._id}
                      >
                        No
                      </button>
                      <button
                        type='button'
                        className='chat-bubble__confirm-btn chat-bubble__confirm-btn--danger'
                        onClick={() => handleConfirmDelete(msg._id)}
                        disabled={deletingId === msg._id}
                      >
                        {deletingId === msg._id ? '...' : 'Si'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
      </div>

      {error && (
        <div className='chat-view__error'>
          <Alert variant='error'>{error}</Alert>
        </div>
      )}

      <form
        className='chat-view__composer'
        onSubmit={(e) => {
          e.preventDefault()
          submitMessage()
        }}
      >
        <textarea
          ref={inputRef}
          className='chat-view__input'
          placeholder='Escribi un mensaje...'
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={MAX_MESSAGE_LENGTH}
          rows={1}
          readOnly={sending}
        />
        <button
          type='submit'
          className='chat-view__send'
          disabled={sending || !text.trim()}
          aria-label='Enviar mensaje'
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
