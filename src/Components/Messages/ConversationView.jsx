import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, CheckCheck, ChevronDown, Copy, Forward, Info, Reply, Send, Trash2, Users, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useUnreadMessages } from '../../context/UnreadMessagesContext'
import {
  acceptConversationRequest,
  clearActiveConversation,
  deleteConversationRequest,
  deleteMessage,
  getConversationMessages,
  markConversationAsRead,
  sendMessage
} from '../../services/conversationService'
import Avatar from '../UI/Avatar'
import EmojiPicker from '../UI/EmojiPicker'
import { insertEmojiAtCursor } from '../../utils/emojiUtils'
import GroupInfoModal from './GroupInfoModal'
import ForwardMessageModal from './ForwardMessageModal'
import Alert from '../Alert/Alert'
import './ConversationView.css'

const PAGE_LIMIT = 30
const POLL_INTERVAL_MS = 6000
const MAX_MESSAGE_LENGTH = 2000

function isMobileSafari() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isIOSDevice =
    /iP(hone|od|ad)/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isSafariBrowser =
    /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Android/i.test(ua)
  const isCoarsePointer =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
  const isWebKitTouch =
    typeof window.CSS !== 'undefined' &&
    typeof window.CSS.supports === 'function' &&
    window.CSS.supports('-webkit-touch-callout', 'none')

  return isIOSDevice && isSafariBrowser && isCoarsePointer && isWebKitTouch
}

