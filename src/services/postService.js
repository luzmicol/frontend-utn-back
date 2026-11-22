import { apiRequest } from './apiClient'

export async function getPosts() {
  return await apiRequest('/api/posts', {
    method: 'GET'
  })
}

export async function createPost(contenido, fk_id_comunidad = null) {
  const body = { contenido }
  if (fk_id_comunidad) {
    body.fk_id_comunidad = fk_id_comunidad
  }

  return await apiRequest('/api/posts', {
    method: 'POST',
    body
  })
}

export async function updatePost(post_id, contenido) {
  return await apiRequest('/api/posts/' + post_id, {
    method: 'PUT',
    body: { contenido }
  })
}

export async function deletePost(post_id) {
  return await apiRequest('/api/posts/' + post_id, {
    method: 'DELETE'
  })
}

export async function getPostLikes(post_id) {
  return await apiRequest('/api/posts/' + post_id + '/likes', {
    method: 'GET'
  })
}

export async function likePost(post_id) {
  return await apiRequest('/api/posts/' + post_id + '/likes', {
    method: 'POST'
  })
}

export async function unlikePost(post_id) {
  return await apiRequest('/api/posts/' + post_id + '/likes', {
    method: 'DELETE'
  })
}

export async function getPostComments(post_id) {
  return await apiRequest('/api/posts/' + post_id + '/comments', {
    method: 'GET'
  })
}

export async function createComment(post_id, contenido) {
  return await apiRequest('/api/posts/' + post_id + '/comments', {
    method: 'POST',
    body: { contenido }
  })
}

export async function deleteComment(post_id, comment_id) {
  return await apiRequest('/api/posts/' + post_id + '/comments/' + comment_id, {
    method: 'DELETE'
  })
}
