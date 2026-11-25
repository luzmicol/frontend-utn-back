import { useState } from 'react'
import { Link } from 'react-router-dom'
import useForm from '../../hooks/useForm'
import useRequest from '../../hooks/useRequest'
import { register } from '../../services/authService'
import AuthLayout from '../../Components/AuthLayout/AuthLayout'
import Alert from '../../Components/Alert/Alert'
import { Form, FormField, FormButton } from '../../Components/Form/Form'

function RegisterScreen() {
  const initial_state = { name: '', email: '', password: '', confirmPassword: '' }
  const { formState, handleChangeInput } = useForm(initial_state)
  const { loading, response, error, sendRequest } = useRequest()
  const [validationError, setValidationError] = useState(null)

  function handleFieldChange(event) {
    if (validationError) setValidationError(null)
    handleChangeInput(event)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const name = formState.name.trim()
    const email = formState.email.trim()
    const password = formState.password
    const confirmPassword = formState.confirmPassword

    if (!name || !email || !password || !confirmPassword) {
      setValidationError('Completá todos los campos obligatorios para registrarte.')
      return
    }

    if (password.length < 8) {
      setValidationError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setValidationError('Las contraseñas no coinciden.')
      return
    }

    setValidationError(null)
    sendRequest(
      () => register(name, email, password)
    )
  }

  return (
    <AuthLayout
      title='Crear cuenta'
      footer={
        <span>
          ¿Ya tenés una cuenta? <Link to='/login'>Iniciar sesión</Link>
        </span>
      }
    >
      <Form onSubmit={handleSubmit}>
        <FormField
          label='Nombre'
          name='name'
          type='text'
          placeholder='Nombre'
          value={formState.name}
          onChange={handleFieldChange}
          required
        />
        <FormField
          label='Correo electrónico'
          name='email'
          type='email'
          placeholder='Correo electrónico'
          value={formState.email}
          onChange={handleFieldChange}
          required
        />
        <FormField
          label='Contraseña'
          name='password'
          type='password'
          placeholder='Contraseña'
          value={formState.password}
          onChange={handleFieldChange}
          required
        />
        <FormField
          label='Repetir contraseña'
          name='confirmPassword'
          type='password'
          placeholder='Repetir contraseña'
          value={formState.confirmPassword}
          onChange={handleFieldChange}
          required
        />
        <FormButton loading={loading}>Registrarse</FormButton>
        {validationError && <Alert variant='error'>{validationError}</Alert>}
        {!validationError && error && !loading && <Alert variant='error'>{error}</Alert>}
        {response && !loading && (
          <Alert variant='success'>
            Registro exitoso. Revisá tu correo electrónico para verificar tu cuenta.
          </Alert>
        )}
      </Form>
    </AuthLayout>
  )
}

export default RegisterScreen
