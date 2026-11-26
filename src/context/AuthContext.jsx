import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import {
    apiRequest,
    clearAuthToken,
    getAuthToken,
    setAuthToken,
    setUnauthorizedHandler
} from '../services/apiClient'
import { login as loginRequest } from '../services/authService'
import { clearAllCache } from '../utils/memoryCache'

const AuthContext = createContext(null)

function isTemporarySessionError(error) {
    return Boolean(!error?.status || error.isNetworkError || error.status >= 500)
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [sessionError, setSessionError] = useState(null)
    const refreshInFlightRef = useRef(null)

    const logout = useCallback(() => {
        clearAuthToken()
        clearAllCache()
        setUser(null)
        setSessionError(null)
    }, [])

    const refreshUser = useCallback(async ({ retryOnFailure = true } = {}) => {
        if (refreshInFlightRef.current) {
            return refreshInFlightRef.current
        }

        const token = getAuthToken()
        if (!token) {
            setUser(null)
            setSessionError(null)
            return null
        }

        const task = (async () => {
            try {
                const response = await apiRequest('/api/users/me')
                const current_user = response.data?.user ?? null
                setUser(current_user)
                setSessionError(null)
                return current_user
            } catch (error) {
                if (error?.status === 401) {
                    clearAuthToken()
                    clearAllCache()
                    setUser(null)
                    setSessionError(null)
                    return null
                }

                if (isTemporarySessionError(error)) {
                    if (retryOnFailure) {
                        await delay(1000)

                        if (!getAuthToken()) {
                            setUser(null)
                            setSessionError(null)
                            return null
                        }

                        try {
                            const retryResponse = await apiRequest('/api/users/me')
                            const retryUser = retryResponse.data?.user ?? null
                            setUser(retryUser)
                            setSessionError(null)
                            return retryUser
                        } catch (retryError) {
                            if (retryError?.status === 401) {
                                clearAuthToken()
                                clearAllCache()
                                setUser(null)
                                setSessionError(null)
                                return null
                            }

                            setSessionError(
                                retryError?.message || 'No se pudo conectar con el servidor.'
                            )
                            return null
                        }
                    }

                    setSessionError(error?.message || 'No se pudo conectar con el servidor.')
                    return null
                }

                setSessionError(error?.message || 'No se pudo verificar la sesion.')
                return null
            } finally {
                refreshInFlightRef.current = null
            }
        })()

        refreshInFlightRef.current = task
        return task
    }, [])

    const login = useCallback(async (email, password) => {
        const response = await loginRequest(email, password)
        const token = response.authentication_token || response.data?.authentication_token

        if (token) {
            clearAllCache()
            setAuthToken(token)
            await refreshUser({ retryOnFailure: false })
        }

        return response
    }, [refreshUser])

    useEffect(() => {
        setUnauthorizedHandler(() => {
            clearAllCache()
            setUser(null)
            setSessionError(null)
        })

        let isMounted = true

        async function initSession() {
            const token = getAuthToken()
            if (token) {
                await refreshUser({ retryOnFailure: true })
            }
            if (isMounted) {
                setLoading(false)
            }
        }

        initSession()

        function handleOnline() {
            if (getAuthToken()) {
                refreshUser({ retryOnFailure: false })
            }
        }

        window.addEventListener('online', handleOnline)

        return () => {
            isMounted = false
            setUnauthorizedHandler(null)
            window.removeEventListener('online', handleOnline)
        }
    }, [refreshUser])

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                sessionError,
                login,
                logout,
                setUser,
                refreshUser
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    return useContext(AuthContext)
}
