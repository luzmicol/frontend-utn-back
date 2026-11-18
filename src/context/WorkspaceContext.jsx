import { createContext, useContext, useEffect } from 'react'
import { Outlet, useParams } from 'react-router'
import useRequest from '../hooks/useRequest'
import { getWorkspace, getWorkspaceMembers } from '../services/workspaceService'

const WorkspaceContext = createContext(null)

/*
Provider a nivel de ruta para /workspace/:workspace_id:
lee el workspace_id de la URL, consulta los datos del espacio de trabajo y
la lista de membresias usando useRequest, y los comparte con las pantallas
anidadas a traves del contexto (se consume con el hook useWorkspace)
*/
export default function WorkspaceProvider() {
    const { workspace_id } = useParams()

    const workspace_request = useRequest()
    const members_request = useRequest()

    useEffect(
        () => {
            workspace_request.sendRequest(
                () => getWorkspace(workspace_id)
            )
            members_request.sendRequest(
                () => getWorkspaceMembers(workspace_id)
            )
        },
        [workspace_id]
    )

    const context_value = {
        workspace_response: workspace_request.response,
        workspace_error: workspace_request.error,
        workspace_loading: workspace_request.loading,
        members_response: members_request.response,
        members_error: members_request.error,
        members_loading: members_request.loading
    }

    return (
        <WorkspaceContext.Provider value={context_value}>
            <Outlet/>
        </WorkspaceContext.Provider>
    )
}

/* Hook para consumir los datos del espacio de trabajo desde cualquier pantalla anidada a la ruta */
export function useWorkspace() {
    return useContext(WorkspaceContext)
}
