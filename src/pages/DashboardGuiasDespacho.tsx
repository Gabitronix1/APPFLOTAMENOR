import { useMemo } from 'react'
import { useGuiasDespacho } from '../hooks/useGuiasDespacho'
import { useGuiasDespachoKpis } from '../hooks/useGuiasDespachoKpis'
import { ESTADO_GUIA_INFO, formatFolio } from '../lib/guiasDespacho'
import { fmtDate } from '../lib/constants'
import { toCsv, downloadCsv } from '../lib/csv'
import { KpiCard } from '../components/vehiculos/KpiCard'
import type { EstadoGuiaDespacho, GuiaDespachoConDatos } from '../types'

function fmtPct(v: number | null): string {
  return v === null ? '—' : `${Math.round(v * 100)}%`
}

function agruparPor(guias: GuiaDespachoConDatos[], key: (g: GuiaDespachoConDatos) => string): { nombre: string; cantidad: number }[] {
  const counts = new Map<string, number>()
  for (const g of guias) {
    const k = key(g)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
}

function exportarCsv(guias: GuiaDespachoConDatos[]) {
  const csv = toCsv(guias, [
    { header: 'Folio', value: g => formatFolio(g.folio) },
    { header: 'Estado', value: g => ESTADO_GUIA_INFO[g.estado].label },
    { header: 'Fundo', value: g => g.fundo },
    { header: 'Contrato', value: g => g.contrato },
    { header: 'Vehículo', value: g => g.patente },
    { header: 'Conductor', value: g => g.conductor },
    { header: 'Almacén origen', value: g => g.almacen_origen },
    { header: 'Fecha creación', value: g => fmtDate(g.created_at) },
    { header: 'Fecha despacho', value: g => (g.fecha_despacho ? fmtDate(g.fecha_despacho) : '') },
    { header: 'Fecha recepción', value: g => (g.fecha_recepcion ? fmtDate(g.fecha_recepcion) : '') },
    { header: 'Recibido por', value: g => g.recibido_por_nombre },
    { header: 'Fecha cierre', value: g => (g.fecha_cierre ? fmtDate(g.fecha_cierre) : '') },
    { header: 'Comentarios', value: g => g.comentarios },
  ])
  downloadCsv(`guias-despacho-${new Date().toISOString().slice(0, 10)}.csv`, csv)
}

function TablaResumen({ titulo, filas }: { titulo: string; filas: { nombre: string; cantidad: number }[] }) {
  return (
    <div className="card p-0 overflow-hidden">
      <h3 className="font-semibold text-dark text-sm px-4 pt-4 pb-2">{titulo}</h3>
      {filas.length === 0 ? (
        <p className="text-sm text-gray-400 px-4 pb-4">Sin datos.</p>
      ) : (
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            {filas.map(f => (
              <tr key={f.nombre}>
                <td className="px-4 py-2">{f.nombre}</td>
                <td className="px-4 py-2 text-right font-semibold">{f.cantidad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export function DashboardGuiasDespacho() {
  const { guias, loading, error } = useGuiasDespacho()
  const { kpis: kpisPct, loading: loadingKpis } = useGuiasDespachoKpis()

  const kpis = useMemo(() => {
    const porEstado = (e: EstadoGuiaDespacho) => guias.filter(g => g.estado === e).length
    return {
      total: guias.length,
      borrador: porEstado('borrador'),
      despachada: porEstado('despachada'),
      recibida: porEstado('recibida'),
      cerrada: porEstado('cerrada'),
      cancelada: porEstado('cancelada'),
    }
  }, [guias])

  const porFundo = useMemo(() => agruparPor(guias, g => g.fundo), [guias])
  const porContrato = useMemo(() => agruparPor(guias, g => g.contrato || 'Sin contrato'), [guias])
  const porConductor = useMemo(() => agruparPor(guias, g => g.conductor || 'Sin asignar'), [guias])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Tablero de Guías de Despacho</h1>
          <p className="text-sm text-gray-500">Resumen del traslado de insumos desde Bodega Central hacia los fundos.</p>
        </div>
        <button onClick={() => exportarCsv(guias)} disabled={loading || guias.length === 0} className="btn-secondary btn-sm shrink-0">
          Descargar CSV
        </button>
      </div>

      {error && <div className="text-fault text-sm mb-4">{error}</div>}

      {loading ? (
        <div className="text-sm text-gray-400 animate-pulse">Cargando...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            <KpiCard label="Total" value={kpis.total} />
            <KpiCard label={ESTADO_GUIA_INFO.borrador.label} value={kpis.borrador} />
            <KpiCard label={ESTADO_GUIA_INFO.despachada.label} value={kpis.despachada} />
            <KpiCard label={ESTADO_GUIA_INFO.recibida.label} value={kpis.recibida} />
            <KpiCard label={ESTADO_GUIA_INFO.cerrada.label} value={kpis.cerrada} />
            <KpiCard label={ESTADO_GUIA_INFO.cancelada.label} value={kpis.cancelada} accent={kpis.cancelada > 0} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            <div title="Guías que ya salieron de bodega (despachada, recibida o cerrada) sobre el total de guías no canceladas.">
              <KpiCard
                label="% Guías despachadas"
                value={loadingKpis ? '…' : fmtPct(kpisPct.pctGuiasDespachadas)}
              />
            </div>
            <div title="De las guías despachadas, cuántas fueron confirmadas en faena (recibida o cerrada).">
              <KpiCard
                label="% Guías entregadas con éxito"
                value={loadingKpis ? '…' : fmtPct(kpisPct.pctGuiasEntregadasExito)}
              />
            </div>
            <div title="De las unidades enviadas en guías ya recibidas/cerradas, cuántas llegaron confirmadas en faena.">
              <KpiCard
                label="% Productos entregados con éxito"
                value={loadingKpis ? '…' : fmtPct(kpisPct.pctProductosEntregadosExito)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <TablaResumen titulo="Guías por fundo" filas={porFundo} />
            <TablaResumen titulo="Guías por contrato" filas={porContrato} />
            <TablaResumen titulo="Guías por conductor" filas={porConductor} />
          </div>
        </>
      )}
    </div>
  )
}
