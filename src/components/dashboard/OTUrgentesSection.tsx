import { Link } from 'react-router-dom'
import { ESTADO_OT_INFO } from '../../lib/ordenesTrabajo'
import { PrioridadBadge } from '../resoluciones/PrioridadBadge'
import { tiempoRelativo } from '../../lib/constants'
import type { OTUrgente } from '../../hooks/useOTUrgentes'

interface Props {
  items: OTUrgente[]
  loading: boolean
  error: string | null
}

export function OTUrgentesSection({ items, loading, error }: Props) {
  if (loading) {
    return <div className="text-sm text-gray-400 animate-pulse">Cargando órdenes de trabajo...</div>
  }
  if (error) {
    return <div className="text-fault text-sm">Error al cargar órdenes de trabajo: {error}</div>
  }
  if (items.length === 0) {
    return <div className="card text-center text-gray-400 py-8">No hay órdenes de trabajo activas.</div>
  }

  return (
    <div className="space-y-2">
      {items.map(ot => (
        <div key={ot.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-gray-100 bg-white">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-dark truncate">
              <span className="font-mono">{ot.patente}</span> · {ot.sistema}
            </p>
            <p className="text-xs text-gray-400">Abierta {tiempoRelativo(ot.created_at)}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {ot.prioridad && <PrioridadBadge prioridad={ot.prioridad} />}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_OT_INFO[ot.estado].badgeClass}`}>
              {ESTADO_OT_INFO[ot.estado].label}
            </span>
          </div>
        </div>
      ))}
      <Link to="/ordenes-trabajo" className="block text-center text-sm text-primary font-semibold pt-2 hover:text-primary/80">
        Ver todas las órdenes de trabajo →
      </Link>
    </div>
  )
}
