import { useMemo, useState } from 'react'
import { PREGUNTAS, fmtDate, fmtNum, severityLabel, severityColor } from '../../lib/constants'
import type { VInspeccion } from '../../types'
import type { PKey } from '../../lib/constants'

interface SecPrioridadesProps {
  data: VInspeccion[]
}

interface VehicleStat {
  patente: string
  insps: number
  withProb: number
  faultRate: number
  active: typeof PREGUNTAS[number][]
  lastOp: boolean | null
  score: number
  latestRec: VInspeccion | null
  perSys: Record<PKey, number>
  perSysObs: Record<PKey, { obs: string; fecha: string } | null>
}

function computeVehicleStats(data: VInspeccion[]): VehicleStat[] {
  const map: Record<string, {
    insps: VInspeccion[]
    withProb: number
    perSys: Record<PKey, number>
    perSysObs: Record<PKey, { obs: string; fecha: string } | null>
    latestRec: VInspeccion | null
  }> = {}

  data.forEach(r => {
    const pl = r.patente
    if (!pl) return
    if (!map[pl]) {
      map[pl] = {
        insps: [],
        withProb: 0,
        perSys: { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 },
        perSysObs: { p1: null, p2: null, p3: null, p4: null, p5: null, p6: null },
        latestRec: null,
      }
    }
    const o = map[pl]
    o.insps.push(r)
    if (r.n_fallas > 0) o.withProb++
    PREGUNTAS.forEach(p => {
      if (r[p.key]) {
        o.perSys[p.key]++
        const fecha = r.fecha.slice(0, 10)
        if (!o.perSysObs[p.key] || fecha > o.perSysObs[p.key]!.fecha) {
          o.perSysObs[p.key] = { obs: r[p.obs] ?? '', fecha }
        }
      }
    })
    if (!o.latestRec || r.fecha > o.latestRec.fecha) {
      o.latestRec = r
    }
  })

  return Object.entries(map)
    .map(([patente, o]) => {
      const faultRate = o.insps.length ? o.withProb / o.insps.length : 0
      const active = PREGUNTAS.filter(p => o.latestRec?.[p.key] === true)
      const lastOp = o.latestRec?.operativo ?? null
      const score = active.length * 10 + Math.round(faultRate * 20) + (!lastOp ? 25 : 0)
      return {
        patente,
        insps: o.insps.length,
        withProb: o.withProb,
        faultRate,
        active,
        lastOp,
        score,
        latestRec: o.latestRec,
        perSys: o.perSys,
        perSysObs: o.perSysObs,
      }
    })
    .filter(v => v.score > 0)
    .sort((a, b) => b.score - a.score || b.active.length - a.active.length)
}

