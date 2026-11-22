import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import useForm from '../../hooks/useForm'
import useRequest from '../../hooks/useRequest'
import { resetPassword } from '../../services/authService'
import AuthLayout from '../../Components/AuthLayout/AuthLayout'
import Alert from '../../Components/Alert/Alert'
import { Form, FormField, FormButton } from '../../Components/Form/Form'

/*
Pantalla de restablecimiento de contraseña
El link del mail lleva a /reset-password?reset_token=...
Antes de enviar validamos la longitud y la coincidencia. Si el backend rechaza
el token mostramos un mensaje en español y la opción de pedir un link nuevo.
*/

//Traducción de los codigos que manda el backend
const MENSAJES_ERROR = {
  RESET_TOKEN_EXPIRED:
    'El link de recuperación expiró. Pedí uno nuevo desde la pantalla de Recuperar contraseña.',
  RESET_TOKEN_USED:
    'Este link ya se usó o fue reemplazado por uno nuevo. Pedí un link nuevo para continuar.',
  RESET_TOKEN_INVALID:
    'El link de recuperación no es válido. Pedí uno nuevo desde la pantalla de Recuperar contraseña.',
  PASSWORD_TOO_SHORT: 'La contraseña debe tener al menos 8 caracteres.',
  PASSWORD_SAME_AS_CURRENT: 'La contraseña nueva tiene que ser distinta de la actual.',
  TOO_MANY_REQUESTS: 'Demasiados intentos. Esperá unos minutos y volvé a intentar.'
}

//Ante estos errores la solución es pedir un link nuevo
const ERRORES_DE_TOKEN = ['RESET_TOKEN_EXPIRED', 'RESET_TOKEN_USED', 'RESET_TOKEN_INVALID']

function ResetPasswordScreen() {
  const [searchParams] = useSearchParams()
  const reset_token = searchParams.get('reset_token')
  const navigate = useNavigate()

  const initial_state = { password: '', confirmation: '' }
  const { formState, handleChangeInput } = useForm(initial_state)
  const { loading, response, error, errorCode, sendRequest } = useRequest()
  const [clientError, setClientError] = useState(null)

  //Con la contraseña cambiada mostramos la confirmación y llevamos a /login
  useEffect(() => {
    if (response && !loading) {
      const timer = setTimeout(() => navigate('/login'), 2500)
      return () => clearTimeout(timer)
    }
  }, [response, loading, navigate])

  async function handleSubmit(event) {
    event.preventDefault()
    setClientError(null)

    if (!reset_token) {
      setClientError(
        'Falta el token de restablecimiento. Pedí un link nuevo desde la pantalla de Recuperar contraseña.'
      )
      return
    }

    if (formState.password.length < 8) {
      setClientError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (formState.password !== formState.confirmation) {
      setClientError('Las contraseñas no coinciden.')
      return
    }

    sendRequest(() => resetPassword(reset_token, formState.password))
  }

  //Si el backend mando un code lo traducimos; si no, usamos su mensaje
  const serverError = error ? (MENSAJES_ERROR[errorCode] ?? error) : null
  const mostrar_link_nuevo = ERRORES_DE_TOKEN.includes(errorCode)

  return (
    <AuthLayout
      title='Restablecer contraseña'
      subtitle='Elegí una nueva contraseña para tu cuenta'
      footer={
        <span>
          ¿Recordaste la contraseña? <Link to='/login'>Iniciar sesión</Link>
        </span>
      }
    >
      <Form onSubmit={handleSubmit}>
        <FormField
          label='Nueva contraseña'
          name='password'
          type='password'
          placeholder='Nueva contraseña'
          value={formState.password}
          onChange={handleChangeInput}
        />
        <FormField
          label='Confirmar contraseña'
          name='confirmation'
          type='password'
          placeholder='Confirmar contraseña'
          value={formState.confirmation}
          onChange={handleChangeInput}
        />
        <FormButton loading={loading}>Restablecer contraseña</FormButton>
        {clientError && !loading && <Alert variant='error'>{clientError}</Alert>}
        {serverError && !loading && <Alert variant='error'>{serverError}</Alert>}
        {mostrar_link_nuevo && !loading && (
          <Link className='form__link' to='/forgot-password'>
            Solicitar un link nuevo
          </Link>
        )}
        {response && !loading && (
          <Alert variant='success'>
            Contraseña restablecida. Te redirigimos para iniciar sesión con tu
            nueva contraseña
          </Alert>
        )}
      </Form>
    </AuthLayout>
  )
}

export default ResetPasswordScreen
