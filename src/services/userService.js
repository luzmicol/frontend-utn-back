import { apiRequest } from './apiClient'

export async function getUsers() {
  return await apiRequest('/api/users', {
    method: 'GET'
  })
}

export async function getMyProfile() {
  return await apiRequest('/api/users/me', {
    method: 'GET'
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
