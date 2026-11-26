import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home } from 'lucide-react'
import { getPosts } from '../../services/postService'
import { fetchWithCache, getCachedData, invalidateCache, setCachedData } from '../../utils/memoryCache'
import PostComposer from '../../Components/Post/PostComposer'
import PostCard from '../../Components/Post/PostCard'
import FeedSuggestionsSidebar from '../../Components/Feed/FeedSuggestionsSidebar'
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

const FEED_CACHE_KEY = 'feed:posts'

export default function FeedScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const initialCache = getCachedData(FEED_CACHE_KEY)?.data
  const [posts, setPosts] = useState(() => initialCache?.posts ?? [])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(() => Boolean(initialCache?.hasMore))
  const [loading, setLoading] = useState(() => !initialCache)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [feedActionError, setFeedActionError] = useState(null)
  const [highlightedPostId, setHighlightedPostId] = useState(null)
  const refreshingRef = useRef(false)

  useEffect(() => {
    let isMounted = true

    async function handleRefreshFeed() {
      if (refreshingRef.current) return
      refreshingRef.current = true
      invalidateCache(FEED_CACHE_KEY)
      setError(null)
      setFeedActionError(null)

      try {
        const res = await getPosts({ page: 1, limit: PAGE_LIMIT, fresh: true })
        if (!isMounted) return
        const nextPosts = res.data?.posts ?? []
        const nextHasMore = Boolean(res.data?.pagination?.has_more)
        setPosts(nextPosts)
        setPage(1)
        setHasMore(nextHasMore)
        setCachedData(FEED_CACHE_KEY, { posts: nextPosts, hasMore: nextHasMore })
      } catch (err) {
        if (isMounted) {
          setFeedActionError(
            err.message || 'No se pudo actualizar el Feed. Intentá nuevamente.'
          )
        }
      } finally {
        refreshingRef.current = false
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && !getCachedData(FEED_CACHE_KEY)?.isFresh) {
        handleRefreshFeed()
      }
    }

    window.addEventListener('loop:feed-refresh', handleRefreshFeed)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      isMounted = false
      window.removeEventListener('loop:feed-refresh', handleRefreshFeed)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const hasCached = Boolean(getCachedData(FEED_CACHE_KEY)?.data)

    async function loadFeed() {
      try {
        if (!hasCached) {
          setLoading(true)
        }
        setError(null)
        const response = await fetchWithCache(FEED_CACHE_KEY, async () => {
          const res = await getPosts({ page: 1, limit: PAGE_LIMIT })
          return {
            posts: res.data?.posts ?? [],
            hasMore: Boolean(res.data?.pagination?.has_more)
          }
        })
        if (isMounted) {
          setPosts(response.posts)
          setPage(1)
          setHasMore(response.hasMore)
        }
      } catch (err) {
        if (isMounted && !hasCached) {
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
      setFeedActionError(null)
      const nextPage = page + 1
      const response = await getPosts({ page: nextPage, limit: PAGE_LIMIT })
      const incoming = response.data?.posts ?? []
      setPosts((prev) => mergePostsUnique(prev, incoming))
      setPage(nextPage)
      setHasMore(Boolean(response.data?.pagination?.has_more))
    } catch (err) {
      setFeedActionError(
        err.message || 'No se pudieron cargar más publicaciones. Intentá nuevamente.'
      )
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
    setPosts((prev) => {
      const next = [newPost, ...prev]
      setCachedData(FEED_CACHE_KEY, { posts: next, hasMore })
      return next
    })
  }

  function handlePostUpdated(updatedPost) {
    setPosts((prev) => {
      const next = prev.map((item) => (item._id === updatedPost._id ? updatedPost : item))
      setCachedData(FEED_CACHE_KEY, { posts: next, hasMore })
      return next
    })
  }

  function handlePostDeleted(deletedPostId) {
    setPosts((prev) => {
      const next = prev.filter((item) => item._id !== deletedPostId)
      setCachedData(FEED_CACHE_KEY, { posts: next, hasMore })
      return next
    })
  }

  return (
    <div className='feed-layout'>
      <section className='loop-page feed-layout__main'>
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

      {!loading && !error && feedActionError && (
        <Alert variant='error'>{feedActionError}</Alert>
      )}

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
          {posts.map((post, idx) => (
            <div
              key={post._id}
              id={`post-${post._id}`}
              className={
                highlightedPostId === post._id ? 'feed-post-highlight' : undefined
              }
            >
              <PostCard
                post={post}
                viewerPosts={posts}
                viewerIndex={idx}
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
                {loadingMore ? 'Cargando...' : 'Cargar más publicaciones'}
              </button>
            </div>
          )}
        </div>
      )}
      </section>

      <FeedSuggestionsSidebar />
    </div>
  )
}
