import { useMemo, useState } from 'react'
import { PREGUNTAS, fmtDate, fmtNum } from '../../lib/constants'
import { downloadCsv, toCsv } from '../../lib/csv'
import { infoEstado } from '../../lib/vehiculos'
import { CONDICION_INFO, ordenarPorGravedad } from '../../lib/gestionFlota'
import type { EstadoVivo } from '../../lib/gestionFlota'
import { CeldaItem, CondicionBadge, LeyendaMatriz, Seccion, Vacio, diasTexto } from './ui'

type Orden = 'gravedad' | 'patente' | 'dias' | 'contrato'
const INICIAL = 25

export function MatrizSalud({ estados, umbral, onVer }: { estados: EstadoVivo[]; umbral: number; onVer: (ev: EstadoVivo) => void }) {
  const [q, setQ] = useState('')
  const [orden, setOrden] = useState<Orden>('gravedad')
  const [todos, setTodos] = useState(false)

  const filas = useMemo(() => {
    const s = q.trim().toLowerCase()
    const base = s
      ? estados.filter(e => `${e.vehiculo.patente} ${e.vehiculo.descripcion} ${e.vehiculo.marca} ${e.vehiculo.modelo} ${e.vehiculo.contrato}`.toLowerCase().includes(s))
      : estados
    const arr = [...base]
    if (orden === 'gravedad') arr.sort(ordenarPorGravedad)
    if (orden === 'patente') arr.sort((a, b) => a.vehiculo.patente.localeCompare(b.vehiculo.patente))
    if (orden === 'dias') arr.sort((a, b) => (b.diasSinChecklist ?? 99999) - (a.diasSinChecklist ?? 99999))
    if (orden === 'contrato') arr.sort((a, b) => a.vehiculo.contrato.localeCompare(b.vehiculo.contrato) || ordenarPorGravedad(a, b))
    return arr
  }, [estados, q, orden])

  const visibles = todos ? filas : filas.slice(0, INICIAL)

  function exportar() {
    downloadCsv(`matriz_salud_flota_${new Date().toISOString().slice(0, 10)}.csv`, toCsv(filas, [
      { header: 'Patente', value: e => e.vehiculo.patente },
      { header: 'Descripción', value: e => e.vehiculo.descripcion },
      { header: 'Tipo', value: e => e.vehiculo.categoria },
      { header: 'Contrato', value: e => e.vehiculo.contrato },
      { header: 'Propiedad', value: e => e.vehiculo.condicion },
      { header: 'Estado operativo', value: e => infoEstado(e.vehiculo.estado).label },
      { header: 'Situación', value: e => CONDICION_INFO[e.condicion].label },
      { header: 'Fallas vigentes', value: e => e.fallasVigentes },
      { header: 'Fallas de detención', value: e => e.fallasD },
      { header: 'Último checklist', value: e => (e.ultimo ? fmtDate(e.ultimo.fecha) : '') },
      { header: 'Días sin checklist', value: e => e.diasSinChecklist ?? '' },
      { header: 'Último km', value: e => e.ultimoKm ?? '' },
      ...PREGUNTAS.map((p, idx) => ({
        header: p.label,
        value: (e: EstadoVivo) => {
          const it = e.items[idx]
          if (!it) return ''
          return it.falla ? `Falla ${it.sev === 'D' ? 'detención' : 'precaución'}${it.obs ? `: ${it.obs}` : ''}` : 'OK'
        },
      })),
    ]))
  }

  return (
    <Seccion
      id="matriz"
      titulo="Matriz de salud de la flota"
      hint="Estado vivo de cada ítem: el último reporte manda. Pasa el cursor por una celda para ver el detalle."
      acciones={<button type="button" onClick={exportar} disabled={!filas.length} className="btn-secondary btn-sm disabled:opacity-50">Exportar CSV</button>}
    >
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <input
          type="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar patente, marca, contrato…"
          className="input max-w-xs py-1.5"
        />
        <label className="flex items-center gap-2 text-sm text-gray-600">
          Ordenar
          <select value={orden} onChange={e => setOrden(e.target.value as Orden)} className="input w-auto py-1.5">
            <option value="gravedad">Por gravedad</option>
            <option value="dias">Días sin checklist</option>
            <option value="contrato">Contrato</option>
            <option value="patente">Patente</option>
          </select>
        </label>
        <div className="ml-auto"><LeyendaMatriz /></div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-th sticky left-0 bg-gray-50 z-10">Vehículo</th>
                <th className="table-th">Situación</th>
                <th className="table-th">Último checklist</th>
                {PREGUNTAS.map(p => (
                  <th key={p.key} className="px-0.5 py-3 text-[10px] font-semibold text-gray-500 uppercase text-center align-bottom" title={p.label}>
                    <span className="block w-7 mx-auto leading-tight break-words">{p.short}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibles.length === 0 && (
                <tr><td colSpan={3 + PREGUNTAS.length}><Vacio>Sin vehículos para los filtros elegidos.</Vacio></td></tr>
              )}
              {visibles.map(e => {
                const atrasado = !e.fueraServicio && (e.diasSinChecklist == null || e.diasSinChecklist >= umbral)
                return (
                  <tr key={e.vehiculo.id} onClick={() => onVer(e)} className="hover:bg-gray-50 cursor-pointer group">
                    <td className="px-4 py-2 sticky left-0 bg-white group-hover:bg-gray-50 z-10 min-w-[11rem]">
                      <p className="font-mono font-semibold text-dark">{e.vehiculo.patente}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[11rem]">
                        {e.vehiculo.contrato} · {e.vehiculo.marca || e.vehiculo.categoria} {e.vehiculo.modelo}
                      </p>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <CondicionBadge c={e.condicion} />
                      {e.vehiculo.estado !== 'operativo' && (
                        <span className={`ml-1.5 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${infoEstado(e.vehiculo.estado).badgeClass}`}>
                          {infoEstado(e.vehiculo.estado).label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <p className={`text-sm ${atrasado ? 'text-warn font-semibold' : 'text-gray-700'}`}>{diasTexto(e.diasSinChecklist)}</p>
                      {e.ultimo && <p className="text-xs text-gray-400">{fmtDate(e.ultimo.fecha)}{e.ultimoKm ? ` · ${fmtNum(e.ultimoKm)} km` : ''}</p>}
                    </td>
                    {PREGUNTAS.map((p, idx) => (
                      <td key={p.key} className="px-0.5 py-2 text-center">
                        <CeldaItem item={e.items[idx]} label={p.label} />
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filas.length > INICIAL && (
          <button type="button" onClick={() => setTodos(v => !v)} className="w-full py-2.5 text-sm font-medium text-primary hover:bg-gray-50 border-t border-gray-100">
            {todos ? 'Ver menos' : `Ver los ${fmtNum(filas.length)} vehículos`}
          </button>
        )}
      </div>
    </Seccion>
  )
}
