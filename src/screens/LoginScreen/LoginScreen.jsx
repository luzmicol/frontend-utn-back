import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useForm from '../../hooks/useForm'
import useRequest from '../../hooks/useRequest'
import { useAuth } from '../../context/AuthContext'
import AuthLayout from '../../Components/AuthLayout/AuthLayout'
import Alert from '../../Components/Alert/Alert'
import { Form, FormField, FormButton } from '../../Components/Form/Form'

function LoginScreen() {
  const initial_state = { email: '', password: '' }
  const { formState, handleChangeInput } = useForm(initial_state)
  const { loading, response, error, sendRequest } = useRequest()
  const { login } = useAuth()
  const [validationError, setValidationError] = useState(null)
  
  const navigate = useNavigate()

  function handleFieldChange(event) {
    if (validationError) setValidationError(null)
    handleChangeInput(event)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const email = formState.email.trim()
    const password = formState.password

    if (!email || !password) {
      setValidationError('Completa tu email y contraseña para iniciar sesion.')
      return
    }

    setValidationError(null)
    sendRequest(
      () => login(email, password)
    )
  }

  useEffect(() => {
    if (response && !loading) {
      navigate('/')
    }
  }, [response, loading, navigate])

  return (
    <AuthLayout
      title='Iniciar sesion'
      footer={
        <span>
          ¿No tienes una cuenta? <Link to='/register'>Registrate</Link>
          <br />
          ¿No recibiste el email de verificacion? <Link to='/resend-email-verification'>Reenviar</Link>
        </span>
      }
    >
      <Form onSubmit={handleSubmit}>
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
        <FormButton loading={loading}>Iniciar sesion</FormButton>
        <Link className='form__link' to='/forgot-password'>
          Olvide mi contrasena
        </Link>
        {validationError && <Alert variant='error'>{validationError}</Alert>}
        {!validationError && error && !loading && <Alert variant='error'>{error}</Alert>}
        {response && !loading && (
          <Alert variant='success'>Inicio de sesion exitoso</Alert>
        )}
      </Form>
    </AuthLayout>
  )
}

export default LoginScreen