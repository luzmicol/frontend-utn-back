import { useEffect, useState } from 'react'
import { Check, Search, Send, Users, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { searchUsers } from '../../services/userService'
import { createOrGetConversation, getConversations, sendMessage } from '../../services/conversationService'
import Avatar from '../UI/Avatar'
import Alert from '../Alert/Alert'
import './SharePostModal.css'

export default function SharePostModal({ post, onClose }) {
  const { user: currentUser } = useAuth()
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState([])
  const [groups, setGroups] = useState([])
  const [selectedGroupIds, setSelectedGroupIds] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [selectedIds, setSelectedIds] = useState([])
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !sending) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, sending])

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      setLoadingUsers(true)
      try {
        const res = await searchUsers(query.trim(), 10)
        if (cancelled) return
        const list = (res.data?.users ?? []).filter(
          (u) => String(u._id) !== String(currentUser?._id)
        )
        setUsers(list)
      } catch {
        if (!cancelled) setUsers([])
      } finally {
        if (!cancelled) setLoadingUsers(false)
      }
    }, 200)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, currentUser?._id])

  useEffect(() => {
    let cancelled = false
    getConversations()
      .then((res) => {
        if (!cancelled) {
          setGroups((res.data?.conversations ?? []).filter((c) => c.tipo === 'group'))
        }
      })
      .catch(() => {
        if (!cancelled) setGroups([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  function toggleGroup(groupId) {
    if (sending) return
    setError(null)
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    )
  }

  function toggleRecipient(userId) {
    if (sending) return
    setError(null)
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  async function handleShare(event) {
    event.preventDefault()
    if (sending || (selectedIds.length === 0 && selectedGroupIds.length === 0)) return

    const validRecipients = selectedIds.filter(
      (id) => String(id) !== String(currentUser?._id)
    )
    if (validRecipients.length === 0 && selectedGroupIds.length === 0) {
      setError('Selecciona al menos un destinatario o grupo valido.')
      return
    }

    setSending(true)
    setError(null)
    setSuccess(null)

    try {
      const userTasks = validRecipients.map(async (recipientId) => {
        const convRes = await createOrGetConversation(recipientId)
        const convId = convRes.data?.conversation?._id
        if (!convId) {
          throw new Error('No se pudo abrir la conversacion.')
        }
        await sendMessage(convId, note.trim(), { shared_post_id: post._id })
      })

      const groupTasks = selectedGroupIds.map(async (groupId) => {
        await sendMessage(groupId, note.trim(), { shared_post_id: post._id })
      })

      const results = await Promise.allSettled([...userTasks, ...groupTasks])

      const succeeded = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.length - succeeded

      if (succeeded === 0) {
        const firstReason = results.find((r) => r.status === 'rejected')?.reason
        setError(firstReason?.message || 'No se pudo compartir la publicacion.')
        return
      }

      if (failed > 0) {
        setSuccess(`Compartida con ${succeeded} usuario(s). ${failed} envio(s) fallaron.`)
      } else {
        setSuccess(
          succeeded === 1
            ? 'Publicacion compartida correctamente.'
            : `Publicacion compartida con ${succeeded} usuarios.`
        )
      }

      setSelectedIds([])
      setNote('')
      setTimeout(() => {
        onClose()
      }, 900)
    } catch (err) {
      setError(err.message || 'No se pudo compartir la publicacion.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className='share-modal__backdrop'
      onClick={(e) => {
        if (e.target === e.currentTarget && !sending) onClose()
      }}
    >
      <div
        className='share-modal'
        role='dialog'
        aria-modal='true'
        aria-labelledby='share-modal-title'
      >
        <header className='share-modal__header'>
          <h2 id='share-modal-title' className='share-modal__title'>
            Compartir publicacion
          </h2>
          <button
            type='button'
            className='share-modal__close'
            onClick={onClose}
            disabled={sending}
            aria-label='Cerrar ventana de compartir'
          >
            <X size={16} />
          </button>
        </header>

        <div className='share-modal__search-wrap'>
          <Search size={15} className='share-modal__search-icon' aria-hidden='true' />
          <input
            type='text'
            className='share-modal__search'
            placeholder='Buscar usuarios por nombre o @username...'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={sending}
            aria-label='Buscar destinatarios'
          />
        </div>

        <div className='share-modal__list'>
          {groups
            .filter((g) => !query.trim() || (g.nombre || '').toLowerCase().includes(query.trim().toLowerCase()))
            .map((group) => {
              const isSelected = selectedGroupIds.includes(group._id)
              return (
                <button
                  key={`group-${group._id}`}
                  type='button'
                  className={`share-modal__user${isSelected ? ' share-modal__user--selected' : ''}`}
                  onClick={() => toggleGroup(group._id)}
                  disabled={sending}
                  aria-pressed={isSelected}
                >
                  {group.imagen_url ? (
                    <Avatar name={group.nombre || 'Grupo'} avatarUrl={group.imagen_url} size='sm' />
                  ) : (
                    <span className='group-avatar-fallback' aria-hidden='true'>
                      <Users size={16} />
                    </span>
                  )}
                  <div className='share-modal__user-info'>
                    <span className='share-modal__user-name'>{group.nombre || 'Grupo'}</span>
                    <span className='share-modal__user-handle'>
                      Grupo · {group.participantes?.length || 0} miembros
                    </span>
                  </div>
                  <span className={`share-modal__check${isSelected ? ' share-modal__check--active' : ''}`}>
                    {isSelected && <Check size={13} strokeWidth={3} />}
                  </span>
                </button>
              )
            })}
          {loadingUsers ? (
            <p className='share-modal__empty'>Buscando usuarios...</p>
          ) : users.length === 0 ? (
            <p className='share-modal__empty'>No se encontraron usuarios.</p>
          ) : (
            users.map((person) => {
              const isSelected = selectedIds.includes(person._id)
              return (
                <button
                  key={person._id}
                  type='button'
                  className={`share-modal__user${isSelected ? ' share-modal__user--selected' : ''}`}
                  onClick={() => toggleRecipient(person._id)}
                  disabled={sending}
                  aria-pressed={isSelected}
                >
                  <Avatar name={person.nombre} avatarUrl={person.avatar_url} size='sm' />
                  <div className='share-modal__user-info'>
                    <span className='share-modal__user-name'>{person.nombre}</span>
                    {person.username && (
                      <span className='share-modal__user-handle'>@{person.username}</span>
                    )}
                  </div>
                  <span className={`share-modal__check${isSelected ? ' share-modal__check--active' : ''}`}>
                    {isSelected && <Check size={13} strokeWidth={3} />}
                  </span>
                </button>
              )
            })
          )}
        </div>

        <form className='share-modal__footer' onSubmit={handleShare}>
          <input
            type='text'
            className='share-modal__note'
            placeholder='Agregar un mensaje opcional...'
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            disabled={sending}
          />

          {error && <Alert variant='error'>{error}</Alert>}
          {success && <Alert variant='success'>{success}</Alert>}

          <div className='share-modal__actions'>
            <button
              type='button'
              className='share-modal__btn share-modal__btn--ghost'
              onClick={onClose}
              disabled={sending}
            >
              Cancelar
            </button>
            <button
              type='submit'
              className='share-modal__btn share-modal__btn--primary'
              disabled={sending || (selectedIds.length === 0 && selectedGroupIds.length === 0)}
            >
              <Send size={14} />
              <span>
                {sending
                  ? 'Enviando...'
                  : selectedIds.length + selectedGroupIds.length > 0
                    ? `Enviar (${selectedIds.length + selectedGroupIds.length})`
                    : 'Enviar'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
