import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PREGUNTAS, fmtDate, fmtNum } from '../../lib/constants'
import { infoEstado } from '../../lib/vehiculos'
import { DIA_MS, hora, kmRecorridos } from '../../lib/gestionFlota'
import type { EstadoVivo, Inspeccion } from '../../lib/gestionFlota'
import type { Rango } from '../../hooks/useTableroGestion'
import { CeldaItem, CondicionBadge, SevBadge, diasTexto } from './ui'

interface Props {
  ev: EstadoVivo
  historial: Inspeccion[]
  rango: Rango
  puedeVerDetalle: boolean
  onClose: () => void
}

export function FichaVehiculo({ ev, historial, rango, puedeVerDetalle, onClose }: Props) {
  const v = ev.vehiculo

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  const enPeriodo = useMemo(() => historial.filter(i => i.ts >= rango.desdeTs && i.ts < rango.hastaTs), [historial, rango])
  const km = useMemo(() => kmRecorridos(historial, rango.desdeTs, rango.hastaTs), [historial, rango])
  const ultimos = useMemo(() => [...historial].reverse().slice(0, 12), [historial])
  const vigentes = ev.items
    .map((item, idx) => ({ item, idx }))
    .filter(x => x.item?.falla)
    .sort((a, b) => (a.item!.sev === 'D' ? 0 : 1) - (b.item!.sev === 'D' ? 0 : 1) || a.item!.desde - b.item!.desde)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={`Ficha ${v.patente}`}>
      <div className="absolute inset-0 bg-dark/40" onClick={onClose} />
      <div className="relative bg-surface w-full sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-start gap-3 z-10">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-bold font-mono text-dark">{v.patente}</h3>
              <CondicionBadge c={ev.condicion} />
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${infoEstado(v.estado).badgeClass}`}>{infoEstado(v.estado).label}</span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5 truncate">
              {[v.marca, v.modelo, v.anno].filter(Boolean).join(' ') || v.descripcion || v.categoria}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{[v.categoria, v.contrato, v.condicion].join(' · ')}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-dark hover:bg-gray-100" aria-label="Cerrar">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Mini label="Último checklist" value={diasTexto(ev.diasSinChecklist)} sub={ev.ultimo ? fmtDate(ev.ultimo.fecha) : undefined} />
            <Mini label="Odómetro" value={ev.ultimoKm ? `${fmtNum(ev.ultimoKm)} km` : '—'} />
            <Mini label="Checklist en el período" value={fmtNum(enPeriodo.length)} />
            <Mini label="Km en el período" value={fmtNum(km)} />
          </div>

          <div>
            <h4 className="text-sm font-bold text-dark mb-2">Estado por ítem</h4>
            <div className="card py-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
              {PREGUNTAS.map((p, idx) => (
                <div key={p.key} className="flex items-center gap-2 min-w-0">
                  <CeldaItem item={ev.items[idx]} label={p.label} />
                  <span className="text-xs text-gray-600 truncate">{p.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-dark mb-2">Fallas vigentes ({vigentes.length})</h4>
            {vigentes.length === 0 ? (
              <p className="text-sm text-gray-500 card py-3">Sin fallas vigentes.</p>
            ) : (
              <ul className="card p-0 divide-y divide-gray-100">
                {vigentes.map(({ item, idx }) => {
                  const dias = Math.floor((Date.now() - item!.desde) / DIA_MS)
                  return (
                    <li key={idx} className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-800 text-sm">{PREGUNTAS[idx].label}</span>
                        <SevBadge sev={item!.sev} />
                        <span className="text-xs text-gray-500">
                          desde {fmtDate(new Date(item!.desde).toISOString())} ({dias} día{dias !== 1 ? 's' : ''}) · {item!.reportes} reporte{item!.reportes !== 1 ? 's seguidos' : ''}
                        </span>
                      </div>
                      {item!.obs && <p className="text-xs text-gray-500 italic mt-1">“{item!.obs}”</p>}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div>
            <h4 className="text-sm font-bold text-dark mb-2">Últimos checklist</h4>
            {ultimos.length === 0 ? (
              <p className="text-sm text-gray-500 card py-3">Este vehículo no tiene checklist registrados.</p>
            ) : (
              <ul className="card p-0 divide-y divide-gray-100">
                {ultimos.map(i => {
                  const fallas = i.respuestas.filter(r => r.falla)
                  return (
                    <li key={i.id} className="px-4 py-2.5">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        <span className="text-gray-700 whitespace-nowrap">{fmtDate(i.fecha)} <span className="text-xs text-gray-400">{hora(i.fecha)}</span></span>
                        <span className="text-gray-600 truncate">{i.conductor}</span>
                        <span className={i.tipo === 'diario' ? 'badge-warn' : 'badge-ok'}>{i.tipo === 'diario' ? 'Diario' : 'Completo'}</span>
                        {!i.operativo && <span className="badge-fault">No operativo</span>}
                        {i.km && <span className="text-xs text-gray-400">{fmtNum(i.km)} km</span>}
                      </div>
                      {fallas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {fallas.map(r => (
                            <span key={r.idx} className={r.sev === 'D' ? 'badge-fault' : 'badge-warn'} title={r.obs ?? undefined}>
                              {PREGUNTAS[r.idx].label}
                            </span>
                          ))}
                        </div>
                      )}
                      {i.obs && <p className="text-xs text-gray-500 mt-1">{i.obs}</p>}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {puedeVerDetalle && (
            <Link to={`/vehiculos/${v.id}`} className="btn-primary btn-sm inline-block">Ver ficha completa del vehículo</Link>
          )}
        </div>
      </div>
    </div>
  )
}

function Mini({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card py-2.5 px-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-dark tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}
