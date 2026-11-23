import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Trash2, Users, Check, X, MessageCircle, Repeat2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { updatePost, deletePost } from '../../services/postService'
import Alert from '../Alert/Alert'
import Avatar from '../UI/Avatar'
import MentionTextarea from '../UI/MentionTextarea'
import RichTextWithMentions from '../UI/RichTextWithMentions'
import LikeButton from './LikeButton'
import RepostButton from './RepostButton'
import CommentSection from './CommentSection'
import './PostCard.css'

const MAX_LENGTH = 2000

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function PostCard({
  post,
  onPostUpdated,
  onPostDeleted,
  repostedByLabel = null,
  onUnreposted = null
}) {
  const { user } = useAuth()
  const isAuthor = Boolean(user?._id && post.fk_id_usuario?._id === user._id)

  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(post.contenido)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [commentsCount, setCommentsCount] = useState(null)
  const [repostInfo, setRepostInfo] = useState({
    reposts_count: 0,
    reposted_by_me: false,
    latest_repost_by: null
  })
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState(null)

  const handleRepostInfoChange = useCallback((info) => {
    setRepostInfo(info)
  }, [])

  async function handleSaveEdit(event) {
    event.preventDefault()
    const trimmed = editContent.trim()
    if (!trimmed) {
      setActionError('El contenido no puede estar vacio.')
      return
    }

    try {
      setActionLoading(true)
      setActionError(null)
      const response = await updatePost(post._id, trimmed)
      const updated = response.data?.post
      setIsEditing(false)
      if (updated && onPostUpdated) {
        onPostUpdated(updated)
      }
    } catch (err) {
      setActionError(err.message || 'No se pudo actualizar la publicacion.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleConfirmDelete() {
    try {
      setActionLoading(true)
      setActionError(null)
      await deletePost(post._id)
      if (onPostDeleted) {
        onPostDeleted(post._id)
      }
    } catch (err) {
      setActionError(err.message || 'No se pudo eliminar la publicacion.')
      setActionLoading(false)
    }
  }

  const feedRepostLabel =
    !repostedByLabel && repostInfo.reposts_count > 0 && repostInfo.latest_repost_by?.nombre
      ? repostInfo.reposts_count === 1
        ? `${repostInfo.latest_repost_by.nombre} reposteo`
        : `${repostInfo.latest_repost_by.nombre} y ${repostInfo.reposts_count - 1} mas repostearon`
      : null

  const activeRepostLabel = repostedByLabel || feedRepostLabel

  return (
    <article className='post-card'>
      {activeRepostLabel && (
        <div className='post-card__repost-banner'>
          <Repeat2 size={14} strokeWidth={2} />
          <span>{activeRepostLabel}</span>
        </div>
      )}

      <header className='post-card__header'>
        <div className='post-card__author-row'>
          <Avatar
            name={post.fk_id_usuario?.nombre || 'Usuario'}
            avatarUrl={post.fk_id_usuario?.avatar_url}
            size='sm'
          />
          <div className='post-card__meta'>
            {post.fk_id_usuario?._id ? (
              <Link
                to={isAuthor ? '/profile' : `/users/${post.fk_id_usuario._id}`}
                className='post-card__author post-card__author-link'
              >
                {post.fk_id_usuario.nombre || 'Usuario'}
                {post.fk_id_usuario.username && (
                  <span className='post-card__username'> @{post.fk_id_usuario.username}</span>
                )}
              </Link>
            ) : (
              <span className='post-card__author'>Usuario</span>
            )}
            <time className='post-card__date' dateTime={post.fecha_creacion}>
              {formatDate(post.fecha_creacion)}
            </time>
          </div>
        </div>

        {isAuthor && !isEditing && !confirmDelete && (
          <div className='post-card__actions'>
            <button
              type='button'
              className='post-card__icon-btn'
              onClick={() => {
                setEditContent(post.contenido)
                setActionError(null)
                setIsEditing(true)
              }}
              aria-label='Editar publicacion'
            >
              <Pencil size={16} />
            </button>
            <button
              type='button'
              className='post-card__icon-btn post-card__icon-btn--danger'
              onClick={() => {
                setActionError(null)
                setConfirmDelete(true)
              }}
              aria-label='Eliminar publicacion'
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </header>

      {post.fk_id_comunidad?.nombre && (
        <div className='post-card__community'>
          <Users size={13} />
          <span>{post.fk_id_comunidad.nombre}</span>
        </div>
      )}

      {isEditing ? (
        <form className='post-card__edit-form' onSubmit={handleSaveEdit}>
          <MentionTextarea
            className='post-card__edit-textarea'
            value={editContent}
            onChange={(nextVal) => setEditContent(nextVal)}
            maxLength={MAX_LENGTH}
            rows={3}
            disabled={actionLoading}
          />
          <div className='post-card__edit-footer'>
            <span className='post-card__counter'>
              {editContent.length} / {MAX_LENGTH}
            </span>
            <div className='post-card__edit-buttons'>
              <button
                type='button'
                className='post-card__btn post-card__btn--ghost'
                onClick={() => {
                  setIsEditing(false)
                  setActionError(null)
                }}
                disabled={actionLoading}
              >
                <X size={15} />
                <span>Cancelar</span>
              </button>
              <button
                type='submit'
                className='post-card__btn post-card__btn--primary'
                disabled={actionLoading || !editContent.trim()}
              >
                <Check size={15} />
                <span>{actionLoading ? 'Guardando...' : 'Guardar'}</span>
              </button>
            </div>
          </div>
        </form>
      ) : (
        <p className='post-card__content'>
          <RichTextWithMentions text={post.contenido} mentions={post.menciones} />
        </p>
      )}

      {confirmDelete && (
        <div className='post-card__confirm'>
          <span className='post-card__confirm-text'>
            ¿Seguro que queres eliminar esta publicacion?
          </span>
          <div className='post-card__confirm-buttons'>
            <button
              type='button'
              className='post-card__btn post-card__btn--ghost'
              onClick={() => setConfirmDelete(false)}
              disabled={actionLoading}
            >
              Cancelar
            </button>
            <button
              type='button'
              className='post-card__btn post-card__btn--danger'
              onClick={handleConfirmDelete}
              disabled={actionLoading}
            >
              {actionLoading ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      )}

      {actionError && <Alert variant='error'>{actionError}</Alert>}

      <footer className='post-card__interactions'>
        <LikeButton postId={post._id} />

        <RepostButton
          postId={post._id}
          onRepostInfoChange={handleRepostInfoChange}
          onUnreposted={onUnreposted}
          onError={setActionError}
        />

        <button
          type='button'
          className={`post-card__action-pill${showComments ? ' post-card__action-pill--active' : ''}`}
          onClick={() => setShowComments((prev) => !prev)}
          aria-expanded={showComments}
        >
          <MessageCircle size={16} strokeWidth={2} />
          <span>{commentsCount !== null ? `Comentarios (${commentsCount})` : 'Comentarios'}</span>
        </button>
      </footer>

      {showComments && (
        <CommentSection postId={post._id} onCountChange={setCommentsCount} />
      )}
    </article>
  )
}
