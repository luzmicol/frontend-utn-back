
import { useWorkspace } from '../../context/WorkspaceContext'

function WorkspaceScreen() {
  const {
    workspace_response,
    workspace_error,
    workspace_loading,
    members_response,
    members_error,
    members_loading
  } = useWorkspace()

  // Datos que devuelve el backend
  const workspace = workspace_response?.data?.workspace_selected
  const members = members_response?.data?.members || []

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
        <h1>{workspace.nombre}</h1>
        <p>{workspace.description || 'Sin descripción'}</p>
      </header>

      <section className="workspace-members">
        <h2>Miembros</h2>

        {members_loading && <p>Cargando miembros...</p>}

        {members_error && (
          <p>Error al cargar los miembros: {members_error}</p>
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
