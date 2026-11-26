import { useState } from 'react'
import { Bookmark } from 'lucide-react'
import { bookmarkPost, unbookmarkPost } from '../../services/postService'

export default function BookmarkButton({
  postId,
  initialBookmarked = false,
  onUnbookmarked,
  onBookmarkChange,
  onError
}) {
  const [prevInitial, setPrevInitial] = useState(Boolean(initialBookmarked))
  const [bookmarked, setBookmarked] = useState(Boolean(initialBookmarked))
  const [busy, setBusy] = useState(false)

  if (Boolean(initialBookmarked) !== prevInitial) {
    setPrevInitial(Boolean(initialBookmarked))
    setBookmarked(Boolean(initialBookmarked))
  }

  async function handleToggle() {
    if (busy) return

    const prevBookmarked = bookmarked
    const nextBookmarked = !prevBookmarked

    setBookmarked(nextBookmarked)
    setBusy(true)
    if (onError) onError(null)

    try {
      const response = nextBookmarked
        ? await bookmarkPost(postId)
        : await unbookmarkPost(postId)

      const finalBookmarked =
        response.data?.bookmarked !== undefined
          ? Boolean(response.data.bookmarked)
          : nextBookmarked

      setBookmarked(finalBookmarked)
      if (onBookmarkChange) {
        onBookmarkChange({ is_bookmarked: finalBookmarked })
      }

      if (!finalBookmarked && onUnbookmarked) {
        onUnbookmarked(postId)
      }
    } catch (err) {
      setBookmarked(prevBookmarked)
      if (onError) {
        onError(err.message || 'No se pudo actualizar el guardado.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type='button'
      className={`post-card__action-pill post-card__action-pill--bookmark${bookmarked ? ' post-card__action-pill--bookmarked' : ''}`}
      onClick={handleToggle}
      disabled={busy}
      aria-pressed={bookmarked}
      aria-busy={busy}
      aria-label={bookmarked ? 'Quitar de guardados' : 'Guardar publicacion'}
      title={bookmarked ? 'Quitar de guardados' : 'Guardar publicacion'}
    >
      <Bookmark
        size={16}
        strokeWidth={2}
        fill={bookmarked ? 'currentColor' : 'none'}
      />
    </button>
  )
}
