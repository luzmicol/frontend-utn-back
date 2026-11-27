import { apiRequest } from './apiClient'
import { invalidateCache } from '../utils/memoryCache'

const CHAT_SESSION_STORAGE_KEY = 'loop_chat_session_id'
let cachedChatSessionId = null

export function getChatSessionId() {
  if (cachedChatSessionId) return cachedChatSessionId
  try {
    const existing = window.sessionStorage.getItem(CHAT_SESSION_STORAGE_KEY)
    if (existing) {
      cachedChatSessionId = existing
      return existing
    }
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    window.sessionStorage.setItem(CHAT_SESSION_STORAGE_KEY, generated)
    cachedChatSessionId = generated
    return generated
  } catch {
    cachedChatSessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    return cachedChatSessionId
  }
}

function getSessionHeaders() {
  return { 'X-Chat-Session-Id': getChatSessionId() }
}

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
    { method: 'GET', headers: getSessionHeaders() }
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
    headers: getSessionHeaders(),
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
    method: 'PATCH',
    headers: getSessionHeaders()
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

export async function setActiveConversation(conversation_id) {
  const session_id = getChatSessionId()
  return apiRequest(`/api/conversations/${conversation_id}/active`, {
    method: 'PUT',
    headers: getSessionHeaders(),
    body: { session_id }
  })
}

export async function clearActiveConversation({ conversation_id = null, keepalive = false } = {}) {
  const session_id = getChatSessionId()
  const params = new URLSearchParams({ session_id })
  if (conversation_id) {
    params.set('conversation_id', conversation_id)
  }
  return apiRequest(`/api/conversations/active?${params.toString()}`, {
    method: 'DELETE',
    headers: getSessionHeaders(),
    keepalive
  })
}
