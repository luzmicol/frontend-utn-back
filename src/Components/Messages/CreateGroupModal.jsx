import { useEffect, useState } from 'react'
import { Camera, Check, Search, Users, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { searchUsers } from '../../services/userService'
import { createGroupConversation } from '../../services/conversationService'
import { prepareAvatarFile } from '../../utils/imageOptimizer'
import Avatar from '../UI/Avatar'
import Alert from '../Alert/Alert'
import './GroupModals.css'

export default function CreateGroupModal({ onClose, onGroupCreated }) {
  const { user: currentUser } = useAuth()
  const [nombre, setNombre] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      setLoadingUsers(true)
      try {
        const res = await searchUsers(query.trim(), 12)
        if (cancelled) return
        setUsers((res.data?.users ?? []).filter((u) => String(u._id) !== String(currentUser?._id)))
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

  function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setImageFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  function toggleUser(id) {
    if (creating) return
    setError(null)
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (creating) return
    const trimmed = nombre.trim()
    if (!trimmed) {
      setError('Ingresa un nombre para el grupo.')
      return
    }
    if (selectedIds.length < 2) {
      setError('Selecciona al menos 2 participantes ademas de vos.')
      return
    }

    setCreating(true)
    setError(null)
    try {
      const optimized = imageFile ? await prepareAvatarFile(imageFile) : null
      const res = await createGroupConversation({
        nombre: trimmed,
        participant_ids: selectedIds,
        imageFile: optimized
      })
      if (res.data?.conversation && onGroupCreated) {
        onGroupCreated(res.data.conversation)
      }
      onClose()
    } catch (err) {
      setError(err.message || 'No se pudo crear el grupo.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div
      className='group-modal__backdrop'
      onClick={(e) => {
        if (e.target === e.currentTarget && !creating) onClose()
      }}
    >
      <div className='group-modal' role='dialog' aria-modal='true' aria-labelledby='create-group-title'>
        <header className='group-modal__header'>
          <h2 id='create-group-title' className='group-modal__title'>Nuevo grupo</h2>
          <button type='button' className='group-modal__close' onClick={onClose} disabled={creating} aria-label='Cerrar'>
            <X size={16} />
          </button>
        </header>

        <form className='group-modal__body' onSubmit={handleSubmit}>
          <div className='group-modal__identity'>
            <label className='group-modal__avatar-pick' title='Elegir imagen del grupo'>
              {previewUrl ? (
                <img src={previewUrl} alt='Grupo' className='group-modal__avatar-img' />
              ) : (
                <Users size={22} />
              )}
              <span className='group-modal__avatar-cam'><Camera size={12} /></span>
              <input type='file' accept='image/jpeg,image/png,image/webp' onChange={handleFileChange} disabled={creating} hidden />
            </label>

            <input
              type='text'
              className='group-modal__input'
              placeholder='Nombre del grupo (max. 60 caracteres)'
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={60}
              disabled={creating}
              required
            />
          </div>

          <div className='group-modal__search-wrap'>
            <Search size={14} className='group-modal__search-icon' />
            <input
              type='text'
              className='group-modal__input group-modal__input--search'
              placeholder='Buscar participantes (minimo 2)...'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={creating}
            />
          </div>

          <div className='group-modal__list'>
            {loadingUsers ? (
              <p className='group-modal__empty'>Buscando usuarios...</p>
            ) : users.length === 0 ? (
              <p className='group-modal__empty'>Sin usuarios encontrados.</p>
            ) : (
              users.map((u) => {
                const selected = selectedIds.includes(u._id)
                return (
                  <button
                    key={u._id}
                    type='button'
                    className={`group-modal__user${selected ? ' group-modal__user--selected' : ''}`}
                    onClick={() => toggleUser(u._id)}
                    disabled={creating}
                  >
                    <Avatar name={u.nombre} avatarUrl={u.avatar_url} size='sm' />
                    <div className='group-modal__user-meta'>
                      <span className='group-modal__user-name'>{u.nombre}</span>
                      {u.username && <span className='group-modal__user-handle'>@{u.username}</span>}
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

          <div className='group-modal__footer'>
            <button type='button' className='group-modal__btn group-modal__btn--ghost' onClick={onClose} disabled={creating}>
              Cancelar
            </button>
            <button
              type='submit'
              className='group-modal__btn group-modal__btn--primary'
              disabled={creating || !nombre.trim() || selectedIds.length < 2}
            >
              {creating ? 'Creando...' : `Crear grupo (${selectedIds.length})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
