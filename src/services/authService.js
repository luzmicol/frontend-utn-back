import { apiRequest, setAuthToken } from './apiClient'

export async function login(email, password) {
    const response_body = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email, password },
        auth: false
    })

    const token = response_body.authentication_token || response_body.data?.authentication_token
    if (token) {
        setAuthToken(token)
    }

    return response_body
}

export async function register(username, email, password) {
    return await apiRequest('/api/auth/register', {
        method: 'POST',
        body: { username, email, password },
        auth: false
    })
}

export async function verifyEmail(verification_token) {
    return await apiRequest('/api/auth/verify', {
        method: 'POST',
        body: { verification_token },
        auth: false
    })
}

export async function requestPasswordReset(email) {
    return await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: { email },
        auth: false
    })
}

export async function resetPassword(reset_token, password) {
    return await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: { reset_token, password },
        auth: false
    })
}

export async function resendVerificationEmail(email) {
    return await apiRequest('/api/auth/verify-email/' + encodeURIComponent(email) + '/resend', {
        method: 'GET',
        auth: false
    })
}
