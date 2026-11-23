import { apiRequest } from './apiClient'

export async function getNotifications({ page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit)
  })
  return await apiRequest('/api/notifications?' + params.toString(), {
    method: 'GET'
  })
}

export async function getUnreadCount() {
  return await apiRequest('/api/notifications/unread-count', {
    method: 'GET'
  })
}

export async function markNotificationAsRead(notification_id) {
  return await apiRequest(`/api/notifications/${notification_id}/read`, {
    method: 'PATCH'
  })
}

export async function markAllNotificationsAsRead() {
  return await apiRequest('/api/notifications/read-all', {
    method: 'PATCH'
  })
}

export async function deleteNotification(notification_id) {
  return await apiRequest(`/api/notifications/${notification_id}`, {
    method: 'DELETE'
  })
}
