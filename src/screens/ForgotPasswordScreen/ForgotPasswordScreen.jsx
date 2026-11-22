import { useState } from 'react'
import { Link } from 'react-router-dom'
import useForm from '../../hooks/useForm'
import useRequest from '../../hooks/useRequest'
import { requestPasswordReset } from '../../services/authService'
import AuthLayout from '../../Components/AuthLayout/AuthLayout'
import Alert from '../../Components/Alert/Alert'
import { Form, FormField, FormButton } from '../../Components/Form/Form'

/*
Pantalla de recuperación de contraseña
Al enviar el email el backend manda un mail con un token para restablecer la
contraseña, solo si la cuenta existe y está activa. La respuesta es siempre la
misma para no revelar si el email está registrado.
*/

//Validamos el formato antes de mandar el request
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

//Traducción de los codigos que manda el backend
const MENSAJES_ERROR = {
  TOO_MANY_REQUESTS: 'Demasiados intentos. Esperá unos minutos y volvé a intentar.'
}

function ForgotPasswordScreen() {
  const initial_state = { email: '' }
  const { formState, handleChangeInput } = useForm(initial_state)
  const { loading, response, error, errorCode, sendRequest } = useRequest()
  const [clientError, setClientError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setClientError(null)

    const email = formState.email.trim()

    if (!EMAIL_REGEX.test(email)) {
      setClientError('Escribí un email válido.')
      return
    }

    sendRequest(() => requestPasswordReset(email))
  }

  //Si el backend mando un code lo traducimos; si no, usamos su mensaje
  const serverError = error ? (MENSAJES_ERROR[errorCode] ?? error) : null

  return (
    <AuthLayout
      title='Recuperar contraseña'
      subtitle='Escribí el email de tu cuenta y te enviamos un link para restablecerla'
      footer={
        <span>
          ¿Recordaste la contraseña? <Link to='/login'>Iniciar sesión</Link>
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
        <FormButton loading={loading}>Recuperar contraseña</FormButton>
        {clientError && !loading && <Alert variant='error'>{clientError}</Alert>}
        {serverError && !loading && <Alert variant='error'>{serverError}</Alert>}
        {response && !loading && (
          <Alert variant='success'>
            Si el email pertenece a una cuenta existente, te enviamos un mail
            con el link para restablecer tu contraseña. Revisá tu bandeja de
            entrada
          </Alert>
        )}
        {response && !loading && (
          <Link className='form__link' to='/login'>
            Ir a iniciar sesión
          </Link>
        )}
      </Form>
    </AuthLayout>
  )
}

export default ForgotPasswordScreen
