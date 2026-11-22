import { useEffect } from 'react'
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
  
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    sendRequest(
      () => login(formState.email, formState.password)
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
          onChange={handleChangeInput}
        />
        <FormField
          label='Password'
          name='password'
          type='password'
          placeholder='Password'
          value={formState.password}
          onChange={handleChangeInput}
        />
        <FormButton loading={loading}>Iniciar sesion</FormButton>
        <Link className='form__link' to='/forgot-password'>
          Olvide mi contrasena
        </Link>
        {error && !loading && <Alert variant='error'>{error}</Alert>}
        {response && !loading && (
          <Alert variant='success'>Inicio de sesion exitoso</Alert>
        )}
      </Form>
    </AuthLayout>
  )
}

export default LoginScreen