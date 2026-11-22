import { useEffect, useState } from 'react'
import { Send, Trash2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getPostComments, createComment, deleteComment } from '../../services/postService'
import Alert from '../Alert/Alert'
import './CommentSection.css'

const MAX_COMMENT_LENGTH = 1000

function formatCommentDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function CommentSection({ postId, onCountChange }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [contenido, setContenido] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function loadComments() {
      try {
        setLoading(true)
        setError(null)
        const response = await getPostComments(postId)
        const list = response.data?.comments ?? []
        if (isMounted) {
          setComments(list)
          if (onCountChange) onCountChange(list.length)
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'No se pudieron cargar los comentarios.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadComments()

    return () => {
      isMounted = false
    }
  }, [postId, onCountChange])

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmed = contenido.trim()
    if (!trimmed) {
      setSubmitError('Escribi un comentario antes de enviar.')
      return
    }

    try {
      setSubmitting(true)
      setSubmitError(null)
      const response = await createComment(postId, trimmed)
      const created = response.data?.comment
      setContenido('')
      if (created) {
        setComments((prev) => {
          const next = [...prev, created]
          if (onCountChange) onCountChange(next.length)
          return next
        })
      }
    } catch (err) {
      setSubmitError(err.message || 'No se pudo publicar el comentario.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(commentId) {
    try {
      setDeletingId(commentId)
      setSubmitError(null)
      await deleteComment(postId, commentId)
      setComments((prev) => {
        const next = prev.filter((c) => c._id !== commentId)
        if (onCountChange) onCountChange(next.length)
        return next
      })
    } catch (err) {
      setSubmitError(err.message || 'No se pudo eliminar el comentario.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className='comment-section'>
      {loading && <p className='comment-section__status'>Cargando comentarios...</p>}

      {!loading && error && <Alert variant='error'>{error}</Alert>}

      {!loading && !error && comments.length === 0 && (
        <p className='comment-section__status'>Todavia no hay comentarios.</p>
      )}

      {!loading && !error && comments.length > 0 && (
        <ul className='comment-section__list'>
          {comments.map((comment) => {
            const isOwner = Boolean(user?._id && comment.fk_id_usuario?._id === user._id)
            return (
              <li key={comment._id} className='comment-item'>
                <div className='comment-item__header'>
                  <div className='comment-item__meta'>
                    <span className='comment-item__author'>
                      {comment.fk_id_usuario?.nombre || 'Usuario'}
                    </span>
                    <time className='comment-item__date' dateTime={comment.fecha_creacion}>
                      {formatCommentDate(comment.fecha_creacion)}
                    </time>
                  </div>

                  {isOwner && (
                    <button
                      type='button'
                      className='comment-item__delete'
                      onClick={() => handleDelete(comment._id)}
                      disabled={deletingId === comment._id}
                      aria-label='Eliminar comentario'
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <p className='comment-item__content'>{comment.contenido}</p>
              </li>
            )
          })}
        </ul>
      )}

      <form className='comment-form' onSubmit={handleSubmit}>
        <textarea
          className='comment-form__input'
          placeholder='Escribi un comentario...'
          value={contenido}
          onChange={(e) => {
            setContenido(e.target.value)
            if (submitError) setSubmitError(null)
          }}
          maxLength={MAX_COMMENT_LENGTH}
          rows={2}
          disabled={submitting}
        />

        {submitError && <Alert variant='error'>{submitError}</Alert>}

        <div className='comment-form__footer'>
          <span className='comment-form__counter'>
            {contenido.length} / {MAX_COMMENT_LENGTH}
          </span>
          <button
            type='submit'
            className='comment-form__submit'
            disabled={submitting || !contenido.trim()}
          >
            <Send size={14} />
            <span>{submitting ? 'Enviando...' : 'Comentar'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
