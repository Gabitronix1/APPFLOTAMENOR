import { useMemo, useState } from 'react'
import { fmtDate, barColor } from '../../lib/constants'
import { KpiGrid } from './KpiTile'
import type { IntervencionMaquinariaCompleta } from '../../hooks/useIntervencionesMaquinaria'
import type { Maquinaria } from '../../types'

interface SecComponentesFallaProps {
  data: IntervencionMaquinariaCompleta[]
  maquinarias: Maquinaria[]
}

interface SistemaStat {
  nombre: string
  count: number
  rate: number
}

interface DrillRow {
  maquina: string
  count: number
  lastObs: string | null
  lastFecha: string
}

export function SecComponentesFalla({ data, maquinarias }: SecComponentesFallaProps) {
  const [selected, setSelected] = useState<string | null>(null)

  const correctivas = useMemo(() => data.filter(d => d.tipo === 'CORRECTIVA'), [data])
  const totalCorrectivas = Math.max(1, correctivas.length)

  const top8 = useMemo((): SistemaStat[] => {
    const counts: Record<string, number> = {}
    correctivas.forEach(c => {
      const nombre = c.sistemaNombre ?? 'Sin componente registrado'
      counts[nombre] = (counts[nombre] ?? 0) + 1
    })
    return Object.entries(counts)
      .map(([nombre, count]) => ({ nombre, count, rate: count / totalCorrectivas }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [correctivas, totalCorrectivas])

  const drillData = useMemo((): DrillRow[] => {
    if (!selected) return []
    const byMaquina: Record<string, { count: number; lastObs: string | null; lastFecha: string }> = {}
    correctivas
      .filter(c => (c.sistemaNombre ?? 'Sin componente registrado') === selected)
      .forEach(c => {
        const k = c.maquinariaCodigo
        const d = c.fecha.slice(0, 10)
        if (!byMaquina[k]) byMaquina[k] = { count: 0, lastObs: null, lastFecha: '' }
        byMaquina[k].count++
        if (d >= byMaquina[k].lastFecha) {
          byMaquina[k].lastObs = c.descripcionFalla
          byMaquina[k].lastFecha = d
        }
      })
    return Object.entries(byMaquina)
      .map(([maquina, v]) => ({ maquina, ...v }))
      .sort((a, b) => b.count - a.count)
  }, [selected, correctivas])

  const kpis = useMemo(() => ({
    total: data.length,
    preventivas: data.filter(d => d.tipo === 'PREVENTIVA').length,
    correctivas: correctivas.length,
    otras: data.filter(d => d.tipo === 'OTRA').length,
    noOperativas: maquinarias.filter(m => m.activo && m.estado_actual !== 'operativo').length,
  }), [data, correctivas, maquinarias])

  return (
    <div>
      {/* Ranking dinámico */}
      {!top8.length ? (
        <div className="text-sm text-gray-400 text-center py-8">No hay correctivas registradas en el período.</div>
      ) : (
        <div className="space-y-2 mb-4">
          {top8.map((s, i) => {
            const color = barColor(s.rate)
            const isActive = selected === s.nombre
            return (
              <button
                key={s.nombre}
                onClick={() => setSelected(prev => (prev === s.nombre ? null : s.nombre))}
                className={`w-full text-left rounded-xl border p-3 transition-all cursor-pointer flex items-center gap-3 ${
                  isActive
                    ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
                    : 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-sm'
                }`}
              >
                <span className="font-mono text-xs font-bold text-gray-400 w-5 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold text-dark truncate">{s.nombre}</span>
                    <span className="text-xs text-gray-400 shrink-0">{s.count} · {Math.round(s.rate * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(s.rate * 100)}%`, background: color }} />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Drill-down panel */}
      {selected && drillData.length > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-primary text-sm">Máquinas afectadas — {selected}</h3>
            <button onClick={() => setSelected(null)} className="text-xs text-gray-400 hover:text-gray-600">✕ Cerrar</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {drillData.map(row => (
              <div key={row.maquina} className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-dark text-sm">{row.maquina}</span>
                  <span className="badge-fault">{row.count}×</span>
                </div>
                {row.lastObs && <p className="text-xs text-gray-500 italic line-clamp-2">"{row.lastObs}"</p>}
                <p className="text-xs text-gray-400 mt-1">Último: {fmtDate(row.lastFecha)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5 KPIs */}
      <KpiGrid
        cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
        items={[
          { label: 'Intervenciones', value: kpis.total, color: 'text-dark' },
          { label: 'Preventivas', value: kpis.preventivas, color: 'text-primary' },
          { label: 'Correctivas', value: kpis.correctivas, color: kpis.correctivas > 0 ? 'text-fault' : 'text-gray-400' },
          { label: 'Otras', value: kpis.otras, color: 'text-warn' },
          { label: 'No operativas ahora', value: kpis.noOperativas, color: kpis.noOperativas > 0 ? 'text-fault' : 'text-gray-400', foot: 'estado actual, sin filtro de fecha' },
        ]}
      />
    </div>
  )
}
