
import { useState } from 'react'
import { Link } from 'react-router'
import useWorkspaceList from '../../hooks/useWorkspaceList'
import { deleteWorkspace } from '../../services/workspaceService'

export default function WorkspaceList() {

    const {
        workspaces_error,
        workspaces_loading,
        workspaces_response,
        reloadWorkspaces
    } = useWorkspaceList()

    const [deleting, setDeleting] = useState(null)
    const [deleteError, setDeleteError] = useState('')

    async function handleDelete(workspace_id) {
        const confirmDelete = window.confirm(
            '¿Estás seguro de que querés eliminar este espacio de trabajo?'
        )

        if (!confirmDelete) return

        try {
            setDeleting(workspace_id)
            setDeleteError('')

            await deleteWorkspace(workspace_id)

            reloadWorkspaces()

        } catch (error) {
            setDeleteError(error.message)
        } finally {
            setDeleting(null)
        }
    }

    if (workspaces_loading) {
        return <span>Cargando...</span>
    }

    if (workspaces_error) {
        return (
            <div>
                <span className='error-text'>
                    Error: {workspaces_error}
                </span>
                <button onClick={reloadWorkspaces}>Recargar</button>
            </div>
        )
    }

    if (!workspaces_response) {
        return (
            <div>
                <span className='error-text'>
                    Error: Ocurrió un problema al obtener la lista.
                </span>
                <button onClick={reloadWorkspaces}>Recargar</button>
            </div>
        )
    }

    const workspaces = workspaces_response.data.workspaces

    if (workspaces.length === 0) {
        return <p>Aún no creaste ningún espacio de trabajo</p>
    }

    return (
        <div>
            {deleteError && (
                <p className='error-text'>{deleteError}</p>
            )}

            {workspaces.map((workspace) => (
                <div key={workspace._id}>
                    <Link to={`/workspace/${workspace._id}`}>
                        {workspace.nombre}
                    </Link>

                    <button
                        onClick={() => handleDelete(workspace._id)}
                        disabled={deleting === workspace._id}
                    >
                        {deleting === workspace._id
                            ? 'Eliminando...'
                            : 'Eliminar'}
                    </button>
                </div>
            ))}
        </div>
    )
}
