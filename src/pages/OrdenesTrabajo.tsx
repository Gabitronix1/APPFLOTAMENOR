import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useOrdenesTrabajo } from '../hooks/useOrdenesTrabajo'
import { supabase } from '../lib/supabase'
import { PRIORIDADES_OT, PRIORIDAD_OT_INFO } from '../lib/ordenesTrabajo'
import { fmtDate } from '../lib/constants'
import { FallaRow } from '../components/resoluciones/FallaRow'
import { AsignarModal } from '../components/resoluciones/AsignarModal'
import { CerrarDirectoModal } from '../components/resoluciones/CerrarDirectoModal'
import { NotasOperadorModal } from '../components/resoluciones/NotasOperadorModal'
import { KpiCard } from '../components/vehiculos/KpiCard'
import type { OrdenTrabajo, PrioridadOT } from '../types'

type ModalState =
  | { tipo: 'asignar'; ot: OrdenTrabajo }
  | { tipo: 'cerrar'; ot: OrdenTrabajo }
  | { tipo: 'iniciar'; ot: OrdenTrabajo }
  | { tipo: 'notas'; ot: OrdenTrabajo }
  | null

const SIETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000

export function OrdenesTrabajo() {
  const { perfil, user } = useAuth()
  const { ordenes, grupos, operadoresAsignables, loading, error, refetch } = useOrdenesTrabajo()
  const [vista, setVista] = useState<'pendientes' | 'todas'>('pendientes')
  const [prioridadFiltro, setPrioridadFiltro] = useState<PrioridadOT | 'todas'>('todas')
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<ModalState>(null)

  const kpis = useMemo(() => {
    const abiertas = ordenes.filter(o => o.estado === 'abierta').length
    const enProgreso = ordenes.filter(o => o.estado === 'en_progreso').length
    const ahora = Date.now()
    const vencidas = ordenes.filter(
      o =>
        o.estado !== 'cerrada' &&
        o.estado !== 'cancelada' &&
        ahora - new Date(o.created_at).getTime() > SIETE_DIAS_MS,
    ).length
    const hoy = new Date()
    const cerradasEsteMes = ordenes.filter(o => {
      if (o.estado !== 'cerrada') return false
      const f = o.fecha_cierre ?? o.fecha
      if (!f) return false
      const d = new Date(f)
      return d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth()
    }).length
    return { abiertas, enProgreso, vencidas, cerradasEsteMes }
  }, [ordenes])

  const gruposFiltrados = useMemo(() => {
    let lista = grupos
    if (vista === 'pendientes') lista = lista.filter(g => g.pendientes > 0)
    if (prioridadFiltro !== 'todas') {
      lista = lista.filter(g => g.fallas.some(f => f.ot?.prioridad === prioridadFiltro))
    }
    return lista
  }, [grupos, vista, prioridadFiltro])

  function toggleExpand(id: string) {
    setExpandidas(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function cancelar(ot: OrdenTrabajo) {
    if (!window.confirm(`¿Cancelar la orden de trabajo de ${ot.patente} · ${ot.sistema}?`)) return
    await supabase.from('resoluciones').update({ estado: 'cancelada' }).eq('id', ot.id)
    refetch()
  }

  function cerrarModal() {
    setModal(null)
  }

  function onSaved() {
    setModal(null)
    refetch()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Órdenes de trabajo</h1>
      <p className="text-sm text-gray-500 mb-6">Fallas detectadas en inspecciones, agrupadas por inspección.</p>

      {error && <div className="text-fault text-sm mb-4">{error}</div>}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Total abiertas" value={kpis.abiertas} />
        <KpiCard label="Total en progreso" value={kpis.enProgreso} />
        <KpiCard label="Vencidas (+7 días sin mover)" value={kpis.vencidas} accent={kpis.vencidas > 0} />
        <KpiCard label="Cerradas este mes" value={kpis.cerradasEsteMes} />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          {(['pendientes', 'todas'] as const).map(v => (
            <button
              key={v}
              onClick={() => setVista(v)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                vista === v ? 'bg-primary text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {v === 'pendientes' ? 'Pendientes' : 'Todas'}
            </button>
          ))}
        </div>
        <select
          value={prioridadFiltro}
          onChange={e => setPrioridadFiltro(e.target.value as PrioridadOT | 'todas')}
          className="input w-auto"
        >
          <option value="todas">Todas las prioridades</option>
          {PRIORIDADES_OT.map(p => (
            <option key={p} value={p}>{PRIORIDAD_OT_INFO[p].label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 animate-pulse">Cargando órdenes de trabajo...</div>
      ) : gruposFiltrados.length === 0 ? (
        <div className="card text-center text-gray-400 py-12">
          {vista === 'pendientes'
            ? 'No hay inspecciones con fallas pendientes.'
            : 'No hay inspecciones con fallas registradas.'}
        </div>
      ) : (
        <div className="space-y-3">
          {gruposFiltrados.map(grupo => {
            const isOpen = expandidas.has(grupo.inspeccion.id)
            return (
              <div key={grupo.inspeccion.id} className="card p-0 overflow-hidden">
                <button
                  onClick={() => toggleExpand(grupo.inspeccion.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="font-mono font-bold text-dark text-sm">{grupo.inspeccion.patente}</span>
                    <span className="text-gray-600 text-sm">{grupo.inspeccion.conductor}</span>
                    <span className="text-gray-500 text-sm">{grupo.inspeccion.fundo}</span>
                    <span className="text-gray-400 text-xs">{fmtDate(grupo.inspeccion.fecha)}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {grupo.pendientes > 0 && (
                      <span className="badge-fault">
                        {grupo.pendientes} pendiente{grupo.pendientes !== 1 ? 's' : ''}
                      </span>
                    )}
                    {grupo.cerradas > 0 && (
                      <span className="badge-ok">
                        {grupo.cerradas} cerrada{grupo.cerradas !== 1 ? 's' : ''}
                      </span>
                    )}
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-200 divide-y divide-gray-100">
                    {grupo.fallas.map(falla => (
                      <FallaRow
                        key={falla.preguntaId}
                        sistema={falla.sistema}
                        observacion={falla.observacion}
                        ot={falla.ot}
                        rol={perfil?.rol}
                        userId={user?.id}
                        onAsignar={ot => setModal({ tipo: 'asignar', ot })}
                        onCerrar={ot => setModal({ tipo: 'cerrar', ot })}
                        onCancelar={ot => void cancelar(ot)}
                        onIniciar={ot => setModal({ tipo: 'iniciar', ot })}
                        onAgregarNotas={ot => setModal({ tipo: 'notas', ot })}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modal?.tipo === 'asignar' && (
        <AsignarModal ot={modal.ot} operadores={operadoresAsignables} onClose={cerrarModal} onSaved={onSaved} />
      )}
      {modal?.tipo === 'cerrar' && (
        <CerrarDirectoModal ot={modal.ot} onClose={cerrarModal} onSaved={onSaved} />
      )}
      {modal?.tipo === 'iniciar' && (
        <NotasOperadorModal ot={modal.ot} modo="iniciar" onClose={cerrarModal} onSaved={onSaved} />
      )}
      {modal?.tipo === 'notas' && (
        <NotasOperadorModal ot={modal.ot} modo="agregar_notas" onClose={cerrarModal} onSaved={onSaved} />
      )}
    </div>
  )
}
