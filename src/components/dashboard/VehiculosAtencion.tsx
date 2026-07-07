import { Link } from 'react-router-dom'
import { EstadoBadge } from '../vehiculos/EstadoBadge'
import { tiempoRelativo } from '../../lib/constants'
import type { VehiculoEstado } from '../../hooks/useEstadoFlota'
import type { EstadoVehiculo } from '../../types'

interface Props {
  vehiculos: VehiculoEstado[]
  filtroEstado: EstadoVehiculo | null
  loading: boolean
  error: string | null
}

export function VehiculosAtencion({ vehiculos, filtroEstado, loading, error }: Props) {
  if (loading) {
    return <div className="text-sm text-gray-400 animate-pulse">Cargando vehículos...</div>
  }
  if (error) {
    return <div className="text-fault text-sm">Error al cargar vehículos: {error}</div>
  }

  const lista = filtroEstado
    ? vehiculos.filter(v => v.estado === filtroEstado)
    : vehiculos.filter(v => v.estado !== 'operativo')

  if (lista.length === 0) {
    return (
      <div className="card text-center text-gray-400 py-8">
        {filtroEstado ? 'No hay vehículos en este estado.' : 'Todos los vehículos están operativos.'}
      </div>
    )
  }

  return (
    <div className="card p-0 divide-y divide-gray-100 overflow-hidden">
      {lista.map(v => (
        <Link
          key={v.id}
          to={`/vehiculos/${v.id}`}
          className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50 transition-colors flex-wrap"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <span className="font-mono font-bold text-dark text-sm">{v.patente}</span>
              <EstadoBadge estado={v.estado} />
            </div>
            <p className="text-xs text-gray-500">{v.motivo ?? 'Sin motivo registrado'}</p>
          </div>
          <span className="text-xs text-gray-400 shrink-0">{v.fecha ? tiempoRelativo(v.fecha) : '—'}</span>
        </Link>
      ))}
    </div>
  )
}
