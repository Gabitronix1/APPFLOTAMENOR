import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useVehiculos, type VehiculoResumen } from '../hooks/useVehiculos'
import { fmtDate } from '../lib/constants'
import { SearchIcon } from '../components/vehiculos/icons'
import { EstadoBadge } from '../components/vehiculos/EstadoBadge'

export function Vehiculos() {
  const { vehiculos, loading, error } = useVehiculos()
  const [query, setQuery] = useState('')
  const [mostrarEliminados, setMostrarEliminados] = useState(false)

  const activos = useMemo(() => vehiculos.filter(v => v.activo), [vehiculos])
  const eliminadosCount = vehiculos.length - activos.length

  const filtrados = useMemo(() => {
    const base = mostrarEliminados ? vehiculos : activos
    const q = query.trim().toLowerCase()
    if (!q) return base
    return base.filter(v => v.patente.toLowerCase().includes(q))
  }, [vehiculos, activos, mostrarEliminados, query])

  const grupos = useMemo(() => {
    const map = new Map<string, VehiculoResumen[]>()
    for (const v of filtrados) {
      const list = map.get(v.categoriaNombre) ?? []
      list.push(v)
      map.set(v.categoriaNombre, list)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtrados])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehículos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            <span className="font-semibold text-gray-700">{activos.length}</span> vehículos en la flota
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {eliminadosCount > 0 && (
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none whitespace-nowrap">
              <input
                type="checkbox"
                checked={mostrarEliminados}
                onChange={e => setMostrarEliminados(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              Ver eliminados ({eliminadosCount})
            </label>
          )}
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
      </div>

      {error && <div className="text-fault text-sm mb-4">{error}</div>}

      {loading ? (
        <div className="text-sm text-gray-400 animate-pulse">Cargando vehículos...</div>
      ) : filtrados.length === 0 ? (
        <div className="card text-center text-gray-400 py-12">
          {query ? 'Sin resultados para esa búsqueda.' : 'No hay patentes registradas.'}
        </div>
      ) : (
        <div className="space-y-8">
          {grupos.map(([categoria, items]) => (
            <div key={categoria}>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">{categoria}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map(v => (
                  <Link
                    key={v.id}
                    to={`/vehiculos/${v.id}`}
                    className={`card hover:shadow-md hover:border-primary/30 transition-all block ${!v.activo ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="font-mono font-bold text-xl text-dark">{v.patente}</span>
                      {v.activo ? (
                        <EstadoBadge estado={v.estado} className="shrink-0" />
                      ) : (
                        <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-white">
                          Eliminado
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{v.descripcion || 'Sin descripción'}</p>
                    <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-3">
                      <span>{v.ultimaActividad ? fmtDate(v.ultimaActividad) : 'Sin actividad'}</span>
                      <span className={v.fallasActivas > 0 ? 'text-fault font-semibold' : 'text-gray-400'}>
                        {v.fallasActivas} falla{v.fallasActivas !== 1 ? 's' : ''} activa{v.fallasActivas !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
