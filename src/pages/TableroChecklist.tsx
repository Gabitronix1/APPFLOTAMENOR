import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { FiltersProvider, applyFilters, useFilters } from '../hooks/useFilters'
import { useInspecciones } from '../hooks/useInspecciones'
import { FilterBar } from '../components/dashboard/FilterBar'
import { PanelSection } from '../components/dashboard/PanelSection'
import { KpiCard } from '../components/vehiculos/KpiCard'
import { downloadCsv, toCsv } from '../lib/csv'
import { fetchAllPages } from '../lib/fetchAllPages'
import { descargarInformePng } from '../lib/informePng'
import type { InformeFalla, InformePatente } from '../lib/informePng'
import { BRAND, PREGUNTAS, barColor, complianceColor, fmtDate, fmtNum } from '../lib/constants'
import type { VInspeccion } from '../types'

type TipoFiltro = 'todos' | 'completo' | 'diario'

const PAGE_SIZE = 25

function pct(n: number, total: number): number {
  return total ? Math.round((n / total) * 100) : 0
}

// Las columnas n_fallas / n_resueltas de v_inspecciones se inflan (la vista cruza respuestas con
// resoluciones), así que las fallas se cuentan desde las respuestas de cada checklist.
function nFallas(r: VInspeccion): number {
  return PREGUNTAS.filter(p => r[p.key] === true).length
}

interface ResolucionMin {
  inspeccion_id: string
  pregunta_id: number
  estado: string
}

const ESTADO_OT: Record<string, string> = {
  cerrada: 'Resuelta',
  abierta: 'Pendiente',
  asignada: 'Asignada',
  en_progreso: 'En progreso',
  cancelada: 'Cancelada',
}

