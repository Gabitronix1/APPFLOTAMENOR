import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Logo } from './Logo'

export function RequireAuth() {
  const { session, provisional, loading } = useAuth()

  if (loading && !provisional) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-dark">
        <Logo variante="negativo" className="h-14" />
        <div className="text-white text-sm animate-pulse">Cargando...</div>
      </div>
    )
  }

  if (!session && !provisional) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
