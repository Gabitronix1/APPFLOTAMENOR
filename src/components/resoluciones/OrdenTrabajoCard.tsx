import { fmtDate } from '../../lib/constants'
import { PrioridadBadge } from './PrioridadBadge'
import type { OrdenTrabajo, Rol } from '../../types'

interface Props {
  ot: OrdenTrabajo
  rol: Rol | undefined
  userId: string | undefined
  onAsignar: () => void
  onCerrar: () => void
  onCancelar: () => void
  onIniciar: () => void
  onAgregarNotas: () => void
}

export function OrdenTrabajoCard({
  ot,
  rol,
  userId,
  onAsignar,
  onCerrar,
  onCancelar,
  onIniciar,
  onAgregarNotas,
}: Props) {
  const esGestor = rol === 'encargado' || rol === 'admin'
  const esPropia = !!userId && ot.asignado_a === userId

  return (
    <div className="card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-dark">
          <span className="font-mono">{ot.patente}</span> · {ot.sistema}
        </span>
        {ot.prioridad && <PrioridadBadge prioridad={ot.prioridad} />}
      </div>

      <p className="text-xs text-gray-400">Abierta el {fmtDate(ot.created_at)}</p>

      {ot.asignadoNombre && (
        <p className="text-xs text-gray-500">
          Asignado a <span className="font-medium text-gray-700">{ot.asignadoNombre}</span>
        </p>
      )}

      {ot.descripcion && (
        <p className="text-xs text-gray-500 italic line-clamp-2">&ldquo;{ot.descripcion}&rdquo;</p>
      )}

      {esGestor && ot.estado !== 'cerrada' && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button onClick={onAsignar} className="btn-secondary btn-sm">
            {ot.estado === 'abierta' ? 'Asignar' : 'Reasignar'}
          </button>
          <button onClick={onCerrar} className="btn-primary btn-sm">
            Cerrar directo
          </button>
          <button onClick={onCancelar} className="btn-danger btn-sm">
            Cancelar
          </button>
        </div>
      )}

      {!esGestor && esPropia && ot.estado === 'asignada' && (
        <div className="pt-1">
          <button onClick={onIniciar} className="btn-primary btn-sm w-full">
            Iniciar trabajo
          </button>
        </div>
      )}

      {!esGestor && esPropia && ot.estado === 'en_progreso' && (
        <div className="pt-1">
          <button onClick={onAgregarNotas} className="btn-secondary btn-sm w-full">
            Agregar notas
          </button>
        </div>
      )}
    </div>
  )
}
