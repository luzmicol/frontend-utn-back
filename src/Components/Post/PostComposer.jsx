import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { createPost } from '../../services/postService'
import Alert from '../Alert/Alert'
import './PostComposer.css'

const MAX_LENGTH = 2000

export default function PostComposer({
  onPostCreated,
  communityId = null,
  placeholder = '¿Que esta pasando en LOOP?',
  autoFocusTrigger = null
}) {
  const textareaRef = useRef(null)
  const [contenido, setContenido] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (autoFocusTrigger && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [autoFocusTrigger])

  const trimmed = contenido.trim()
  const remaining = MAX_LENGTH - contenido.length

  async function handleSubmit(event) {
    event.preventDefault()

    if (!trimmed) {
      setError('Escribi algo antes de publicar.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await createPost(trimmed, communityId)
      const created = response.data?.post
      setContenido('')
      if (created && onPostCreated) {
        onPostCreated(created)
      }
    } catch (err) {
      setError(err.message || 'No se pudo crear la publicacion.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className='post-composer' onSubmit={handleSubmit}>
      <textarea
        ref={textareaRef}
        className='post-composer__textarea'
        placeholder={placeholder}
        value={contenido}
        onChange={(e) => {
          setContenido(e.target.value)
          if (error) setError(null)
        }}
        maxLength={MAX_LENGTH}
        rows={3}
        disabled={loading}
      />

      {error && <Alert variant='error'>{error}</Alert>}

      <div className='post-composer__footer'>
        <span className={`post-composer__counter${remaining < 100 ? ' post-composer__counter--warn' : ''}`}>
          {contenido.length} / {MAX_LENGTH}
        </span>

        <button
          type='submit'
          className='post-composer__submit'
          disabled={loading || !trimmed}
        >
          <Send size={16} strokeWidth={2} />
          <span>{loading ? 'Publicando...' : 'Publicar'}</span>
        </button>
      </div>
    </form>
  )
}
