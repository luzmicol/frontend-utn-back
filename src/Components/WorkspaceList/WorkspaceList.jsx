
import { useState } from 'react'
import { Link } from 'react-router'
import useWorkspaceList from '../../hooks/useWorkspaceList'
import { deleteWorkspace } from '../../services/workspaceService'
import './WorkspaceList.css'

export default function WorkspaceList() {

    const {
        workspaces_error,
        workspaces_loading,
        workspaces_response,
        reloadWorkspaces
    } = useWorkspaceList()

    const [deleting, setDeleting] = useState(null)
    const [workspaceToDelete, setWorkspaceToDelete] = useState(null)
    const [deleteError, setDeleteError] = useState('')

    async function handleDelete() {
        try {
            setDeleting(workspaceToDelete._id)
            setDeleteError('')

            await deleteWorkspace(workspaceToDelete._id)

            setWorkspaceToDelete(null)
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

    return (
        <div>
            {deleteError && (
                <p className='error-text'>{deleteError}</p>
            )}

            {workspaces.length === 0 ? (
                <p>Aún no creaste ningún espacio de trabajo</p>
            ) : (
                workspaces.map((workspace) => (
                    <div key={workspace._id}>
                        <Link to={`/workspace/${workspace._id}`}>
                            {workspace.nombre}
                        </Link>

                        <button
                            onClick={() => setWorkspaceToDelete(workspace)}
                        >
                            Eliminar
                        </button>
                    </div>
                ))
            )}

            {workspaceToDelete && (
                <div className="delete-overlay">
                    <div className="delete-modal">
                        <h2>Eliminar espacio</h2>

                        <p>
                            ¿Estás seguro de que querés eliminar
                            <strong> {workspaceToDelete.nombre}</strong>?
                        </p>

                        <p>Esta acción no se puede deshacer.</p>

                        <div className="delete-actions">
                            <button
                                onClick={() => setWorkspaceToDelete(null)}
                                disabled={deleting !== null}
                            >
                                Cancelar
                            </button>

                            <button
                                onClick={handleDelete}
                                disabled={deleting !== null}
                            >
                                {deleting !== null
                                    ? 'Eliminando...'
                                    : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
