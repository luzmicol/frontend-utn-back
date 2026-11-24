import { apiRequest } from './apiClient'

export async function getUsers() {
  return await apiRequest('/api/users', {
    method: 'GET'
  })
}

export async function searchUsers(query = '', limit = 6) {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  params.set('limit', String(limit))

  return await apiRequest('/api/users/search?' + params.toString(), {
    method: 'GET'
  })
}

export async function getMyProfile() {
  return await apiRequest('/api/users/me', {
    method: 'GET'
  })
}

export async function updateMyProfile(data = {}) {
  const payload = {}
  if (data.nombre !== undefined) payload.nombre = data.nombre
  if (data.bio !== undefined) payload.bio = data.bio

  return await apiRequest('/api/users/me', {
    method: 'PUT',
    body: payload
  })
}

export async function uploadMyAvatar(file) {
  const formData = new FormData()
  formData.append('avatar', file)

  return await apiRequest('/api/users/me/avatar', {
    method: 'POST',
    body: formData
  })
}

export async function deleteMyAvatar() {
  return await apiRequest('/api/users/me/avatar', {
    method: 'DELETE'
  })
}

export async function checkUsernameAvailability(username) {
  return await apiRequest(
    '/api/users/username-availability?username=' + encodeURIComponent(username),
    {
      method: 'GET',
      auth: false
    }
  )
}

export async function updateMyUsername(username) {
  return await apiRequest('/api/users/me/username', {
    method: 'PUT',
    body: { username }
  })
}

export async function getUserById(user_id) {
  return await apiRequest('/api/users/' + user_id, {
    method: 'GET'
  })
}

export async function followUser(user_id) {
  return await apiRequest('/api/users/' + user_id + '/follow', {
    method: 'POST'
  })
}

export async function unfollowUser(user_id) {
  return await apiRequest('/api/users/' + user_id + '/follow', {
    method: 'DELETE'
  })
}

export async function getFollowStatus(user_id) {
  return await apiRequest('/api/users/' + user_id + '/follow', {
    method: 'GET'
  })
}

export async function getFollowers(user_id) {
  return await apiRequest('/api/users/' + user_id + '/followers', {
    method: 'GET'
  })
}

export async function getFollowing(user_id) {
  return await apiRequest('/api/users/' + user_id + '/following', {
    method: 'GET'
  })
}

export async function getUserReposts(user_id) {
  return await apiRequest('/api/users/' + user_id + '/reposts', {
    method: 'GET'
  })
}

export async function getMyBookmarks({ page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))

  return await apiRequest('/api/users/me/bookmarks?' + params.toString(), {
    method: 'GET'
  })
}
