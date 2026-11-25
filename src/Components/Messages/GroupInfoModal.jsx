import { useEffect, useMemo, useState } from 'react'
import { Camera, Crown, LogOut, Shield, Trash2, UserPlus, Users, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { searchUsers } from '../../services/userService'
import {
  addGroupParticipants,
  leaveGroupConversation,
  removeGroupParticipant,
  updateGroupConversation,
  updateGroupMemberRole
} from '../../services/conversationService'
import { prepareAvatarFile } from '../../utils/imageOptimizer'
import Avatar from '../UI/Avatar'
import Alert from '../Alert/Alert'
import './GroupModals.css'

export default function GroupInfoModal({ conversation, onClose, onGroupUpdated, onGroupLeft }) {
  const { user: currentUser } = useAuth()
  const [nombre, setNombre] = useState(conversation?.nombre || '')
  const [savingInfo, setSavingInfo] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [addQuery, setAddQuery] = useState('')
  const [addResults, setAddResults] = useState([])
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const rawMembers = conversation?.miembros_grupo
  const members = useMemo(() => rawMembers || [], [rawMembers])
  const myMember = members.find(
    (m) => String(m.usuario?._id || m.usuario) === String(currentUser?._id)
  )
  const isOwner = myMember?.rol === 'owner'
  const isAdmin = myMember?.rol === 'admin'
  const canManageParticipants = isOwner || isAdmin

  useEffect(() => {
    if (!canManageParticipants || !addQuery.trim()) {
      return
    }
    let cancelled = false
    const existingIds = new Set(members.map((m) => String(m.usuario?._id || m.usuario)))
    const timer = setTimeout(async () => {
      try {
        const res = await searchUsers(addQuery.trim(), 6)
        if (!cancelled) {
          setAddResults((res.data?.users ?? []).filter((u) => !existingIds.has(String(u._id))))
        }
      } catch {
        if (!cancelled) setAddResults([])
      }
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [addQuery, canManageParticipants, members])

  async function handleSaveName(event) {
    event.preventDefault()
    if (savingInfo || !nombre.trim()) return
    setSavingInfo(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await updateGroupConversation(conversation._id, { nombre: nombre.trim() })
      if (res.data?.conversation && onGroupUpdated) onGroupUpdated(res.data.conversation)
      setSuccess('Nombre del grupo actualizado.')
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el nombre.')
    } finally {
      setSavingInfo(false)
    }
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0]
    if (!file || savingInfo) return
    setSavingInfo(true)
    setError(null)
    setSuccess(null)
    try {
      const optimized = await prepareAvatarFile(file)
      const res = await updateGroupConversation(conversation._id, { imageFile: optimized })
      if (res.data?.conversation && onGroupUpdated) onGroupUpdated(res.data.conversation)
      setSuccess('Imagen del grupo actualizada.')
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la imagen.')
    } finally {
      setSavingInfo(false)
      event.target.value = ''
    }
  }

  async function handleAddUser(userId) {
    setBusyId(userId)
    setError(null)
    try {
      const res = await addGroupParticipants(conversation._id, [userId])
      if (res.data?.conversation && onGroupUpdated) onGroupUpdated(res.data.conversation)
      setAddQuery('')
      setAddResults([])
    } catch (err) {
      setError(err.message || 'No se pudo agregar al participante.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleRemoveUser(userId) {
    setBusyId(userId)
    setError(null)
    try {
      const res = await removeGroupParticipant(conversation._id, userId)
      if (res.data?.conversation && onGroupUpdated) onGroupUpdated(res.data.conversation)
    } catch (err) {
      setError(err.message || 'No se pudo quitar al participante.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleToggleRole(userId, currentRole) {
    const nextRole = currentRole === 'admin' ? 'member' : 'admin'
    setBusyId(userId)
    setError(null)
    try {
      const res = await updateGroupMemberRole(conversation._id, userId, nextRole)
      if (res.data?.conversation && onGroupUpdated) onGroupUpdated(res.data.conversation)
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el rol.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleConfirmLeave() {
    setLeaving(true)
    setError(null)
    try {
      await leaveGroupConversation(conversation._id)
      if (onGroupLeft) onGroupLeft(conversation._id)
      onClose()
    } catch (err) {
      setError(err.message || 'No se pudo abandonar el grupo.')
      setLeaving(false)
    }
  }

  return (
    <div
      className='group-modal__backdrop'
      onClick={(e) => {
        if (e.target === e.currentTarget && !savingInfo && !leaving) onClose()
      }}
    >
      <div className='group-modal' role='dialog' aria-modal='true' aria-labelledby='group-info-title'>
        <header className='group-modal__header'>
          <h2 id='group-info-title' className='group-modal__title'>Informacion del grupo</h2>
          <button type='button' className='group-modal__close' onClick={onClose} aria-label='Cerrar'>
            <X size={16} />
          </button>
        </header>

        <div className='group-modal__body'>
          <form className='group-modal__identity' onSubmit={handleSaveName}>
            <label className='group-modal__avatar-pick' title='Cambiar imagen del grupo'>
              {conversation.imagen_url ? (
                <img src={conversation.imagen_url} alt={conversation.nombre} className='group-modal__avatar-img' />
              ) : (
                <Users size={22} />
              )}
              <span className='group-modal__avatar-cam'><Camera size={12} /></span>
              <input type='file' accept='image/jpeg,image/png,image/webp' onChange={handleImageChange} disabled={savingInfo} hidden />
            </label>

            <input
              type='text'
              className='group-modal__input'
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={60}
              disabled={savingInfo}
            />
            <button type='submit' className='group-modal__btn group-modal__btn--primary' disabled={savingInfo || !nombre.trim()}>
              Guardar
            </button>
          </form>

          {error && <Alert variant='error'>{error}</Alert>}
          {success && <Alert variant='success'>{success}</Alert>}

          {canManageParticipants && (
            <div className='group-modal__add-section'>
              <input
                type='text'
                className='group-modal__input'
                placeholder='Agregar participante por nombre o @username...'
                value={addQuery}
                onChange={(e) => {
                  const val = e.target.value
                  setAddQuery(val)
                  if (!val.trim()) setAddResults([])
                }}
              />
              {addResults.length > 0 && (
                <div className='group-modal__add-results'>
                  {addResults.map((u) => (
                    <button
                      key={u._id}
                      type='button'
                      className='group-modal__user'
                      disabled={busyId === u._id}
                      onClick={() => handleAddUser(u._id)}
                    >
                      <Avatar name={u.nombre} avatarUrl={u.avatar_url} size='xs' />
                      <span className='group-modal__user-name'>{u.nombre}</span>
                      <UserPlus size={14} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className='group-modal__section-label'>
            Participantes ({members.length})
          </div>

          <div className='group-modal__list'>
            {members.map((m) => {
              const u = m.usuario || {}
              const uid = String(u._id || m.usuario)
              const isMe = uid === String(currentUser?._id)
              const canKick =
                !isMe &&
                ((isOwner && m.rol !== 'owner') || (isAdmin && m.rol === 'member'))
              return (
                <div key={uid} className='group-modal__member-row'>
                  <Avatar name={u.nombre || 'Usuario'} avatarUrl={u.avatar_url} size='sm' />
                  <div className='group-modal__user-meta'>
                    <span className='group-modal__user-name'>
                      {u.nombre || 'Usuario'} {isMe && '(Vos)'}
                    </span>
                    <span className='group-modal__role-badge'>
                      {m.rol === 'owner' && <><Crown size={11} /> Owner</>}
                      {m.rol === 'admin' && <><Shield size={11} /> Admin</>}
                      {m.rol === 'member' && 'Miembro'}
                    </span>
                  </div>
                  <div className='group-modal__member-actions'>
                    {isOwner && !isMe && (
                      <button
                        type='button'
                        className='group-modal__mini-btn'
                        disabled={busyId === uid}
                        onClick={() => handleToggleRole(uid, m.rol)}
                        title={m.rol === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                      >
                        <Shield size={13} />
                      </button>
                    )}
                    {canKick && (
                      <button
                        type='button'
                        className='group-modal__mini-btn group-modal__mini-btn--danger'
                        disabled={busyId === uid}
                        onClick={() => handleRemoveUser(uid)}
                        title='Quitar del grupo'
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className='group-modal__leave-box'>
            {!confirmLeave ? (
              <button
                type='button'
                className='group-modal__btn group-modal__btn--danger'
                onClick={() => setConfirmLeave(true)}
              >
                <LogOut size={14} />
                <span>Abandonar grupo</span>
              </button>
            ) : (
              <div className='group-modal__confirm-row'>
                <span>¿Seguro que queres salir?</span>
                <button type='button' className='group-modal__btn group-modal__btn--ghost' onClick={() => setConfirmLeave(false)} disabled={leaving}>
                  Cancelar
                </button>
                <button type='button' className='group-modal__btn group-modal__btn--danger' onClick={handleConfirmLeave} disabled={leaving}>
                  {leaving ? 'Saliendo...' : 'Confirmar'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
