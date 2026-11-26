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
      setValidationError('Completá tu correo electrónico y contraseña para iniciar sesión.')
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
      title='Iniciar sesión'
      footer={
        <span>
          ¿No tenés una cuenta? <Link to='/register'>Registrate</Link>
          <br />
          ¿No recibiste el correo de verificación? <Link to='/resend-email-verification'>Reenviar</Link>
        </span>
      }
    >
      <Form onSubmit={handleSubmit}>
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
        <FormButton loading={loading}>Iniciar sesión</FormButton>
        <Link className='form__link' to='/forgot-password'>
          Olvidé mi contraseña
        </Link>
        {validationError && <Alert variant='error'>{validationError}</Alert>}
        {!validationError && error && !loading && (
          <Alert variant='error'>
            {error}
            {/verific/i.test(error) && (
              <>
                {' '}
                <Link to='/resend-email-verification'>Reenviar correo de verificación</Link>.
              </>
            )}
          </Alert>
        )}
        {response && !loading && (
          <Alert variant='success'>Inicio de sesión exitoso</Alert>
        )}
      </Form>
    </AuthLayout>
  )
}

export default LoginScreen