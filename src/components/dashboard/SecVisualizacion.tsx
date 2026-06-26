import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, ComposedChart, Area, Line, CartesianGrid,
} from 'recharts'
import { PREGUNTAS, BRAND, barColor, fmtDate } from '../../lib/constants'
import type { VInspeccion } from '../../types'
import type { PKey } from '../../lib/constants'

interface SecVisualizacionProps {
  data: VInspeccion[]
}

/* ─── Custom tooltips ─── */
function TooltipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs max-w-52">
      {children}
    </div>
  )
}

/* ─── Drill-down state for system bar chart ─── */
interface DrillRow {
  patente: string
  count: number
  lastObs: string | null
  lastFecha: string
}

function computeDrill(data: VInspeccion[], key: PKey): DrillRow[] {
  const p = PREGUNTAS.find(q => q.key === key)!
  const byPlate: Record<string, { count: number; lastObs: string | null; lastFecha: string }> = {}
  data.filter(r => r[p.key]).forEach(r => {
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
}

/* ─── Weekly data ─── */
interface WeekPoint { week: string; inspecciones: number; faults: number }

function weeklyData(data: VInspeccion[]): WeekPoint[] {
  const b: Record<string, WeekPoint> = {}
  data.forEach(r => {
    if (!r.fecha) return
    const dt = new Date(r.fecha.slice(0, 10) + 'T00:00:00')
    const day = (dt.getDay() + 6) % 7
    const mon = new Date(dt)
    mon.setDate(dt.getDate() - day)
    const k = mon.toISOString().slice(0, 10)
    if (!b[k]) b[k] = { week: k, inspecciones: 0, faults: 0 }
    b[k].inspecciones++
    b[k].faults += r.n_fallas
  })
  return Object.values(b).sort((a, b2) => a.week.localeCompare(b2.week))
}

/* ─── Main component ─── */
export function SecVisualizacion({ data }: SecVisualizacionProps) {
  const [drillSystem, setDrillSystem] = useState<PKey | null>(null)

  const total = Math.max(1, data.length)

  /* Sistema bar data */
  const sysData = useMemo(() =>
    PREGUNTAS.map(p => ({
      name: p.label,
      key: p.key as PKey,
      value: data.filter(r => r[p.key]).length,
      rate: data.filter(r => r[p.key]).length / total,
    })).sort((a, b) => b.value - a.value),
    [data, total],
  )

  /* Donut health data */
  const healthData = useMemo(() => [
    { name: 'Sin fallas', value: data.filter(r => r.n_fallas === 0).length, color: BRAND.primary },
    { name: '1–2 fallas', value: data.filter(r => r.n_fallas >= 1 && r.n_fallas <= 2).length, color: BRAND.warn },
    { name: '3+ fallas', value: data.filter(r => r.n_fallas >= 3).length, color: BRAND.fault },
  ], [data])

  /* Fundo bar data */
  const fundoData = useMemo(() => {
    const m: Record<string, { n: number; f: number }> = {}
    data.forEach(r => {
      const k = r.fundo || '—'
      if (!m[k]) m[k] = { n: 0, f: 0 }
      m[k].n++
      m[k].f += r.n_fallas
    })
    return Object.entries(m)
      .map(([name, v]) => ({
        name,
        value: parseFloat((v.f / v.n).toFixed(2)),
        insps: v.n,
        rate: v.f / v.n,
      }))
      .sort((a, b) => b.value - a.value)
  }, [data])

  /* Top 8 vehicles */
  const vehData = useMemo(() => {
    const m: Record<string, { f: number; n: number }> = {}
    data.forEach(r => {
      const k = r.patente || '—'
      if (!m[k]) m[k] = { f: 0, n: 0 }
      m[k].f += r.n_fallas
      m[k].n++
    })
    return Object.entries(m)
      .map(([name, v]) => ({ name, value: v.f, insps: v.n }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [data])

  /* Weekly line data */
  const timeData = useMemo(() => weeklyData(data), [data])

  const drillData = useMemo(() =>
    drillSystem ? computeDrill(data, drillSystem) : [],
    [drillSystem, data],
  )

  return (
    <div>
      {/* Row 1: Sistema (7/12) + Donut (5/12) */}
      <div className="grid grid-cols-12 gap-4 mb-4">
        {/* Fallas por sistema */}
        <div className="col-span-12 lg:col-span-7 card">
          <h4 className="text-sm font-semibold text-gray-700 mb-1">Fallas por sistema</h4>
          <p className="text-xs text-gray-400 mb-3">Toca una barra para ver patentes afectadas</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart layout="vertical" data={sysData} margin={{ top: 4, right: 60, left: 10, bottom: 4 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const v = payload[0].value as number
                  const rate = Math.round(v / total * 100)
                  return (
                    <TooltipBox>
                      <p className="font-bold text-gray-900 mb-1">{String(label)}</p>
                      <p style={{ color: BRAND.primary }}>Total: <b>{v}</b></p>
                      <p className="text-gray-500">{rate}% de inspecciones</p>
                    </TooltipBox>
                  )
                }}
              />
              <Bar
                dataKey="value"
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                onClick={(d) => {
                  const key = (d as unknown as { key: PKey }).key
                  setDrillSystem(prev => prev === key ? null : key)
                }}
              >
                {sysData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={drillSystem === entry.key ? BRAND.dark : barColor(entry.rate)}
                    opacity={drillSystem && drillSystem !== entry.key ? 0.4 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {drillSystem && drillData.length > 0 && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-primary">
                  {PREGUNTAS.find(p => p.key === drillSystem)?.label} — patentes afectadas
                </p>
                <button onClick={() => setDrillSystem(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {drillData.slice(0, 9).map(row => (
                  <div key={row.patente} className="bg-gray-50 rounded-lg border border-gray-200 p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-dark text-xs">{row.patente}</span>
                      <span className="badge-fault">{row.count}×</span>
                    </div>
                    {row.lastObs && (
                      <p className="text-xs text-gray-400 italic mt-0.5 line-clamp-1">"{row.lastObs}"</p>
                    )}
                    <p className="text-xs text-gray-300 mt-0.5">{fmtDate(row.lastFecha)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Condición de inspecciones — Donut */}
        <div className="col-span-12 lg:col-span-5 card flex flex-col">
          <h4 className="text-sm font-semibold text-gray-700 mb-1">Condición de inspecciones</h4>
          <p className="text-xs text-gray-400 mb-3">Distribución por cantidad de fallas</p>
          <div className="flex-1 min-h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={healthData}
                  cx="50%"
                  cy="46%"
                  innerRadius="38%"
                  outerRadius="58%"
                  dataKey="value"
                  paddingAngle={2}
                >
                  {healthData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const entry = payload[0]
                    const v = entry.value as number
                    const pct = Math.round(v / total * 100)
                    return (
                      <TooltipBox>
                        <p className="font-bold mb-1" style={{ color: String(entry.payload.color) }}>
                          {String(entry.name)}
                        </p>
                        <p className="text-gray-700">{v} inspecciones · {pct}%</p>
                      </TooltipBox>
                    )
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={10}
                  formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Fundo (5/12) + Vehículos (4/12) + Tiempo (3/12) */}
      <div className="grid grid-cols-12 gap-4">
        {/* Fallas por fundo */}
        <div className="col-span-12 lg:col-span-5 card">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Fallas por fundo</h4>
          <ResponsiveContainer width="100%" height={Math.max(160, fundoData.length * 38 + 40)}>
            <BarChart layout="vertical" data={fundoData} margin={{ top: 4, right: 55, left: 10, bottom: 4 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => v.toFixed(1)} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const entry = payload[0]
                  const insps = (payload[0].payload as { insps: number }).insps
                  return (
                    <TooltipBox>
                      <p className="font-bold text-gray-900 mb-1">{String(label)}</p>
                      <p style={{ color: String(entry.color) }}>
                        Prom.: <b>{(entry.value as number).toFixed(2)}</b> fallas/insp.
                      </p>
                      <p className="text-gray-400">{insps} inspecciones</p>
                    </TooltipBox>
                  )
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {fundoData.map((entry, i) => (
                  <Cell key={i} fill={entry.rate >= 1.5 ? BRAND.fault : entry.rate >= 0.8 ? BRAND.warn : BRAND.primary} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top 8 vehículos */}
        <div className="col-span-12 lg:col-span-4 card">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Vehículos top 8 (fallas acumuladas)</h4>
          <ResponsiveContainer width="100%" height={Math.max(160, vehData.length * 30 + 40)}>
            <BarChart layout="vertical" data={vehData} margin={{ top: 4, right: 40, left: 10, bottom: 4 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const insps = (payload[0].payload as { insps: number }).insps
                  return (
                    <TooltipBox>
                      <p className="font-mono font-bold text-dark mb-1">{String(label)}</p>
                      <p style={{ color: String(payload[0].color) }}>
                        Fallas: <b>{String(payload[0].value)}</b>
                      </p>
                      <p className="text-gray-400">{insps} inspecciones</p>
                    </TooltipBox>
                  )
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {vehData.map((entry, i) => (
                  <Cell key={i} fill={entry.value >= 8 ? BRAND.fault : entry.value >= 4 ? BRAND.warn : BRAND.primary} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Evolución temporal */}
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
                  tickFormatter={w => {
                    const [, m, d] = w.split('-')
                    return `${d}/${m}`
                  }}
                  angle={-45}
                  textAnchor="end"
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <TooltipBox>
                        <p className="font-bold text-gray-900 mb-1">Sem. {String(label).slice(5)}</p>
                        {payload.map(p => (
                          <p key={String(p.dataKey)} style={{ color: String(p.color) }}>
                            {String(p.name)}: <b>{String(p.value)}</b>
                          </p>
                        ))}
                      </TooltipBox>
                    )
                  }}
                />
                <Legend
                  iconType="line"
                  iconSize={10}
                  formatter={v => <span className="text-xs text-gray-600">{v}</span>}
                />
                <Area
                  type="monotone"
                  dataKey="faults"
                  name="Fallas"
                  fill={BRAND.fault}
                  stroke={BRAND.fault}
                  fillOpacity={0.12}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="inspecciones"
                  name="Inspecciones"
                  stroke={BRAND.primary}
                  strokeWidth={2.2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
