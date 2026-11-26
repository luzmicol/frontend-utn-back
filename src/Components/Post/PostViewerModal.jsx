import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, MessageCircle, Users, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { usePostViewer } from '../../context/PostViewerContext'
import Avatar from '../UI/Avatar'
import RichTextWithMentions from '../UI/RichTextWithMentions'
import Alert from '../Alert/Alert'
import LikeButton from './LikeButton'
import RepostButton from './RepostButton'
import BookmarkButton from './BookmarkButton'
import CommentSection from './CommentSection'
import ZoomableImage from './ZoomableImage'
import './PostViewerModal.css'

function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function PostViewerModal() {
  const { user: currentUser } = useAuth()
  const viewer = usePostViewer()
  const post = viewer?.viewerState?.post || null
  const closePostViewer = viewer?.closePostViewer
  const goPrev = viewer?.goPrev
  const goNext = viewer?.goNext
  const updateViewerPost = viewer?.updateViewerPost
  const hasList = Boolean(viewer?.hasList)
  const hasPrev = Boolean(viewer?.hasPrev)
  const hasNext = Boolean(viewer?.hasNext)
  const currentIndex = viewer?.currentIndex ?? 0
  const totalCount = viewer?.totalCount ?? 1

  const [actionError, setActionError] = useState(null)
  const [commentsCount, setCommentsCount] = useState(null)

  // Bloquea el scroll del fondo mientras el visor esta abierto y escucha Escape / Flechas
  useEffect(() => {
    if (!post) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closePostViewer?.()
        return
      }
      if (event.target?.closest?.('input, textarea, select, [contenteditable="true"]')) {
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goPrev?.()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        goNext?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [post, closePostViewer, goPrev, goNext])

  if (!post) return null

  const author = post.fk_id_usuario
  const authorId = author?._id
  const authorLink = currentUser?._id === authorId ? '/profile' : `/users/${authorId}`
  const hasImage = Boolean(post.imagen_url)

  return (
    <div
      className='post-viewer-backdrop'
      role='dialog'
      aria-modal='true'
      aria-label='Visor de publicación'
      onClick={() => closePostViewer?.()}
    >
      <div
        className={`post-viewer${hasImage ? '' : ' post-viewer--no-media'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {hasList && (
          <>
            <button
              type='button'
              className='post-viewer__nav post-viewer__nav--prev'
              onClick={() => goPrev?.()}
              disabled={!hasPrev}
              aria-label='Publicación anterior'
              title='Publicación anterior'
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type='button'
              className='post-viewer__nav post-viewer__nav--next'
              onClick={() => goNext?.()}
              disabled={!hasNext}
              aria-label='Publicación siguiente'
              title='Publicación siguiente'
            >
              <ChevronRight size={22} />
            </button>
            <div className='post-viewer__mobile-nav' role='group' aria-label='Navegación entre publicaciones'>
              <button
                type='button'
                className='post-viewer__mobile-nav-btn'
                onClick={() => goPrev?.()}
                disabled={!hasPrev}
                aria-label='Publicación anterior'
              >
                <ChevronLeft size={18} />
              </button>
              <span className='post-viewer__mobile-nav-counter'>
                {currentIndex + 1} / {totalCount}
              </span>
              <button
                type='button'
                className='post-viewer__mobile-nav-btn'
                onClick={() => goNext?.()}
                disabled={!hasNext}
                aria-label='Publicación siguiente'
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </>
        )}

        <button
          type='button'
          className='post-viewer__close'
          onClick={() => closePostViewer?.()}
          aria-label='Cerrar visor'
        >
          <X size={20} />
        </button>

        {hasImage && (
          <div className='post-viewer__media'>
            <ZoomableImage
              key={post._id}
              src={post.imagen_url}
              alt='Imagen de la publicación'
            />
          </div>
        )}

        <div className='post-viewer__sidebar'>
          <header className='post-viewer__header'>
            <Link to={authorLink} className='post-viewer__author'>
              <Avatar
                name={author?.nombre || 'Usuario'}
                avatarUrl={author?.avatar_url}
                size='sm'
              />
              <div className='post-viewer__author-meta'>
                <span className='post-viewer__author-name'>
                  {author?.nombre || 'Usuario'}
                </span>
                {author?.username && (
                  <span className='post-viewer__author-username'>@{author.username}</span>
                )}
              </div>
            </Link>

            {post.fk_id_comunidad && (
              <Link
                to={`/communities/${post.fk_id_comunidad._id}`}
                className='post-viewer__community'
              >
                <Users size={13} />
                <span>{post.fk_id_comunidad.nombre}</span>
              </Link>
            )}
          </header>

          <div className='post-viewer__scroll'>
            <div className='post-viewer__caption-block'>
              {post.contenido && (
                <div className='post-viewer__caption'>
                  <p className='post-viewer__text'>
                    <RichTextWithMentions
                      text={post.contenido}
                      mentions={post.menciones}
                    />
                  </p>
                </div>
              )}

              <time className='post-viewer__date' dateTime={post.fecha_creacion}>
                {formatDate(post.fecha_creacion)}
              </time>
            </div>

            {actionError && (
              <div className='post-viewer__error'>
                <Alert variant='error'>{actionError}</Alert>
              </div>
            )}

            <div className='post-viewer__interactions'>
              <LikeButton
                key={`like-${post._id}`}
                postId={post._id}
                initialLikesCount={post.likes_count}
                initialLikedByMe={post.liked_by_me}
                onLikeChange={(patch) => updateViewerPost?.(patch)}
                onError={setActionError}
              />
              <RepostButton
                key={`repost-${post._id}`}
                postId={post._id}
                initialRepostsCount={post.reposts_count}
                initialRepostedByMe={post.reposted_by_me}
                initialLatestRepostBy={post.latest_repost_by}
                onRepostInfoChange={(info) => updateViewerPost?.(info)}
                onError={setActionError}
              />
              <span
                className='post-viewer__comment-count'
                aria-label='Comentarios'
                title='Comentarios'
              >
                <MessageCircle size={15} />
                {commentsCount !== null && <span>{commentsCount}</span>}
              </span>
              <BookmarkButton
                key={`bookmark-${post._id}`}
                postId={post._id}
                initialBookmarked={post.is_bookmarked}
                onBookmarkChange={(patch) => updateViewerPost?.(patch)}
                onError={setActionError}
              />
            </div>

            <div className='post-viewer__comments'>
              <CommentSection
                key={`comments-${post._id}`}
                postId={post._id}
                onCountChange={(count) => {
                  setCommentsCount(count)
                  updateViewerPost?.({ comments_count: count })
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
