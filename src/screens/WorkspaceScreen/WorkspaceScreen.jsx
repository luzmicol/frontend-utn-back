import { useEffect } from 'react'
import useWorkspaceList from '../../hooks/useWorkspaceList'

function WorkspaceScreen() {
  const {
    workspace_response,
    workspace_error,
    workspace_loading,
    members_response,
    members_error,
    members_loading
  } = useWorkspaceList()

  useEffect(() => {
    console.log('[WorkspaceScreen] estado del espacio de trabajo:', {
      loading: workspace_loading,
      response: workspace_response,
      error: workspace_error
    })
  }, [workspace_loading, workspace_response, workspace_error])

  useEffect(() => {
    console.log('[WorkspaceScreen] estado de las membresias:', {
      loading: members_loading,
      response: members_response,
      error: members_error
    })
  }, [members_loading, members_response, members_error])

  return (
    <div>
      <h1>Workspace cargado correctamente</h1>
    </div>
  )
}

export default WorkspaceScreen