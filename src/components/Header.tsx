import { useState, useEffect, useRef, ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogoTriangulos } from './LogoTriangulos'
import { getOfflineQueueCount, QUEUE_CHANGED_EVENT } from '../hooks/useOfflineQueue'
import { listQueue, syncAll } from '../lib/offlineQueue'
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
        className={`text-[15px] font-medium transition-colors flex items-center gap-1.5 py-2 ${open ? 'text-white' : 'text-gray-300 hover:text-white'}`}
      >
        {label}
        <svg
          viewBox="0 0 24 24"
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
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
          className="absolute left-0 mt-2 w-64 bg-dark border border-white/10 rounded-xl shadow-xl overflow-hidden py-1.5 z-50"
        >
          {children}
        </div>
      )}
    </div>
  )
}

function MobileNavGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-2">
      <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      {children}
    </div>
  )
}

export function Header() {
  const { perfil, signOut } = useAuth()
  const [pending, setPending] = useState(getOfflineQueueCount)
  const [syncing, setSyncing] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handle = () => setPending(getOfflineQueueCount())
    window.addEventListener(QUEUE_CHANGED_EVENT, handle)
    return () => window.removeEventListener(QUEUE_CHANGED_EVENT, handle)
  }, [])

  async function handleRetrySync() {
    setSyncing(true)
    await syncAll()
    const queue = await listQueue()
    const withError = queue.find(i => i.lastError)
    setSyncing(false)
    if (queue.length > 0 && withError) {
      alert(`No se pudo sincronizar (${queue.length} pendiente${queue.length !== 1 ? 's' : ''}). Error: ${withError.lastError}`)
    } else if (queue.length > 0) {
      alert(`Sigue sin conexión — ${queue.length} pendiente${queue.length !== 1 ? 's' : ''}. Se reintentará solo.`)
    }
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-[15px] font-medium transition-colors py-2 ${
      isActive ? 'text-lime' : 'text-gray-300 hover:text-white'
    }`

  const dropdownLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-3 text-sm transition-colors ${
      isActive ? 'text-lime bg-white/5' : 'text-gray-300 hover:text-white hover:bg-white/5'
    }`

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-3 text-base font-medium rounded-lg transition-colors ${
      isActive ? 'text-lime bg-white/5' : 'text-gray-200 hover:text-white hover:bg-white/5'
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
        <div className="flex items-center gap-3">
          <LogoTriangulos size={40} />
          <span className="text-white font-bold text-lg leading-tight">
            Doña Isidora
            <span className="block text-xs font-normal text-gray-400">Flota Menor</span>
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7">
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
            <button
              type="button"
              onClick={() => void handleRetrySync()}
              disabled={syncing}
              className="badge-warn whitespace-nowrap disabled:opacity-60"
              title="Tocar para reintentar sincronizar ahora"
            >
              {syncing ? 'Sincronizando…' : `${pending} pendiente${pending !== 1 ? 's' : ''} · reintentar`}
            </button>
          )}
          {perfil && (
            <span className="text-xs text-gray-400 hidden lg:block">
              {ROL_LABELS[perfil.rol]}
            </span>
          )}
          <button
            onClick={() => void signOut()}
            className="hidden md:inline-block text-sm text-gray-300 hover:text-white border border-white/20 hover:border-white/40 rounded-lg px-3.5 py-2 transition-colors"
          >
            Salir
          </button>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen(o => !o)}
            className="md:hidden w-11 h-11 flex items-center justify-center rounded-lg border border-white/20 text-gray-200 hover:text-white hover:border-white/40"
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2}>
              {mobileOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-white/10 bg-dark px-4 py-3 max-h-[calc(100vh-80px)] overflow-y-auto">
          <NavLink to="/checklist" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>
            Checklist
          </NavLink>

          {mostrarFlotaMenor && (
            <MobileNavGroup label="Flota Menor">
              {puedeIntervencion && (
                <NavLink to="/intervencion" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Intervención</NavLink>
              )}
              {puedeOT && (
                <NavLink to="/ordenes-trabajo" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Órdenes de trabajo</NavLink>
              )}
              {puedeAdmin && (
                <NavLink to="/vehiculos" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Vehículos</NavLink>
              )}
              {puedeAdmin && (
                <NavLink to="/vencimientos" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Vencimientos</NavLink>
              )}
            </MobileNavGroup>
          )}

          {mostrarFlotaMayor && (
            <MobileNavGroup label="Flota Mayor">
              {puedeIntervencionMaquinaria && (
                <NavLink to="/intervencion-maquinaria" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Intervención Maquinaria</NavLink>
              )}
              {puedeAdmin && (
                <NavLink to="/maquinarias" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Maquinarias</NavLink>
              )}
            </MobileNavGroup>
          )}

          {(puedeAdmin || puedeJefe) && (
            <MobileNavGroup label="Administración">
              {puedeAdmin && (
                <NavLink to="/dashboard" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Dashboard</NavLink>
              )}
              {puedeJefe && (
                <NavLink to="/maestros" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Maestros</NavLink>
              )}
            </MobileNavGroup>
          )}

          <div className="border-t border-white/10 mt-2 pt-3 flex items-center justify-between">
            {perfil && <span className="text-xs text-gray-400 px-4">{ROL_LABELS[perfil.rol]}</span>}
            <button
              onClick={() => void signOut()}
              className="text-sm text-gray-300 hover:text-white border border-white/20 hover:border-white/40 rounded-lg px-4 py-2 mx-4 transition-colors"
            >
              Salir
            </button>
          </div>
        </nav>
      )}
    </header>
  )
}
