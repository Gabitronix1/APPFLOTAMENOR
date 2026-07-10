import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useOrdenesTrabajo } from '../../hooks/useOrdenesTrabajo'
import type { Filters } from '../../hooks/useFilters'
import { supabase } from '../../lib/supabase'
import { ESTADO_OT_INFO } from '../../lib/ordenesTrabajo'
import { FallaRow } from '../resoluciones/FallaRow'
import { PrioridadBadge } from '../resoluciones/PrioridadBadge'
import { AsignarModal } from '../resoluciones/AsignarModal'
import { CerrarDirectoModal } from '../resoluciones/CerrarDirectoModal'
import { NotasOperadorModal } from '../resoluciones/NotasOperadorModal'
import type { OrdenTrabajo, PrioridadOT, VInspeccion } from '../../types'

interface SecPrioridadesOTProps {
  filters: Filters
}

interface FilaOT {
  key: string
  patente: string
  sistema: string
  observacion: string | null
  ot: OrdenTrabajo
  diasAbierta: number
}

const ESTADOS_PENDIENTES = ['abierta', 'asignada', 'en_progreso']
const RANK: Record<PrioridadOT, number> = { urgente: 4, alta: 3, media: 2, baja: 1 }

function matchesFilters(insp: VInspeccion, f: Filters): boolean {
  if (f.fundo && insp.fundo !== f.fundo) return false
  if (f.contrato && insp.contrato !== f.contrato) return false
  if (f.conductor && insp.conductor !== f.conductor) return false
  if (f.patente && insp.patente !== f.patente) return false
  if (f.desde && insp.fecha.slice(0, 10) < f.desde) return false
  if (f.hasta && insp.fecha.slice(0, 10) > f.hasta) return false
  const q = f.search.toLowerCase().trim()
  if (q) {
    const hay = [insp.patente, insp.conductor, insp.fundo, insp.contrato, insp.obs_general]
      .map(x => (x ?? '').toLowerCase()).join(' ')
    if (!hay.includes(q)) return false
  }
  return true
}

type ModalState =
  | { tipo: 'asignar'; ot: OrdenTrabajo }
  | { tipo: 'cerrar'; ot: OrdenTrabajo }
  | { tipo: 'iniciar'; ot: OrdenTrabajo }
  | { tipo: 'notas'; ot: OrdenTrabajo }
  | null

