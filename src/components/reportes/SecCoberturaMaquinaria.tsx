import { useMemo, useState } from 'react'
import { fmtDate } from '../../lib/constants'
import { KpiGrid } from './KpiTile'
import type { IntervencionMaquinariaCompleta } from '../../hooks/useIntervencionesMaquinaria'
import type { CategoriaMaquinaria, Maquinaria } from '../../types'

interface SecCoberturaMaquinariaProps {
  data: IntervencionMaquinariaCompleta[]
  maquinarias: Maquinaria[]
  categorias: CategoriaMaquinaria[]
}

interface MaquinaInfo {
  id: string
  codigo: string
  n: number
  last: string | null
  categoria: string
}

type CovFilter = 'all' | 'rep' | 'sin'

const SIN_CATEGORIA = 'Sin categoría'

export function SecCoberturaMaquinaria({ data, maquinarias, categorias }: SecCoberturaMaquinariaProps) {
  const [covFilter, setCovFilter] = useState<CovFilter>('all')
  const [search, setSearch] = useState('')

  const allMaquinas = useMemo(() => {
    const nombrePorCategoria = new Map(categorias.map(c => [c.id, c.nombre]))
    const statsPorId: Record<string, { n: number; last: string | null }> = {}
    data.forEach(d => {
      if (!statsPorId[d.maquinariaId]) statsPorId[d.maquinariaId] = { n: 0, last: null }
      statsPorId[d.maquinariaId].n++
      const dia = d.fecha.slice(0, 10)
      if (!statsPorId[d.maquinariaId].last || dia > statsPorId[d.maquinariaId].last!) {
        statsPorId[d.maquinariaId].last = dia
      }
    })
    return maquinarias
      .filter(m => m.activo)
      .map((m): MaquinaInfo => ({
        id: m.id,
        codigo: m.codigo,
        n: statsPorId[m.id]?.n ?? 0,
        last: statsPorId[m.id]?.last ?? null,
        categoria: (m.categoria_id && nombrePorCategoria.get(m.categoria_id)) || SIN_CATEGORIA,
      }))
  }, [data, maquinarias, categorias])

  const total = allMaquinas.length
  const conDatos = allMaquinas.filter(m => m.n > 0).length
  const sinDatos = total - conDatos
  const cobertura = total ? Math.round((conDatos / total) * 100) : 0

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return allMaquinas
      .filter(m => {
        if (covFilter === 'rep' && m.n === 0) return false
        if (covFilter === 'sin' && m.n > 0) return false
        if (q && !m.codigo.toLowerCase().includes(q)) return false
        return true
      })
      .sort((a, b) => Number(b.n > 0) - Number(a.n > 0) || b.n - a.n || a.codigo.localeCompare(b.codigo))
  }, [allMaquinas, covFilter, search])

  const grouped = useMemo(() => {
    const groups = new Map<string, MaquinaInfo[]>()
    filtered.forEach(m => {
      const list = groups.get(m.categoria) ?? []
      list.push(m)
      groups.set(m.categoria, list)
    })
    return [...groups.entries()].sort(([a], [b]) => {
      if (a === SIN_CATEGORIA) return 1
      if (b === SIN_CATEGORIA) return -1
      return a.localeCompare(b, 'es')
    })
  }, [filtered])

  return (
    <div>
      <KpiGrid items={[
        { label: 'Maquinarias totales', value: total, foot: 'activas', color: 'text-dark' },
        { label: 'Con intervenciones', value: conDatos, foot: `${cobertura}% de cobertura`, color: 'text-primary' },
        { label: 'Sin ninguna', value: sinDatos, foot: sinDatos ? 'nunca intervenidas' : 'todas cubiertas', color: sinDatos > 0 ? 'text-fault' : 'text-gray-400' },
        { label: 'Cobertura', value: `${cobertura}%`, foot: 'del total de maquinarias', color: cobertura >= 70 ? 'text-primary' : 'text-warn' },
      ]} />

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {([['all', 'Todas'], ['rep', 'Con datos'], ['sin', 'Sin datos']] as const).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setCovFilter(v)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                covFilter === v ? 'bg-white text-dark shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Buscar máquina..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input w-48 text-sm"
        />
      </div>

      {!filtered.length ? (
        <div className="text-sm text-gray-400 text-center py-8">Sin maquinarias para este filtro.</div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([categoria, items]) => (
            <div key={categoria}>
              <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {categoria} <span className="text-gray-300">· {items.length}</span>
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                {items.map(m => (
                  m.n === 0 ? (
                    <div key={m.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-center">
                      <p className="font-mono font-bold text-gray-500 text-sm">{m.codigo}</p>
                      <p className="text-xs text-gray-400 mt-1">sin datos</p>
                    </div>
                  ) : (
                    <div key={m.id} className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                      <p className="font-mono font-bold text-dark text-sm">{m.codigo}</p>
                      <p className="text-xs text-gray-500 mt-1">{m.n} interv.</p>
                      {m.last && <p className="text-xs text-gray-400">{fmtDate(m.last)}</p>}
                    </div>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
