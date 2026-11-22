import { apiRequest } from './apiClient'

export async function getAllWorkspaces() {
    return await apiRequest('/api/workspaces', {
        method: 'GET'
    })
}

export async function getWorkspace(workspace_id) {
    return await apiRequest('/api/workspaces/' + workspace_id, {
        method: 'GET'
    })
}

export async function getWorkspaceMembers(workspace_id) {
    return await apiRequest('/api/workspaces/' + workspace_id + '/members', {
        method: 'GET'
    })
}

export async function createWorkspace(name, description) {
    return await apiRequest('/api/workspaces', {
        method: 'POST',
        body: { name, description }
    })
}

export async function deleteWorkspace(workspace_id) {
    return await apiRequest('/api/workspaces/' + workspace_id, {
        method: 'DELETE'
    })
}

export async function updateWorkspace(workspace_id, name, description) {
    return await apiRequest('/api/workspaces/' + workspace_id, {
        method: 'PUT',
        body: { name, description }
    })
}
