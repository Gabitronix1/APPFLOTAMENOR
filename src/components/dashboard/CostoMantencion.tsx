import { Link } from 'react-router-dom'
import { fmtCLP } from '../../lib/constants'
import type { CostoVehiculo } from '../../types'

interface Props {
  total: number
  top5: CostoVehiculo[]
  loading: boolean
  error: string | null
}

export function CostoMantencion({ total, top5, loading, error }: Props) {
  if (loading) {
    return <div className="text-sm text-gray-400 animate-pulse">Cargando costos...</div>
  }
  if (error) {
    return <div className="text-fault text-sm">Error al cargar costos: {error}</div>
  }

  return (
    <div className="card">
      <p className="text-4xl font-bold text-dark mb-4">{fmtCLP(total)}</p>
      {top5.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Top 5 más caros del mes</p>
          {top5.map(c => (
            <Link
              key={c.patente_id}
              to={`/vehiculos/${c.patente_id}`}
              className="flex items-center justify-between px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
            >
              <span className="font-mono font-semibold text-sm text-dark">{c.patente}</span>
              <span className="text-sm font-bold text-gray-700">{fmtCLP(c.costo_total)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
