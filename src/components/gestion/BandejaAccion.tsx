import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { PREGUNTAS, fmtDate, fmtNum } from '../../lib/constants'
import { downloadCsv, toCsv } from '../../lib/csv'
import { infoEstado } from '../../lib/vehiculos'
import type { EstadoVivo } from '../../lib/gestionFlota'
import type { FiltrosGestion } from '../../hooks/useFiltrosGestion'
import { UMBRALES } from '../../hooks/useFiltrosGestion'
import type { Tablero } from '../../hooks/useTableroGestion'
import type { VDocumentoVencimiento } from '../../types'
import { Seccion, SevBadge, Vacio, diasTexto } from './ui'

export type TabBandeja = 'detencion' | 'sin-reparar' | 'sin-checklist' | 'documentos'

function useDocumentosAlerta(): { docs: VDocumentoVencimiento[]; error: string | null } {
  const [state, setState] = useState<{ docs: VDocumentoVencimiento[]; error: string | null }>({ docs: [], error: null })
  useEffect(() => {
    let cancel = false
    supabase
      .from('v_documentos_vencimientos')
      .select('*')
      .in('estado', ['vencido', 'por_vencer'])
      .order('dias_restantes', { ascending: true })
      .then(({ data, error }) => {
        if (!cancel) setState({ docs: (data ?? []) as unknown as VDocumentoVencimiento[], error: error?.message ?? null })
      })
    return () => { cancel = true }
  }, [])
  return state
}

interface Props {
  t: Tablero
  tab: TabBandeja
  setTab: (t: TabBandeja) => void
  filtros: FiltrosGestion
  setFiltros: (c: Partial<FiltrosGestion>) => void
  onVer: (ev: EstadoVivo) => void
}

