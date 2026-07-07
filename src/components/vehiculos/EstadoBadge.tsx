import { ESTADO_VEHICULO_INFO } from '../../lib/vehiculos'
import type { EstadoVehiculo } from '../../types'

interface Props {
  estado: EstadoVehiculo
  className?: string
}

export function EstadoBadge({ estado, className = '' }: Props) {
  const info = ESTADO_VEHICULO_INFO[estado]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${info.badgeClass} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${info.dotClass}`} />
      {info.label}
    </span>
  )
}
