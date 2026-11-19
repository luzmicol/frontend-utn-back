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

  async function handleSubmit(event) {
    event.preventDefault()
    sendRequest(
      () => register(formState.name, formState.email, formState.password)
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
          onChange={handleChangeInput}
        />
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
        <FormButton loading={loading}>Registrarse</FormButton>
        {error && !loading && <Alert variant='error'>{error}</Alert>}
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
