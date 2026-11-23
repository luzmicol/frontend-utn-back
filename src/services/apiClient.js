const API_URL = import.meta.env.VITE_APP_URL_BACKEND
export const AUTH_TOKEN_KEY = 'auth_token'

let unauthorizedHandler = null

export function setUnauthorizedHandler(handler) {
    unauthorizedHandler = handler
}

export function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setAuthToken(token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function clearAuthToken() {
    localStorage.removeItem(AUTH_TOKEN_KEY)
}

async function readResponseBody(response_http) {
    const content_type = response_http.headers.get('content-type') || ''

    if (!content_type.includes('application/json')) {
        return {
            ok: false,
            status: response_http.status,
            message: 'No se pudo conectar con el servidor. Probá de nuevo en unos minutos.'
        }
    }

    return response_http.json()
}

function createApiError(response_body, status) {
    const error = new Error(response_body.message || 'Ocurrio un error inesperado')
    error.code = response_body.code ?? null
    error.status = response_body.status ?? status
    return error
}

export async function apiRequest(endpoint, { method = 'GET', body, headers = {}, auth = true } = {}) {
    const request_headers = { ...headers }
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData

    if (body !== undefined && !isFormData && !request_headers['Content-Type']) {
        request_headers['Content-Type'] = 'application/json'
    }

    if (auth) {
        const token = getAuthToken()
        if (token) {
            request_headers['Authorization'] = `Bearer ${token}`
        }
    }

    let response_http

    try {
        response_http = await fetch(API_URL + endpoint, {
            method,
            headers: request_headers,
            body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body)
        })
    } catch {
        const network_error = new Error('No se pudo conectar con el servidor. Probá de nuevo en unos minutos.')
        network_error.status = null
        network_error.code = 'NETWORK_ERROR'
        network_error.isNetworkError = true
        throw network_error
    }

    const response_body = await readResponseBody(response_http)

    if (response_http.status === 401 && auth) {
        clearAuthToken()
        if (typeof unauthorizedHandler === 'function') {
            unauthorizedHandler()
        }
    }

    if (!response_http.ok || response_body.ok === false) {
        throw createApiError(response_body, response_http.status)
    }

    return response_body
}
