import { apiRequest } from './apiClient'

export async function getTrendingPosts({ page = 1, limit = 15 } = {}) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))

  return await apiRequest('/api/explore/trending?' + params.toString(), {
    method: 'GET'
  })
}

export async function getForYouPosts({ page = 1, limit = 15 } = {}) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', String(limit))

  return await apiRequest('/api/explore/for-you?' + params.toString(), {
    method: 'GET'
  })
}
