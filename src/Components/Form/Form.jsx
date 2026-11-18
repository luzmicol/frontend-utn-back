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
  return (
    <div className='form__field'>
      <label className='form__label' htmlFor={name}>
        {label}
      </label>
      <input
        className='form__input'
        name={name}
        id={name}
        type={type}
        value={value}
        onChange={onChange}
        {...inputProps}
      />
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
