import { Link } from 'react-router-dom'
import { EstadoBadge } from '../vehiculos/EstadoBadge'
import { tiempoRelativo } from '../../lib/constants'
import type { MaquinariaEstado } from '../../hooks/useEstadoFlotaMaquinaria'
import type { EstadoMaquinaria } from '../../types'

interface Props {
  maquinarias: MaquinariaEstado[]
  filtroEstado: EstadoMaquinaria | null
  loading: boolean
  error: string | null
}

export function MaquinariasAtencion({ maquinarias, filtroEstado, loading, error }: Props) {
  if (loading) {
    return <div className="text-sm text-gray-400 animate-pulse">Cargando maquinarias...</div>
  }
  if (error) {
    return <div className="text-fault text-sm">Error al cargar maquinarias: {error}</div>
  }

  const lista = filtroEstado
    ? maquinarias.filter(m => m.estado === filtroEstado)
    : maquinarias.filter(m => m.estado !== 'operativo')

  if (lista.length === 0) {
    return (
      <div className="card text-center text-gray-400 py-8">
        {filtroEstado ? 'No hay maquinarias en este estado.' : 'Todas las maquinarias están operativas.'}
      </div>
    )
  }

  return (
    <div className="card p-0 divide-y divide-gray-100 overflow-hidden">
      {lista.map(m => (
        <Link
          key={m.id}
          to={`/maquinarias/${m.id}`}
          className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50 transition-colors flex-wrap"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <span className="font-mono font-bold text-dark text-sm">{m.codigo}</span>
              <span className="text-sm text-gray-600 truncate">{m.nombre}</span>
              <EstadoBadge estado={m.estado} />
            </div>
            <p className="text-xs text-gray-500">{m.motivo ?? 'Sin motivo registrado'}</p>
          </div>
          <span className="text-xs text-gray-400 shrink-0">{m.fecha ? tiempoRelativo(m.fecha) : '—'}</span>
        </Link>
      ))}
    </div>
  )
}