export function SecPrioridadesOT({ filters }: SecPrioridadesOTProps) {
  const { perfil, user } = useAuth()
  const { grupos, operadoresAsignables, loading, error, refetch } = useOrdenesTrabajo()
  const [openRows, setOpenRows] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<ModalState>(null)

  const filas = useMemo((): FilaOT[] => {
    const ahora = Date.now()
    const rows: FilaOT[] = []
    grupos
      .filter(g => matchesFilters(g.inspeccion, filters))
      .forEach(g => {
        g.fallas.forEach(f => {
          if (!f.ot || !ESTADOS_PENDIENTES.includes(f.ot.estado)) return
          rows.push({
            key: f.ot.id,
            patente: g.inspeccion.patente,
            sistema: f.sistema,
            observacion: f.observacion,
            ot: f.ot,
            diasAbierta: Math.floor((ahora - new Date(f.ot.created_at).getTime()) / 86400000),
          })
        })
      })
    return rows.sort((a, b) => {
      const rankA = a.ot.prioridad ? RANK[a.ot.prioridad] : 0
      const rankB = b.ot.prioridad ? RANK[b.ot.prioridad] : 0
      return rankB - rankA || b.diasAbierta - a.diasAbierta
    })
  }, [grupos, filters])

  function toggleRow(key: string) {
    setOpenRows(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function cancelar(ot: OrdenTrabajo) {
    if (!window.confirm(`¿Cancelar la orden de trabajo de ${ot.patente} · ${ot.sistema}?`)) return
    await supabase.from('resoluciones').update({ estado: 'cancelada' }).eq('id', ot.id)
    refetch()
  }

  function onSaved() {
    setModal(null)
    refetch()
  }

  if (loading) {
    return <div className="text-sm text-gray-400 animate-pulse py-8 text-center">Cargando órdenes de trabajo...</div>
  }

  if (error) {
    return <div className="text-fault text-sm">{error}</div>
  }

  const urgentes = filas.filter(f => f.ot.prioridad === 'urgente').length

  return (
    <div>
      <div className="rounded-xl border-l-4 border-warn bg-warn/5 px-4 py-3 mb-4 text-sm text-gray-700">
        {filas.length
          ? <><b>{filas.length} falla(s)</b> con orden de trabajo abierta, asignada o en progreso.{' '}
              {urgentes > 0 && <><b className="text-fault">{urgentes}</b> con prioridad urgente. </>}
              Ordenadas por prioridad y antigüedad. Toca una fila para ver la falla y actuar.
            </>
          : 'No hay órdenes de trabajo pendientes para los filtros aplicados. 👍'
        }
      </div>

      {filas.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="table-th">Patente</th>
                  <th className="table-th">Sistema afectado</th>
                  <th className="table-th">Prioridad</th>
                  <th className="table-th">Estado</th>
                  <th className="table-th">Asignado a</th>
                  <th className="table-th text-center">Días abierta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filas.map(fila => {
                  const isOpen = openRows.has(fila.key)
                  const estadoInfo = ESTADO_OT_INFO[fila.ot.estado]
                  return [
                    <tr
                      key={`main-${fila.key}`}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${isOpen ? 'bg-primary/5' : ''}`}
                      onClick={() => toggleRow(fila.key)}
                    >
                      <td className="table-td"><span className="font-mono font-bold text-dark">{fila.patente}</span></td>
                      <td className="table-td text-sm">{fila.sistema}</td>
                      <td className="table-td">
                        {fila.ot.prioridad ? <PrioridadBadge prioridad={fila.ot.prioridad} /> : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="table-td">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${estadoInfo.badgeClass}`}>
                          {estadoInfo.label}
                        </span>
                      </td>
                      <td className="table-td text-sm text-gray-600">{fila.ot.asignadoNombre ?? '—'}</td>
                      <td className="table-td text-center">
                        <span className={fila.diasAbierta > 7 ? 'badge-fault' : 'badge-warn'}>{fila.diasAbierta}d</span>
                      </td>
                    </tr>,
                    isOpen && (
                      <tr key={`detail-${fila.key}`}>
                        <td colSpan={6} className="bg-gray-50 p-0">
                          <FallaRow
                            sistema={fila.sistema}
                            observacion={fila.observacion}
                            ot={fila.ot}
                            rol={perfil?.rol}
                            userId={user?.id}
                            onAsignar={ot => setModal({ tipo: 'asignar', ot })}
                            onCerrar={ot => setModal({ tipo: 'cerrar', ot })}
                            onCancelar={ot => void cancelar(ot)}
                            onIniciar={ot => setModal({ tipo: 'iniciar', ot })}
                            onAgregarNotas={ot => setModal({ tipo: 'notas', ot })}
                          />
                        </td>
                      </tr>
                    ),
                  ]
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal?.tipo === 'asignar' && (
        <AsignarModal ot={modal.ot} operadores={operadoresAsignables} onClose={() => setModal(null)} onSaved={onSaved} />
      )}
      {modal?.tipo === 'cerrar' && (
        <CerrarDirectoModal ot={modal.ot} onClose={() => setModal(null)} onSaved={onSaved} />
      )}
      {modal?.tipo === 'iniciar' && (
        <NotasOperadorModal ot={modal.ot} modo="iniciar" onClose={() => setModal(null)} onSaved={onSaved} />
      )}
      {modal?.tipo === 'notas' && (
        <NotasOperadorModal ot={modal.ot} modo="agregar_notas" onClose={() => setModal(null)} onSaved={onSaved} />
      )}
    </div>
  )
}
