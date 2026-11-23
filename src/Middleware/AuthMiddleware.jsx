import { useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { Infinity as InfinityIcon, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getAuthToken } from '../services/apiClient'
import Alert from '../Components/Alert/Alert'

export default function AuthMiddleware() {
  const { user, loading, sessionError, refreshUser } = useAuth()
  const [retrying, setRetrying] = useState(false)

  if (loading) {
    return (
      <main className='auth-layout'>
        <div className='auth-content'>
          <div className='auth-content__brand'>
            <span className='auth-content__logo' aria-hidden='true'>
              <InfinityIcon size={22} strokeWidth={2.2} />
            </span>
            <span className='auth-content__brand-name'>LOOP</span>
          </div>
          <p className='auth-content__subtitle'>Verificando sesion...</p>
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
            <span className='auth-content__logo' aria-hidden='true'>
              <InfinityIcon size={22} strokeWidth={2.2} />
            </span>
            <span className='auth-content__brand-name'>LOOP</span>
          </div>
          <h1 className='auth-content__title'>Problema de conexion</h1>
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
