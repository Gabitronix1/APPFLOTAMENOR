import { Fragment, useMemo, useState } from 'react'
import { PREGUNTAS, fmtDate, fmtNum } from '../../lib/constants'
import { downloadCsv, toCsv } from '../../lib/csv'
import { hora } from '../../lib/gestionFlota'
import type { EstadoVivo, Inspeccion } from '../../lib/gestionFlota'
import type { Tablero } from '../../hooks/useTableroGestion'
import { Seccion, Vacio } from './ui'

const PAGINA = 25

// Listado de los checklist realizados en el período (con los filtros del tablero), con los datos
// del vehículo y el detalle de cada respuesta.
export function ListaChecklist({ t, onVer }: { t: Tablero; onVer: (ev: EstadoVivo) => void }) {
  const [q, setQ] = useState('')
  const [soloFallas, setSoloFallas] = useState(false)
  const [pagina, setPagina] = useState(0)
  const [abierta, setAbierta] = useState<string | null>(null)

  const lista = useMemo(() => {
    const s = q.trim().toLowerCase()
    return [...t.inspecciones]
      .reverse()
      .filter(i => !soloFallas || i.nFallas > 0 || !i.operativo)
      .filter(i => {
        if (!s) return true
        const v = t.vehiculoPorId.get(i.patenteId)
        return `${v?.patente ?? ''} ${v?.marca ?? ''} ${v?.modelo ?? ''} ${i.conductor} ${i.contrato}`.toLowerCase().includes(s)
      })
  }, [t.inspecciones, t.vehiculoPorId, q, soloFallas])

  const paginas = Math.max(1, Math.ceil(lista.length / PAGINA))
  const actual = Math.min(pagina, paginas - 1)
  const visibles = lista.slice(actual * PAGINA, (actual + 1) * PAGINA)

  function exportar() {
    downloadCsv(`checklist_realizados_${new Date().toISOString().slice(0, 10)}.csv`, toCsv<Inspeccion>(lista, [
      { header: 'Fecha', value: i => fmtDate(i.fecha) },
      { header: 'Hora', value: i => hora(i.fecha) },
      { header: 'Patente', value: i => t.vehiculoPorId.get(i.patenteId)?.patente ?? '' },
      { header: 'Marca', value: i => t.vehiculoPorId.get(i.patenteId)?.marca ?? '' },
      { header: 'Modelo', value: i => t.vehiculoPorId.get(i.patenteId)?.modelo ?? '' },
      { header: 'Tipo de vehículo', value: i => t.vehiculoPorId.get(i.patenteId)?.categoria ?? '' },
      { header: 'Contrato', value: i => i.contrato },
      { header: 'Conductor', value: i => i.conductor },
      { header: 'Tipo de checklist', value: i => (i.tipo === 'diario' ? 'Diario' : 'Completo') },
      { header: 'Kilometraje', value: i => i.km ?? '' },
      { header: 'Operativo', value: i => (i.operativo ? 'Sí' : 'No') },
      { header: 'Fallas', value: i => i.nFallas },
      { header: 'Fallas de detención', value: i => i.nFallasD },
      ...PREGUNTAS.map((p, idx) => ({
        header: p.label,
        value: (i: Inspeccion) => {
          const r = i.respuestas.find(x => x.idx === idx)
          if (!r) return ''
          return r.falla ? `Falla${r.obs ? `: ${r.obs}` : ''}` : 'OK'
        },
      })),
      { header: 'Observación general', value: i => i.obs ?? '' },
    ]))
  }

  return (
    <Seccion
      id="checklist"
      titulo="Checklist realizados"
      hint="Cada checklist del período con los datos del vehículo. Toca una fila para ver las respuestas."
      acciones={<button type="button" onClick={exportar} disabled={!lista.length} className="btn-secondary btn-sm disabled:opacity-50">Exportar CSV</button>}
    >
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <input
          type="search"
          value={q}
          onChange={e => { setQ(e.target.value); setPagina(0) }}
          placeholder="Buscar patente, conductor, contrato…"
          className="input max-w-xs py-1.5"
        />
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={soloFallas} onChange={e => { setSoloFallas(e.target.checked); setPagina(0) }} className="w-4 h-4 accent-primary" />
          Solo con fallas
        </label>
        <span className="text-xs text-gray-500 ml-auto">{fmtNum(lista.length)} checklist</span>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-th">Fecha</th>
                <th className="table-th">Vehículo</th>
                <th className="table-th">Conductor</th>
                <th className="table-th">Contrato</th>
                <th className="table-th text-center">Tipo</th>
                <th className="table-th text-right">Kilometraje</th>
                <th className="table-th">Fallas</th>
                <th className="table-th text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibles.length === 0 && <tr><td colSpan={8}><Vacio>Sin checklist para los filtros elegidos.</Vacio></td></tr>}
              {visibles.map(i => {
                const v = t.vehiculoPorId.get(i.patenteId)
                const ev = t.estadoPorId.get(i.patenteId)
                const fallas = i.respuestas.filter(r => r.falla)
                return (
                  <Fragment key={i.id}>
                    <tr onClick={() => setAbierta(abierta === i.id ? null : i.id)} className="hover:bg-gray-50 cursor-pointer align-top">
                      <td className="table-td whitespace-nowrap">
                        {fmtDate(i.fecha)} <span className="text-xs text-gray-400">{hora(i.fecha)}</span>
                      </td>
                      <td className="table-td whitespace-nowrap">
                        <p className="font-mono font-semibold text-dark">{v?.patente}</p>
                        <p className="text-xs text-gray-500">{[v?.marca, v?.modelo].filter(Boolean).join(' ') || v?.categoria}</p>
                      </td>
                      <td className="table-td">{i.conductor}</td>
                      <td className="table-td whitespace-nowrap">{i.contrato}</td>
                      <td className="table-td text-center">
                        <span className={i.tipo === 'diario' ? 'badge-warn' : 'badge-ok'}>{i.tipo === 'diario' ? 'Diario' : 'Completo'}</span>
                      </td>
                      <td className="table-td text-right tabular-nums whitespace-nowrap">{i.km ? `${fmtNum(i.km)} km` : '—'}</td>
                      <td className="table-td">
                        {fallas.length === 0 ? <span className="text-xs text-gray-400">Sin fallas</span> : (
                          <div className="flex flex-wrap gap-1 max-w-[16rem]">
                            {fallas.map(r => (
                              <span key={r.idx} className={r.sev === 'D' ? 'badge-fault' : 'badge-warn'}>{PREGUNTAS[r.idx].label}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="table-td text-center">
                        {i.operativo ? <span className="badge-ok">Operativo</span> : <span className="badge-fault whitespace-nowrap">No operativo</span>}
                      </td>
                    </tr>
                    {abierta === i.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {i.respuestas.map(r => (
                              <div key={r.idx} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium text-gray-800">{PREGUNTAS[r.idx].label}</span>
                                  {!r.falla ? <span className="badge-ok">OK</span>
                                    : r.sev === 'D' ? <span className="badge-fault">Falla · detención</span>
                                      : <span className="badge-warn">Falla · precaución</span>}
                                </div>
                                {r.obs && <p className="text-xs text-gray-500 mt-1">{r.obs}</p>}
                              </div>
                            ))}
                          </div>
                          {i.obs && <p className="text-sm text-gray-600 mt-3"><span className="font-semibold">Observación general:</span> {i.obs}</p>}
                          {ev && (
                            <button type="button" onClick={() => onVer(ev)} className="btn-secondary btn-sm mt-3">
                              Ver ficha de {v?.patente}
                            </button>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {paginas > 1 && (
        <div className="flex items-center justify-center gap-3 mt-3 text-sm">
          <button type="button" className="btn-secondary btn-sm disabled:opacity-50" disabled={actual === 0} onClick={() => setPagina(actual - 1)}>Anterior</button>
          <span className="text-gray-500">Página {actual + 1} de {paginas}</span>
          <button type="button" className="btn-secondary btn-sm disabled:opacity-50" disabled={actual >= paginas - 1} onClick={() => setPagina(actual + 1)}>Siguiente</button>
        </div>
      )}
    </Seccion>
  )
}
