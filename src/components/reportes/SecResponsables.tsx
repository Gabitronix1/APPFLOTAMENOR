import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { fmtDate, BRAND } from '../../lib/constants'
import { KpiGrid } from './KpiTile'
import type { IntervencionMaquinariaCompleta } from '../../hooks/useIntervencionesMaquinaria'

interface SecResponsablesProps {
  data: IntervencionMaquinariaCompleta[]
}

interface ResponsableStat {
  responsable: string
  n: number
  ultimo: string
  diasDesdeUltima: number
  pctCorrectivas: number
}

export function SecResponsables({ data }: SecResponsablesProps) {
  const maxFecha = useMemo(() => {
    const fechas = data.map(d => d.fecha.slice(0, 10)).sort()
    return fechas[fechas.length - 1] ?? null
  }, [data])

  const stats = useMemo((): ResponsableStat[] => {
    const byResp: Record<string, { n: number; correctivas: number; ultimo: string }> = {}
    data.forEach(d => {
      const r = byResp[d.responsableNombre] ?? (byResp[d.responsableNombre] = { n: 0, correctivas: 0, ultimo: '' })
      r.n++
      if (d.tipo === 'CORRECTIVA') r.correctivas++
      const dia = d.fecha.slice(0, 10)
      if (dia > r.ultimo) r.ultimo = dia
    })
    return Object.entries(byResp)
      .map(([responsable, v]) => ({
        responsable,
        n: v.n,
        ultimo: v.ultimo,
        diasDesdeUltima: maxFecha ? Math.round((new Date(maxFecha + 'T00:00').getTime() - new Date(v.ultimo + 'T00:00').getTime()) / 86400000) : 0,
        pctCorrectivas: v.n ? Math.round((v.correctivas / v.n) * 100) : 0,
      }))
      .sort((a, b) => b.n - a.n)
  }, [data, maxFecha])

  const chartData = stats.map(s => ({ name: s.responsable, n: s.n }))

  return (
    <div>
      <KpiGrid
        cols="grid-cols-2"
        items={[
          { label: 'Personas con intervenciones', value: stats.length, color: 'text-dark' },
          { label: 'Total intervenciones del período', value: data.length, color: 'text-primary' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="table-th">Responsable</th>
                  <th className="table-th text-center">Intervenciones</th>
                  <th className="table-th text-center">Última fecha</th>
                  <th className="table-th text-center">Días desde la última</th>
                  <th className="table-th text-center">% correctivas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {!stats.length && (
                  <tr><td colSpan={5} className="table-td text-center text-gray-400 py-8">Sin intervenciones en el período.</td></tr>
                )}
                {stats.map(s => (
                  <tr key={s.responsable} className="hover:bg-gray-50">
                    <td className="table-td font-medium text-sm">{s.responsable}</td>
                    <td className="table-td text-center font-mono text-sm">{s.n}</td>
                    <td className="table-td text-center text-xs">{fmtDate(s.ultimo)}</td>
                    <td className="table-td text-center text-xs">
                      {s.diasDesdeUltima <= 7 ? <span className="badge-ok">{s.diasDesdeUltima}d</span> : <span className="badge-warn">{s.diasDesdeUltima}d</span>}
                    </td>
                    <td className="table-td text-center font-mono text-sm">{s.pctCorrectivas}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Volumen de intervenciones por responsable</h4>
          <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 32 + 40)}>
            <BarChart layout="vertical" data={chartData} margin={{ top: 4, right: 40, left: 10, bottom: 4 }}>
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
                      <p className="font-bold text-gray-900 mb-1">{String(label)}</p>
                      <p style={{ color: BRAND.primary }}>Intervenciones: <b>{String(payload[0].value)}</b></p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="n" fill={BRAND.primary} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
