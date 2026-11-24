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

export async function sendMessage(conversation_id, contenido = '', { shared_post_id = null } = {}) {
  const body = {}
  if (contenido !== undefined && contenido !== null) {
    body.contenido = contenido
  }
  if (shared_post_id) {
    body.shared_post_id = shared_post_id
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
