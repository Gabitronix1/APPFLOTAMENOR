import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogoTriangulos } from './LogoTriangulos'
import { getOfflineQueueCount, QUEUE_CHANGED_EVENT } from '../hooks/useOfflineQueue'

export function Header() {
  const { perfil, signOut } = useAuth()
  const [pending, setPending] = useState(getOfflineQueueCount)

  useEffect(() => {
    const handle = () => setPending(getOfflineQueueCount())
    window.addEventListener(QUEUE_CHANGED_EVENT, handle)
    return () => window.removeEventListener(QUEUE_CHANGED_EVENT, handle)
  }, [])

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${
      isActive ? 'text-lime' : 'text-gray-300 hover:text-white'
    }`

  return (
    <header className="bg-dark border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <LogoTriangulos size={36} />
          <span className="text-white font-bold text-lg leading-tight">
            Doña Isidora
            <span className="block text-xs font-normal text-gray-400">Flota Menor</span>
          </span>
        </div>

        <nav className="flex items-center gap-4 overflow-x-auto">
          <NavLink to="/checklist" className={navLinkClass}>
            Checklist
          </NavLink>
          <NavLink to="/intervencion" className={navLinkClass}>
            Intervención
          </NavLink>
          <NavLink to="/dashboard" className={navLinkClass}>
            Dashboard
          </NavLink>
          {(perfil?.rol === 'encargado' || perfil?.rol === 'admin') && (
            <NavLink to="/resoluciones" className={navLinkClass}>
              Resoluciones
            </NavLink>
          )}
          {perfil?.rol === 'admin' && (
            <NavLink to="/maestros" className={navLinkClass}>
              Maestros
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {pending > 0 && (
            <span className="badge-warn whitespace-nowrap">
              {pending} pendiente{pending !== 1 ? 's' : ''}
            </span>
          )}
          {perfil && (
            <span className="text-xs text-gray-400 capitalize hidden sm:block">
              {perfil.rol}
            </span>
          )}
          <button
            onClick={() => void signOut()}
            className="text-sm text-gray-300 hover:text-white border border-white/20 hover:border-white/40 rounded-lg px-3 py-1.5 transition-colors"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  )
}
