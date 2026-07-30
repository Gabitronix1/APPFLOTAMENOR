import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function RequireAuth() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-dark">
        <div className="bg-white rounded-xl px-5 py-3">
          <img src="/DI1color.png" alt="Doña Isidora" className="h-8 w-auto" />
        </div>
        <div className="text-white text-sm animate-pulse">Cargando...</div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
