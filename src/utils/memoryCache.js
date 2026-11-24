const DEFAULT_TTL_MS = 30000

const cacheStore = new Map()
const inFlightRequests = new Map()

export function getCachedData(key) {
  const entry = cacheStore.get(key)
  if (!entry) return null
  return {
    data: entry.data,
    isFresh: Date.now() < entry.expiresAt
  }
}

export function setCachedData(key, data, ttlMs = DEFAULT_TTL_MS) {
  cacheStore.set(key, {
    data,
    expiresAt: Date.now() + ttlMs
  })
}

export function invalidateCache(keyOrPrefix) {
  if (!keyOrPrefix) return
  for (const key of cacheStore.keys()) {
    if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
      cacheStore.delete(key)
    }
  }
}

export function clearAllCache() {
  cacheStore.clear()
  inFlightRequests.clear()
}

export async function fetchWithCache(key, fetcher, { ttlMs = DEFAULT_TTL_MS } = {}) {
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key)
  }

  const promise = Promise.resolve()
    .then(() => fetcher())
    .then((result) => {
      setCachedData(key, result, ttlMs)
      return result
    })
    .finally(() => {
      inFlightRequests.delete(key)
    })

  inFlightRequests.set(key, promise)
  return promise
}
