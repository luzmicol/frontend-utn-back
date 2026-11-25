import { apiRequest } from './apiClient'
import { invalidateCache } from '../utils/memoryCache'

export async function getConversations() {
  return await apiRequest('/api/conversations', {
    method: 'GET'
  })
}

export async function createOrGetConversation(participant_id) {
  return await apiRequest('/api/conversations', {
    method: 'POST',
    body: { participant_id }
  })
}

export async function getConversationMessages(conversation_id, { page = 1, limit = 30 } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit)
  })
  return await apiRequest(
    `/api/conversations/${conversation_id}/messages?${params.toString()}`,
    { method: 'GET' }
  )
}

export async function sendMessage(
  conversation_id,
  contenido = '',
  { shared_post_id = null, reply_to_message_id = null, forwarded = false } = {}
) {
  const body = {}
  if (contenido !== undefined && contenido !== null) {
    body.contenido = contenido
  }
  if (shared_post_id) {
    body.shared_post_id = shared_post_id
  }
  if (reply_to_message_id) {
    body.reply_to_message_id = reply_to_message_id
  }
  if (forwarded) {
    body.forwarded = true
  }

  const response = await apiRequest(`/api/conversations/${conversation_id}/messages`, {
    method: 'POST',
    body
  })
  invalidateCache('messages:')
  return response
}

export async function deleteMessage(message_id) {
  return await apiRequest(`/api/messages/${message_id}`, {
    method: 'DELETE'
  })
}

export async function getUnreadMessagesCount() {
  return await apiRequest('/api/conversations/unread-count', {
    method: 'GET'
  })
}

export async function markConversationAsRead(conversation_id) {
  return await apiRequest(`/api/conversations/${conversation_id}/read`, {
    method: 'PATCH'
  })
}

export async function acceptConversationRequest(conversation_id) {
  const response = await apiRequest(`/api/conversations/${conversation_id}/accept`, {
    method: 'PATCH'
  })
  invalidateCache('messages:')
  return response
}

export async function deleteConversationRequest(conversation_id) {
  const response = await apiRequest(`/api/conversations/${conversation_id}/request`, {
    method: 'DELETE'
  })
  invalidateCache('messages:')
  return response
}

export async function createGroupConversation({ nombre, participant_ids, imageFile = null }) {
  let body
  if (imageFile) {
    const formData = new FormData()
    formData.append('nombre', nombre)
    formData.append('participant_ids', JSON.stringify(participant_ids))
    formData.append('imagen', imageFile)
    body = formData
  } else {
    body = { nombre, participant_ids }
  }

  const response = await apiRequest('/api/conversations/groups', {
    method: 'POST',
    body
  })
  invalidateCache('messages:')
  return response
}

export async function updateGroupConversation(conversation_id, { nombre, imageFile = null, removeImage = false } = {}) {
  let body
  if (imageFile || removeImage) {
    const formData = new FormData()
    if (nombre !== undefined) formData.append('nombre', nombre)
    if (imageFile) formData.append('imagen', imageFile)
    if (removeImage) formData.append('remove_image', 'true')
    body = formData
  } else {
    body = { nombre }
  }

  const response = await apiRequest(`/api/conversations/${conversation_id}/group`, {
    method: 'PATCH',
    body
  })
  invalidateCache('messages:')
  return response
}

export async function addGroupParticipants(conversation_id, participant_ids) {
  const response = await apiRequest(`/api/conversations/${conversation_id}/participants`, {
    method: 'POST',
    body: { participant_ids }
  })
  invalidateCache('messages:')
  return response
}

export async function removeGroupParticipant(conversation_id, user_id) {
  const response = await apiRequest(`/api/conversations/${conversation_id}/participants/${user_id}`, {
    method: 'DELETE'
  })
  invalidateCache('messages:')
  return response
}

export async function updateGroupMemberRole(conversation_id, user_id, rol) {
  const response = await apiRequest(`/api/conversations/${conversation_id}/participants/${user_id}/role`, {
    method: 'PATCH',
    body: { rol }
  })
  invalidateCache('messages:')
  return response
}

export async function leaveGroupConversation(conversation_id) {
  const response = await apiRequest(`/api/conversations/${conversation_id}/members/me`, {
    method: 'DELETE'
  })
  invalidateCache('messages:')
  return response
}

export async function clearActiveConversation() {
  return apiRequest('/api/conversations/active', {
    method: 'DELETE'
  })
}
