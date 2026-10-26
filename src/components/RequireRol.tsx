import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getDefaultRoute } from '../lib/roles'
import type { Perfil, Rol } from '../types'

interface RequireRolProps {
  roles: Rol[]
  // Permiso alternativo por persona (p. ej. acceso otorgado a usuarios puntuales).
  permitir?: (perfil: Perfil) => boolean
}

export function RequireRol({ roles, permitir }: RequireRolProps) {
  const { perfil, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500 text-sm animate-pulse">Verificando permisos...</div>
      </div>
    )
  }

  if (!perfil || (!roles.includes(perfil.rol) && !permitir?.(perfil))) {
    return <Navigate to={getDefaultRoute(perfil?.rol)} replace />
  }

  return <Outlet />
}
