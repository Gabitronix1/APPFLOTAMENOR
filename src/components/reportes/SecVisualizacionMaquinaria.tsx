import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, ComposedChart, Line, CartesianGrid,
} from 'recharts'
import { BRAND, barColor } from '../../lib/constants'
import { ESTADO_VEHICULO_INFO } from '../../lib/vehiculos'
import type { IntervencionMaquinariaCompleta } from '../../hooks/useIntervencionesMaquinaria'
import type { EstadoMaquinaria } from '../../types'

interface SecVisualizacionMaquinariaProps {
  data: IntervencionMaquinariaCompleta[]
}

const ESTADO_COLOR: Record<EstadoMaquinaria, string> = {
  operativo: BRAND.primary,
  en_observacion: BRAND.warn,
  en_mantencion: BRAND.fault,
  taller_externo: '#8b5cf6',
  dado_de_baja: '#6b7280',
}

function TooltipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs max-w-52">
      {children}
    </div>
  )
}

interface WeekPoint { week: string; preventivas: number; correctivas: number }

function weeklyData(data: IntervencionMaquinariaCompleta[]): WeekPoint[] {
  const b: Record<string, WeekPoint> = {}
  data.forEach(r => {
    if (!r.fecha) return
    const dt = new Date(r.fecha.slice(0, 10) + 'T00:00:00')
    const day = (dt.getDay() + 6) % 7
    const mon = new Date(dt)
    mon.setDate(dt.getDate() - day)
    const k = mon.toISOString().slice(0, 10)
    if (!b[k]) b[k] = { week: k, preventivas: 0, correctivas: 0 }
    if (r.tipo === 'PREVENTIVA') b[k].preventivas++
    if (r.tipo === 'CORRECTIVA') b[k].correctivas++
  })
  return Object.values(b).sort((a, b2) => a.week.localeCompare(b2.week))
}

