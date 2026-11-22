import React from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AuthMiddleware() {
    const { user, loading } = useAuth()

    if (loading) {
        return <p>Verificando sesion...</p>
    }

    if (user) {
        return <Outlet />
    }

    return <Navigate to={'/login'} replace />
}
