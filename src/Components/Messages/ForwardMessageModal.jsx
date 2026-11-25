import { useEffect, useState } from 'react'
import { Check, Forward, Search, Users, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getConversations, sendMessage } from '../../services/conversationService'
import Avatar from '../UI/Avatar'
import Alert from '../Alert/Alert'
import './GroupModals.css'

export default function ForwardMessageModal({ message, onClose, onForwarded }) {
  const { user: currentUser } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    let cancelled = false
    getConversations()
      .then((res) => {
        if (!cancelled) {
          const accepted = (res.data?.conversations ?? []).filter(
            (c) => c.estado !== 'pending'
          )
          setConversations(accepted)
        }
      })
      .catch(() => {
        if (!cancelled) setError('No se pudieron cargar las conversaciones.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !sending) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, sending])

  function toggleConversation(id) {
    if (sending) return
    setError(null)
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  async function handleForward(event) {
    event.preventDefault()
    if (sending || selectedIds.length === 0 || !message) return

    setSending(true)
    setError(null)
    setSuccess(null)

    const sharedPostId =
      message.tipo === 'shared_post'
        ? message.fk_id_publicacion_compartida?._id || null
        : null
    const contentToSend = message.contenido || ''

    if (!sharedPostId && !contentToSend.trim()) {
      setError('Este mensaje no tiene contenido disponible para reenviar.')
      setSending(false)
      return
    }

    try {
      const results = await Promise.allSettled(
        selectedIds.map((convId) =>
          sendMessage(convId, contentToSend, {
            shared_post_id: sharedPostId,
            forwarded: true
          })
        )
      )

      const succeeded = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.length - succeeded

      if (succeeded === 0) {
        const firstErr = results.find((r) => r.status === 'rejected')?.reason
        setError(firstErr?.message || 'No se pudo reenviar el mensaje.')
        return
      }

      if (onForwarded) {
        onForwarded(selectedIds)
      }

      setSuccess(
        failed > 0
          ? `Reenviado a ${succeeded} chat(s). ${failed} fallaron.`
          : succeeded === 1
            ? 'Mensaje reenviado correctamente.'
            : `Mensaje reenviado a ${succeeded} conversaciones.`
      )

      setTimeout(() => {
        onClose()
      }, 800)
    } catch (err) {
      setError(err.message || 'No se pudo reenviar el mensaje.')
    } finally {
      setSending(false)
    }
  }

  const normalizedQuery = query.trim().toLowerCase()
  const filtered = conversations.filter((conv) => {
    const isGroup =
      conv.tipo === 'group' ||
      (Array.isArray(conv.miembros_grupo) && conv.miembros_grupo.length > 0)
    if (!normalizedQuery) return true
    if (isGroup) {
      return (conv.nombre || '').toLowerCase().includes(normalizedQuery)
    }
    const other = (conv.participantes || []).find(
      (p) => String(p._id) !== String(currentUser?._id)
    )
    return (
      (other?.nombre || '').toLowerCase().includes(normalizedQuery) ||
      (other?.username || '').toLowerCase().includes(normalizedQuery)
    )
  })

  return (
    <div
      className='group-modal__backdrop'
      onClick={(e) => {
        if (e.target === e.currentTarget && !sending) onClose()
      }}
    >
      <div
        className='group-modal'
        role='dialog'
        aria-modal='true'
        aria-labelledby='forward-msg-title'
      >
        <header className='group-modal__header'>
          <h2 id='forward-msg-title' className='group-modal__title'>
            Reenviar mensaje
          </h2>
          <button
            type='button'
            className='group-modal__close'
            onClick={onClose}
            disabled={sending}
            aria-label='Cerrar'
          >
            <X size={16} />
          </button>
        </header>

        <form className='group-modal__body' onSubmit={handleForward}>
          <div className='group-modal__search-wrap'>
            <Search size={14} className='group-modal__search-icon' />
            <input
              type='text'
              className='group-modal__input group-modal__input--search'
              placeholder='Buscar conversaciones o grupos...'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={sending}
            />
          </div>

          <div className='group-modal__list'>
            {loading ? (
              <p className='group-modal__empty'>Cargando conversaciones...</p>
            ) : filtered.length === 0 ? (
              <p className='group-modal__empty'>No se encontraron conversaciones.</p>
            ) : (
              filtered.map((conv) => {
                const isGroup =
                  conv.tipo === 'group' ||
                  (Array.isArray(conv.miembros_grupo) && conv.miembros_grupo.length > 0)
                const other = !isGroup
                  ? (conv.participantes || []).find(
                      (p) => String(p._id) !== String(currentUser?._id)
                    )
                  : null
                const selected = selectedIds.includes(conv._id)
                return (
                  <button
                    key={conv._id}
                    type='button'
                    className={`group-modal__user${selected ? ' group-modal__user--selected' : ''}`}
                    onClick={() => toggleConversation(conv._id)}
                    disabled={sending}
                    aria-pressed={selected}
                  >
                    {isGroup ? (
                      conv.imagen_url ? (
                        <Avatar name={conv.nombre || 'Grupo'} avatarUrl={conv.imagen_url} size='sm' />
                      ) : (
                        <span className='group-avatar-fallback' aria-hidden='true'>
                          <Users size={16} />
                        </span>
                      )
                    ) : (
                      <Avatar
                        name={other?.nombre || 'Usuario'}
                        avatarUrl={other?.avatar_url}
                        size='sm'
                      />
                    )}
                    <div className='group-modal__user-meta'>
                      <span className='group-modal__user-name'>
                        {isGroup ? conv.nombre || 'Grupo' : other?.nombre || 'Usuario'}
                      </span>
                      <span className='group-modal__user-handle'>
                        {isGroup
                          ? `Grupo · ${conv.participantes?.length || 0} miembros`
                          : other?.username
                            ? `@${other.username}`
                            : 'Chat individual'}
                      </span>
                    </div>
                    <span className={`group-modal__check${selected ? ' group-modal__check--active' : ''}`}>
                      {selected && <Check size={12} strokeWidth={3} />}
                    </span>
                  </button>
                )
              })
            )}
          </div>

          {error && <Alert variant='error'>{error}</Alert>}
          {success && <Alert variant='success'>{success}</Alert>}

          <div className='group-modal__footer'>
            <button
              type='button'
              className='group-modal__btn group-modal__btn--ghost'
              onClick={onClose}
              disabled={sending}
            >
              Cancelar
            </button>
            <button
              type='submit'
              className='group-modal__btn group-modal__btn--primary'
              disabled={sending || selectedIds.length === 0}
            >
              <Forward size={14} />
              <span>
                {sending
                  ? 'Reenviando...'
                  : selectedIds.length > 0
                    ? `Reenviar (${selectedIds.length})`
                    : 'Reenviar'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
