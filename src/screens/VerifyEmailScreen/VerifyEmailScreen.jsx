import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import useRequest from '../../hooks/useRequest'
import { verifyEmail } from '../../services/authService'
import AuthLayout from '../../Components/AuthLayout/AuthLayout'
import Alert from '../../Components/Alert/Alert'

function VerifyEmailScreen() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { loading, response, error, sendRequest } = useRequest()

  const verification_token = searchParams.get('verification_token')

  //Al montar la pantalla enviamos la consulta junto al token para verificar el email
  useEffect(() => {
    if (verification_token) {
      sendRequest(() => verifyEmail(verification_token))
    }
    // sendRequest cambia de identidad en cada render, no va en las dependencias
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verification_token])

  //Si se verifico correctamente redireccionamos a /login despues de 3 segundos
  useEffect(() => {
    if (response && !loading) {
      const timer = setTimeout(() => navigate('/login'), 3000)
      return () => clearTimeout(timer)
    }
  }, [response, loading, navigate])

  //Mensaje que indica en que estado esta la verificacion
  const status_message = loading
    ? 'Estamos verificando tu cuenta...'
    : response
      ? 'Tu email fue verificado. Te estamos redirigiendo a iniciar sesion...'
      : verification_token
        ? 'No se pudo verificar tu email.'
        : 'Falta el token de verificacion en la URL.'

  return (
    <AuthLayout
      title='Verificacion de email'
      subtitle={status_message}
      footer={
        <span>
          ¿Ya verificaste tu cuenta? <Link to='/login'>Inicia sesion</Link>
        </span>
      }
    >
      {error && !loading && <Alert variant='error'>{error}</Alert>}
      {!verification_token && (
        <Alert variant='error'>
          No se encontro el token de verificacion en la URL
        </Alert>
      )}
      {response && !loading && (
        <Alert variant='success'>Tu email fue verificado exitosamente</Alert>
      )}
    </AuthLayout>
  )
}

export default VerifyEmailScreen
