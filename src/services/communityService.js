import { apiRequest } from './apiClient'

export async function getCommunities() {
  return await apiRequest('/api/communities', {
    method: 'GET'
  })
}

export async function getMyCommunities() {
  return await apiRequest('/api/communities/me', {
    method: 'GET'
  })
}

export async function getCommunityById(community_id) {
  return await apiRequest('/api/communities/' + community_id, {
    method: 'GET'
  })
}

export async function getCommunityMembers(community_id) {
  return await apiRequest('/api/communities/' + community_id + '/members', {
    method: 'GET'
  })
}

export async function createCommunity(nombre, descripcion) {
  return await apiRequest('/api/communities', {
    method: 'POST',
    body: { nombre, descripcion }
  })
}

export async function joinCommunity(community_id) {
  return await apiRequest('/api/communities/' + community_id + '/members', {
    method: 'POST'
  })
}

export async function leaveCommunity(community_id) {
  return await apiRequest('/api/communities/' + community_id + '/members/me', {
    method: 'DELETE'
  })
}

export async function updateCommunityImage(community_id, imageFile) {
  const formData = new FormData()
  formData.append('imagen', imageFile)

  return await apiRequest('/api/communities/' + community_id + '/image', {
    method: 'PATCH',
    body: formData
  })
}

export async function deleteCommunityImage(community_id) {
  return await apiRequest('/api/communities/' + community_id + '/image', {
    method: 'DELETE'
  })
}

export async function deleteCommunity(community_id) {
  return await apiRequest('/api/communities/' + community_id, {
    method: 'DELETE'
  })
}
