import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import useForm from '../../hooks/useForm'
import useRequest from '../../hooks/useRequest'
import { resetPassword } from '../../services/authService'
import AuthLayout from '../../Components/AuthLayout/AuthLayout'
import Alert from '../../Components/Alert/Alert'
import { Form, FormField, FormButton } from '../../Components/Form/Form'

/*
Pantalla de restablecimiento de contrasena
El link del mail lleva a /reset-password?reset_token=...
Validamos que ambas contrasenas coincidan y enviamos el token
junto a la nueva contrasena al backend
*/
function ResetPasswordScreen() {
  const [searchParams] = useSearchParams()
  const reset_token = searchParams.get('reset_token')

  const initial_state = { password: '', confirmation: '' }
  const { formState, handleChangeInput } = useForm(initial_state)
  const { loading, response, error, sendRequest } = useRequest()
  const [clientError, setClientError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setClientError(null)

    if (!reset_token) {
      setClientError(
        'Falta el token de restablecimiento. Pedis un mail nuevo desde la pantalla de Recuperar contrasena'
      )
      return
    }

    if (formState.password !== formState.confirmation) {
      setClientError('Las contrasenas no coinciden')
      return
    }

    sendRequest(
      () => resetPassword(reset_token, formState.password)
    )
  }

  return (
    <AuthLayout
      title='Restablecer contrasena'
      subtitle='Elegi una nueva contrasena para tu cuenta'
      footer={
        <span>
          Recordaste la contrasena? <Link to='/login'>Iniciar sesion</Link>
        </span>
      }
    >
      <Form onSubmit={handleSubmit}>
        <FormField
          label='Nueva contrasena'
          name='password'
          type='password'
          placeholder='Nueva contrasena'
          value={formState.password}
          onChange={handleChangeInput}
        />
        <FormField
          label='Confirmar contrasena'
          name='confirmation'
          type='password'
          placeholder='Confirmar contrasena'
          value={formState.confirmation}
          onChange={handleChangeInput}
        />
        <FormButton loading={loading}>Restablecer contrasena</FormButton>
        {clientError && !loading && (
          <Alert variant='error'>{clientError}</Alert>
        )}
        {error && !loading && <Alert variant='error'>{error}</Alert>}
        {response && !loading && (
          <Alert variant='success'>
            Contrasena restablecida. Ya podes iniciar sesion con tu nueva
            contrasena
          </Alert>
        )}
      </Form>
    </AuthLayout>
  )
}

export default ResetPasswordScreen
