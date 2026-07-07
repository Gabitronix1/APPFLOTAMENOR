import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVencimientos } from '../hooks/useVencimientos'
import {
  ESTADOS_DOCUMENTO_FILTRO,
  ORDEN_ESTADO_DOCUMENTO,
  diasRestantesLabel,
} from '../lib/documentos'
import { fmtDate } from '../lib/constants'
import { SearchIcon } from '../components/vehiculos/icons'
import { EstadoDocumentoBadge } from '../components/vehiculos/EstadoDocumentoBadge'
import { KpiCard } from '../components/vehiculos/KpiCard'
import type { EstadoDocumento } from '../types'

export function Vencimientos() {
  const { documentos, loading, error } = useVencimientos()
  const [filtroEstado, setFiltroEstado] = useState<EstadoDocumento | 'todos'>('todos')
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const kpis = useMemo(() => {
    const vencidos = documentos.filter(d => d.estado === 'vencido').length
    const porVencer = documentos.filter(d => d.estado === 'por_vencer').length
    const vigentes = documentos.filter(d => d.estado === 'vigente').length
    const vehiculosFaltantes = new Set(
      documentos.filter(d => d.estado === 'sin_registro').map(d => d.patenteId),
    ).size
    return { vencidos, porVencer, vigentes, vehiculosFaltantes }
  }, [documentos])

  const filtrados = useMemo(() => {
    let rows = documentos
    if (filtroEstado !== 'todos') rows = rows.filter(d => d.estado === filtroEstado)
    const q = query.trim().toLowerCase()
    if (q) rows = rows.filter(d => d.patente.toLowerCase().includes(q))

    return [...rows].sort((a, b) => {
      const rankDiff = ORDEN_ESTADO_DOCUMENTO[a.estado] - ORDEN_ESTADO_DOCUMENTO[b.estado]
      if (rankDiff !== 0) return rankDiff
      if (a.diasRestantes != null && b.diasRestantes != null) return a.diasRestantes - b.diasRestantes
      return a.patente.localeCompare(b.patente)
    })
  }, [documentos, filtroEstado, query])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vencimientos</h1>
        <p className="text-sm text-gray-500 mt-0.5">Documentación de toda la flota — aviso temprano de vencimientos.</p>
      </div>

      {error && <div className="text-fault text-sm mb-4">{error}</div>}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Vencidos" value={kpis.vencidos} accent={kpis.vencidos > 0} />
        <KpiCard label="Por vencer (≤30 días)" value={kpis.porVencer} />
        <KpiCard label="Vigentes" value={kpis.vigentes} />
        <KpiCard label="Vehículos con documentos faltantes" value={kpis.vehiculosFaltantes} />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          {ESTADOS_DOCUMENTO_FILTRO.map(f => (
            <button
              key={f.value}
              onClick={() => setFiltroEstado(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filtroEstado === f.value
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64 sm:ml-auto">
          <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por patente..."
            className="input pl-9"
          />
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-sm text-gray-400 animate-pulse">Cargando vencimientos...</div>
      ) : filtrados.length === 0 ? (
        <div className="card text-center text-gray-400 py-12">Sin resultados para este filtro.</div>
      ) : (
        <div className="card p-0 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-th">Patente</th>
                <th className="table-th">Tipo documento</th>
                <th className="table-th">Vencimiento</th>
                <th className="table-th">Días restantes</th>
                <th className="table-th">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.map(d => (
                <tr
                  key={`${d.patenteId}-${d.tipoDocumentoId}`}
                  onClick={() => navigate(`/vehiculos/${d.patenteId}`)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <td className="table-td font-mono font-semibold text-dark">{d.patente}</td>
                  <td className="table-td">{d.tipoDocumento}</td>
                  <td className="table-td">{d.fechaVencimiento ? fmtDate(d.fechaVencimiento) : '—'}</td>
                  <td className="table-td">
                    {d.diasRestantes != null ? diasRestantesLabel(d.diasRestantes) : '—'}
                  </td>
                  <td className="table-td">
                    <EstadoDocumentoBadge estado={d.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
