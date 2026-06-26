import { useMemo } from 'react'
import { BRAND, MESES, complianceColor } from '../../lib/constants'
import type { VInspeccion, Operador } from '../../types'

interface SecCalendarioProps {
  data: VInspeccion[]
  operadoresNomina: Operador[]
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

export function SecCalendario({ data, operadoresNomina }: SecCalendarioProps) {
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
    // Sort conductores by report count desc
    all.sort((a, b) => (repMap[b]?.size ?? 0) - (repMap[a]?.size ?? 0) || a.localeCompare(b, 'es'))
    return { conductores: all, repByOpDay: repMap, cntByOpDay: cntMap }
  }, [data, operadoresNomina])

  const expected = Math.max(1, Math.round(days.length / 2))

  if (!days.length || !conductores.length) {
    return <div className="text-sm text-gray-400 text-center py-8">Sin datos en el periodo.</div>
  }

  // SVG dimensions
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

  // Collect month labels
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
          {/* Alternate row backgrounds */}
          {conductores.map((_, r) => r % 2 === 1 && (
            <rect
              key={`row-bg-${r}`}
              x={0}
              y={padT + r * rowH}
              width={W}
              height={rowH}
              fill="rgba(17,48,46,.018)"
            />
          ))}

          {/* Sunday tints + month lines + day numbers */}
          {days.map((day, i) => {
            const dt = new Date(day + 'T00:00:00')
            const dow = dt.getDay()
            const x = padL + i * cw
            return (
              <g key={`day-col-${day}`}>
                {dow === 0 && (
                  <rect
                    x={x - 1}
                    y={padT - 2}
                    width={cw}
                    height={conductores.length * rowH + 2}
                    fill="rgba(17,48,46,.05)"
                  />
                )}
                {(cell >= 16 || dt.getDate() % 2 === 1) && (
                  <text
                    x={x + cell / 2}
                    y={padT - 7}
                    textAnchor="middle"
                    fill={BRAND.muted}
                    fontSize={8}
                  >
                    {dt.getDate()}
                  </text>
                )}
              </g>
            )
          })}

          {/* Month labels and lines */}
          {monthLines.map((x, i) => (
            <line
              key={`ml-${i}`}
              x1={x - 1}
              y1={padT - 16}
              x2={x - 1}
              y2={H - padB}
              stroke={BRAND.muted}
              strokeWidth={0.5}
              strokeDasharray="3 3"
              opacity={0.4}
            />
          ))}
          {monthLabels.map((m, i) => (
            <text
              key={`mo-${i}`}
              x={m.x}
              y={12}
              fill={BRAND.muted}
              fontSize={11}
              fontWeight={600}
            >
              {m.label}
            </text>
          ))}

          {/* Operator rows */}
          {conductores.map((conductor, r) => {
            const y = padT + r * rowH
            const repSet = repByOpDay[conductor] ?? new Set<string>()
            const cntMap = cntByOpDay[conductor] ?? {}
            const pct = Math.min(100, Math.round(repSet.size / expected * 100))
            const pctColor = complianceColor(pct)

            return (
              <g key={conductor}>
                {/* Operator label */}
                <text
                  x={padL - 10}
                  y={y + rowH / 2}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill={BRAND.dark}
                  fontSize={11}
                >
                  {shortName(conductor)}
                </text>

                {/* Day cells */}
                {days.map((day, i) => {
                  const x = padL + i * cw
                  const has = repSet.has(day)
                  const n = cntMap[day] ?? 0
                  const dt = new Date(day + 'T00:00:00')
                  const isSun = dt.getDay() === 0
                  const fill = has
                    ? (n >= 2 ? BRAND.primary : BRAND.lime)
                    : isSun
                      ? 'rgba(17,48,46,.04)'
                      : 'rgba(17,48,46,.07)'
                  const tooltip = has
                    ? `${shortName(conductor)} · ${day} · ${n} inspección(es)`
                    : `${shortName(conductor)} · ${day} · sin reporte${isSun ? ' (domingo)' : ''}`
                  return (
                    <rect
                      key={`${conductor}-${day}`}
                      x={x}
                      y={y + (rowH - cell) / 2}
                      width={cell}
                      height={cell}
                      rx={2.5}
                      fill={fill}
                    >
                      <title>{tooltip}</title>
                    </rect>
                  )
                })}

                {/* Compliance % */}
                <text
                  x={W - padR + 10}
                  y={y + rowH / 2}
                  dominantBaseline="middle"
                  fill={pctColor}
                  fontWeight={700}
                  fontSize={12}
                >
                  {pct}%{' '}
                  <tspan fill={BRAND.muted} fontWeight={400} fontSize={9.5}>
                    {repSet.size}d
                  </tspan>
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legend */}
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
