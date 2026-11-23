import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { getPostLikes, likePost, unlikePost } from '../../services/postService'

export default function LikeButton({ postId, initialLikesCount, initialLikedByMe, onError }) {
  const hasInitialData = initialLikesCount !== undefined
  const [likesCount, setLikesCount] = useState(initialLikesCount ?? 0)
  const [likedByMe, setLikedByMe] = useState(Boolean(initialLikedByMe))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (hasInitialData) return

    let isMounted = true

    async function loadLikes() {
      try {
        const response = await getPostLikes(postId)
        if (isMounted && response.data) {
          setLikesCount(response.data.likes_count ?? 0)
          setLikedByMe(Boolean(response.data.liked_by_me))
        }
      } catch {
        // Silencioso en carga inicial para no saturar la card
      }
    }

    loadLikes()

    return () => {
      isMounted = false
    }
  }, [postId, hasInitialData])

  async function handleToggle() {
    if (busy) return

    const prevLiked = likedByMe
    const prevCount = likesCount
    const nextLiked = !prevLiked
    const nextCount = nextLiked ? prevCount + 1 : Math.max(0, prevCount - 1)

    setLikedByMe(nextLiked)
    setLikesCount(nextCount)
    setBusy(true)
    if (onError) onError(null)

    try {
      const response = nextLiked ? await likePost(postId) : await unlikePost(postId)
      if (response.data) {
        setLikesCount(response.data.likes_count ?? nextCount)
        setLikedByMe(Boolean(response.data.liked_by_me))
      }
    } catch (err) {
      setLikedByMe(prevLiked)
      setLikesCount(prevCount)
      if (onError) {
        onError(err.message || 'No se pudo actualizar el me gusta.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type='button'
      className={`post-card__action-pill${likedByMe ? ' post-card__action-pill--liked' : ''}`}
      onClick={handleToggle}
      disabled={busy}
      aria-pressed={likedByMe}
      aria-label={likedByMe ? 'Quitar like' : 'Dar like'}
    >
      <Heart
        size={16}
        strokeWidth={2}
        fill={likedByMe ? 'currentColor' : 'none'}
      />
      <span>{likesCount}</span>
    </button>
  )
}
