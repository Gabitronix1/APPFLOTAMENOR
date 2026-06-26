import { useState, useMemo } from 'react'
import type { ReactElement } from 'react'
import { PREGUNTAS, BRAND, barColor, fmtDate } from '../../lib/constants'
import type { VInspeccion } from '../../types'
import type { PKey } from '../../lib/constants'

interface SecSistemasProps {
  data: VInspeccion[]
}

const ICONS: Record<PKey, ReactElement> = {
  p1: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><path d="M12 2C6 8 4 12 4 15a8 8 0 0 0 16 0c0-3-2-7-8-13z"/></svg>,
  p2: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><line x1="3" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="21" y2="12"/><line x1="12" y1="3" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="21"/></svg>,
  p3: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  p4: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M12 9.5V3M7.5 14l-5 3M16.5 14l5 3"/></svg>,
  p5: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  p6: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
}

interface DrillRow {
  patente: string
  count: number
  lastObs: string | null
  lastFecha: string
}

export function SecSistemas({ data }: SecSistemasProps) {
  const [selected, setSelected] = useState<PKey | null>(null)

  const total = Math.max(1, data.length)

  const systemStats = useMemo(() =>
    PREGUNTAS.map(p => {
      const affected = data.filter(r => r[p.key])
      return {
        ...p,
        count: affected.length,
        rate: affected.length / total,
      }
    }),
    [data, total],
  )

  const drillData = useMemo((): DrillRow[] => {
    if (!selected) return []
    const p = PREGUNTAS.find(q => q.key === selected)!
    const byPlate: Record<string, { count: number; lastObs: string | null; lastFecha: string }> = {}
    data
      .filter(r => r[p.key])
      .forEach(r => {
        const pl = r.patente
        const d = r.fecha.slice(0, 10)
        if (!byPlate[pl] || d > byPlate[pl].lastFecha) {
          byPlate[pl] = {
            count: (byPlate[pl]?.count ?? 0) + 1,
            lastObs: r[p.obs],
            lastFecha: d,
          }
        } else {
          byPlate[pl].count++
        }
      })
    return Object.entries(byPlate)
      .map(([patente, v]) => ({ patente, ...v }))
      .sort((a, b) => b.count - a.count)
  }, [selected, data])

  const kpis = useMemo(() => {
    const conFallas = data.filter(r => r.n_fallas > 0).length
    const fallas = data.reduce((a, r) => a + r.n_fallas, 0)
    return {
      inspecciones: data.length,
      sinFallas: data.length - conFallas,
      conFallas,
      fallasTotales: fallas,
      noOperativos: data.filter(r => !r.operativo).length,
    }
  }, [data])

  function handleCardClick(key: PKey) {
    setSelected(prev => (prev === key ? null : key))
  }

  return (
    <div>
      {/* 6 System cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
        {systemStats.map(s => {
          const color = barColor(s.rate)
          const isActive = selected === s.key
          return (
            <button
              key={s.key}
              onClick={() => handleCardClick(s.key)}
              className={`text-left rounded-xl border p-4 transition-all cursor-pointer ${
                isActive
                  ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
                  : 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-md'
              }`}
            >
              <div style={{ color }} className="mb-2">{ICONS[s.key]}</div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.count > 0 ? color : BRAND.muted }}>
                {s.count}
              </p>
              <p className="text-xs text-gray-400 mb-2">{Math.round(s.rate * 100)}% de inspecciones</p>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.round(s.rate * 100)}%`, background: color }}
                />
              </div>
            </button>
          )
        })}
      </div>

      {/* Drill-down panel */}
      {selected && drillData.length > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-primary text-sm">
              Patentes afectadas — {PREGUNTAS.find(p => p.key === selected)?.label}
            </h3>
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              ✕ Cerrar
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {drillData.map(row => (
              <div key={row.patente} className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-dark text-sm">{row.patente}</span>
                  <span className="badge-fault">{row.count}×</span>
                </div>
                {row.lastObs && (
                  <p className="text-xs text-gray-500 italic line-clamp-2">"{row.lastObs}"</p>
                )}
                <p className="text-xs text-gray-400 mt-1">Último: {fmtDate(row.lastFecha)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5 KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Inspecciones', value: kpis.inspecciones, color: 'text-dark', cls: '' },
          { label: 'Sin fallas', value: kpis.sinFallas, color: 'text-primary', cls: 'good' },
          { label: 'Con fallas', value: kpis.conFallas, color: 'text-fault', cls: kpis.conFallas > 0 ? 'alert' : '' },
          { label: 'Fallas totales', value: kpis.fallasTotales, color: 'text-fault', cls: kpis.fallasTotales > 0 ? 'alert' : '' },
          { label: 'No operativos', value: kpis.noOperativos, color: 'text-warn', cls: kpis.noOperativos > 0 ? 'alert' : '' },
        ].map(k => (
          <div key={k.label} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{k.label}</p>
            <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
