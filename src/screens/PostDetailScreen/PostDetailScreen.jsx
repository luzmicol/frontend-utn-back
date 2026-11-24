import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import { getPostById } from '../../services/postService'
import PostCard from '../../Components/Post/PostCard'
import Alert from '../../Components/Alert/Alert'
import './PostDetailScreen.css'

export default function PostDetailScreen() {
  const { post_id } = useParams()
  const navigate = useNavigate()

  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!post_id) return
    let isMounted = true

    async function loadPost() {
      try {
        setLoading(true)
        setError(null)
        setNotFound(false)
        const res = await getPostById(post_id)
        if (!isMounted) return
        const found = res.data?.post ?? null
        if (!found) {
          setNotFound(true)
          setPost(null)
        } else {
          setPost(found)
        }
      } catch (err) {
        if (!isMounted) return
        if (err.status === 404 || err.status === 400) {
          setNotFound(true)
          setPost(null)
        } else {
          setError(err.message || 'No se pudo cargar la publicacion.')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadPost()

    return () => {
      isMounted = false
    }
  }, [post_id])

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  return (
    <section className='loop-page'>
      <div className='post-detail__nav'>
        <button type='button' className='post-detail__back' onClick={handleBack}>
          <ArrowLeft size={16} />
          <span>Volver</span>
        </button>
      </div>

      {loading && (
        <div className='loop-empty'>
          <p className='loop-empty__text'>Cargando publicacion...</p>
        </div>
      )}

      {!loading && notFound && (
        <div className='loop-empty'>
          <span className='loop-empty__icon' aria-hidden='true'>
            <FileText size={22} />
          </span>
          <h1 className='loop-empty__title'>Publicacion no encontrada</h1>
          <p className='loop-empty__text'>
            Es posible que esta publicacion haya sido eliminada o que el enlace no sea valido.
          </p>
          <Link to='/' className='loop-empty__link'>
            Volver al Feed
          </Link>
        </div>
      )}

      {!loading && !notFound && error && <Alert variant='error'>{error}</Alert>}

      {!loading && !notFound && !error && post && (
        <PostCard
          post={post}
          defaultShowComments
          onPostUpdated={(updated) => setPost(updated)}
          onPostDeleted={() => navigate('/', { replace: true })}
        />
      )}
    </section>
  )
}
