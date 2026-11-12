import { useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, LabelList, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { fmtDate, fmtNum } from '../../lib/constants'
import { downloadCsv, toCsv } from '../../lib/csv'
import { pct } from '../../lib/gestionFlota'
import type { EstadoVivo } from '../../lib/gestionFlota'
import type { CeldaCalendario, FilaConductor, FilaContrato, Tablero } from '../../hooks/useTableroGestion'
import type { FiltrosGestion } from '../../hooks/useFiltrosGestion'
import { DisponibilidadWidget } from '../dashboard/DisponibilidadWidget'
import type { Disponibilidad } from '../../types'
import { COLOR, Seccion, Tile, Vacio, tooltipStyle } from './ui'

const AXIS = { fontSize: 11, fill: '#6B7280' }

/* ─── Tendencias ─── */

export function SecTendencias({ t }: { t: Tablero }) {
  const data = t.tendencia
  const hayDatos = data.some(d => d.sinFalla + d.conFalla > 0)
  const unidad = t.tendenciaSemanal ? 'por semana' : 'por día'
  return (
    <Seccion id="tendencias" titulo="Tendencias" hint={`Checklist, fallas, cobertura y kilometraje ${unidad}`}>
      {!hayDatos ? <div className="card"><Vacio>Sin checklist en el período.</Vacio></div> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-dark mb-3">Checklist realizados {unidad}</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="20%">
                <CartesianGrid stroke={COLOR.grid} vertical={false} />
                <XAxis dataKey="etiqueta" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} />
                <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                <Bar dataKey="sinFalla" name="Sin fallas" stackId="a" fill={COLOR.ok} stroke="#fff" strokeWidth={1} />
                <Bar dataKey="conFalla" name="Con fallas" stackId="a" fill={COLOR.D} stroke="#fff" strokeWidth={1} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3 className="text-sm font-semibold text-dark mb-3">Cobertura de flota y checklist con falla (%)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={COLOR.grid} vertical={false} />
                <XAxis dataKey="etiqueta" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} />
                <YAxis domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} unit="%" />
                <Tooltip {...tooltipStyle} cursor={{ stroke: COLOR.muted, strokeDasharray: '3 3' }} formatter={v => (v == null ? '—' : `${v}%`)} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                <Line type="monotone" dataKey="cobertura" name="Cobertura de flota" stroke={COLOR.ok} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
                <Line type="monotone" dataKey="pctConFalla" name="Checklist con falla" stroke={COLOR.D} strokeWidth={2} dot={false} connectNulls activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="card lg:col-span-2">
            <h3 className="text-sm font-semibold text-dark mb-3">Kilómetros recorridos {unidad}</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barCategoryGap="20%">
                <CartesianGrid stroke={COLOR.grid} vertical={false} />
                <XAxis dataKey="etiqueta" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                <Tooltip {...tooltipStyle} formatter={v => [`${fmtNum(Number(v))} km`, 'Recorrido']} />
                <Bar dataKey="km" name="Km" fill={COLOR.dark} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </Seccion>
  )
}

/* ─── Fallas ─── */

