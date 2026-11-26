import { useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { getAuthToken } from '../services/apiClient'
import Alert from '../Components/Alert/Alert'

export default function AuthMiddleware() {
  const { user, loading, sessionError, refreshUser } = useAuth()
  const { resolvedTheme } = useTheme()
  const [retrying, setRetrying] = useState(false)
  const logoSrc = resolvedTheme === 'light' ? '/loop-wordmark-dark.png' : '/loop-wordmark.png'

  if (loading) {
    return (
      <main className='auth-layout'>
        <div className='auth-content'>
          <div className='auth-content__brand'>
            <img
              src={logoSrc}
              alt='LOOP'
              className='auth-content__brand-img'
            />
          </div>
          <p className='auth-content__subtitle'>Verificando sesión...</p>
        </div>
      </main>
    )
  }

  if (user) {
    return <Outlet />
  }

  if (getAuthToken() && sessionError) {
    async function handleRetry() {
      setRetrying(true)
      await refreshUser({ retryOnFailure: false })
      setRetrying(false)
    }

    return (
      <main className='auth-layout'>
        <div className='auth-content'>
          <div className='auth-content__brand'>
            <img
              src={logoSrc}
              alt='LOOP'
              className='auth-content__brand-img'
            />
          </div>
          <h1 className='auth-content__title'>Problema de conexión</h1>
          <Alert variant='error'>{sessionError}</Alert>
          <button
            type='button'
            className='form__button'
            onClick={handleRetry}
            disabled={retrying}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <RefreshCw size={16} />
            <span>{retrying ? 'Reintentando...' : 'Reintentar'}</span>
          </button>
        </div>
      </main>
    )
  }

  return <Navigate to={'/login'} replace />
}
