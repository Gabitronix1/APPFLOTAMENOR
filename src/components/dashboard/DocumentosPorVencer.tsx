import { Link } from 'react-router-dom'
import { EstadoDocumentoBadge } from '../vehiculos/EstadoDocumentoBadge'
import type { VDocumentoVencimiento } from '../../types'

interface Props {
  total: number
  top5: VDocumentoVencimiento[]
  loading: boolean
  error: string | null
}

export function DocumentosPorVencer({ total, top5, loading, error }: Props) {
  if (loading) {
    return <div className="text-sm text-gray-400 animate-pulse">Cargando vencimientos...</div>
  }
  if (error) {
    return <div className="text-fault text-sm">Error al cargar vencimientos: {error}</div>
  }

  return (
    <div className="card">
      <p className="text-4xl font-bold text-dark mb-4">{total}</p>
      {top5.length > 0 && (
        <div className="space-y-2">
          {top5.map(d => (
            <Link
              key={d.id}
              to={`/vehiculos/${d.patente_id}`}
              className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
            >
              <span className="text-sm font-semibold text-dark truncate">
                <span className="font-mono">{d.patente}</span> · {d.tipo_documento}
              </span>
              <EstadoDocumentoBadge estado={d.estado} />
            </Link>
          ))}
        </div>
      )}
      <Link to="/vencimientos" className="block text-center text-sm text-primary font-semibold pt-3 hover:text-primary/80">
        Ver todos los vencimientos →
      </Link>
    </div>
  )
}
