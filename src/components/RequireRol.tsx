import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getDefaultRoute } from '../lib/roles'
import type { Rol } from '../types'

interface RequireRolProps {
  roles: Rol[]
}

export function RequireRol({ roles }: RequireRolProps) {
  const { perfil, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500 text-sm animate-pulse">Verificando permisos...</div>
      </div>
    )
  }

  if (!perfil || !roles.includes(perfil.rol)) {
    return <Navigate to={getDefaultRoute(perfil?.rol)} replace />
  }

  return <Outlet />
}
