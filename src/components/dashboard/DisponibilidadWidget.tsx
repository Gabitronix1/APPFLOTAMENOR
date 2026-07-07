import { ESTADO_VEHICULO_INFO } from '../../lib/vehiculos'
import type { Disponibilidad } from '../../types'

interface Props {
  data: Disponibilidad[]
  loading: boolean
  error: string | null
}

export function DisponibilidadWidget({ data, loading, error }: Props) {
  if (loading) {
    return <div className="text-sm text-gray-400 animate-pulse">Cargando disponibilidad...</div>
  }
  if (error) {
    return <div className="text-fault text-sm">Error al cargar disponibilidad: {error}</div>
  }
  if (data.length === 0) {
    return <div className="text-sm text-gray-400">Sin datos de disponibilidad para el período.</div>
  }

  return (
    <div>
      <div className="w-full h-8 rounded-full overflow-hidden flex bg-gray-100">
        {data
          .filter(d => d.porcentaje > 0)
          .map(d => (
            <div
              key={d.estado}
              className={ESTADO_VEHICULO_INFO[d.estado].dotClass}
              style={{ width: `${d.porcentaje}%` }}
              title={`${ESTADO_VEHICULO_INFO[d.estado].label}: ${d.porcentaje.toFixed(1)}%`}
            />
          ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
        {data.map(d => (
          <div key={d.estado} className="flex items-center gap-2 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${ESTADO_VEHICULO_INFO[d.estado].dotClass}`} />
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">{ESTADO_VEHICULO_INFO[d.estado].label}</p>
              <p className="text-sm font-bold text-dark">
                {d.porcentaje.toFixed(0)}%
                <span className="text-xs font-normal text-gray-400"> · {d.dias}d</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
