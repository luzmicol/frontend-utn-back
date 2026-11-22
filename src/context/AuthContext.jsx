import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
    apiRequest,
    clearAuthToken,
    getAuthToken,
    setAuthToken,
    setUnauthorizedHandler
} from '../services/apiClient'
import { login as loginRequest } from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    const logout = useCallback(() => {
        clearAuthToken()
        setUser(null)
    }, [])

    const refreshUser = useCallback(async () => {
        const token = getAuthToken()
        if (!token) {
            setUser(null)
            return null
        }

        try {
            const response = await apiRequest('/api/users/me')
            const current_user = response.data?.user ?? null
            setUser(current_user)
            return current_user
        } catch {
            clearAuthToken()
            setUser(null)
            return null
        }
    }, [])

    const login = useCallback(async (email, password) => {
        const response = await loginRequest(email, password)
        const token = response.authentication_token || response.data?.authentication_token

        if (token) {
            setAuthToken(token)
            await refreshUser()
        }

        return response
    }, [refreshUser])

    useEffect(() => {
        setUnauthorizedHandler(() => {
            setUser(null)
        })

        let isMounted = true

        async function initSession() {
            const token = getAuthToken()
            if (token) {
                await refreshUser()
            }
            if (isMounted) {
                setLoading(false)
            }
        }

        initSession()

        return () => {
            isMounted = false
            setUnauthorizedHandler(null)
        }
    }, [refreshUser])

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
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

export function useAuth() {
    return useContext(AuthContext)
}
