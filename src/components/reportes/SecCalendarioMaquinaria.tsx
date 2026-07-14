import { useMemo } from 'react'
import { BRAND, MESES } from '../../lib/constants'
import type { FiltersMaquinaria } from '../../hooks/useFiltersMaquinaria'
import type { TimelineEvento } from '../../hooks/useIntervencionesMaquinaria'
import type { CategoriaMaquinaria, Maquinaria } from '../../types'

interface SecCalendarioMaquinariaProps {
  timeline: TimelineEvento[]
  maquinarias: Maquinaria[]
  categorias: CategoriaMaquinaria[]
  filters: FiltersMaquinaria
}

const SIN_CATEGORIA = 'Sin categoría'

function rangeDays(dates: string[]): string[] {
  if (!dates.length) return []
  const sorted = [...dates].sort()
  const start = new Date(sorted[0] + 'T00:00:00')
  const end = new Date(sorted[sorted.length - 1] + 'T00:00:00')
  const result: string[] = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    result.push(d.toISOString().slice(0, 10))
  }
  return result
}

export function SecCalendarioMaquinaria({ timeline, maquinarias, categorias, filters }: SecCalendarioMaquinariaProps) {
  const categoriaPorMaquinariaId = useMemo(() => {
    const nombrePorId = new Map(categorias.map(c => [c.id, c.nombre]))
    return new Map(maquinarias.map(m => [m.id, (m.categoria_id && nombrePorId.get(m.categoria_id)) || SIN_CATEGORIA]))
  }, [maquinarias, categorias])

  const codigoPorId = useMemo(() => new Map(maquinarias.map(m => [m.id, m.codigo])), [maquinarias])

  // Nota: este calendario usa v_maquinaria_timeline (incluye cambios de estado, no solo
  // intervenciones), y respeta Desde/Hasta, Categoría y búsqueda libre de los filtros globales.
  // Turno/Actividad/Responsable no aplican aquí porque son atributos de la intervención, no
  // de la máquina ni del evento genérico de trazabilidad.
  const maquinasVisibles = useMemo(() => {
    const q = filters.search.toLowerCase().trim()
    return maquinarias.filter(m => {
      if (!m.activo) return false
      if (filters.categoria && categoriaPorMaquinariaId.get(m.id) !== filters.categoria) return false
      if (q && !`${m.codigo} ${m.nombre}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [maquinarias, filters.categoria, filters.search, categoriaPorMaquinariaId])

  const eventosFiltrados = useMemo(() => {
    return timeline.filter(t => {
      const d = t.fecha.slice(0, 10)
      if (filters.desde && d < filters.desde) return false
      if (filters.hasta && d > filters.hasta) return false
      return true
    })
  }, [timeline, filters.desde, filters.hasta])

  const days = useMemo(() => rangeDays(eventosFiltrados.map(e => e.fecha.slice(0, 10))), [eventosFiltrados])

  const actividadPorMaquinaria = useMemo(() => {
    const map = new Map<string, Set<string>>()
    eventosFiltrados.forEach(e => {
      const d = e.fecha.slice(0, 10)
      if (!map.has(e.maquinariaId)) map.set(e.maquinariaId, new Set())
      map.get(e.maquinariaId)!.add(d)
    })
    return map
  }, [eventosFiltrados])

  const maxDia = days[days.length - 1] ?? null

  const filas = useMemo(() => {
    return maquinasVisibles
      .map(m => {
        const dias = actividadPorMaquinaria.get(m.id) ?? new Set<string>()
        const ultimo = [...dias].sort().pop() ?? null
        const diasDesdeUltima = ultimo && maxDia
          ? Math.round((new Date(maxDia + 'T00:00').getTime() - new Date(ultimo + 'T00:00').getTime()) / 86400000)
          : null
        return { maquinaria: m, dias, diasDesdeUltima }
      })
      .sort((a, b) => (b.diasDesdeUltima ?? 9999) - (a.diasDesdeUltima ?? 9999))
  }, [maquinasVisibles, actividadPorMaquinaria, maxDia])

  if (!days.length || !filas.length) {
    return <div className="text-sm text-gray-400 text-center py-8">Sin actividad registrada en el período.</div>
  }

  const cell = days.length > 50 ? 12 : days.length > 30 ? 16 : 20
  const gap = 2
  const cw = cell + gap
  const padL = 130
  const padT = 38
  const padR = 130
  const padB = 6
  const rowH = Math.max(18, cell + 8)
  const W = padL + days.length * cw + padR
  const H = padT + filas.length * rowH + padB

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
          {filas.map((_, r) => r % 2 === 1 && (
            <rect key={`row-bg-${r}`} x={0} y={padT + r * rowH} width={W} height={rowH} fill="rgba(17,48,46,.018)" />
          ))}

          {days.map((day, i) => {
            const dt = new Date(day + 'T00:00:00')
            const x = padL + i * cw
            return (
              (cell >= 16 || dt.getDate() % 2 === 1) && (
                <text key={`day-${day}`} x={x + cell / 2} y={padT - 7} textAnchor="middle" fill={BRAND.muted} fontSize={8}>
                  {dt.getDate()}
                </text>
              )
            )
          })}

          {monthLines.map((x, i) => (
            <line key={`ml-${i}`} x1={x - 1} y1={padT - 16} x2={x - 1} y2={H - padB} stroke={BRAND.muted} strokeWidth={0.5} strokeDasharray="3 3" opacity={0.4} />
          ))}
          {monthLabels.map((m, i) => (
            <text key={`mo-${i}`} x={m.x} y={12} fill={BRAND.muted} fontSize={11} fontWeight={600}>{m.label}</text>
          ))}

          {filas.map((fila, r) => {
            const y = padT + r * rowH
            return (
              <g key={fila.maquinaria.id}>
                <text x={padL - 10} y={y + rowH / 2} textAnchor="end" dominantBaseline="middle" fill={BRAND.dark} fontSize={11} fontFamily="monospace" fontWeight={700}>
                  {codigoPorId.get(fila.maquinaria.id) ?? fila.maquinaria.codigo}
                </text>
                {days.map((day, i) => {
                  const x = padL + i * cw
                  const has = fila.dias.has(day)
                  return (
                    <rect
                      key={`${fila.maquinaria.id}-${day}`}
                      x={x}
                      y={y + (rowH - cell) / 2}
                      width={cell}
                      height={cell}
                      rx={2.5}
                      fill={has ? BRAND.lime : 'rgba(17,48,46,.07)'}
                    >
                      <title>{`${fila.maquinaria.codigo} · ${day} · ${has ? 'tuvo actividad' : 'sin actividad'}`}</title>
                    </rect>
                  )
                })}
                <text x={W - padR + 10} y={y + rowH / 2} dominantBaseline="middle" fill={fila.diasDesdeUltima != null && fila.diasDesdeUltima > 14 ? BRAND.fault : BRAND.muted} fontWeight={700} fontSize={12}>
                  {fila.diasDesdeUltima == null ? 'sin registro' : `${fila.diasDesdeUltima}d`}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: BRAND.lime }} />Tuvo intervención</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'rgba(17,48,46,.07)' }} />Sin actividad</span>
        <span className="ml-auto text-gray-400">(columna derecha = días desde la última actividad)</span>
      </div>
    </div>
  )
}
