import { useNavigate } from 'react-router-dom'
import useForm from '../../hooks/useForm'
import useRequest from '../../hooks/useRequest'
import { createWorkspace } from '../../services/workspaceService'
import AuthLayout from '../../Components/AuthLayout/AuthLayout'
import Alert from '../../Components/Alert/Alert'
import { Form, FormField, FormTextArea, FormButton } from '../../Components/Form/Form'

/* Limite de caracteres de la descripcion, igual al que acepta el backend */
const DESCRIPTION_MAX_LENGTH = 1000

function CreateWorkspaceScreen() {
  const initial_state = { name: '', description: '' }
  const { formState, handleChangeInput } = useForm(initial_state)
  const { loading, error, sendRequest } = useRequest()
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    sendRequest(
      async () => {
        await createWorkspace(formState.name, formState.description)
        //Si se creo bien volvemos al home, donde aparece en la lista de espacios de trabajo
        navigate('/home')
      }
    )
  }

  return (
    <AuthLayout
      title='Asigna un nombre a tu espacio de trabajo de Slack'
      subtitle='Elige algo que tu equipo reconozca fácilmente, como el nombre de la empresa o del equipo. Puedes modificarlo cuando quieras.'
    >
      <Form onSubmit={handleSubmit}>
        <FormField
          label='Nombre'
          name='name'
          type='text'
          placeholder='Nombre del espacio de trabajo'
          value={formState.name}
          onChange={handleChangeInput}
          maxLength={30}
        />
        <FormTextArea
          label='Descripción'
          name='description'
          placeholder='Descripción'
          value={formState.description}
          onChange={handleChangeInput}
          maxLength={DESCRIPTION_MAX_LENGTH}
        />
        <FormButton loading={loading}>Crear espacio de trabajo</FormButton>
        {error && !loading && <Alert variant='error'>{error}</Alert>}
      </Form>
    </AuthLayout>
  )
}

export default CreateWorkspaceScreen
