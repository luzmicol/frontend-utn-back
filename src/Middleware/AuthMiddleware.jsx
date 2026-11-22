import { Outlet, Navigate } from 'react-router-dom'
import { Infinity as InfinityIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function AuthMiddleware() {
  const { user, loading } = useAuth()

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

  return <Navigate to={'/login'} replace />
}
