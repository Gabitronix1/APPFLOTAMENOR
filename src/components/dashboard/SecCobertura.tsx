import { useMemo, useState } from 'react'
import { fmtDate } from '../../lib/constants'
import type { VInspeccion, Patente } from '../../types'

interface SecCoberturaProps {
  data: VInspeccion[]
  patentesNomina: Patente[]
}

interface PlateInfo {
  plate: string
  n: number
  faults: number
  last: string | null
}

type CovFilter = 'all' | 'rep' | 'sin'

export function SecCobertura({ data, patentesNomina }: SecCoberturaProps) {
  const [covFilter, setCovFilter] = useState<CovFilter>('all')
  const [search, setSearch] = useState('')

  const { allPlates, byPlate } = useMemo(() => {
    const bpMap: Record<string, { n: number; faults: number; last: string | null }> = {}
    data.forEach(r => {
      if (!r.patente) return
      const d = r.fecha.slice(0, 10)
      if (!bpMap[r.patente]) bpMap[r.patente] = { n: 0, faults: 0, last: null }
      bpMap[r.patente].n++
      bpMap[r.patente].faults += r.n_fallas
      if (!bpMap[r.patente].last || d > bpMap[r.patente].last!) {
        bpMap[r.patente].last = d
      }
    })
    const nomina = patentesNomina.filter(p => p.activo).map(p => p.patente)
    const all = [...new Set([...nomina, ...Object.keys(bpMap)])]
      .map(pl => ({ plate: pl, ...(bpMap[pl] ?? { n: 0, faults: 0, last: null }) } as PlateInfo))
    return { allPlates: all, byPlate: bpMap }
  }, [data, patentesNomina])

  const totalFleet = allPlates.length
  const conRep = allPlates.filter(p => p.n > 0).length
  const sinRep = totalFleet - conRep
  const cobertura = totalFleet ? Math.round(conRep / totalFleet * 100) : 0

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return allPlates
      .filter(p => {
        if (covFilter === 'rep' && p.n === 0) return false
        if (covFilter === 'sin' && p.n > 0) return false
        if (q && !p.plate.toLowerCase().includes(q)) return false
        return true
      })
      .sort((a, b) => Number(b.n > 0) - Number(a.n > 0) || b.faults - a.faults || a.plate.localeCompare(b.plate))
  }, [allPlates, covFilter, search, byPlate])

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Patentes en flota', value: totalFleet, foot: 'nómina de patentes', color: 'text-dark' },
          { label: 'Con reportes', value: conRep, foot: `${cobertura}% de cobertura`, color: 'text-primary' },
          { label: 'Sin reportes', value: sinRep, foot: sinRep ? 'nunca inspeccionadas' : 'todas cubiertas', color: sinRep > 0 ? 'text-fault' : 'text-gray-400' },
          { label: 'Cobertura', value: `${cobertura}%`, foot: 'del total de patentes', color: cobertura >= 70 ? 'text-primary' : 'text-warn' },
        ].map(k => (
          <div key={k.label} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{k.label}</p>
            <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-gray-400 mt-1">{k.foot}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {([['all', 'Todas'], ['rep', 'Con reportes'], ['sin', 'Sin reportes']] as const).map(([v, l]) => (
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
          placeholder="Buscar patente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input w-48 text-sm"
        />
      </div>

      {/* Cards grid */}
      {!filtered.length ? (
        <div className="text-sm text-gray-400 text-center py-8">Sin patentes para este filtro.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
          {filtered.map(p => {
            if (p.n === 0) {
              return (
                <div key={p.plate} className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-center">
                  <p className="font-mono font-bold text-gray-500 text-sm">{p.plate}</p>
                  <p className="text-xs text-gray-400 mt-1">sin reportes</p>
                </div>
              )
            }
            return (
              <div key={p.plate} className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                <p className="font-mono font-bold text-dark text-sm">{p.plate}</p>
                <p className="text-xs text-gray-500 mt-1">{p.n} insp.</p>
                {p.last && <p className="text-xs text-gray-400">{fmtDate(p.last)}</p>}
                {p.faults > 0
                  ? <span className="badge-fault mt-1">{p.faults} falla(s)</span>
                  : <span className="badge-ok mt-1">sin fallas</span>
                }
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
