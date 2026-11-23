import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home } from 'lucide-react'
import { getPosts } from '../../services/postService'
import PostComposer from '../../Components/Post/PostComposer'
import PostCard from '../../Components/Post/PostCard'
import Alert from '../../Components/Alert/Alert'
import './FeedScreen.css'

const PAGE_LIMIT = 20

function mergePostsUnique(existing, incoming) {
  const seen = new Set(existing.map((p) => p._id))
  const merged = [...existing]
  for (const post of incoming) {
    if (!seen.has(post._id)) {
      seen.add(post._id)
      merged.push(post)
    }
  }
  return merged
}

export default function FeedScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [highlightedPostId, setHighlightedPostId] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function loadFeed() {
      try {
        setLoading(true)
        setError(null)
        const response = await getPosts({ page: 1, limit: PAGE_LIMIT })
        if (isMounted) {
          setPosts(response.data?.posts ?? [])
          setPage(1)
          setHasMore(Boolean(response.data?.pagination?.has_more))
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'No se pudieron cargar las publicaciones.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadFeed()

    return () => {
      isMounted = false
    }
  }, [])

  async function handleLoadMore() {
    if (loadingMore || !hasMore) return

    try {
      setLoadingMore(true)
      const nextPage = page + 1
      const response = await getPosts({ page: nextPage, limit: PAGE_LIMIT })
      const incoming = response.data?.posts ?? []
      setPosts((prev) => mergePostsUnique(prev, incoming))
      setPage(nextPage)
      setHasMore(Boolean(response.data?.pagination?.has_more))
    } catch (err) {
      setError(err.message || 'No se pudieron cargar mas publicaciones.')
    } finally {
      setLoadingMore(false)
    }
  }

  // Scroll y resaltado temporal al llegar desde una notificacion
  useEffect(() => {
    const targetPostId = location.state?.highlightPostId
    if (loading || !targetPostId) return

    let clearTimer = null
    const frame = requestAnimationFrame(() => {
      const element = document.getElementById(`post-${targetPostId}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setHighlightedPostId(targetPostId)
        clearTimer = setTimeout(() => {
          setHighlightedPostId((prev) => (prev === targetPostId ? null : prev))
        }, 2600)
      }
    })

    const nextState = location.state?.focusComposer
      ? { focusComposer: location.state.focusComposer }
      : null
    navigate(location.pathname, { replace: true, state: nextState })

    return () => {
      cancelAnimationFrame(frame)
      if (clearTimer) clearTimeout(clearTimer)
    }
  }, [loading, location.pathname, location.state, navigate, posts.length])

  function handlePostCreated(newPost) {
    setPosts((prev) => [newPost, ...prev])
  }

  function handlePostUpdated(updatedPost) {
    setPosts((prev) =>
      prev.map((item) => (item._id === updatedPost._id ? updatedPost : item))
    )
  }

  function handlePostDeleted(deletedPostId) {
    setPosts((prev) => prev.filter((item) => item._id !== deletedPostId))
  }

  return (
    <section className='loop-page'>
      <header className='loop-page__header'>
        <h1 className='loop-page__title'>Feed</h1>
        <p className='loop-page__subtitle'>Publicaciones recientes de LOOP</p>
      </header>

      <PostComposer
        onPostCreated={handlePostCreated}
        autoFocusTrigger={location.state?.focusComposer}
      />

      {loading && (
        <div className='loop-empty'>
          <p className='loop-empty__text'>Cargando publicaciones...</p>
        </div>
      )}

      {!loading && error && <Alert variant='error'>{error}</Alert>}

      {!loading && !error && posts.length === 0 && (
        <div className='loop-empty'>
          <span className='loop-empty__icon' aria-hidden='true'>
            <Home size={22} />
          </span>
          <h2 className='loop-empty__title'>Todavia no hay publicaciones</h2>
          <p className='loop-empty__text'>
            Se la primera persona en compartir algo en LOOP.
          </p>
        </div>
      )}

      {!loading && !error && posts.length > 0 && (
        <div className='loop-page'>
          {posts.map((post) => (
            <div
              key={post._id}
              id={`post-${post._id}`}
              className={
                highlightedPostId === post._id ? 'feed-post-highlight' : undefined
              }
            >
              <PostCard
                post={post}
                onPostUpdated={handlePostUpdated}
                onPostDeleted={handlePostDeleted}
              />
            </div>
          ))}

          {hasMore && (
            <div className='loop-empty'>
              <button
                type='button'
                className='post-card__action-pill'
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Cargando...' : 'Cargar mas publicaciones'}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
