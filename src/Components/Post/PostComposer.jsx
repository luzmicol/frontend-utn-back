import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Send, X } from 'lucide-react'
import { createPost } from '../../services/postService'
import { preparePostImageFile } from '../../utils/imageOptimizer'
import Alert from '../Alert/Alert'
import MentionTextarea from '../UI/MentionTextarea'
import EmojiPicker from '../UI/EmojiPicker'
import { insertEmojiAtCursor } from '../../utils/emojiUtils'
import './PostComposer.css'

const MAX_LENGTH = 2000
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_ORIGINAL_BYTES = 15 * 1024 * 1024

export default function PostComposer({
  onPostCreated,
  communityId = null,
  placeholder = '¿Que esta pasando en LOOP?',
  autoFocusTrigger = null
}) {
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const [contenido, setContenido] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (autoFocusTrigger && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [autoFocusTrigger])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const trimmed = contenido.trim()
  const remaining = MAX_LENGTH - contenido.length
  const canSubmit = Boolean(trimmed || selectedFile)

  function handleFileChange(event) {
    const file = event.target.files?.[0]
    setError(null)
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Formato no permitido. Usa JPG, PNG o WebP.')
      event.target.value = ''
      return
    }

    if (file.size > MAX_ORIGINAL_BYTES) {
      setError('La imagen original no puede superar los 15 MB.')
      event.target.value = ''
      return
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    event.target.value = ''
  }

  function handleRemoveImage() {
    setSelectedFile(null)
    setPreviewUrl('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!canSubmit) {
      setError('Escribi un texto o adjunta una imagen antes de publicar.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      let optimizedFile = null
      if (selectedFile) {
        optimizedFile = await preparePostImageFile(selectedFile)
      }
      const response = await createPost(trimmed, communityId, optimizedFile)
      const created = response.data?.post
      setContenido('')
      handleRemoveImage()
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
      <MentionTextarea
        textareaRef={textareaRef}
        className='post-composer__textarea'
        placeholder={placeholder}
        value={contenido}
        onChange={(nextVal) => {
          setContenido(nextVal)
          if (error) setError(null)
        }}
        maxLength={MAX_LENGTH}
        rows={3}
        disabled={loading}
      />

      {previewUrl && (
        <div className='post-composer__preview'>
          <img src={previewUrl} alt='Vista previa' className='post-composer__preview-img' />
          <button
            type='button'
            className='post-composer__preview-remove'
            onClick={handleRemoveImage}
            disabled={loading}
            aria-label='Quitar imagen'
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && <Alert variant='error'>{error}</Alert>}

      <div className='post-composer__footer'>
        <div className='post-composer__left-tools'>
          <label className='post-composer__image-btn'>
            <ImagePlus size={16} strokeWidth={2} />
            <span>{selectedFile ? 'Cambiar imagen' : 'Imagen'}</span>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/jpeg,image/png,image/webp'
              onChange={handleFileChange}
              disabled={loading}
              hidden
            />
          </label>

          <EmojiPicker
            placement='bottom'
            align='left'
            disabled={loading}
            onSelect={(emoji) => {
              insertEmojiAtCursor(textareaRef, contenido, emoji, MAX_LENGTH, (nextVal) => {
                setContenido(nextVal)
                if (error) setError(null)
              })
            }}
          />

          <span className={`post-composer__counter${remaining < 100 ? ' post-composer__counter--warn' : ''}`}>
            {contenido.length} / {MAX_LENGTH}
          </span>
        </div>

        <button
          type='submit'
          className='post-composer__submit'
          disabled={loading || !canSubmit}
        >
          <Send size={16} strokeWidth={2} />
          <span>{loading ? 'Publicando...' : 'Publicar'}</span>
        </button>
      </div>
    </form>
  )
}
