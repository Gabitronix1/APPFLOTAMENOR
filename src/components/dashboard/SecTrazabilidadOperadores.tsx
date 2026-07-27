import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { fmtDate, complianceColor, BRAND, MESES } from '../../lib/constants'
import type { VInspeccion, Operador } from '../../types'

interface Props {
  data: VInspeccion[]
  operadoresNomina: Operador[]
}

type Vista = 'tabla' | 'calendario'

interface OperadorStat {
  conductor: string
  reportes: number
  ultimo: string | null
  diasSinReporte: number
  pctFalla: number
  cumplimiento: number
  diasConReporte: number
  alDia: boolean
}

function computeOperadorStats(data: VInspeccion[], maxFecha: string): OperadorStat[] {
  const byOp: Record<string, { dates: Set<string>; conFalla: number; total: number }> = {}
  data.forEach(r => {
    if (!r.conductor) return
    const d = r.fecha.slice(0, 10)
    if (!byOp[r.conductor]) byOp[r.conductor] = { dates: new Set(), conFalla: 0, total: 0 }
    byOp[r.conductor].dates.add(d)
    byOp[r.conductor].total++
    if (r.n_fallas > 0) byOp[r.conductor].conFalla++
  })

  const allDates = [...new Set(data.map(r => r.fecha.slice(0, 10)))].sort()
  const periodDays = allDates.length
  const expected = Math.max(1, Math.round(periodDays / 2))

  return Object.entries(byOp).map(([conductor, o]) => {
    const sorted = [...o.dates].sort()
    const ultimo = sorted[sorted.length - 1] ?? null
    const diasSinReporte = ultimo
      ? Math.round((new Date(maxFecha + 'T00:00').getTime() - new Date(ultimo + 'T00:00').getTime()) / 86400000)
      : 999
    const cumplimiento = Math.min(100, Math.round(o.dates.size / expected * 100))
    return {
      conductor,
      reportes: o.total,
      ultimo,
      diasSinReporte,
      pctFalla: o.total ? Math.round(o.conFalla / o.total * 100) : 0,
      cumplimiento,
      diasConReporte: o.dates.size,
      alDia: diasSinReporte <= 14,
    }
  }).sort((a, b) => b.reportes - a.reportes)
}

function rangeDays(data: VInspeccion[]): string[] {
  const dates = data.map(r => r.fecha?.slice(0, 10)).filter((d): d is string => !!d).sort()
  if (!dates.length) return []
  const start = new Date(dates[0] + 'T00:00:00')
  const end = new Date(dates[dates.length - 1] + 'T00:00:00')
  const result: string[] = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    result.push(d.toISOString().slice(0, 10))
  }
  return result
}

function shortName(full: string): string {
  const parts = full.trim().split(/\s+/)
  return parts.slice(0, 2).join(' ')
}

