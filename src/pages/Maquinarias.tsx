import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMaquinarias, type MaquinariaResumen } from '../hooks/useMaquinarias'
import { SearchIcon } from '../components/vehiculos/icons'
import { EstadoBadge } from '../components/vehiculos/EstadoBadge'

export function Maquinarias() {
  const { maquinarias, loading, error } = useMaquinarias()
  const [query, setQuery] = useState('')

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return maquinarias
    return maquinarias.filter(m => m.codigo.toLowerCase().includes(q) || m.nombre.toLowerCase().includes(q))
  }, [maquinarias, query])

  const grupos = useMemo(() => {
    const map = new Map<string, MaquinariaResumen[]>()
    for (const m of filtradas) {
      const list = map.get(m.categoriaNombre) ?? []
      list.push(m)
      map.set(m.categoriaNombre, list)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtradas])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maquinarias</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            <span className="font-semibold text-gray-700">{maquinarias.length}</span> maquinarias en la flota
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por código o nombre..."
            className="input pl-9"
          />
        </div>
      </div>

      {error && <div className="text-fault text-sm mb-4">{error}</div>}

      {loading ? (
        <div className="text-sm text-gray-400 animate-pulse">Cargando maquinarias...</div>
      ) : filtradas.length === 0 ? (
        <div className="card text-center text-gray-400 py-12">
          {query ? 'Sin resultados para esa búsqueda.' : 'No hay maquinarias registradas.'}
        </div>
      ) : (
        <div className="space-y-8">
          {grupos.map(([categoria, items]) => (
            <div key={categoria}>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">{categoria}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map(m => (
                  <Link
                    key={m.id}
                    to={`/maquinarias/${m.id}`}
                    className="card hover:shadow-md hover:border-primary/30 transition-all block"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="font-mono font-bold text-xl text-dark">{m.codigo}</span>
                      <EstadoBadge estado={m.estado} className="shrink-0" />
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{m.nombre}</p>
                    {m.esAditamento && (
                      <p className="text-xs text-primary font-medium mt-2">
                        🔗 Aditamento{m.padreCodigo ? ` de ${m.padreCodigo}` : ''}
                      </p>
                    )}
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
