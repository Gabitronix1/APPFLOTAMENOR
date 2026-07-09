import { ESTADO_OT_INFO } from '../../lib/ordenesTrabajo'
import { puedeGestionarOT } from '../../lib/roles'
import { PrioridadBadge } from './PrioridadBadge'
import type { OrdenTrabajo, Rol } from '../../types'

interface Props {
  sistema: string
  observacion: string | null
  ot: OrdenTrabajo | null
  rol: Rol | undefined
  userId: string | undefined
  onAsignar: (ot: OrdenTrabajo) => void
  onCerrar: (ot: OrdenTrabajo) => void
  onCancelar: (ot: OrdenTrabajo) => void
  onIniciar: (ot: OrdenTrabajo) => void
  onAgregarNotas: (ot: OrdenTrabajo) => void
}

export function FallaRow({
  sistema,
  observacion,
  ot,
  rol,
  userId,
  onAsignar,
  onCerrar,
  onCancelar,
  onIniciar,
  onAgregarNotas,
}: Props) {
  const esGestor = puedeGestionarOT(rol)
  const esPropia = !!ot && !!userId && ot.asignado_a === userId
  const estadoInfo = ot ? ESTADO_OT_INFO[ot.estado] : null

  return (
    <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="text-sm font-semibold text-gray-800">{sistema}</p>
          {estadoInfo && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${estadoInfo.badgeClass}`}>
              {estadoInfo.label}
            </span>
          )}
          {ot?.prioridad && <PrioridadBadge prioridad={ot.prioridad} />}
        </div>
        {observacion && <p className="text-xs text-gray-500">{observacion}</p>}
        {ot?.asignadoNombre && <p className="text-xs text-gray-500 mt-1">→ {ot.asignadoNombre}</p>}
        {ot?.descripcion && (
          <p className="text-xs text-gray-500 italic mt-1">&ldquo;{ot.descripcion}&rdquo;</p>
        )}
        {!ot && <p className="text-xs text-gray-400 mt-1">Sin orden de trabajo asociada.</p>}
      </div>

      {ot && (
        <div className="flex flex-wrap gap-1.5 shrink-0">
          {esGestor && ot.estado !== 'cerrada' && (
            <>
              <button onClick={() => onAsignar(ot)} className="btn-secondary btn-sm">
                {ot.estado === 'abierta' ? 'Asignar' : 'Reasignar'}
              </button>
              <button onClick={() => onCerrar(ot)} className="btn-primary btn-sm">
                Cerrar directo
              </button>
              <button onClick={() => onCancelar(ot)} className="btn-danger btn-sm">
                Cancelar
              </button>
            </>
          )}
          {!esGestor && esPropia && ot.estado === 'asignada' && (
            <button onClick={() => onIniciar(ot)} className="btn-primary btn-sm">
              Iniciar trabajo
            </button>
          )}
          {!esGestor && esPropia && ot.estado === 'en_progreso' && (
            <button onClick={() => onAgregarNotas(ot)} className="btn-secondary btn-sm">
              Agregar notas
            </button>
          )}
        </div>
      )}
    </div>
  )
}