export function BandejaAccion({ t, tab, setTab, filtros, setFiltros, onVer }: Props) {
  const { docs: docsTodos, error: errorDocs } = useDocumentosAlerta()
  const porId = useMemo(() => new Map(t.estados.map(e => [e.vehiculo.id, e])), [t.estados])
  const docs = useMemo(() => docsTodos.filter(d => porId.has(d.patente_id)), [docsTodos, porId])

  const tabs: { id: TabBandeja; label: string; n: number; tono: string }[] = [
    { id: 'detencion', label: 'Detención', n: t.detencion.length, tono: 'bg-fault text-white' },
    { id: 'sin-reparar', label: 'Fallas sin reparar', n: t.sinReparar.length, tono: 'bg-warn text-white' },
    { id: 'sin-checklist', label: 'Sin checklist', n: t.sinChecklist.length, tono: 'bg-warn text-white' },
    { id: 'documentos', label: 'Documentos', n: docs.length, tono: 'bg-dark text-white' },
  ]

  function exportar() {
    const fecha = new Date().toISOString().slice(0, 10)
    if (tab === 'detencion') {
      downloadCsv(`detencion_${fecha}.csv`, toCsv(t.detencion, [
        { header: 'Patente', value: e => e.vehiculo.patente },
        { header: 'Contrato', value: e => e.vehiculo.contrato },
        { header: 'Estado operativo', value: e => infoEstado(e.vehiculo.estado).label },
        { header: 'Declarado no operativo', value: e => (e.declaradoNoOperativo ? 'Sí' : 'No') },
        { header: 'Fallas de detención', value: e => fallasDe(e, 'D').map(x => x.label).join(' | ') },
        { header: 'Otras fallas', value: e => fallasDe(e, 'P').map(x => x.label).join(' | ') },
        { header: 'Último checklist', value: e => (e.ultimo ? fmtDate(e.ultimo.fecha) : '') },
        { header: 'Último conductor', value: e => e.ultimo?.conductor ?? '' },
      ]))
    } else if (tab === 'sin-reparar') {
      downloadCsv(`fallas_sin_reparar_${fecha}.csv`, toCsv(t.sinReparar, [
        { header: 'Patente', value: r => r.ev.vehiculo.patente },
        { header: 'Contrato', value: r => r.ev.vehiculo.contrato },
        { header: 'Ítem', value: r => PREGUNTAS[r.idx].label },
        { header: 'Severidad', value: r => (r.item.sev === 'D' ? 'Detención' : 'Precaución') },
        { header: 'Falla desde', value: r => fmtDate(new Date(r.item.desde).toISOString()) },
        { header: 'Días abierta', value: r => r.diasAbierta },
        { header: 'Reportes últimos 30 días', value: r => r.item.reportes30d },
        { header: 'Observación', value: r => r.item.obs ?? '' },
      ]))
    } else if (tab === 'sin-checklist') {
      downloadCsv(`sin_checklist_${fecha}.csv`, toCsv(t.sinChecklist, [
        { header: 'Patente', value: e => e.vehiculo.patente },
        { header: 'Contrato', value: e => e.vehiculo.contrato },
        { header: 'Tipo', value: e => e.vehiculo.categoria },
        { header: 'Último checklist', value: e => (e.ultimo ? fmtDate(e.ultimo.fecha) : 'Nunca') },
        { header: 'Días sin checklist', value: e => e.diasSinChecklist ?? '' },
        { header: 'Último conductor', value: e => e.ultimo?.conductor ?? '' },
      ]))
    } else {
      downloadCsv(`documentos_${fecha}.csv`, toCsv(docs, [
        { header: 'Patente', value: d => d.patente },
        { header: 'Contrato', value: d => porId.get(d.patente_id)?.vehiculo.contrato ?? '' },
        { header: 'Documento', value: d => d.tipo_documento },
        { header: 'Vence', value: d => fmtDate(d.fecha_vencimiento) },
        { header: 'Días restantes', value: d => d.dias_restantes },
        { header: 'Estado', value: d => (d.estado === 'vencido' ? 'Vencido' : 'Por vencer') },
      ]))
    }
  }

  const nActual = tabs.find(x => x.id === tab)!.n

  return (
    <Seccion
      id="bandeja"
      titulo="Bandeja de acción"
      hint="Lo que hay que resolver hoy. Toca una fila para ver la ficha del vehículo."
      acciones={
        <button type="button" onClick={exportar} disabled={!nActual} className="btn-secondary btn-sm disabled:opacity-50">
          Exportar CSV
        </button>
      }
    >
      <div className="card p-0 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-200" role="tablist">
          {tabs.map(x => (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={tab === x.id}
              onClick={() => setTab(x.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                tab === x.id ? 'border-primary text-dark' : 'border-transparent text-gray-500 hover:text-dark'
              }`}
            >
              {x.label}
              <span className={`min-w-[1.5rem] px-1.5 py-0.5 rounded-full text-xs font-bold tabular-nums ${x.n ? x.tono : 'bg-gray-100 text-gray-400'}`}>
                {fmtNum(x.n)}
              </span>
            </button>
          ))}
        </div>

        <div className="max-h-[28rem] overflow-y-auto">
          {tab === 'detencion' && (
            t.detencion.length === 0 ? <Vacio>Ningún vehículo con falla de detención vigente. 👍</Vacio> : (
              <ul className="divide-y divide-gray-100">
                {t.detencion.map(e => (
                  <Fila key={e.vehiculo.id} ev={e} onVer={onVer}>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {e.declaradoNoOperativo && <span className="badge-fault">Declarado no operativo</span>}
                      {fallasDe(e, 'D').map(x => (
                        <span key={x.label} className="badge-fault" title={x.obs ?? undefined}>{x.label}</span>
                      ))}
                      {fallasDe(e, 'P').map(x => (
                        <span key={x.label} className="badge-warn" title={x.obs ?? undefined}>{x.label}</span>
                      ))}
                    </div>
                  </Fila>
                ))}
              </ul>
            )
          )}

          {tab === 'sin-reparar' && (
            t.sinReparar.length === 0 ? <Vacio>No hay fallas repetidas ni abiertas hace más de 30 días.</Vacio> : (
              <ul className="divide-y divide-gray-100">
                {t.sinReparar.map(r => (
                  <li key={`${r.ev.vehiculo.id}:${r.idx}`}>
                    <button type="button" onClick={() => onVer(r.ev)} className="w-full text-left px-4 py-3 hover:bg-gray-50 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="font-mono font-semibold text-dark w-20">{r.ev.vehiculo.patente}</span>
                      <span className="text-sm font-medium text-gray-800 min-w-[9rem]">{PREGUNTAS[r.idx].label}</span>
                      <SevBadge sev={r.item.sev} />
                      <span className="text-xs text-gray-500">
                        Desde {fmtDate(new Date(r.item.desde).toISOString())} · <b className="text-gray-700">{r.diasAbierta} día{r.diasAbierta !== 1 ? 's' : ''}</b>
                        {' · '}<b className={r.item.reportes30d >= 3 ? 'text-fault' : 'text-gray-700'}>{r.item.reportes30d}</b> reportes en 30 días
                      </span>
                      <span className="text-xs text-gray-400">{r.ev.vehiculo.contrato}</span>
                      {r.item.obs && <span className="basis-full text-xs text-gray-500 italic truncate">“{r.item.obs}”</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}

          {tab === 'sin-checklist' && (
            <>
              <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs text-gray-600">
                Alertar cuando un vehículo en servicio lleva
                <select
                  value={filtros.umbral}
                  onChange={e => setFiltros({ umbral: Number(e.target.value) })}
                  className="input w-auto py-1 text-xs"
                  aria-label="Días sin checklist"
                >
                  {UMBRALES.map(u => <option key={u} value={u}>{u} día{u !== 1 ? 's' : ''} o más</option>)}
                </select>
                sin checklist. No incluye vehículos en mantención o taller.
              </div>
              {t.sinChecklist.length === 0 ? <Vacio>Todos los vehículos en servicio tienen checklist al día.</Vacio> : (
                <ul className="divide-y divide-gray-100">
                  {t.sinChecklist.map(e => (
                    <Fila key={e.vehiculo.id} ev={e} onVer={onVer} derecha={
                      <span className={`text-sm font-semibold whitespace-nowrap ${e.diasSinChecklist == null || e.diasSinChecklist > 7 ? 'text-fault' : 'text-warn'}`}>
                        {diasTexto(e.diasSinChecklist)}
                      </span>
                    }>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {e.ultimo ? <>Último: {fmtDate(e.ultimo.fecha)} por {e.ultimo.conductor}</> : 'Sin checklist registrados'}
                      </p>
                    </Fila>
                  ))}
                </ul>
              )}
            </>
          )}

          {tab === 'documentos' && (
            errorDocs ? <Vacio>No se pudieron cargar los documentos: {errorDocs}</Vacio>
              : docs.length === 0 ? <Vacio>Sin documentos vencidos ni por vencer.</Vacio> : (
                <ul className="divide-y divide-gray-100">
                  {docs.map(d => {
                    const ev = porId.get(d.patente_id)
                    return (
                      <li key={d.id}>
                        <button type="button" onClick={() => ev && onVer(ev)} className="w-full text-left px-4 py-3 hover:bg-gray-50 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span className="font-mono font-semibold text-dark w-20">{d.patente}</span>
                          <span className="text-sm text-gray-800 flex-1 min-w-[8rem]">{d.tipo_documento}</span>
                          <span className="text-xs text-gray-500">Vence {fmtDate(d.fecha_vencimiento)}</span>
                          {d.estado === 'vencido'
                            ? <span className="badge-fault">Vencido hace {Math.abs(d.dias_restantes)} d</span>
                            : <span className="badge-warn">Vence en {d.dias_restantes} d</span>}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )
          )}
        </div>
      </div>
    </Seccion>
  )
}

function fallasDe(e: EstadoVivo, sev: 'P' | 'D') {
  return e.items
    .map((it, idx) => ({ it, label: PREGUNTAS[idx].label }))
    .filter(x => x.it?.falla && x.it.sev === sev)
    .map(x => ({ label: x.label, obs: x.it!.obs }))
}

function Fila({ ev, onVer, children, derecha }: {
  ev: EstadoVivo
  onVer: (ev: EstadoVivo) => void
  children?: React.ReactNode
  derecha?: React.ReactNode
}) {
  return (
    <li>
      <button type="button" onClick={() => onVer(ev)} className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <span className="font-mono font-semibold text-dark">{ev.vehiculo.patente}</span>
            <span className="text-xs text-gray-500 truncate">
              {[ev.vehiculo.categoria, ev.vehiculo.contrato, infoEstado(ev.vehiculo.estado).label].join(' · ')}
            </span>
          </div>
          {children}
        </div>
        {derecha}
      </button>
    </li>
  )
}
