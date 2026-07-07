import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useOrdenesTrabajo } from '../hooks/useOrdenesTrabajo'
import { COLUMNAS_OT } from '../lib/ordenesTrabajo'
import { supabase } from '../lib/supabase'
import { OrdenTrabajoCard } from '../components/resoluciones/OrdenTrabajoCard'
import { AsignarModal } from '../components/resoluciones/AsignarModal'
import { CerrarDirectoModal } from '../components/resoluciones/CerrarDirectoModal'
import { NotasOperadorModal } from '../components/resoluciones/NotasOperadorModal'
import { KpiCard } from '../components/vehiculos/KpiCard'
import type { OrdenTrabajo } from '../types'

type ModalState =
  | { tipo: 'asignar'; ot: OrdenTrabajo }
  | { tipo: 'cerrar'; ot: OrdenTrabajo }
  | { tipo: 'iniciar'; ot: OrdenTrabajo }
  | { tipo: 'notas'; ot: OrdenTrabajo }
  | null

const SIETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000

export function Resoluciones() {
  const { perfil, user } = useAuth()
  const { ordenes, operadoresAsignables, loading, error, refetch } = useOrdenesTrabajo()
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

  const columnas = useMemo(
    () => COLUMNAS_OT.map(col => ({ ...col, items: ordenes.filter(o => o.estado === col.estado) })),
    [ordenes],
  )

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
      <p className="text-sm text-gray-500 mb-6">Seguimiento de fallas detectadas, desde apertura hasta cierre.</p>

      {error && <div className="text-fault text-sm mb-4">{error}</div>}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Total abiertas" value={kpis.abiertas} />
        <KpiCard label="Total en progreso" value={kpis.enProgreso} />
        <KpiCard label="Vencidas (+7 días sin mover)" value={kpis.vencidas} accent={kpis.vencidas > 0} />
        <KpiCard label="Cerradas este mes" value={kpis.cerradasEsteMes} />
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 animate-pulse">Cargando órdenes de trabajo...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {columnas.map(col => (
            <div key={col.estado} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-sm font-semibold text-gray-700">
                  {col.emoji} {col.label}
                </h2>
                <span className="text-xs text-gray-400 font-medium">{col.items.length}</span>
              </div>
              <div className="space-y-3">
                {col.items.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">Sin órdenes.</p>
                ) : (
                  col.items.map(ot => (
                    <OrdenTrabajoCard
                      key={ot.id}
                      ot={ot}
                      rol={perfil?.rol}
                      userId={user?.id}
                      onAsignar={() => setModal({ tipo: 'asignar', ot })}
                      onCerrar={() => setModal({ tipo: 'cerrar', ot })}
                      onCancelar={() => void cancelar(ot)}
                      onIniciar={() => setModal({ tipo: 'iniciar', ot })}
                      onAgregarNotas={() => setModal({ tipo: 'notas', ot })}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
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