function formatTime(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatSystemEventText(msg) {
  const actor = msg.fk_id_remitente?.nombre || 'Un usuario'
  const target = msg.fk_id_usuario_objetivo?.nombre || 'un participante'

  switch (msg.evento_sistema) {
    case 'group_created':
      return `${actor} creo el grupo`
    case 'member_added':
      return `${actor} agrego a ${target}`
    case 'member_removed':
      return `${actor} elimino a ${target}`
    case 'member_left':
      return `${actor} abandono el grupo`
    case 'group_renamed':
      return `${actor} cambio el nombre del grupo`
    case 'group_image_updated':
      return `${actor} cambio la imagen del grupo`
    case 'admin_assigned':
      return `${actor} nombro administrador a ${target}`
    case 'admin_removed':
      return `${actor} quito el rol de administrador a ${target}`
    case 'owner_changed':
      return `${actor} ahora es el propietario del grupo`
    default:
      return msg.contenido || 'Evento del grupo'
  }
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

export default function ConversationView({
  conversation,
  onBack,
  onConversationActivity,
  onConversationRead,
  onRequestAccepted,
  onRequestDeleted,
  onGroupUpdated,
  onGroupLeft
}) {
  const { user: currentUser } = useAuth()
  const { setUnreadMessagesCount } = useUnreadMessages()
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const latestPageRef = useRef(1)
  const pollingInFlightRef = useRef(false)
  const activeConversationIdRef = useRef(conversation?._id || null)
  const pendingInitialScrollRef = useRef(true)
  const lastMessageIdRef = useRef(null)

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
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)
  const [forwardingMsg, setForwardingMsg] = useState(null)
  const [contextMenu, setContextMenu] = useState(null)
  const [highlightedId, setHighlightedId] = useState(null)
  const [copyToast, setCopyToast] = useState(null)
  const longPressTimerRef = useRef(null)
  const touchStartPosRef = useRef({ x: 0, y: 0 })
  const isGroup =
    conversation?.tipo === 'group' ||
    (Array.isArray(conversation?.miembros_grupo) && conversation.miembros_grupo.length > 0)

  const otherUser = conversation?.participantes?.find(
    (p) => p._id !== currentUser?._id
  )

  useEffect(() => {
    const root = document.documentElement
    root.classList.add('chat-route-active')

    // Bandera diagnostica temporal (?diag=no-kb-js | ?diag=no-height | ?diag=no-class | ?diag=no-autoscroll)
    const diagParam =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('diag')
        : null
    const diagNoKbJs = diagParam === 'no-kb-js'
    const diagNoHeight = diagParam === 'no-height'
    const diagNoClass = diagParam === 'no-class'
    const diagNoAutoscroll = diagParam === 'no-autoscroll'

    if (diagNoKbJs || isMobileSafari()) {
      return () => {
        root.style.removeProperty('--chat-viewport-height')
        root.classList.remove('chat-keyboard-open')
        root.classList.remove('chat-route-active')
      }
    }

    const vv = window.visualViewport
    let rafId = null
    let baselineHeight = Math.max(window.innerHeight, vv ? vv.height : 0)
    let wasKeyboardOpen = false

    function isComposerFocused() {
      return Boolean(inputRef.current && document.activeElement === inputRef.current)
    }

    function applyViewport() {
      rafId = null
      const focused = isComposerFocused()
      const currentHeight = vv ? vv.height : window.innerHeight

      if (!focused && currentHeight > baselineHeight) {
        baselineHeight = currentHeight
      }

      const heightDelta = baselineHeight - currentHeight
      const keyboardOpen = focused || heightDelta > 100

      if (!diagNoHeight) {
        if (keyboardOpen) {
          root.style.setProperty('--chat-viewport-height', `${Math.round(currentHeight)}px`)
        } else {
          root.style.removeProperty('--chat-viewport-height')
        }
      }

      if (!diagNoClass) {
        root.classList.toggle('chat-keyboard-open', keyboardOpen)
      }

      if (!diagNoAutoscroll && keyboardOpen && !wasKeyboardOpen && listRef.current) {
        const container = listRef.current
        const distanceFromBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight
        if (distanceFromBottom < 140) {
          container.scrollTop = container.scrollHeight
        }
      }

      wasKeyboardOpen = keyboardOpen
    }

    function scheduleSync() {
      if (rafId !== null) return
      rafId = requestAnimationFrame(applyViewport)
    }

    function handleFocusChange() {
      scheduleSync()
    }

    function handleOrientationChange() {
      baselineHeight = Math.max(window.innerHeight, vv ? vv.height : 0)
      scheduleSync()
    }

    applyViewport()
    if (vv) {
      vv.addEventListener('resize', scheduleSync)
    }
    window.addEventListener('orientationchange', handleOrientationChange)
    document.addEventListener('focusin', handleFocusChange)
    document.addEventListener('focusout', handleFocusChange)

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      if (vv) {
        vv.removeEventListener('resize', scheduleSync)
      }
      window.removeEventListener('orientationchange', handleOrientationChange)
      document.removeEventListener('focusin', handleFocusChange)
      document.removeEventListener('focusout', handleFocusChange)
      root.style.removeProperty('--chat-viewport-height')
      root.classList.remove('chat-keyboard-open')
      root.classList.remove('chat-route-active')
    }
  }, [])

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
    pendingInitialScrollRef.current = true
    lastMessageIdRef.current = null

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
        // Marcar como leidos los mensajes recibidos de esta conversacion
        markConversationAsRead(conversationId)
          .then((readRes) => {
            if (isMounted && activeConversationIdRef.current === conversationId) {
              setUnreadMessagesCount(readRes.data?.unread_count ?? 0)
              if (onConversationRead) onConversationRead(conversationId)
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
  }, [conversation?._id, setUnreadMessagesCount, onConversationRead])

  // Posiciona en el ultimo mensaje al abrir un chat y acompaña mensajes nuevos si el usuario esta cerca del final
  useEffect(() => {
    if (loading) return

    const newestId = messages.length > 0 ? messages[messages.length - 1]._id : null

    if (pendingInitialScrollRef.current) {
      pendingInitialScrollRef.current = false
      lastMessageIdRef.current = newestId
      scrollToBottom()
      return
    }

    if (newestId && newestId !== lastMessageIdRef.current) {
      lastMessageIdRef.current = newestId
      const container = listRef.current
      if (container) {
        const distanceFromBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight
        if (distanceFromBottom < 140) {
          scrollToBottom()
        }
      }
    }
  }, [loading, messages, scrollToBottom])

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
                if (onConversationRead) onConversationRead(conversationId)
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
      } else {
        clearActiveConversation().catch(() => {
          // Silencioso
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isMounted = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [conversation?._id, currentUser?._id, setUnreadMessagesCount, onConversationRead])

  // Limpia la conversacion activa al cerrar el chat o navegar a otra seccion
  useEffect(() => {
    return () => {
      clearActiveConversation().catch(() => {
        // Silencioso
      })
    }
  }, [])

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

  useEffect(() => {
    if (!contextMenu) return
    function handleKeyDown(event) {
      if (event.key === 'Escape') setContextMenu(null)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [contextMenu])

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    }
  }, [])

  function openContextMenuAt(msg, clientX, clientY) {
    if (!msg || msg.tipo === 'system') return
    const menuWidth = 188
    const menuHeight = 196
    const maxX = Math.max(12, window.innerWidth - menuWidth - 12)
    const maxY = Math.max(12, window.innerHeight - menuHeight - 16)
    const x = Math.min(Math.max(12, clientX), maxX)
    const y = Math.min(Math.max(12, clientY), maxY)
    setContextMenu({ msg, x, y })
  }

  function handleBubbleTouchStart(event, msg) {
    if (msg.tipo === 'system') return
    const touch = event.touches?.[0]
    if (!touch) return
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY }
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = setTimeout(() => {
      openContextMenuAt(msg, touch.clientX - 80, touch.clientY - 24)
    }, 450)
  }

  function handleBubbleTouchMove(event) {
    if (!longPressTimerRef.current) return
    const touch = event.touches?.[0]
    if (!touch) return
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x)
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y)
    if (dx > 10 || dy > 10) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  function handleBubbleTouchEnd() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  function getMessageSnippet(msg) {
    if (!msg) return 'Mensaje no disponible'
    if (msg.contenido && msg.contenido.trim()) return msg.contenido.trim()
    if (msg.tipo === 'shared_post') return 'Publicacion compartida'
    return 'Mensaje'
  }

  async function handleCopyMessage(msg) {
    let textToCopy
    if (msg.tipo === 'shared_post') {
      const post = msg.fk_id_publicacion_compartida
      const postUrl = post?._id ? `${window.location.origin}/posts/${post._id}` : ''
      const parts = []
      if (msg.contenido) parts.push(msg.contenido)
      if (post?.contenido) parts.push(post.contenido)
      if (postUrl) parts.push(postUrl)
      textToCopy = parts.join('\n') || 'Publicacion compartida'
    } else {
      textToCopy = msg.contenido || ''
    }

    if (!textToCopy) return

    let copied = false
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy)
        copied = true
      }
    } catch {
      copied = false
    }

    if (!copied) {
      try {
        const helper = document.createElement('textarea')
        helper.value = textToCopy
        helper.setAttribute('readonly', '')
        helper.style.position = 'fixed'
        helper.style.opacity = '0'
        document.body.appendChild(helper)
        helper.select()
        copied = document.execCommand('copy')
        document.body.removeChild(helper)
      } catch {
        copied = false
      }
    }

    setCopyToast(copied ? 'Mensaje copiado' : 'No se pudo copiar al portapapeles')
    setTimeout(() => setCopyToast(null), 1800)
  }

  function handleJumpToMessage(targetId) {
    if (!targetId || !listRef.current) return
    const targetEl = listRef.current.querySelector(`[data-message-id="${targetId}"]`)
    if (!targetEl) return
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightedId(targetId)
    setTimeout(() => {
      setHighlightedId((prev) => (prev === targetId ? null : prev))
    }, 1500)
  }

  async function submitMessage() {
    const trimmed = text.trim()
    if (!trimmed || sending || !conversation?._id) return

    const replyId = replyingTo?._id || null

    try {
      setSending(true)
      setError(null)
      const res = await sendMessage(conversation._id, trimmed, {
        reply_to_message_id: replyId
      })
      const created = res.data?.message
      setText('')
      setReplyingTo(null)
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

        {isGroup ? (
          <div className='chat-view__group-header'>
            {conversation.imagen_url ? (
              <Avatar name={conversation.nombre || 'Grupo'} avatarUrl={conversation.imagen_url} size='sm' />
            ) : (
              <span className='group-avatar-fallback' aria-hidden='true'>
                <Users size={18} />
              </span>
            )}
            <div className='chat-view__group-meta'>
              <span className='chat-view__name'>{conversation.nombre || 'Grupo'}</span>
              <span className='chat-view__group-members'>
                {(conversation.participantes || [])
                  .map((p) => p?.nombre)
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </div>
            <button
              type='button'
              className='chat-view__group-info-btn'
              onClick={() => setShowGroupInfo(true)}
              aria-label='Ver informacion del grupo'
              title='Informacion del grupo'
            >
              <Info size={18} strokeWidth={2} />
            </button>
          </div>
        ) : otherUser && (
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
            if (msg.tipo === 'system') {
              return (
                <div key={msg._id} className='chat-system-event' role='status'>
                  <span className='chat-system-event__pill'>
                    {formatSystemEventText(msg)}
                  </span>
                </div>
              )
            }

            const isMine = msg.fk_id_remitente?._id === currentUser?._id
            const otherId = otherUser?._id
            const isReadByOther = Boolean(
              isMine && otherId && (msg.leido_por || []).includes(otherId)
            )
            const isDeliveredToOther = Boolean(
              isMine && otherId && (msg.entregado_a || []).includes(otherId)
            )
            return (
              <div
                key={msg._id}
                data-message-id={msg._id}
                className={`chat-bubble-row${isMine ? ' chat-bubble-row--mine' : ''}`}
              >
                <div
                  className={`chat-bubble${isMine ? ' chat-bubble--mine' : ''}${highlightedId === msg._id ? ' chat-bubble--highlighted' : ''}`}
                  onTouchStart={(e) => handleBubbleTouchStart(e, msg)}
                  onTouchMove={handleBubbleTouchMove}
                  onTouchEnd={handleBubbleTouchEnd}
                  onTouchCancel={handleBubbleTouchEnd}
                >
                  <button
                    type='button'
                    className='chat-bubble__menu-trigger'
                    onClick={(e) => {
                      e.stopPropagation()
                      const rect = e.currentTarget.getBoundingClientRect()
                      openContextMenuAt(msg, isMine ? rect.right - 188 : rect.left, rect.bottom + 4)
                    }}
                    aria-label='Opciones del mensaje'
                    title='Opciones'
                  >
                    <ChevronDown size={15} />
                  </button>

                  {msg.reenviado && (
                    <span className='chat-bubble__forwarded'>
                      <Forward size={11} /> Reenviado
                    </span>
                  )}

                  {isGroup && !isMine && msg.fk_id_remitente?.nombre && (
                    <span className='chat-bubble__sender'>
                      {msg.fk_id_remitente.nombre}
                    </span>
                  )}

                  {msg.fk_id_mensaje_respondido !== null && msg.fk_id_mensaje_respondido !== undefined && (
                    msg.fk_id_mensaje_respondido && msg.fk_id_mensaje_respondido.activo !== false ? (
                      <button
                        type='button'
                        className='chat-reply-quote'
                        onClick={() => handleJumpToMessage(msg.fk_id_mensaje_respondido._id)}
                      >
                        <span className='chat-reply-quote__author'>
                          {msg.fk_id_mensaje_respondido.fk_id_remitente?.nombre || 'Usuario'}
                        </span>
                        <span className='chat-reply-quote__text'>
                          {getMessageSnippet(msg.fk_id_mensaje_respondido)}
                        </span>
                      </button>
                    ) : (
                      <div className='chat-reply-quote chat-reply-quote--unavailable'>
                        <span className='chat-reply-quote__text'>Mensaje no disponible</span>
                      </div>
                    )
                  )}

                  {msg.tipo === 'shared_post' && (
                    msg.fk_id_publicacion_compartida ? (
                      <Link
                        to={`/posts/${msg.fk_id_publicacion_compartida._id}`}
                        className='chat-shared-post'
                      >
                        <span className='chat-shared-post__badge'>Publicacion compartida</span>
                        <div className='chat-shared-post__author'>
                          <Avatar
                            name={msg.fk_id_publicacion_compartida.fk_id_usuario?.nombre || 'Usuario'}
                            avatarUrl={msg.fk_id_publicacion_compartida.fk_id_usuario?.avatar_url}
                            size='xs'
                          />
                          <div className='chat-shared-post__author-meta'>
                            <span className='chat-shared-post__author-name'>
                              {msg.fk_id_publicacion_compartida.fk_id_usuario?.nombre || 'Usuario'}
                            </span>
                            {msg.fk_id_publicacion_compartida.fk_id_usuario?.username && (
                              <span className='chat-shared-post__author-handle'>
                                @{msg.fk_id_publicacion_compartida.fk_id_usuario.username}
                              </span>
                            )}
                          </div>
                        </div>
                        {msg.fk_id_publicacion_compartida.contenido && (
                          <p className='chat-shared-post__text'>
                            {msg.fk_id_publicacion_compartida.contenido}
                          </p>
                        )}
                        {msg.fk_id_publicacion_compartida.imagen_url && (
                          <img
                            src={msg.fk_id_publicacion_compartida.imagen_url}
                            alt='Publicacion compartida'
                            className='chat-shared-post__image'
                          />
                        )}
                      </Link>
                    ) : (
                      <div className='chat-shared-post chat-shared-post--unavailable'>
                        <span className='chat-shared-post__badge'>Publicacion compartida</span>
                        <p className='chat-shared-post__unavailable-text'>
                          Esta publicacion ya no esta disponible.
                        </p>
                      </div>
                    )
                  )}
                  {msg.contenido && (
                    <p className='chat-bubble__text'>{msg.contenido}</p>
                  )}
                  <div className='chat-bubble__meta'>
                    <time className='chat-bubble__time'>{formatTime(msg.fecha_creacion)}</time>
                    {isMine && (
                      <span
                        className={`chat-bubble__status${isReadByOther ? ' chat-bubble__status--read' : ''}`}
                        aria-label={
                          isReadByOther
                            ? 'Visto'
                            : isDeliveredToOther
                              ? 'Entregado'
                              : 'Enviado'
                        }
                        title={
                          isReadByOther
                            ? 'Visto'
                            : isDeliveredToOther
                              ? 'Entregado'
                              : 'Enviado'
                        }
                      >
                        {isReadByOther || isDeliveredToOther ? (
                          <CheckCheck size={14} strokeWidth={2.2} />
                        ) : (
                          <Check size={14} strokeWidth={2.2} />
                        )}
                      </span>
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

      {copyToast && (
        <div className='chat-copy-toast' role='status'>
          {copyToast}
        </div>
      )}

      {replyingTo && (
        <div className='chat-reply-preview'>
          <div className='chat-reply-preview__body'>
            <span className='chat-reply-preview__author'>
              Respondiendo a {replyingTo.fk_id_remitente?.nombre || 'Usuario'}
            </span>
            <span className='chat-reply-preview__text'>
              {getMessageSnippet(replyingTo)}
            </span>
          </div>
          <button
            type='button'
            className='chat-reply-preview__close'
            onClick={() => setReplyingTo(null)}
            aria-label='Cancelar respuesta'
          >
            <X size={15} />
          </button>
        </div>
      )}

      <form
        className='chat-view__composer'
        style={
          conversation?.estado === 'pending' &&
          (String(conversation?.solicitada_por) !== String(currentUser?._id) || messages.length >= 1)
            ? { display: 'none' }
            : undefined
        }
        onSubmit={(e) => {
          e.preventDefault()
          submitMessage()
        }}
      >
        <EmojiPicker
          placement='top'
          align='left'
          disabled={sending}
          onSelect={(emoji) => {
            insertEmojiAtCursor(inputRef, text, emoji, MAX_MESSAGE_LENGTH, setText)
          }}
        />
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
          onMouseDown={(e) => e.preventDefault()}
          disabled={sending || !text.trim()}
          aria-label='Enviar mensaje'
        >
          <Send size={16} />
        </button>
      </form>

      {conversation?.estado === 'pending' &&
        String(conversation?.solicitada_por) !== String(currentUser?._id) && (
          <div className='chat-request-bar'>
            <p className='chat-request-bar__text'>
              Solicitud de mensaje. Acepta para responder o eliminala sin notificar al remitente.
            </p>
            <div className='chat-request-bar__actions'>
              <button
                type='button'
                className='chat-request-bar__btn chat-request-bar__btn--danger'
                disabled={sending}
                onClick={async () => {
                  try {
                    setSending(true)
                    setError(null)
                    await deleteConversationRequest(conversation._id)
                    if (onRequestDeleted) onRequestDeleted(conversation._id)
                  } catch (err) {
                    setError(err.message || 'No se pudo eliminar la solicitud.')
                  } finally {
                    setSending(false)
                  }
                }}
              >
                Eliminar
              </button>
              <button
                type='button'
                className='chat-request-bar__btn chat-request-bar__btn--primary'
                disabled={sending}
                onClick={async () => {
                  try {
                    setSending(true)
                    setError(null)
                    const res = await acceptConversationRequest(conversation._id)
                    if (onRequestAccepted && res.data?.conversation) {
                      onRequestAccepted(res.data.conversation)
                    }
                  } catch (err) {
                    setError(err.message || 'No se pudo aceptar la solicitud.')
                  } finally {
                    setSending(false)
                  }
                }}
              >
                Aceptar
              </button>
            </div>
          </div>
        )}

      {conversation?.estado === 'pending' &&
        String(conversation?.solicitada_por) === String(currentUser?._id) &&
        messages.length >= 1 && (
          <div className='chat-request-bar'>
            <p className='chat-request-bar__text'>
              Solicitud enviada. Podras enviar mas mensajes cuando la acepten.
            </p>
          </div>
        )}

      {contextMenu && (
        <>
          <div
            className='chat-context-menu__backdrop'
            onClick={() => setContextMenu(null)}
            aria-hidden='true'
          />
          <div
            className='chat-context-menu'
            role='menu'
            aria-label='Acciones del mensaje'
            style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          >
            <button
              type='button'
              role='menuitem'
              className='chat-context-menu__item'
              onClick={() => {
                setReplyingTo(contextMenu.msg)
                setContextMenu(null)
                requestAnimationFrame(() => inputRef.current?.focus())
              }}
            >
              <Reply size={15} />
              <span>Responder</span>
            </button>
            <button
              type='button'
              role='menuitem'
              className='chat-context-menu__item'
              onClick={() => {
                setForwardingMsg(contextMenu.msg)
                setContextMenu(null)
              }}
            >
              <Forward size={15} />
              <span>Reenviar</span>
            </button>
            {(contextMenu.msg.contenido || contextMenu.msg.tipo === 'shared_post') && (
              <button
                type='button'
                role='menuitem'
                className='chat-context-menu__item'
                onClick={() => {
                  const target = contextMenu.msg
                  setContextMenu(null)
                  handleCopyMessage(target)
                }}
              >
                <Copy size={15} />
                <span>Copiar</span>
              </button>
            )}
            {contextMenu.msg.fk_id_remitente?._id === currentUser?._id && (
              <button
                type='button'
                role='menuitem'
                className='chat-context-menu__item chat-context-menu__item--danger'
                onClick={() => {
                  setConfirmDeleteId(contextMenu.msg._id)
                  setContextMenu(null)
                }}
              >
                <Trash2 size={15} />
                <span>Eliminar</span>
              </button>
            )}
          </div>
        </>
      )}

      {forwardingMsg && (
        <ForwardMessageModal
          message={forwardingMsg}
          onClose={() => setForwardingMsg(null)}
        />
      )}

      {isGroup && showGroupInfo && (
        <GroupInfoModal
          conversation={conversation}
          onClose={() => setShowGroupInfo(false)}
          onGroupUpdated={onGroupUpdated}
          onGroupLeft={onGroupLeft}
        />
      )}
    </div>
  )
}
