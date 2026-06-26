import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { fmtDate, complianceColor } from '../../lib/constants'
import type { VInspeccion, Operador } from '../../types'

interface SecOperadoresProps {
  data: VInspeccion[]
  operadoresNomina: Operador[]
}

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

export function SecOperadores({ data, operadoresNomina }: SecOperadoresProps) {
  const maxFecha = useMemo(() => {
    const dates = data.map(r => r.fecha.slice(0, 10)).sort()
    return dates[dates.length - 1] ?? new Date().toISOString().slice(0, 10)
  }, [data])

  const stats = useMemo(() => computeOperadorStats(data, maxFecha), [data, maxFecha])

  const enNomina = operadoresNomina.filter(o => o.activo).length
  const reportando = stats.length
  const sinReportes = Math.max(0, enNomina - reportando)
  const atrasados = stats.filter(s => !s.alDia).length

  const chartData = [...stats]
    .sort((a, b) => b.cumplimiento - a.cumplimiento)
    .map(s => ({ name: s.conductor, cumplimiento: s.cumplimiento, reportes: s.reportes }))

  return (
    <div>
      {/* KPIs */}
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

      {/* Table + Chart grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Table */}
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

        {/* Horizontal bar chart - compliance */}
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
    </div>
  )
}