function hora(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

function TableroContent() {
  const { filters } = useFilters()
  const { allInspecciones, loading, error } = useInspecciones()
  const [tipo, setTipo] = useState<TipoFiltro>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(0)
  const [abierta, setAbierta] = useState<string | null>(null)
  const [resoluciones, setResoluciones] = useState<ResolucionMin[] | null>(null)
  const [generando, setGenerando] = useState(false)

  const [lineas, setLineas] = useState<Map<string, string> | null>(null)

  useEffect(() => {
    fetchAllPages<ResolucionMin>('resoluciones', 'inspeccion_id,pregunta_id,estado')
      .then(setResoluciones)
      .catch(() => setResoluciones(null))
    fetchAllPages<{ id: string; linea: string | null }>('inspecciones', 'id,linea')
      .then(rows => setLineas(new Map(rows.map(r => [r.id, r.linea ?? '']))))
      .catch(() => setLineas(null))
  }, [])

  // Estado de la orden de trabajo de cada falla (inspección + pregunta).
  const estadoPorFalla = useMemo(() => {
    const m = new Map<string, string>()
    resoluciones?.forEach(r => m.set(`${r.inspeccion_id}:${r.pregunta_id}`, r.estado))
    return m
  }, [resoluciones])

  // Contrato: el del fundo si lo tiene; si no (los checklist nuevos ya no piden fundo), la línea de
  // operación del vehículo.
  function contratoDe(r: VInspeccion): string {
    return r.contrato || lineas?.get(r.id) || 'Sin contrato'
  }

  function estadoFalla(r: VInspeccion, idx: number): string {
    if (!resoluciones) return '—'
    const e = estadoPorFalla.get(`${r.id}:${idx + 1}`)
    return e ? (ESTADO_OT[e] ?? e) : 'Sin OT'
  }

  // Una falla está resuelta solo cuando su orden de trabajo está cerrada.
  function nResueltas(r: VInspeccion): number {
    return PREGUNTAS.filter((p, idx) => r[p.key] === true && estadoPorFalla.get(`${r.id}:${idx + 1}`) === 'cerrada').length
  }

  const data = useMemo(() => {
    const base = applyFilters(allInspecciones, filters)
    return tipo === 'todos' ? base : base.filter(r => r.tipo === tipo)
  }, [allInspecciones, filters, tipo])

  const metricas = useMemo(() => {
    const total = data.length
    const conFalla = data.filter(r => nFallas(r) > 0).length
    const noOperativos = data.filter(r => !r.operativo).length
    const fallas = data.reduce((s, r) => s + nFallas(r), 0)
    const resueltas = data.reduce((s, r) => s + nResueltas(r), 0)
    const dias = new Set(data.map(r => r.fecha.slice(0, 10)))
    return {
      total,
      vehiculos: new Set(data.map(r => r.patente)).size,
      conductores: new Set(data.map(r => r.conductor)).size,
      conFalla,
      pctConFalla: pct(conFalla, total),
      noOperativos,
      fallas,
      resueltas,
      pendientes: fallas - resueltas,
      vehiculosConFalla: new Set(data.filter(r => nFallas(r) > 0).map(r => r.patente)).size,
      pctResueltas: pct(resueltas, fallas),
      promedioDia: dias.size ? (total / dias.size).toFixed(1) : '0',
      diarios: data.filter(r => r.tipo === 'diario').length,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, estadoPorFalla])

  const porDia = useMemo(() => {
    const m: Record<string, { fecha: string; sinFalla: number; conFalla: number }> = {}
    data.forEach(r => {
      const d = r.fecha.slice(0, 10)
      m[d] ??= { fecha: d, sinFalla: 0, conFalla: 0 }
      if (nFallas(r) > 0) m[d].conFalla++
      else m[d].sinFalla++
    })
    return Object.values(m).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(-45)
  }, [data])

  const porItem = useMemo(
    () => PREGUNTAS.map(p => {
      const aplicables = data.filter(r => r[p.key] !== null && r[p.key] !== undefined)
      const fallas = aplicables.filter(r => r[p.key] === true).length
      return { name: p.label, fallas, revisiones: aplicables.length, tasa: aplicables.length ? fallas / aplicables.length : 0 }
    }).sort((a, b) => b.fallas - a.fallas),
    [data],
  )

  const porContrato = useMemo(() => {
    const m: Record<string, { contrato: string; checklist: number; patentes: Set<string>; conFalla: number; fallas: number; resueltas: number }> = {}
    data.forEach(r => {
      const k = contratoDe(r)
      m[k] ??= { contrato: k, checklist: 0, patentes: new Set(), conFalla: 0, fallas: 0, resueltas: 0 }
      m[k].checklist++
      m[k].patentes.add(r.patente)
      const f = nFallas(r)
      if (f > 0) m[k].conFalla++
      m[k].fallas += f
      m[k].resueltas += nResueltas(r)
    })
    return Object.values(m)
      .map(c => ({ ...c, vehiculos: c.patentes.size }))
      .sort((a, b) => b.checklist - a.checklist)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, lineas, estadoPorFalla])

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return data
    return data.filter(r => `${r.patente} ${r.conductor} ${contratoDe(r)}`.toLowerCase().includes(q))
  }, [data, busqueda])

  const paginas = Math.max(1, Math.ceil(lista.length / PAGE_SIZE))
  const paginaActual = Math.min(pagina, paginas - 1)
  const visibles = lista.slice(paginaActual * PAGE_SIZE, (paginaActual + 1) * PAGE_SIZE)

  function exportar() {
    const csv = toCsv<VInspeccion>(lista, [
      { header: 'Fecha', value: r => fmtDate(r.fecha) },
      { header: 'Hora', value: r => hora(r.fecha) },
      { header: 'Tipo', value: r => r.tipo },
      { header: 'Patente', value: r => r.patente },
      { header: 'Conductor', value: r => r.conductor },
      { header: 'Contrato', value: r => contratoDe(r) },
      { header: 'Operativo', value: r => (r.operativo ? 'Sí' : 'No') },
      { header: 'Fallas', value: r => nFallas(r) },
      { header: 'Fallas pendientes', value: r => (resoluciones ? nFallas(r) - nResueltas(r) : '') },
      { header: 'Resueltas', value: r => (resoluciones ? nResueltas(r) : '') },
      ...PREGUNTAS.map(p => ({
        header: p.label,
        value: (r: VInspeccion) => (r[p.key] === null || r[p.key] === undefined ? '' : r[p.key] ? 'Falla' : 'OK'),
      })),
      { header: 'Observación general', value: r => r.obs_general },
    ])
    downloadCsv(`checklist_${new Date().toISOString().slice(0, 10)}.csv`, csv)
  }

  // Patentes con fallas, cada una con su fecha de reporte y el estado de su OT.
  function detallePorPatente(): InformePatente[] {
    const m = new Map<string, InformePatente>()
    ;[...data].sort((a, b) => a.fecha.localeCompare(b.fecha)).forEach(r => {
      const g = m.get(r.patente) ?? { patente: r.patente, contrato: '', checklist: 0, conFalla: 0, fallas: [] }
      g.checklist++
      g.contrato = contratoDe(r)
      const fallas: InformeFalla[] = []
      PREGUNTAS.forEach((p, idx) => {
        if (r[p.key] === true) {
          fallas.push({ fecha: `${fmtDate(r.fecha)} ${hora(r.fecha)}`.trim(), item: p.label, obs: r[p.obs] ?? '', estado: estadoFalla(r, idx) })
        }
      })
      if (fallas.length) g.conFalla++
      g.fallas.push(...fallas)
      m.set(r.patente, g)
    })
    return [...m.values()]
      .filter(g => g.fallas.length)
      .sort((a, b) => b.fallas.length - a.fallas.length || a.patente.localeCompare(b.patente))
  }

  async function generarInforme() {
    setGenerando(true)
    try {
      const fechas = data.map(r => r.fecha.slice(0, 10)).sort()
      const desde = filters.desde || fechas[0]
      const hasta = filters.hasta || fechas[fechas.length - 1]
      const partes = [desde && hasta ? `Periodo: ${fmtDate(desde)} al ${fmtDate(hasta)}` : 'Sin checklist en el periodo']
      if (filters.fundo) partes.push(`Fundo: ${filters.fundo}`)
      if (filters.contrato) partes.push(`Contrato: ${filters.contrato}`)
      if (filters.conductor) partes.push(`Conductor: ${filters.conductor}`)
      if (filters.patente) partes.push(`Patente: ${filters.patente}`)
      if (filters.soloConProblemas) partes.push('Solo con problemas')
      if (tipo !== 'todos') partes.push(`Tipo: ${tipo === 'diario' ? 'Diario' : 'Completo'}`)
      const detalle = detallePorPatente()
      const hoy = new Date()
      await descargarInformePng(
        {
          titulo: 'Informe de checklist',
          subtitulo: partes.join('  ·  '),
          generado: `${hoy.toLocaleDateString('es-CL')} ${hoy.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`,
          kpis: [
            { label: 'Checklist realizados', value: fmtNum(metricas.total) },
            { label: 'Vehículos revisados', value: fmtNum(metricas.vehiculos) },
            { label: 'Conductores', value: fmtNum(metricas.conductores) },
            { label: 'Promedio por día', value: metricas.promedioDia },
            { label: 'Checklist con falla', value: `${metricas.pctConFalla}% (${fmtNum(metricas.conFalla)})`, alerta: metricas.pctConFalla >= 30 },
            { label: 'Vehículos con falla', value: `${pct(metricas.vehiculosConFalla, metricas.vehiculos)}% (${fmtNum(metricas.vehiculosConFalla)})`, alerta: metricas.vehiculosConFalla > 0 },
            { label: 'No operativos', value: fmtNum(metricas.noOperativos), alerta: metricas.noOperativos > 0 },
            { label: 'Fallas reportadas', value: fmtNum(metricas.fallas) },
            { label: 'Fallas por checklist', value: metricas.total ? (metricas.fallas / metricas.total).toFixed(2) : '0' },
            { label: 'Fallas resueltas', value: resoluciones ? `${metricas.pctResueltas}% (${fmtNum(metricas.resueltas)})` : '—' },
            { label: 'Fallas pendientes', value: resoluciones ? fmtNum(metricas.pendientes) : '—', alerta: !!resoluciones && metricas.pendientes > 0 },
            { label: 'Diarios / Completos', value: `${fmtNum(metricas.diarios)} / ${fmtNum(metricas.total - metricas.diarios)}` },
          ],
          porDia,
          porItem,
          porContrato,
          porPatente: detalle,
        },
        `informe_checklist_${hoy.toISOString().slice(0, 10)}.png`,
      )
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo generar el informe.')
    } finally {
      setGenerando(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-gray-500 animate-pulse">Cargando checklist…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-fault text-sm bg-fault/10 border border-fault/30 rounded-xl p-4">
          Error al cargar datos: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-dark mb-1">Tablero de checklist</h1>
          <p className="text-sm text-gray-500">Checklist realizados y sus métricas.</p>
        </div>
        <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void generarInforme()}
          disabled={generando || !data.length}
          className="btn-primary btn-sm"
        >
          {generando ? 'Generando…' : 'Informe PNG'}
        </button>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm bg-white">
          {([['todos', 'Todos'], ['completo', 'Completos'], ['diario', 'Diarios']] as const).map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => { setTipo(v); setPagina(0) }}
              className={`px-3.5 py-2 font-medium transition-colors ${tipo === v ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {l}
            </button>
          ))}
        </div>
        </div>
      </div>

      <FilterBar allData={allInspecciones} />

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <KpiCard label="Checklist realizados" value={fmtNum(metricas.total)} />
        <KpiCard label="Vehículos" value={fmtNum(metricas.vehiculos)} />
        <KpiCard label="Conductores" value={fmtNum(metricas.conductores)} />
        <KpiCard label="Promedio por día" value={metricas.promedioDia} />
        <KpiCard label="Con fallas" value={`${metricas.pctConFalla}% (${fmtNum(metricas.conFalla)})`} accent={metricas.pctConFalla >= 30} />
        <KpiCard label="No operativos" value={fmtNum(metricas.noOperativos)} accent={metricas.noOperativos > 0} />
        <KpiCard label="Fallas reportadas" value={fmtNum(metricas.fallas)} />
        <KpiCard
          label="Fallas resueltas"
          value={resoluciones ? `${metricas.pctResueltas}% (${fmtNum(metricas.resueltas)})` : '—'}
        />
        <KpiCard
          label="Fallas pendientes"
          value={resoluciones ? fmtNum(metricas.pendientes) : '—'}
          accent={!!resoluciones && metricas.pendientes > 0}
        />
        <KpiCard label="Checklist diarios" value={fmtNum(metricas.diarios)} />
        <KpiCard label="Checklist completos" value={fmtNum(metricas.total - metricas.diarios)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
        <PanelSection title="Checklist por día" hint="Últimos 45 días con registros">
          <div className="card">
            {porDia.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Sin datos en el periodo.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={porDia} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="fecha" tick={{ fontSize: 10 }} tickFormatter={(v: string) => `${v.slice(8)}/${v.slice(5, 7)}`} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip labelFormatter={v => fmtDate(String(v))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="sinFalla" name="Sin fallas" stackId="a" fill={BRAND.primary} />
                  <Bar dataKey="conFalla" name="Con fallas" stackId="a" fill={BRAND.fault} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </PanelSection>

        <PanelSection title="Fallas por ítem" hint="Cantidad de veces marcado en mal estado">
          <div className="card">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart layout="vertical" data={porItem} margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v, _n, item) => {
                    const n = Number(v)
                    const rev = (item.payload as { revisiones: number }).revisiones
                    return [`${n} de ${rev} (${pct(n, rev)}%)`, 'Fallas']
                  }}
                />
                <Bar dataKey="fallas" radius={[0, 4, 4, 0]}>
                  {porItem.map(i => <Cell key={i.name} fill={barColor(i.tasa)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PanelSection>
      </div>

      <PanelSection title="Por contrato" hint="Línea de operación del vehículo · % con falla sobre los checklist del contrato">
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="table-th">Contrato</th>
                  <th className="table-th text-center">Checklist</th>
                  <th className="table-th text-center">Vehículos</th>
                  <th className="table-th text-center">Con falla</th>
                  <th className="table-th text-center">% con falla</th>
                  <th className="table-th text-center">Fallas</th>
                  <th className="table-th text-center">Resueltas</th>
                  <th className="table-th text-center">Pendientes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {porContrato.length === 0 && (
                  <tr><td colSpan={8} className="table-td text-center text-gray-400 py-8">Sin datos en el periodo.</td></tr>
                )}
                {porContrato.map(c => {
                  const p = pct(c.conFalla, c.checklist)
                  const pendientes = c.fallas - c.resueltas
                  return (
                    <tr key={c.contrato} className="hover:bg-gray-50">
                      <td className="table-td font-medium">{c.contrato}</td>
                      <td className="table-td text-center font-mono">{c.checklist}</td>
                      <td className="table-td text-center font-mono">{c.vehiculos}</td>
                      <td className="table-td text-center font-mono">{c.conFalla}</td>
                      <td className="table-td text-center font-bold" style={{ color: complianceColor(100 - p) }}>{p}%</td>
                      <td className="table-td text-center font-mono">{c.fallas}</td>
                      <td className="table-td text-center font-mono">{resoluciones ? c.resueltas : '—'}</td>
                      <td className={`table-td text-center font-mono ${resoluciones && pendientes > 0 ? 'font-bold text-fault' : ''}`}>
                        {resoluciones ? pendientes : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </PanelSection>

      <PanelSection title="Checklist realizados" hint="Toca una fila para ver el detalle">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <input
            type="search"
            value={busqueda}
            onChange={e => { setBusqueda(e.target.value); setPagina(0) }}
            placeholder="Buscar patente, conductor o contrato…"
            className="input max-w-xs"
          />
          <span className="text-xs text-gray-500">{fmtNum(lista.length)} resultado{lista.length !== 1 ? 's' : ''}</span>
          <button type="button" onClick={exportar} disabled={!lista.length} className="btn-secondary btn-sm ml-auto disabled:opacity-50">
            Exportar CSV
          </button>
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="table-th">Fecha</th>
                  <th className="table-th">Patente</th>
                  <th className="table-th">Conductor</th>
                  <th className="table-th">Contrato</th>
                  <th className="table-th text-center">Tipo</th>
                  <th className="table-th text-center">Fallas</th>
                  <th className="table-th text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibles.length === 0 && (
                  <tr><td colSpan={7} className="table-td text-center text-gray-400 py-8">Sin checklist para mostrar.</td></tr>
                )}
                {visibles.map(r => (
                  <Fragment key={r.id}>
                    <tr
                      onClick={() => setAbierta(abierta === r.id ? null : r.id)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="table-td whitespace-nowrap">{fmtDate(r.fecha)} <span className="text-xs text-gray-400">{hora(r.fecha)}</span></td>
                      <td className="table-td font-mono font-medium">{r.patente}</td>
                      <td className="table-td">{r.conductor}</td>
                      <td className="table-td">{contratoDe(r)}</td>
                      <td className="table-td text-center">
                        <span className={r.tipo === 'diario' ? 'badge-warn' : 'badge-ok'}>{r.tipo === 'diario' ? 'Diario' : 'Completo'}</span>
                      </td>
                      <td className="table-td text-center font-mono">{nFallas(r)}</td>
                      <td className="table-td text-center">
                        {r.operativo ? <span className="badge-ok">Operativo</span> : <span className="badge-fault">No operativo</span>}
                      </td>
                    </tr>
                    {abierta === r.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {PREGUNTAS.filter(p => r[p.key] !== null && r[p.key] !== undefined).map(p => (
                              <div key={p.key} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium text-gray-800">{p.label}</span>
                                  {r[p.key] ? <span className="badge-fault">Falla</span> : <span className="badge-ok">OK</span>}
                                </div>
                                {r[p.obs] && <p className="text-xs text-gray-500 mt-1">{r[p.obs]}</p>}
                              </div>
                            ))}
                          </div>
                          {r.obs_general && (
                            <p className="text-sm text-gray-600 mt-3"><span className="font-semibold">Observación general:</span> {r.obs_general}</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {paginas > 1 && (
          <div className="flex items-center justify-center gap-3 mt-3 text-sm">
            <button type="button" className="btn-secondary btn-sm disabled:opacity-50" disabled={paginaActual === 0} onClick={() => setPagina(paginaActual - 1)}>
              Anterior
            </button>
            <span className="text-gray-500">Página {paginaActual + 1} de {paginas}</span>
            <button type="button" className="btn-secondary btn-sm disabled:opacity-50" disabled={paginaActual >= paginas - 1} onClick={() => setPagina(paginaActual + 1)}>
              Siguiente
            </button>
          </div>
        )}
      </PanelSection>
    </div>
  )
}

export function TableroChecklist() {
  return (
    <FiltersProvider>
      <TableroContent />
    </FiltersProvider>
  )
}
