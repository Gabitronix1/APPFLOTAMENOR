import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useVehiculos } from '../hooks/useVehiculos'
import { ESTADO_VEHICULO_INFO, ESTADO_TOOLTIP } from '../lib/vehiculos'
import { fmtDate } from '../lib/constants'
import { SearchIcon } from '../components/vehiculos/icons'

export function Vehiculos() {
  const { vehiculos, loading, error } = useVehiculos()
  const [query, setQuery] = useState('')

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return vehiculos
    return vehiculos.filter(v => v.patente.toLowerCase().includes(q))
  }, [vehiculos, query])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehículos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            <span className="font-semibold text-gray-700">{vehiculos.length}</span> vehículos en la flota
          </p>
        </div>
        <div className="relative w-full sm:w-64">
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

      {error && <div className="text-fault text-sm mb-4">{error}</div>}

      {loading ? (
        <div className="text-sm text-gray-400 animate-pulse">Cargando vehículos...</div>
      ) : filtrados.length === 0 ? (
        <div className="card text-center text-gray-400 py-12">
          {query ? 'Sin resultados para esa búsqueda.' : 'No hay patentes registradas.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtrados.map(v => {
            const info = ESTADO_VEHICULO_INFO[v.estado]
            return (
              <Link
                key={v.id}
                to={`/vehiculos/${v.id}`}
                className="card hover:shadow-md hover:border-primary/30 transition-all block"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="font-mono font-bold text-xl text-dark">{v.patente}</span>
                  <span
                    className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${info.badgeClass}`}
                    title={ESTADO_TOOLTIP}
                  >
                    {info.emoji} {info.label}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{v.descripcion || 'Sin descripción'}</p>
                <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-3">
                  <span>{v.ultimaActividad ? fmtDate(v.ultimaActividad) : 'Sin actividad'}</span>
                  <span className={v.fallasActivas > 0 ? 'text-fault font-semibold' : 'text-gray-400'}>
                    {v.fallasActivas} falla{v.fallasActivas !== 1 ? 's' : ''} activa{v.fallasActivas !== 1 ? 's' : ''}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
