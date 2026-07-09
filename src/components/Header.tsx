import { useState, useEffect, useRef, ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogoTriangulos } from './LogoTriangulos'
import { getOfflineQueueCount, QUEUE_CHANGED_EVENT } from '../hooks/useOfflineQueue'
import {
  ROL_LABELS,
  ROLES_ADMINISTRATIVOS,
  ROLES_INTERVENCION,
  ROLES_INTERVENCION_MAQUINARIA,
  ROLES_JEFES,
  ROLES_ORDENES_TRABAJO,
} from '../lib/roles'

function NavDropdown({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`text-sm font-medium transition-colors flex items-center gap-1 ${open ? 'text-white' : 'text-gray-300 hover:text-white'}`}
      >
        {label}
        <svg
          viewBox="0 0 24 24"
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="absolute left-0 mt-2 w-56 bg-dark border border-white/10 rounded-xl shadow-xl overflow-hidden py-1 z-50"
        >
          {children}
        </div>
      )}
    </div>
  )
}

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

  const dropdownLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-2.5 text-sm transition-colors ${
      isActive ? 'text-lime bg-white/5' : 'text-gray-300 hover:text-white hover:bg-white/5'
    }`

  const puedeIntervencion = !!perfil && ROLES_INTERVENCION.includes(perfil.rol)
  const puedeOT = !!perfil && ROLES_ORDENES_TRABAJO.includes(perfil.rol)
  const puedeAdmin = !!perfil && ROLES_ADMINISTRATIVOS.includes(perfil.rol)
  const puedeIntervencionMaquinaria = !!perfil && ROLES_INTERVENCION_MAQUINARIA.includes(perfil.rol)
  const puedeJefe = !!perfil && ROLES_JEFES.includes(perfil.rol)

  const mostrarFlotaMenor = puedeIntervencion || puedeOT || puedeAdmin
  const mostrarFlotaMayor = puedeIntervencionMaquinaria || puedeAdmin

  return (
    <header className="bg-dark border-b border-white/10 sticky top-0 z-50 print:hidden">
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

          {mostrarFlotaMenor && (
            <NavDropdown label="Flota Menor">
              {puedeIntervencion && (
                <NavLink to="/intervencion" className={dropdownLinkClass}>Intervención</NavLink>
              )}
              {puedeOT && (
                <NavLink to="/ordenes-trabajo" className={dropdownLinkClass}>Órdenes de trabajo</NavLink>
              )}
              {puedeAdmin && (
                <NavLink to="/vehiculos" className={dropdownLinkClass}>Vehículos</NavLink>
              )}
              {puedeAdmin && (
                <NavLink to="/vencimientos" className={dropdownLinkClass}>Vencimientos</NavLink>
              )}
            </NavDropdown>
          )}

          {mostrarFlotaMayor && (
            <NavDropdown label="Flota Mayor">
              {puedeIntervencionMaquinaria && (
                <NavLink to="/intervencion-maquinaria" className={dropdownLinkClass}>Intervención Maquinaria</NavLink>
              )}
              {puedeAdmin && (
                <NavLink to="/maquinarias" className={dropdownLinkClass}>Maquinarias</NavLink>
              )}
            </NavDropdown>
          )}

          {puedeAdmin && (
            <NavLink to="/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>
          )}
          {puedeJefe && (
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
            <span className="text-xs text-gray-400 hidden sm:block">
              {ROL_LABELS[perfil.rol]}
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
