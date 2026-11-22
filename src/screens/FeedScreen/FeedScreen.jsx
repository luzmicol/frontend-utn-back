import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Home } from 'lucide-react'
import { getPosts } from '../../services/postService'
import PostComposer from '../../Components/Post/PostComposer'
import PostCard from '../../Components/Post/PostCard'
import Alert from '../../Components/Alert/Alert'

export default function FeedScreen() {
  const location = useLocation()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function loadFeed() {
      try {
        setLoading(true)
        setError(null)
        const response = await getPosts()
        if (isMounted) {
          setPosts(response.data?.posts ?? [])
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
            <PostCard
              key={post._id}
              post={post}
              onPostUpdated={handlePostUpdated}
              onPostDeleted={handlePostDeleted}
            />
          ))}
        </div>
      )}
    </section>
  )
}
