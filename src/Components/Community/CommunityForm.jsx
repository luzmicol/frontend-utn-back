import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { createCommunity } from '../../services/communityService'
import Alert from '../Alert/Alert'
import './CommunityForm.css'

const MAX_NAME = 50
const MAX_DESC = 1000

export default function CommunityForm({ onCreated, onCancel }) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmedName = nombre.trim()
    const trimmedDesc = descripcion.trim()

    if (!trimmedName) {
      setError('El nombre de la comunidad es obligatorio.')
      return
    }

    if (trimmedName.length > MAX_NAME) {
      setError(`El nombre no puede superar los ${MAX_NAME} caracteres.`)
      return
    }

    if (trimmedDesc.length > MAX_DESC) {
      setError(`La descripcion no puede superar los ${MAX_DESC} caracteres.`)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await createCommunity(trimmedName, trimmedDesc)
      const created = response.data?.community
      setNombre('')
      setDescripcion('')
      if (created && onCreated) {
        onCreated(created)
      }
    } catch (err) {
      setError(err.message || 'No se pudo crear la comunidad.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className='community-form' onSubmit={handleSubmit}>
      <div className='community-form__header'>
        <h2 className='community-form__title'>Nueva comunidad</h2>
        <button
          type='button'
          className='community-form__close'
          onClick={onCancel}
          aria-label='Cerrar formulario'
          disabled={loading}
        >
          <X size={18} />
        </button>
      </div>

      <div className='community-form__field'>
        <label className='community-form__label' htmlFor='community-name'>
          Nombre
        </label>
        <input
          id='community-name'
          className='community-form__input'
          type='text'
          placeholder='Ej: Desarrollo Web'
          value={nombre}
          onChange={(e) => {
            setNombre(e.target.value)
            if (error) setError(null)
          }}
          maxLength={MAX_NAME}
          disabled={loading}
          required
        />
        <span className='community-form__counter'>
          {nombre.length} / {MAX_NAME}
        </span>
      </div>

      <div className='community-form__field'>
        <label className='community-form__label' htmlFor='community-desc'>
          Descripcion (opcional)
        </label>
        <textarea
          id='community-desc'
          className='community-form__input community-form__textarea'
          placeholder='¿De que trata esta comunidad?'
          value={descripcion}
          onChange={(e) => {
            setDescripcion(e.target.value)
            if (error) setError(null)
          }}
          maxLength={MAX_DESC}
          rows={3}
          disabled={loading}
        />
        <span className='community-form__counter'>
          {descripcion.length} / {MAX_DESC}
        </span>
      </div>

      {error && <Alert variant='error'>{error}</Alert>}

      <div className='community-form__actions'>
        <button
          type='button'
          className='community-form__btn community-form__btn--ghost'
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type='submit'
          className='community-form__btn community-form__btn--primary'
          disabled={loading || !nombre.trim()}
        >
          <Plus size={16} />
          <span>{loading ? 'Creando...' : 'Crear comunidad'}</span>
        </button>
      </div>
    </form>
  )
}
