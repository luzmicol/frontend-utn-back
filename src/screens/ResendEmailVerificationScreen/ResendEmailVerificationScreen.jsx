import { Link } from 'react-router-dom'
import useForm from '../../hooks/useForm'
import useRequest from '../../hooks/useRequest'
import { resendVerificationEmail } from '../../services/authService'
import AuthLayout from '../../Components/AuthLayout/AuthLayout'
import Alert from '../../Components/Alert/Alert'
import { Form, FormField, FormButton } from '../../Components/Form/Form'

function ResendEmailVerificationScreen() {
  const initial_state = { email: '' }
  const { formState, handleChangeInput } = useForm(initial_state)
  const { loading, response, error, sendRequest } = useRequest()

  async function handleSubmit(event) {
    event.preventDefault()
    sendRequest(
      () => resendVerificationEmail(formState.email)
    )
  }

  return (
    <AuthLayout
      title='Reenviar email de verificacion'
      footer={
        <span>
          ¿Ya tienes cuenta? <Link to='/login'>Inicia sesion</Link>
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
        <FormButton loading={loading}>Reenviar email</FormButton>
        {error && !loading && <Alert variant='error'>{error}</Alert>}
        {response && !loading && (
          <Alert variant='success'>{response.message}</Alert>
        )}
      </Form>
    </AuthLayout>
  )
}

export default ResendEmailVerificationScreen
