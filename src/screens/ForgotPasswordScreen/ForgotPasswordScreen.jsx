import { Link } from 'react-router-dom'
import useForm from '../../hooks/useForm'
import useRequest from '../../hooks/useRequest'
import { requestPasswordReset } from '../../services/authService'
import AuthLayout from '../../Components/AuthLayout/AuthLayout'
import Alert from '../../Components/Alert/Alert'
import { Form, FormField, FormButton } from '../../Components/Form/Form'

/*
Pantalla de recuperacion de contrasena
Al enviar el email, el backend manda un mail con un token para
restablecer la contrasena en caso de que el usuario exista
*/
function ForgotPasswordScreen() {
  const initial_state = { email: '' }
  const { formState, handleChangeInput } = useForm(initial_state)
  const { loading, response, error, sendRequest } = useRequest()

  async function handleSubmit(event) {
    event.preventDefault()
    sendRequest(
      () => requestPasswordReset(formState.email)
    )
  }

  return (
    <AuthLayout
      title='Recuperar contrasena'
      subtitle='Escribi el email de tu cuenta y te enviamos un link para restablecerla'
      footer={
        <span>
          Recordaste la contrasena? <Link to='/login'>Iniciar sesion</Link>
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
        <FormButton loading={loading}>Recuperar contrasena</FormButton>
        {error && !loading && <Alert variant='error'>{error}</Alert>}
        {response && !loading && (
          <Alert variant='success'>
            Si el email pertenece a una cuenta existente, te enviamos un mail
            con el link para restablecer tu contrasena
          </Alert>
        )}
      </Form>
    </AuthLayout>
  )
}

export default ForgotPasswordScreen
