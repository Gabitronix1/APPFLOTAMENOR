import { PRIORIDAD_OT_INFO } from '../../lib/ordenesTrabajo'
import type { PrioridadOT } from '../../types'

export function PrioridadBadge({ prioridad }: { prioridad: PrioridadOT }) {
  const info = PRIORIDAD_OT_INFO[prioridad]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${info.badgeClass}`}>
      {info.label}
    </span>
  )
}
