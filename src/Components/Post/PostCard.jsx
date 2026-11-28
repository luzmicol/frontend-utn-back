import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Trash2, Users, Check, X, MessageCircle, Repeat2, ImagePlus, ImageOff, Send, MoreHorizontal } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { usePostViewer } from '../../context/PostViewerContext'
import { updatePost, deletePost } from '../../services/postService'
import { preparePostImageFile } from '../../utils/imageOptimizer'
import Alert from '../Alert/Alert'
import Avatar from '../UI/Avatar'
import MentionTextarea from '../UI/MentionTextarea'
import EmojiPicker from '../UI/EmojiPicker'
import { insertEmojiAtCursor } from '../../utils/emojiUtils'
import RichTextWithMentions from '../UI/RichTextWithMentions'
import LikeButton from './LikeButton'
import RepostButton from './RepostButton'
import BookmarkButton from './BookmarkButton'
import SharePostModal from './SharePostModal'
import CommentSection from './CommentSection'
import './PostCard.css'

const MAX_LENGTH = 2000
const MAX_ORIGINAL_IMAGE_BYTES = 15 * 1024 * 1024
const LONG_POST_TRUNCATE_LIMIT = 380

function truncatePreservingWords(text, limit = LONG_POST_TRUNCATE_LIMIT) {
  if (!text || text.length <= limit) return text
  let cut = text.slice(0, limit)
  // Evita cortar en medio de una palabra, mencion (@usuario), hashtag o enlace
  const lastBreak = Math.max(cut.lastIndexOf(' '), cut.lastIndexOf('\n'))
  if (lastBreak > Math.floor(limit * 0.6)) {
    cut = cut.slice(0, lastBreak)
  }
  return `${cut.trimEnd()}…`
}

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
  onUnreposted = null,
  onUnbookmarked = null,
  defaultShowComments = false,
  viewerPosts = null,
  viewerIndex = null
}) {
  const { user } = useAuth()
  const postViewer = usePostViewer()
  const isAuthor = Boolean(user?._id && post.fk_id_usuario?._id === user._id)
  const isAdmin = Boolean(user?.rol === 'admin' || user?.role === 'admin' || user?.is_admin)
  const canManagePost = isAuthor || isAdmin

  const [openMenuPostId, setOpenMenuPostId] = useState(null)
  const menuOpen = openMenuPostId === post._id
  const menuRef = useRef(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(post.contenido || '')
  const editTextareaRef = useRef(null)
  const [editImageFile, setEditImageFile] = useState(null)
  const [editPreviewUrl, setEditPreviewUrl] = useState('')
  const [removeImagePending, setRemoveImagePending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    return () => {
      if (editPreviewUrl) URL.revokeObjectURL(editPreviewUrl)
    }
  }, [editPreviewUrl])

  useEffect(() => {
    if (!menuOpen) return

    function handlePointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuPostId(null)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpenMenuPostId(null)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])
  const [showComments, setShowComments] = useState(defaultShowComments)
  const [showShareModal, setShowShareModal] = useState(false)
  const [isExpanded, setIsExpanded] = useState(defaultShowComments)
  const [prevPostCommentsCount, setPrevPostCommentsCount] = useState(post.comments_count ?? null)
  const [commentsCount, setCommentsCount] = useState(post.comments_count ?? null)

  if (
    post.comments_count !== undefined &&
    post.comments_count !== null &&
    post.comments_count !== prevPostCommentsCount
  ) {
    setPrevPostCommentsCount(post.comments_count)
    setCommentsCount(post.comments_count)
  }
  const [repostInfo, setRepostInfo] = useState({
    reposts_count: post.reposts_count ?? 0,
    reposted_by_me: Boolean(post.reposted_by_me),
    latest_repost_by: post.latest_repost_by ?? null
  })
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [failedImageUrl, setFailedImageUrl] = useState('')
  const imageLoadFailed = Boolean(post.imagen_url && failedImageUrl === post.imagen_url)

  const handleRepostInfoChange = useCallback((info) => {
    setRepostInfo(info)
  }, [])

  function openViewerIfAllowed(event) {
    if (isEditing || confirmDelete || !postViewer) return
    if (window.getSelection && window.getSelection().toString().trim()) return
    if (
      event.target?.closest?.(
        'a, button, input, textarea, select, [role="button"], [role="menu"], .comment-section, .post-card__edit-form, .post-card__menu-wrap'
      )
    ) {
      return
    }
    postViewer.openPostViewer({
      post,
      posts: viewerPosts,
      index: viewerIndex,
      onPostUpdated,
      onPostDeleted
    })
  }

  function handleCardKeyDown(event) {
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!isEditing && !confirmDelete && postViewer) {
        postViewer.openPostViewer({
          post,
          posts: viewerPosts,
          index: viewerIndex,
          onPostUpdated,
          onPostDeleted
        })
      }
    }
  }

  function handleEditImageChange(event) {
    const file = event.target.files?.[0]
    setActionError(null)
    if (!file) return

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setActionError('Formato no permitido. Usa JPG, PNG o WebP.')
      event.target.value = ''
      return
    }
    if (file.size > MAX_ORIGINAL_IMAGE_BYTES) {
      setActionError('La imagen original no puede superar los 15 MB.')
      event.target.value = ''
      return
    }

    if (editPreviewUrl) URL.revokeObjectURL(editPreviewUrl)
    setEditImageFile(file)
    setEditPreviewUrl(URL.createObjectURL(file))
    setRemoveImagePending(false)
  }

  function handleMarkRemoveEditImage() {
    if (editPreviewUrl) URL.revokeObjectURL(editPreviewUrl)
    setEditImageFile(null)
    setEditPreviewUrl('')
    setRemoveImagePending(true)
  }

  function cancelEdit() {
    if (editPreviewUrl) URL.revokeObjectURL(editPreviewUrl)
    setEditImageFile(null)
    setEditPreviewUrl('')
    setRemoveImagePending(false)
    setIsEditing(false)
    setActionError(null)
  }

  async function handleSaveEdit(event) {
    event.preventDefault()
    const trimmed = editContent.trim()
    const willHaveImage = Boolean(editImageFile) || (Boolean(post.imagen_url) && !removeImagePending)

    if (!trimmed && !willHaveImage) {
      setActionError('La publicación debe tener texto o una imagen.')
      return
    }

    try {
      setActionLoading(true)
      setActionError(null)
      let optimizedFile = null
      if (editImageFile) {
        optimizedFile = await preparePostImageFile(editImageFile)
      }

      const response = await updatePost(post._id, trimmed, {
        imageFile: optimizedFile,
        removeImage: removeImagePending && !optimizedFile
      })
      const updated = response.data?.post
      cancelEdit()
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
    <article
      className='post-card post-card--clickable'
      tabIndex={isEditing ? undefined : 0}
      onClick={openViewerIfAllowed}
      onKeyDown={handleCardKeyDown}
    >
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
            <Link to={`/posts/${post._id}`} className='post-card__date' style={{ textDecoration: 'none' }}>
              <time dateTime={post.fecha_creacion}>
                {formatDate(post.fecha_creacion)}
              </time>
            </Link>
          </div>
        </div>

        {canManagePost && !isEditing && !confirmDelete && (
          <div className='post-card__menu-wrap' ref={menuRef}>
            <button
              type='button'
              className={`post-card__menu-trigger${menuOpen ? ' post-card__menu-trigger--open' : ''}`}
              onClick={() => setOpenMenuPostId((prev) => (prev === post._id ? null : post._id))}
              aria-label='Opciones de la publicación'
              aria-haspopup='menu'
              aria-expanded={menuOpen}
            >
              <MoreHorizontal size={18} strokeWidth={2} />
            </button>

            {menuOpen && (
              <div className='post-card__menu' role='menu' aria-label='Acciones de la publicación'>
                <button
                  type='button'
                  role='menuitem'
                  className='post-card__menu-item'
                  onClick={() => {
                    setOpenMenuPostId(null)
                    setEditContent(post.contenido || '')
                    setEditImageFile(null)
                    if (editPreviewUrl) URL.revokeObjectURL(editPreviewUrl)
                    setEditPreviewUrl('')
                    setRemoveImagePending(false)
                    setActionError(null)
                    setIsEditing(true)
                  }}
                >
                  <Pencil size={15} strokeWidth={2} />
                  <span>Editar publicación</span>
                </button>
                <div className='post-card__menu-divider' role='separator' />
                <button
                  type='button'
                  role='menuitem'
                  className='post-card__menu-item post-card__menu-item--danger'
                  onClick={() => {
                    setOpenMenuPostId(null)
                    setActionError(null)
                    setConfirmDelete(true)
                  }}
                >
                  <Trash2 size={15} strokeWidth={2} />
                  <span>Eliminar publicación</span>
                </button>
              </div>
            )}
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
            textareaRef={editTextareaRef}
            className='post-card__edit-textarea'
            value={editContent}
            onChange={(nextVal) => setEditContent(nextVal)}
            maxLength={MAX_LENGTH}
            rows={3}
            disabled={actionLoading}
          />

          {(!removeImagePending && (editPreviewUrl || post.imagen_url)) && (
            <div className='post-card__image-wrap'>
              <img
                src={editPreviewUrl || post.imagen_url}
                alt='Imagen de la publicacion'
                className='post-card__image'
              />
            </div>
          )}

          <div className='post-card__edit-image-tools'>
            <EmojiPicker
              placement='top'
              align='left'
              disabled={actionLoading}
              onSelect={(emoji) => {
                insertEmojiAtCursor(editTextareaRef, editContent, emoji, MAX_LENGTH, setEditContent)
              }}
            />

            <label className='post-card__btn post-card__btn--ghost'>
              <ImagePlus size={14} />
              <span>{editPreviewUrl || (!removeImagePending && post.imagen_url) ? 'Cambiar imagen' : 'Agregar imagen'}</span>
              <input
                type='file'
                accept='image/jpeg,image/png,image/webp'
                onChange={handleEditImageChange}
                disabled={actionLoading}
                hidden
              />
            </label>

            {(!removeImagePending && (editPreviewUrl || post.imagen_url)) && (
              <button
                type='button'
                className='post-card__btn post-card__btn--danger'
                onClick={handleMarkRemoveEditImage}
                disabled={actionLoading}
              >
                <Trash2 size={14} />
                <span>Quitar imagen</span>
              </button>
            )}
          </div>

          <div className='post-card__edit-footer'>
            <span className='post-card__counter'>
              {editContent.length} / {MAX_LENGTH}
            </span>
            <div className='post-card__edit-buttons'>
              <button
                type='button'
                className='post-card__btn post-card__btn--ghost'
                onClick={cancelEdit}
                disabled={actionLoading}
              >
                <X size={15} />
                <span>Cancelar</span>
              </button>
              <button
                type='submit'
                className='post-card__btn post-card__btn--primary'
                disabled={
                  actionLoading ||
                  (!editContent.trim() && !editImageFile && (!post.imagen_url || removeImagePending))
                }
              >
                <Check size={15} />
                <span>{actionLoading ? 'Guardando...' : 'Guardar'}</span>
              </button>
            </div>
          </div>
        </form>
      ) : (
        <>
          {post.contenido && (
            <div className='post-card__content-wrap'>
              <p className='post-card__content'>
                <RichTextWithMentions
                  text={
                    !defaultShowComments &&
                    !isExpanded &&
                    post.contenido.length > LONG_POST_TRUNCATE_LIMIT
                      ? truncatePreservingWords(post.contenido, LONG_POST_TRUNCATE_LIMIT)
                      : post.contenido
                  }
                  mentions={post.menciones}
                />
              </p>
              {!defaultShowComments && post.contenido.length > LONG_POST_TRUNCATE_LIMIT && (
                <button
                  type='button'
                  className='post-card__expand-btn'
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsExpanded((prev) => !prev)
                  }}
                >
                  {isExpanded ? 'Ver menos' : 'Ver más'}
                </button>
              )}
            </div>
          )}
          {post.imagen_url && (
            <div className='post-card__image-wrap'>
              {imageLoadFailed ? (
                <div className='post-card__image-fallback' role='img' aria-label='No se pudo cargar la imagen'>
                  <ImageOff size={20} aria-hidden='true' />
                  <span>No se pudo cargar la imagen</span>
                </div>
              ) : (
                <img
                  src={post.imagen_url}
                  alt='Imagen de la publicacion'
                  className='post-card__image'
                  loading='lazy'
                  decoding='async'
                  onError={() => setFailedImageUrl(post.imagen_url)}
                />
              )}
            </div>
          )}
        </>
      )}

      {confirmDelete && (
        <div className='post-card__confirm'>
          <span className='post-card__confirm-text'>
            ¿Seguro que querés eliminar esta publicación?
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
        <LikeButton
          postId={post._id}
          initialLikesCount={post.likes_count}
          initialLikedByMe={post.liked_by_me}
          onError={setActionError}
        />

        <RepostButton
          postId={post._id}
          initialRepostsCount={post.reposts_count}
          initialRepostedByMe={post.reposted_by_me}
          initialLatestRepostBy={post.latest_repost_by}
          onRepostInfoChange={handleRepostInfoChange}
          onUnreposted={onUnreposted}
          onError={setActionError}
        />

        <button
          type='button'
          className={`post-card__action-pill${showComments ? ' post-card__action-pill--active' : ''}`}
          onClick={() => setShowComments((prev) => !prev)}
          aria-expanded={showComments}
          aria-label='Comentarios'
          title='Comentarios'
        >
          <MessageCircle size={16} strokeWidth={2} />
          {commentsCount !== null && <span>{commentsCount}</span>}
        </button>

        <button
          type='button'
          className='post-card__action-pill'
          onClick={() => setShowShareModal(true)}
          aria-label='Compartir publicación'
          title='Compartir por mensaje'
        >
          <Send size={15} strokeWidth={2} />
        </button>

        <BookmarkButton
          postId={post._id}
          initialBookmarked={post.is_bookmarked}
          onUnbookmarked={onUnbookmarked}
          onError={setActionError}
        />
      </footer>

      {showComments && (
        <CommentSection postId={post._id} onCountChange={setCommentsCount} />
      )}

      {showShareModal && (
        <SharePostModal post={post} onClose={() => setShowShareModal(false)} />
      )}
    </article>
  )
}
