import { useState } from 'react'
import { Link } from 'react-router-dom'
import useForm from '../../hooks/useForm'
import useRequest from '../../hooks/useRequest'
import { register } from '../../services/authService'
import AuthLayout from '../../Components/AuthLayout/AuthLayout'
import Alert from '../../Components/Alert/Alert'
import { Form, FormField, FormButton } from '../../Components/Form/Form'

function RegisterScreen() {
  const initial_state = { name: '', email: '', password: '' }
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

    if (!name || !email || !password) {
      setValidationError('Completa todos los campos obligatorios para registrarte.')
      return
    }

    if (password.length < 8) {
      setValidationError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setValidationError(null)
    sendRequest(
      () => register(name, email, password)
    )
  }

  return (
    <AuthLayout
      title='Registro de usuario'
      footer={
        <span>
          ¿Ya tienes cuenta? <Link to='/login'>Inicia sesion</Link>
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
          label='Email'
          name='email'
          type='email'
          placeholder='Email'
          value={formState.email}
          onChange={handleFieldChange}
          required
        />
        <FormField
          label='Password'
          name='password'
          type='password'
          placeholder='Password'
          value={formState.password}
          onChange={handleFieldChange}
          required
        />
        <FormButton loading={loading}>Registrarse</FormButton>
        {validationError && <Alert variant='error'>{validationError}</Alert>}
        {!validationError && error && !loading && <Alert variant='error'>{error}</Alert>}
        {response && !loading && (
          <Alert variant='success'>
            Registro exitoso, revisa tu correo electronico para verificar la
            cuenta
          </Alert>
        )}
      </Form>
    </AuthLayout>
  )
}

export default RegisterScreen
