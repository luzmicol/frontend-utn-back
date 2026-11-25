import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import './Form.css'

/* Piezas de formulario reutilizables (Register, Login, y futuros formularios).
   Los estilos viven en Form.css para usarlos desde cualquier pantalla. */

export function Form({ onSubmit, children }) {
  return (
    <form className='form' onSubmit={onSubmit}>
      {children}
    </form>
  )
}

export function FormField({ label, type = 'text', name, value, onChange, ...inputProps }) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <div className='form__field'>
      <label className='form__label' htmlFor={name}>
        {label}
      </label>
      <div className={isPassword ? 'form__input-wrap' : undefined}>
        <input
          className={`form__input${isPassword ? ' form__input--password' : ''}`}
          name={name}
          id={name}
          type={resolvedType}
          value={value}
          onChange={onChange}
          {...inputProps}
        />
        {isPassword && (
          <button
            type='button'
            className='form__password-toggle'
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  )
}

/* Area de texto para campos largos (ej: descripcion del workspace).
   Cuando recibe maxLength muestra cuantos caracteres quedan disponibles. */
export function FormTextArea({ label, name, value, onChange, maxLength, ...textAreaProps }) {
  const remaining_characters = maxLength != null ? maxLength - value.length : null

  return (
    <div className='form__field'>
      <label className='form__label' htmlFor={name}>
        {label}
      </label>
      <textarea
        className='form__input form__textarea'
        name={name}
        id={name}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        {...textAreaProps}
      />
      {remaining_characters != null && (
        <span className='form__char-count'>
          {remaining_characters} caracteres restantes
        </span>
      )}
    </div>
  )
}

export function FormButton({ loading, loadingText = 'Cargando...', children }) {
  return (
    <button className='form__button' type='submit' disabled={loading}>
      {loading ? loadingText : children}
    </button>
  )
}
