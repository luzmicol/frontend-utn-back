
import { useState } from 'react'
import { useWorkspace } from '../../context/WorkspaceContext'
import { updateWorkspace } from '../../services/workspaceService'

function WorkspaceScreen() {
  const {
    workspace_response,
    workspace_error,
    workspace_loading,
    members_response,
    members_error,
    members_loading
  } = useWorkspace()

  const workspace = workspace_response?.data?.workspace_selected
  const members = members_response?.data?.members || []

  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [updatedWorkspace, setUpdatedWorkspace] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const displayedWorkspace = updatedWorkspace || workspace

  function handleEdit() {
    setName(workspace.nombre)
    setDescription(workspace.description || '')
    setEditError('')
    setSuccessMessage('')
    setIsEditing(true)
  }

  function handleCancel() {
    setIsEditing(false)
    setEditError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    try {
      setSaving(true)
      setEditError('')
      setSuccessMessage('')

      const response = await updateWorkspace(
        workspace._id,
        name,
        description
      )

      setUpdatedWorkspace(response.data.workspace_updated)
      setIsEditing(false)
      setSuccessMessage('Espacio de trabajo actualizado correctamente.')

    } catch (error) {
      setEditError(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (workspace_loading || members_loading) {
    return <p>Cargando espacio de trabajo...</p>
  }

  if (workspace_error) {
    return <p>Error al cargar el espacio: {workspace_error}</p>
  }

  if (!workspace) {
    return <p>No se encontró el espacio de trabajo.</p>
  }

  return (
    <main className="workspace-screen">
      <header className="workspace-header">

        {isEditing ? (
          <form onSubmit={handleSubmit}>
            <h2>Editar espacio de trabajo</h2>

            <label htmlFor="workspace-name">Nombre</label>
            <input
              id="workspace-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={30}
              required
            />

            <label htmlFor="workspace-description">Descripción</label>
            <textarea
              id="workspace-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={1000}
            />

            {editError && <p className="error-text">{editError}</p>}

            <button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancelar
            </button>
          </form>
        ) : (
          <>
            <h1>{displayedWorkspace.nombre}</h1>
            <p>{displayedWorkspace.description || 'Sin descripción'}</p>

            <button onClick={handleEdit}>
              Editar espacio
            </button>
          </>
        )}

        {successMessage && (
          <p>{successMessage}</p>
        )}
      </header>

      <section className="workspace-members">
        <h2>Miembros</h2>

        {members_error && (
          <p className="error-text">
            Error al cargar los miembros: {members_error}
          </p>
        )}

        {!members_loading && members.length === 0 && (
          <p>Todavía no hay miembros para mostrar.</p>
        )}

        <ul>
          {members.map((member, index) => (
            <li key={member._id || index}>
              {member.nombre || member.fk_id_usuario?.nombre || 'Usuario'}
              {member.rol && ` - ${member.rol}`}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

export default WorkspaceScreen