export function SecPrioridades({ data }: SecPrioridadesProps) {
  const [openRows, setOpenRows] = useState<Set<string>>(new Set())
  const rows = useMemo(() => computeVehicleStats(data), [data])
  const maxScore = Math.max(1, ...rows.map(r => r.score))

  const alta = rows.filter(r => severityLabel(r.score) === 'alta').length
  const noop = rows.filter(r => r.lastOp === false).length

  function toggleRow(patente: string) {
    setOpenRows(prev => {
      const next = new Set(prev)
      if (next.has(patente)) next.delete(patente)
      else next.add(patente)
      return next
    })
  }

  if (!rows.length) {
    return (
      <div className="rounded-xl bg-primary/5 border border-primary/20 p-6 text-center text-gray-500 text-sm">
        No hay vehículos con fallas activas en el periodo filtrado. 👍
      </div>
    )
  }

  return (
    <div>
      {/* Intro */}
      <div className="rounded-xl border-l-4 border-warn bg-warn/5 px-4 py-3 mb-4 text-sm text-gray-700">
        <b>{fmtNum(rows.length)} vehículos</b> requieren atención.{' '}
        {alta > 0 && <><b className="text-fault">{alta}</b> con severidad alta</>}
        {noop > 0 && <> y <b className="text-fault">{noop}</b> marcado(s) no operativo en su última inspección</>}.
        {' '}El ranking pondera las fallas activas, la recurrencia y si quedó no operativo. Toca una fila para ver la orden de trabajo.
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-th w-10">#</th>
                <th className="table-th">Patente</th>
                <th className="table-th">Estado actual (última inspección)</th>
                <th className="table-th text-center">Operativo</th>
                <th className="table-th text-center">Reportes</th>
                <th className="table-th text-center">% c/falla</th>
                <th className="table-th">Severidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, i) => {
                const sl = severityLabel(row.score)
                const sc = severityColor(sl)
                const isOpen = openRows.has(row.patente)
                return [
                  <tr
                    key={`main-${row.patente}`}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${isOpen ? 'bg-primary/5' : ''}`}
                    onClick={() => toggleRow(row.patente)}
                  >
                    <td className="table-td">
                      <span className={`font-bold text-sm ${i < 3 ? 'text-fault' : 'text-gray-400'}`}>{i + 1}</span>
                    </td>
                    <td className="table-td">
                      <span className="font-mono font-bold text-dark">{row.patente}</span>
                    </td>
                    <td className="table-td">
                      <div className="flex flex-wrap gap-1">
                        {row.active.length
                          ? row.active.map(q => (
                              <span key={q.key} className="badge-fault text-xs">{q.short}</span>
                            ))
                          : <span className="text-xs text-gray-400">sin falla activa</span>
                        }
                      </div>
                    </td>
                    <td className="table-td text-center">
                      {row.lastOp === false
                        ? <span className="badge-fault">NO OP.</span>
                        : <span className="badge-ok">Operativo</span>
                      }
                    </td>
                    <td className="table-td text-center font-mono text-sm">{row.insps}</td>
                    <td className="table-td text-center font-mono text-sm">{Math.round(row.faultRate * 100)}%</td>
                    <td className="table-td min-w-36">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.round(row.score / maxScore * 100)}%`, background: sc }}
                          />
                        </div>
                        <span className="font-mono text-xs font-bold" style={{ color: sc }}>{row.score}</span>
                        <span className="text-xs capitalize" style={{ color: sc }}>{sl}</span>
                      </div>
                    </td>
                  </tr>,
                  isOpen && (
                    <tr key={`detail-${row.patente}`}>
                      <td colSpan={7} className="bg-gray-50 px-6 py-4">
                        <WorkOrder row={row} />
                      </td>
                    </tr>
                  ),
                ]
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function WorkOrder({ row }: { row: VehicleStat }) {
  const latestDate = row.latestRec?.fecha.slice(0, 10) ?? ''
  return (
    <div>
      <h5 className="font-bold text-sm text-gray-700 mb-3">
        Orden de trabajo · {row.patente} · última inspección {latestDate ? fmtDate(latestDate) : '—'}
      </h5>
      {!row.active.length ? (
        <p className="text-sm text-gray-400 italic">Sin fallas activas en la última inspección.</p>
      ) : (
        <div className="space-y-2">
          {row.active.map(q => {
            const sysObs = row.perSysObs[q.key]
            return (
              <div key={q.key} className="grid grid-cols-[1fr_2fr_auto] gap-3 bg-white rounded-lg border border-gray-200 p-3">
                <div>
                  <span className="inline-block w-2 h-2 rounded-full bg-fault mr-1.5" />
                  <span className="text-sm font-semibold text-gray-800">{q.label}</span>
                </div>
                <div className="text-xs text-gray-600 italic">
                  {sysObs?.obs
                    ? `"${sysObs.obs}"`
                    : <span className="text-gray-400 not-italic">sin comentario registrado</span>
                  }
                </div>
                <div className="text-right">
                  {sysObs?.fecha && <p className="text-xs text-gray-400">{fmtDate(sysObs.fecha)}</p>}
                  <p className="text-xs text-gray-400">{row.perSys[q.key]}× histórico</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {row.latestRec?.obs_general && (
        <div className="mt-3 text-xs text-gray-600">
          <span className="font-semibold text-gray-400 uppercase tracking-wide">Obs. general · </span>
          {row.latestRec.obs_general}
        </div>
      )}
    </div>
  )
}