export function SecVisualizacionMaquinaria({ data }: SecVisualizacionMaquinariaProps) {
  const correctivas = useMemo(() => data.filter(d => d.tipo === 'CORRECTIVA'), [data])

  const sistemaData = useMemo(() => {
    const m: Record<string, number> = {}
    correctivas.forEach(c => {
      const k = c.sistemaNombre ?? 'Sin componente'
      m[k] = (m[k] ?? 0) + 1
    })
    const total = Math.max(1, correctivas.length)
    return Object.entries(m)
      .map(([name, value]) => ({ name, value, rate: value / total }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [correctivas])

  const condicionData = useMemo(() => {
    const m: Record<string, number> = {}
    data.forEach(d => { if (d.condicionEstado) m[d.condicionEstado] = (m[d.condicionEstado] ?? 0) + 1 })
    return Object.entries(m)
      .map(([estado, value]) => ({
        name: ESTADO_VEHICULO_INFO[estado as EstadoMaquinaria]?.label ?? estado,
        value,
        color: ESTADO_COLOR[estado as EstadoMaquinaria] ?? BRAND.muted,
      }))
      .sort((a, b) => b.value - a.value)
  }, [data])

  const lineaData = useMemo(() => {
    const m: Record<string, number> = {}
    data.forEach(d => {
      const k = d.lineaCodigo ?? 'Sin línea'
      m[k] = (m[k] ?? 0) + 1
    })
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [data])

  const maquinaData = useMemo(() => {
    const m: Record<string, number> = {}
    correctivas.forEach(c => { m[c.maquinariaCodigo] = (m[c.maquinariaCodigo] ?? 0) + 1 })
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8)
  }, [correctivas])

  const timeData = useMemo(() => weeklyData(data), [data])
  const totalCondicion = Math.max(1, condicionData.reduce((a, c) => a + c.value, 0))

  return (
    <div>
      {/* Row 1 */}
      <div className="grid grid-cols-12 gap-4 mb-4">
        <div className="col-span-12 lg:col-span-7 card">
          <h4 className="text-sm font-semibold text-gray-700 mb-1">Fallas por componente/sistema</h4>
          <p className="text-xs text-gray-400 mb-3">Top 8 en correctivas</p>
          {sistemaData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart layout="vertical" data={sistemaData} margin={{ top: 4, right: 60, left: 10, bottom: 4 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const v = payload[0].value as number
                    return (
                      <TooltipBox>
                        <p className="font-bold text-gray-900 mb-1">{String(label)}</p>
                        <p style={{ color: BRAND.primary }}>Correctivas: <b>{v}</b></p>
                      </TooltipBox>
                    )
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {sistemaData.map((entry, i) => <Cell key={i} fill={barColor(entry.rate)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="text-sm text-gray-400 text-center py-8">Sin correctivas registradas.</div>}
        </div>

        <div className="col-span-12 lg:col-span-5 card flex flex-col">
          <h4 className="text-sm font-semibold text-gray-700 mb-1">Condición de las intervenciones</h4>
          <p className="text-xs text-gray-400 mb-3">Según mapeo de condiciones de equipo</p>
          <div className="flex-1 min-h-52">
            {condicionData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={condicionData} cx="50%" cy="46%" innerRadius="38%" outerRadius="58%" dataKey="value" paddingAngle={2}>
                    {condicionData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const entry = payload[0]
                      const v = entry.value as number
                      const pct = Math.round((v / totalCondicion) * 100)
                      return (
                        <TooltipBox>
                          <p className="font-bold mb-1" style={{ color: String(entry.payload.color) }}>{String(entry.name)}</p>
                          <p className="text-gray-700">{v} intervenciones · {pct}%</p>
                        </TooltipBox>
                      )
                    }}
                  />
                  <Legend iconType="circle" iconSize={10} formatter={v => <span className="text-xs text-gray-600">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="text-sm text-gray-400 text-center py-8">Sin condición registrada.</div>}
          </div>
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-5 card">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Intervenciones por línea de operación</h4>
          <ResponsiveContainer width="100%" height={Math.max(160, lineaData.length * 38 + 40)}>
            <BarChart layout="vertical" data={lineaData} margin={{ top: 4, right: 40, left: 10, bottom: 4 }}>
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <TooltipBox>
                      <p className="font-bold text-gray-900 mb-1">{String(label)}</p>
                      <p style={{ color: BRAND.primary }}>Intervenciones: <b>{String(payload[0].value)}</b></p>
                    </TooltipBox>
                  )
                }}
              />
              <Bar dataKey="value" fill={BRAND.primary} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-12 lg:col-span-4 card">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Top 8 máquinas (correctivas)</h4>
          {maquinaData.length ? (
            <ResponsiveContainer width="100%" height={Math.max(160, maquinaData.length * 30 + 40)}>
              <BarChart layout="vertical" data={maquinaData} margin={{ top: 4, right: 40, left: 10, bottom: 4 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <TooltipBox>
                        <p className="font-mono font-bold text-dark mb-1">{String(label)}</p>
                        <p style={{ color: BRAND.fault }}>Correctivas: <b>{String(payload[0].value)}</b></p>
                      </TooltipBox>
                    )
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {maquinaData.map((entry, i) => (
                    <Cell key={i} fill={entry.value >= 8 ? BRAND.fault : entry.value >= 4 ? BRAND.warn : BRAND.primary} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="text-sm text-gray-400 text-center py-8">Sin correctivas registradas.</div>}
        </div>

        <div className="col-span-12 lg:col-span-3 card">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Evolución semanal</h4>
          {timeData.length < 2 ? (
            <div className="text-sm text-gray-400 text-center py-8">Insuficientes datos temporales.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={timeData} margin={{ top: 4, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 9 }}
                  tickFormatter={w => { const [, m, d] = w.split('-'); return `${d}/${m}` }}
                  angle={-45}
                  textAnchor="end"
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <TooltipBox>
                        <p className="font-bold text-gray-900 mb-1">Sem. {String(label).slice(5)}</p>
                        {payload.map(p => (
                          <p key={String(p.dataKey)} style={{ color: String(p.color) }}>{String(p.name)}: <b>{String(p.value)}</b></p>
                        ))}
                      </TooltipBox>
                    )
                  }}
                />
                <Legend iconType="line" iconSize={10} formatter={v => <span className="text-xs text-gray-600">{v}</span>} />
                <Line type="monotone" dataKey="preventivas" name="Preventivas" stroke={BRAND.primary} strokeWidth={2.2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="correctivas" name="Correctivas" stroke={BRAND.fault} strokeWidth={2.2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
