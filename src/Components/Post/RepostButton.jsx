import { useEffect, useState } from 'react'
import { Repeat2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getPostReposts, repostPost, unrepostPost } from '../../services/postService'

export default function RepostButton({
  postId,
  initialRepostsCount,
  initialRepostedByMe,
  onRepostInfoChange,
  onUnreposted,
  onError
}) {
  const { user: currentUser } = useAuth()
  const hasInitialData = initialRepostsCount !== undefined
  const [prevInitial, setPrevInitial] = useState({
    count: initialRepostsCount,
    reposted: initialRepostedByMe
  })
  const [repostsCount, setRepostsCount] = useState(initialRepostsCount ?? 0)
  const [repostedByMe, setRepostedByMe] = useState(Boolean(initialRepostedByMe))
  const [busy, setBusy] = useState(false)

  if (
    hasInitialData &&
    (initialRepostsCount !== prevInitial.count || initialRepostedByMe !== prevInitial.reposted)
  ) {
    setPrevInitial({ count: initialRepostsCount, reposted: initialRepostedByMe })
    setRepostsCount(initialRepostsCount ?? 0)
    setRepostedByMe(Boolean(initialRepostedByMe))
  }

  useEffect(() => {
    if (hasInitialData) return

    let isMounted = true

    async function loadReposts() {
      try {
        const response = await getPostReposts(postId)
        if (isMounted && response.data) {
          const count = response.data.reposts_count ?? 0
          const byMe = Boolean(response.data.reposted_by_me)
          setRepostsCount(count)
          setRepostedByMe(byMe)
          if (onRepostInfoChange) {
            onRepostInfoChange({
              reposts_count: count,
              reposted_by_me: byMe,
              latest_repost_by: response.data.latest_repost_by ?? null
            })
          }
        }
      } catch {
        // Silencioso en carga inicial
      }
    }

    loadReposts()

    return () => {
      isMounted = false
    }
  }, [postId, hasInitialData, onRepostInfoChange])

  async function handleToggle() {
    if (busy) return

    const prevReposted = repostedByMe
    const prevCount = repostsCount
    const nextReposted = !prevReposted
    const nextCount = nextReposted ? prevCount + 1 : Math.max(0, prevCount - 1)

    setRepostedByMe(nextReposted)
    setRepostsCount(nextCount)
    setBusy(true)
    if (onError) onError(null)

    if (onRepostInfoChange && nextReposted && currentUser) {
      onRepostInfoChange({
        reposts_count: nextCount,
        reposted_by_me: true,
        latest_repost_by: { _id: currentUser._id, nombre: currentUser.nombre }
      })
    }

    try {
      const response = nextReposted ? await repostPost(postId) : await unrepostPost(postId)
      if (response.data) {
        const finalCount = response.data.reposts_count ?? nextCount
        const finalByMe = Boolean(response.data.reposted_by_me)
        setRepostsCount(finalCount)
        setRepostedByMe(finalByMe)
        if (onRepostInfoChange) {
          onRepostInfoChange({
            reposts_count: finalCount,
            reposted_by_me: finalByMe,
            latest_repost_by: response.data.latest_repost_by ?? null
          })
        }
        if (!finalByMe && onUnreposted) {
          onUnreposted(postId)
        }
      }
    } catch (err) {
      setRepostedByMe(prevReposted)
      setRepostsCount(prevCount)
      if (onError) {
        onError(err.message || 'No se pudo actualizar el repost.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type='button'
      className={`post-card__action-pill${repostedByMe ? ' post-card__action-pill--reposted' : ''}`}
      onClick={handleToggle}
      disabled={busy}
      aria-pressed={repostedByMe}
      aria-label={repostedByMe ? 'Deshacer repost' : 'Repostear publicacion'}
    >
      <Repeat2 size={16} strokeWidth={2} />
      <span>{repostsCount}</span>
    </button>
  )
}
