import { ESTADOS_VEHICULO, ESTADO_VEHICULO_INFO } from '../../lib/vehiculos'
import type { EstadoVehiculo } from '../../types'

interface Props {
  counts: Record<EstadoVehiculo, number>
  loading: boolean
  selected: EstadoVehiculo | null
  onSelect: (estado: EstadoVehiculo | null) => void
}

export function SemaforoFlota({ counts, loading, selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {ESTADOS_VEHICULO.map(estado => {
        const info = ESTADO_VEHICULO_INFO[estado]
        const isSelected = selected === estado
        return (
          <button
            key={estado}
            onClick={() => onSelect(isSelected ? null : estado)}
            className={`card text-left transition-all ${isSelected ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${info.dotClass}`} />
              <span className="text-xs text-gray-500">{info.label}</span>
            </div>
            <p className="text-3xl font-bold text-dark">{loading ? '—' : counts[estado] ?? 0}</p>
          </button>
        )
      })}
    </div>
  )
}