function TablaCumplimiento({ stats }: { stats: OperadorStat[] }) {
  const chartData = [...stats]
    .sort((a, b) => b.cumplimiento - a.cumplimiento)
    .map(s => ({ name: s.conductor, cumplimiento: s.cumplimiento, reportes: s.reportes }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-th">Operador</th>
                <th className="table-th text-center">Reportes</th>
                <th className="table-th text-center">Último</th>
                <th className="table-th text-center">Días</th>
                <th className="table-th text-center">% c/falla</th>
                <th className="table-th text-center">Cumpl. 5x5</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!stats.length && (
                <tr>
                  <td colSpan={6} className="table-td text-center text-gray-400 py-8">Sin operadores en el periodo.</td>
                </tr>
              )}
              {stats.map(s => {
                const cc = complianceColor(s.cumplimiento)
                return (
                  <tr key={s.conductor} className="hover:bg-gray-50">
                    <td className="table-td font-medium text-sm">{s.conductor}</td>
                    <td className="table-td text-center font-mono text-sm">{s.reportes}</td>
                    <td className="table-td text-center text-xs">
                      {s.ultimo ? fmtDate(s.ultimo) : '—'}
                    </td>
                    <td className="table-td text-center text-xs">
                      {s.alDia
                        ? <span className="badge-ok">{s.diasSinReporte}d</span>
                        : <span className="badge-fault">{s.diasSinReporte}d</span>
                      }
                    </td>
                    <td className="table-td text-center font-mono text-sm">{s.pctFalla}%</td>
                    <td className="table-td text-center">
                      <span className="font-bold text-sm" style={{ color: cc }}>
                        {s.cumplimiento}%
                      </span>
                      <span className="text-xs text-gray-400 ml-1">{s.diasConReporte}d</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Cumplimiento 5×5 por operador</h4>
        <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 32 + 40)}>
          <BarChart layout="vertical" data={chartData} margin={{ top: 4, right: 50, left: 10, bottom: 4 }}>
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const entry = payload[0]
                const reportes = (payload[0].payload as { reportes: number }).reportes
                return (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
                    <p className="font-bold text-gray-900 mb-1">{String(label)}</p>
                    <p style={{ color: String(entry.color) }}>Cumpl.: <b>{String(entry.value)}%</b></p>
                    <p className="text-gray-500">Reportes: {reportes}</p>
                  </div>
                )
              }}
            />
            <Bar dataKey="cumplimiento" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={complianceColor(entry.cumplimiento)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function CalendarioCumplimiento({ data, operadoresNomina }: Props) {
  const days = useMemo(() => rangeDays(data), [data])

  const { conductores, repByOpDay, cntByOpDay } = useMemo(() => {
    const fromNomina = operadoresNomina
      .filter(o => o.activo)
      .map(o => `${o.nombre} ${o.apellido}`)
    const fromData = [...new Set(data.map(r => r.conductor).filter(Boolean))]
    const all = [...new Set([...fromNomina, ...fromData])].sort((a, b) =>
      a.localeCompare(b, 'es'),
    )

    const repMap: Record<string, Set<string>> = {}
    const cntMap: Record<string, Record<string, number>> = {}
    data.forEach(r => {
      if (!r.conductor || !r.fecha) return
      const d = r.fecha.slice(0, 10)
      const k = r.conductor
      if (!repMap[k]) { repMap[k] = new Set(); cntMap[k] = {} }
      repMap[k].add(d)
      cntMap[k][d] = (cntMap[k][d] ?? 0) + 1
    })
    all.sort((a, b) => (repMap[b]?.size ?? 0) - (repMap[a]?.size ?? 0) || a.localeCompare(b, 'es'))
    return { conductores: all, repByOpDay: repMap, cntByOpDay: cntMap }
  }, [data, operadoresNomina])

  const expected = Math.max(1, Math.round(days.length / 2))

  if (!days.length || !conductores.length) {
    return <div className="text-sm text-gray-400 text-center py-8">Sin datos en el periodo.</div>
  }

  const cell = days.length > 50 ? 12 : days.length > 30 ? 16 : 20
  const gap = 2
  const cw = cell + gap
  const padL = 148
  const padT = 38
  const padR = 110
  const padB = 6
  const rowH = Math.max(18, cell + 8)
  const W = padL + days.length * cw + padR
  const H = padT + conductores.length * rowH + padB

  const monthLabels: { x: number; label: string }[] = []
  let curMonth = -1
  const monthLines: number[] = []
  days.forEach((day, i) => {
    const dt = new Date(day + 'T00:00:00')
    const mo = dt.getMonth()
    if (mo !== curMonth) {
      curMonth = mo
      const x = padL + i * cw
      monthLabels.push({ x: x + 2, label: `${MESES[mo]} ${String(dt.getFullYear()).slice(2)}` })
      monthLines.push(x)
    }
  })

  return (
    <div>
      <div className="overflow-x-auto" style={{ maxWidth: '100%' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ minWidth: W, height: H }}
          preserveAspectRatio="xMinYMin meet"
          xmlns="http://www.w3.org/2000/svg"
          fontSize={11}
        >
          {conductores.map((_, r) => r % 2 === 1 && (
            <rect key={`row-bg-${r}`} x={0} y={padT + r * rowH} width={W} height={rowH} fill="rgba(17,48,46,.018)" />
          ))}

          {days.map((day, i) => {
            const dt = new Date(day + 'T00:00:00')
            const dow = dt.getDay()
            const x = padL + i * cw
            return (
              <g key={`day-col-${day}`}>
                {dow === 0 && (
                  <rect x={x - 1} y={padT - 2} width={cw} height={conductores.length * rowH + 2} fill="rgba(17,48,46,.05)" />
                )}
                {(cell >= 16 || dt.getDate() % 2 === 1) && (
                  <text x={x + cell / 2} y={padT - 7} textAnchor="middle" fill={BRAND.muted} fontSize={8}>
                    {dt.getDate()}
                  </text>
                )}
              </g>
            )
          })}

          {monthLines.map((x, i) => (
            <line key={`ml-${i}`} x1={x - 1} y1={padT - 16} x2={x - 1} y2={H - padB} stroke={BRAND.muted} strokeWidth={0.5} strokeDasharray="3 3" opacity={0.4} />
          ))}
          {monthLabels.map((m, i) => (
            <text key={`mo-${i}`} x={m.x} y={12} fill={BRAND.muted} fontSize={11} fontWeight={600}>{m.label}</text>
          ))}

          {conductores.map((conductor, r) => {
            const y = padT + r * rowH
            const repSet = repByOpDay[conductor] ?? new Set<string>()
            const cntMap = cntByOpDay[conductor] ?? {}
            const pct = Math.min(100, Math.round(repSet.size / expected * 100))
            const pctColor = complianceColor(pct)

            return (
              <g key={conductor}>
                <text x={padL - 10} y={y + rowH / 2} textAnchor="end" dominantBaseline="middle" fill={BRAND.dark} fontSize={11}>
                  {shortName(conductor)}
                </text>

                {days.map((day, i) => {
                  const x = padL + i * cw
                  const has = repSet.has(day)
                  const n = cntMap[day] ?? 0
                  const dt = new Date(day + 'T00:00:00')
                  const isSun = dt.getDay() === 0
                  const fill = has
                    ? (n >= 2 ? BRAND.primary : BRAND.lime)
                    : isSun ? 'rgba(17,48,46,.04)' : 'rgba(17,48,46,.07)'
                  const tooltip = has
                    ? `${shortName(conductor)} · ${day} · ${n} inspección(es)`
                    : `${shortName(conductor)} · ${day} · sin reporte${isSun ? ' (domingo)' : ''}`
                  return (
                    <rect key={`${conductor}-${day}`} x={x} y={y + (rowH - cell) / 2} width={cell} height={cell} rx={2.5} fill={fill}>
                      <title>{tooltip}</title>
                    </rect>
                  )
                })}

                <text x={W - padR + 10} y={y + rowH / 2} dominantBaseline="middle" fill={pctColor} fontWeight={700} fontSize={12}>
                  {pct}%{' '}
                  <tspan fill={BRAND.muted} fontWeight={400} fontSize={9.5}>{repSet.size}d</tspan>
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
        {[
          { color: BRAND.lime, label: 'Reportó' },
          { color: BRAND.primary, label: '2+ inspecciones' },
          { color: 'rgba(17,48,46,.07)', label: 'Sin reporte' },
          { color: 'rgba(17,48,46,.04)', label: 'Domingo' },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
        <span className="ml-auto text-gray-400">(turno 5×5 · columna derecha = cumpl.)</span>
      </div>
    </div>
  )
}

export function SecTrazabilidadOperadores({ data, operadoresNomina }: Props) {
  const [vista, setVista] = useState<Vista>('tabla')

  const maxFecha = useMemo(() => {
    const dates = data.map(r => r.fecha.slice(0, 10)).sort()
    return dates[dates.length - 1] ?? new Date().toISOString().slice(0, 10)
  }, [data])

  const stats = useMemo(() => computeOperadorStats(data, maxFecha), [data, maxFecha])

  const enNomina = operadoresNomina.filter(o => o.activo).length
  const reportando = stats.length
  const sinReportes = Math.max(0, enNomina - reportando)
  const atrasados = stats.filter(s => !s.alDia).length

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'En nómina', value: enNomina, color: 'text-dark' },
          { label: 'Reportando', value: reportando, color: 'text-primary' },
          { label: 'Sin reportes', value: sinReportes, color: sinReportes > 0 ? 'text-fault' : 'text-gray-400' },
          { label: 'Atrasados >14d', value: atrasados, color: atrasados > 0 ? 'text-warn' : 'text-gray-400' },
        ].map(k => (
          <div key={k.label} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{k.label}</p>
            <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        {(['tabla', 'calendario'] as const).map(v => (
          <button
            key={v}
            type="button"
            onClick={() => setVista(v)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              vista === v ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {v === 'tabla' ? 'Tabla' : 'Calendario'}
          </button>
        ))}
      </div>

      {vista === 'tabla'
        ? <TablaCumplimiento stats={stats} />
        : <CalendarioCumplimiento data={data} operadoresNomina={operadoresNomina} />
      }
    </div>
  )
}