export function SecFallas({ t }: { t: Tablero }) {
  const items = t.porItem.filter(i => i.revisiones > 0)
  return (
    <Seccion id="fallas" titulo="Fallas" hint="Qué falla más en el período, y hace cuánto están abiertas las fallas vigentes">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-sm font-semibold text-dark mb-3">Fallas reportadas por ítem</h3>
          {items.length === 0 ? <Vacio>Sin checklist en el período.</Vacio> : (
            <ResponsiveContainer width="100%" height={Math.max(220, items.length * 26)}>
              <BarChart layout="vertical" data={items} margin={{ top: 0, right: 40, left: 0, bottom: 0 }} barCategoryGap={6}>
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 11, fill: '#374151' }} tickLine={false} axisLine={false} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v, _n, item) => {
                    const rev = (item.payload as { revisiones: number }).revisiones
                    return [`${v} de ${fmtNum(rev)} revisiones (${pct(Number(v), rev)}%)`, 'Fallas']
                  }}
                />
                <Bar dataKey="fallas" fill={COLOR.dark} radius={[0, 4, 4, 0]} barSize={14}>
                  <LabelList dataKey="fallas" position="right" style={{ fontSize: 11, fill: '#374151' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-dark mb-1">Antigüedad de las fallas vigentes</h3>
          <p className="text-xs text-gray-500 mb-3">Desde el primer reporte de la falla que sigue sin salir OK</p>
          {t.fallasVigentes === 0 ? <Vacio>Sin fallas vigentes.</Vacio> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={t.antiguedad} margin={{ top: 16, right: 4, left: -20, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid stroke={COLOR.grid} vertical={false} />
                <XAxis dataKey="rango" tick={AXIS} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                <Bar dataKey="P" name="Precaución" stackId="s" fill={COLOR.P} stroke="#fff" strokeWidth={1} />
                <Bar dataKey="D" name="Detención" stackId="s" fill={COLOR.D} stroke="#fff" strokeWidth={1} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </Seccion>
  )
}

/* ─── Por contrato ─── */

export function SecContratos({ t, filtros, setFiltros }: {
  t: Tablero
  filtros: FiltrosGestion
  setFiltros: (c: Partial<FiltrosGestion>) => void
}) {
  const filas = t.porContrato
  function exportar() {
    downloadCsv(`contratos_${new Date().toISOString().slice(0, 10)}.csv`, toCsv<FilaContrato>(filas, [
      { header: 'Contrato', value: r => r.contrato },
      { header: 'Vehículos en servicio', value: r => r.vehiculos },
      { header: 'Con checklist en el período', value: r => r.conChecklist },
      { header: 'Cobertura %', value: r => r.cobertura },
      { header: 'Checklist', value: r => r.checklist },
      { header: '% con falla', value: r => r.pctConFalla },
      { header: 'Detención', value: r => r.detencion },
      { header: 'Con restricción', value: r => r.restriccion },
      { header: `Sin checklist ${filtros.umbral}+ días`, value: r => r.sinChecklist },
      { header: 'Fallas vigentes', value: r => r.fallasVigentes },
    ]))
  }
  return (
    <Seccion
      id="contratos"
      titulo="Por contrato"
      hint="Toca un contrato para filtrar todo el tablero por él"
      acciones={<button type="button" onClick={exportar} disabled={!filas.length} className="btn-secondary btn-sm disabled:opacity-50">Exportar CSV</button>}
    >
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-th">Contrato</th>
                <th className="table-th text-right">Vehículos</th>
                <th className="table-th">Cobertura</th>
                <th className="table-th text-right">Checklist</th>
                <th className="table-th text-right">% con falla</th>
                <th className="table-th text-right">Detención</th>
                <th className="table-th text-right">Restricción</th>
                <th className="table-th text-right">Sin checklist</th>
                <th className="table-th text-right">Fallas vigentes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filas.length === 0 && <tr><td colSpan={9}><Vacio>Sin datos.</Vacio></td></tr>}
              {filas.map(r => (
                <tr
                  key={r.contrato}
                  onClick={() => setFiltros({ contrato: filtros.contrato === r.contrato ? '' : r.contrato })}
                  className={`cursor-pointer hover:bg-gray-50 ${filtros.contrato === r.contrato ? 'bg-primary/5' : ''}`}
                >
                  <td className="table-td font-semibold text-dark">{r.contrato}</td>
                  <td className="table-td text-right tabular-nums">{r.vehiculos}</td>
                  <td className="table-td min-w-[8rem]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${r.cobertura >= 80 ? 'bg-primary' : r.cobertura >= 50 ? 'bg-warn' : 'bg-fault'}`} style={{ width: `${r.cobertura}%` }} />
                      </div>
                      <span className="text-xs tabular-nums w-9 text-right">{r.vehiculos ? `${r.cobertura}%` : '—'}</span>
                    </div>
                  </td>
                  <td className="table-td text-right tabular-nums">{r.checklist}</td>
                  <td className={`table-td text-right tabular-nums ${r.pctConFalla >= 30 ? 'text-fault font-semibold' : ''}`}>{r.checklist ? `${r.pctConFalla}%` : '—'}</td>
                  <td className={`table-td text-right tabular-nums ${r.detencion ? 'text-fault font-bold' : 'text-gray-400'}`}>{r.detencion}</td>
                  <td className={`table-td text-right tabular-nums ${r.restriccion ? 'text-warn font-semibold' : 'text-gray-400'}`}>{r.restriccion}</td>
                  <td className={`table-td text-right tabular-nums ${r.sinChecklist ? 'text-warn font-semibold' : 'text-gray-400'}`}>{r.sinChecklist}</td>
                  <td className="table-td text-right tabular-nums">{r.fallasVigentes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Seccion>
  )
}

/* ─── Cumplimiento ─── */

const CELDA: Record<CeldaCalendario, { cls: string; label: string }> = {
  0: { cls: 'bg-gray-100', label: 'Sin checklist' },
  1: { cls: 'bg-primary', label: 'Sin fallas' },
  2: { cls: 'bg-warn', label: 'Con falla de precaución' },
  3: { cls: 'bg-fault', label: 'Detención o no operativo' },
}

export function SecCumplimiento({ t, onVer }: { t: Tablero; onVer: (ev: EstadoVivo) => void }) {
  const { dias, filas } = t.calendario
  const [todosCond, setTodosCond] = useState(false)
  const conductores = todosCond ? t.porConductor : t.porConductor.slice(0, 10)

  function exportarConductores() {
    downloadCsv(`conductores_${new Date().toISOString().slice(0, 10)}.csv`, toCsv<FilaConductor>(t.porConductor, [
      { header: 'Conductor', value: r => r.conductor },
      { header: 'Checklist', value: r => r.checklist },
      { header: 'Vehículos', value: r => r.vehiculos },
      { header: 'Días con reporte', value: r => r.dias },
      { header: '% con falla', value: r => r.pctConFalla },
      { header: 'Fallas reportadas', value: r => r.fallas },
      { header: 'Último checklist', value: r => fmtDate(r.ultimo) },
    ]))
  }

  return (
    <Seccion id="cumplimiento" titulo="Cumplimiento" hint={`Checklist por vehículo y día (últimos ${dias.length} días del período) y reporte por conductor`}>
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="card xl:col-span-3 p-0 overflow-hidden">
          <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3 border-b border-gray-100 text-xs text-gray-600">
            {([0, 1, 2, 3] as CeldaCalendario[]).map(k => (
              <span key={k} className="inline-flex items-center gap-1.5"><span className={`w-3 h-3 rounded-sm ${CELDA[k].cls}`} />{CELDA[k].label}</span>
            ))}
          </div>
          {filas.length === 0 ? <Vacio>Sin vehículos.</Vacio> : (
            <div className="overflow-auto max-h-[30rem]">
              <table className="text-xs border-separate" style={{ borderSpacing: 2 }}>
                <thead className="sticky top-0 bg-white z-10">
                  <tr>
                    <th className="sticky left-0 bg-white z-20 text-left font-semibold text-gray-500 px-2">Patente</th>
                    {dias.map(d => {
                      const dow = new Date(`${d}T12:00:00`).getDay()
                      return (
                        <th key={d} className={`w-4 font-normal tabular-nums ${dow === 0 || dow === 6 ? 'text-gray-300' : 'text-gray-500'}`} title={fmtDate(d)}>
                          {Number(d.slice(8))}
                        </th>
                      )
                    })}
                    <th className="text-right font-semibold text-gray-500 px-2 whitespace-nowrap">Días</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map(({ ev, celdas }) => {
                    const n = celdas.filter(c => c > 0).length
                    return (
                      <tr key={ev.vehiculo.id}>
                        <td className="sticky left-0 bg-white z-10 px-2 whitespace-nowrap">
                          <button type="button" onClick={() => onVer(ev)} className="font-mono font-medium text-dark hover:text-primary">
                            {ev.vehiculo.patente}
                          </button>
                          <span className="text-gray-400 ml-1.5">{ev.vehiculo.contrato}</span>
                        </td>
                        {celdas.map((c, k) => (
                          <td key={dias[k]} className="p-0">
                            <span className={`block w-4 h-4 rounded-sm ${CELDA[c].cls}`} title={`${ev.vehiculo.patente} · ${fmtDate(dias[k])}: ${CELDA[c].label}`} />
                          </td>
                        ))}
                        <td className={`text-right px-2 tabular-nums ${ev.fueraServicio ? 'text-gray-400' : n === 0 ? 'text-fault font-semibold' : 'text-gray-700'}`}>
                          {n}/{dias.length}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card xl:col-span-2 p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-dark">Conductores ({fmtNum(t.porConductor.length)})</h3>
            <button type="button" onClick={exportarConductores} disabled={!t.porConductor.length} className="text-xs font-medium text-primary hover:underline disabled:opacity-50">
              Exportar CSV
            </button>
          </div>
          {t.porConductor.length === 0 ? <Vacio>Sin checklist en el período.</Vacio> : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-th">Conductor</th>
                      <th className="table-th text-right">Checklist</th>
                      <th className="table-th text-right">Días</th>
                      <th className="table-th text-right">% falla</th>
                      <th className="table-th">Último</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {conductores.map(c => (
                      <tr key={c.id}>
                        <td className="table-td py-2 truncate max-w-[12rem]" title={c.conductor}>{c.conductor}</td>
                        <td className="table-td py-2 text-right tabular-nums">{c.checklist}</td>
                        <td className="table-td py-2 text-right tabular-nums">{c.dias}</td>
                        <td className={`table-td py-2 text-right tabular-nums ${c.pctConFalla >= 30 ? 'text-fault font-semibold' : ''}`}>{c.pctConFalla}%</td>
                        <td className="table-td py-2 text-xs text-gray-500 whitespace-nowrap">{fmtDate(c.ultimo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {t.porConductor.length > 10 && (
                <button type="button" onClick={() => setTodosCond(v => !v)} className="w-full py-2.5 text-sm font-medium text-primary hover:bg-gray-50 border-t border-gray-100">
                  {todosCond ? 'Ver menos' : `Ver los ${fmtNum(t.porConductor.length)} conductores`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Seccion>
  )
}

/* ─── Mantenimiento (OT) ─── */

export function SecMantenimiento({ t, disponibilidad }: {
  t: Tablero
  disponibilidad: { data: Disponibilidad[]; loading: boolean; error: string | null }
}) {
  const o = t.ot
  return (
    <Seccion id="mantenimiento" titulo="Órdenes de trabajo y disponibilidad" hint="OT generadas desde las fallas de checklist de los vehículos filtrados">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
        <Tile label="OT abiertas" value={fmtNum(o.abiertas)} tono={o.abiertas ? 'warn' : undefined} />
        <Tile label="Sin asignar" value={fmtNum(o.sinAsignar)} sub={o.abiertas ? `${pct(o.sinAsignar, o.abiertas)}% de las abiertas` : undefined} tono={o.sinAsignar ? 'fault' : undefined} />
        <Tile label="Abiertas hace 30+ días" value={fmtNum(o.mas30)} tono={o.mas30 ? 'fault' : undefined} />
        <Tile label="Cerradas en el período" value={fmtNum(o.cerradasPeriodo)} />
        <Tile
          label="Tiempo prom. de cierre"
          value={o.diasPromCierre == null ? '—' : `${o.diasPromCierre.toLocaleString('es-CL', { maximumFractionDigits: 1 })} d`}
          sub="OT cerradas en el período"
        />
      </div>
      {o.yaOk > 0 && (
        <div className="flex gap-3 items-start bg-warn/10 border border-warn/30 rounded-xl px-4 py-3 mb-3 text-sm text-gray-700">
          <span className="text-warn font-bold" aria-hidden>!</span>
          <p>
            <b>{fmtNum(o.yaOk)}</b> OT abiertas ({pct(o.yaOk, o.abiertas)}%) corresponden a fallas que un checklist posterior ya reportó en buen estado.
            Probablemente ya se repararon y quedan pendientes de cerrar en Órdenes de trabajo.
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-sm font-semibold text-dark mb-3">Antigüedad de las OT abiertas</h3>
          {o.abiertas === 0 ? <Vacio>Sin OT abiertas.</Vacio> : (
            <div className="space-y-2.5">
              {o.porAntiguedad.map(r => (
                <div key={r.rango} className="flex items-center gap-3 text-sm">
                  <span className="w-24 text-gray-600 shrink-0">{r.rango}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-dark" style={{ width: `${pct(r.n, o.abiertas)}%` }} />
                  </div>
                  <span className="w-20 text-right tabular-nums text-gray-700">{fmtNum(r.n)} <span className="text-xs text-gray-400">({pct(r.n, o.abiertas)}%)</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-dark mb-1">Disponibilidad por estado operativo</h3>
          <p className="text-xs text-gray-500 mb-3">Toda la flota que afecta indicadores · últimos 30 días (no aplica filtros)</p>
          <DisponibilidadWidget data={disponibilidad.data} loading={disponibilidad.loading} error={disponibilidad.error} />
        </div>
      </div>
    </Seccion>
  )
}
