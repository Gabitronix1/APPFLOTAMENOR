import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useGuiasDespacho, ESTADOS_GUIA_FILTRO } from '../hooks/useGuiasDespacho'
import { ESTADO_GUIA_INFO, formatFolio } from '../lib/guiasDespacho'
import { puedeGestionarGuia } from '../lib/roles'
import { fmtDate } from '../lib/constants'
import { KpiCard } from '../components/vehiculos/KpiCard'
import { CrearGuiaModal } from '../components/guiasDespacho/CrearGuiaModal'
import type { EstadoGuiaDespacho } from '../types'

export function GuiasDespacho() {
  const { perfil } = useAuth()
  const { guias, loading, error, refetch } = useGuiasDespacho()
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoGuiaDespacho | 'todas'>('todas')
  const [showCrear, setShowCrear] = useState(false)
  const navigate = useNavigate()

  const puedeCrear = puedeGestionarGuia(perfil?.rol)

  const kpis = useMemo(() => {
    const enCurso = guias.filter(g => g.estado === 'despachada' || g.estado === 'recibida').length
    const borrador = guias.filter(g => g.estado === 'borrador').length
    const hoy = new Date()
    const cerradasEsteMes = guias.filter(g => {
      if (g.estado !== 'cerrada' || !g.fecha_cierre) return false
      const d = new Date(g.fecha_cierre)
      return d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth()
    }).length
    return { total: guias.length, enCurso, borrador, cerradasEsteMes }
  }, [guias])

  const guiasFiltradas = estadoFiltro === 'todas' ? guias : guias.filter(g => g.estado === estadoFiltro)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Guías de despacho</h1>
          <p className="text-sm text-gray-500">Traslado de insumos desde Bodega Central hacia los fundos.</p>
        </div>
        {puedeCrear && (
          <button onClick={() => setShowCrear(true)} className="btn-primary btn-sm shrink-0">
            + Nueva guía
          </button>
        )}
      </div>

      {error && <div className="text-fault text-sm mb-4">{error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Total" value={kpis.total} />
        <KpiCard label="Borrador" value={kpis.borrador} />
        <KpiCard label="En curso" value={kpis.enCurso} />
        <KpiCard label="Cerradas este mes" value={kpis.cerradasEsteMes} />
      </div>

      <div className="flex flex-wrap gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        {ESTADOS_GUIA_FILTRO.map(f => (
          <button
            key={f.value}
            onClick={() => setEstadoFiltro(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              estadoFiltro === f.value ? 'bg-white text-dark shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden overflow-x-auto">
        {loading ? (
          <div className="p-6 text-sm text-gray-400 animate-pulse">Cargando...</div>
        ) : (
          <table className="w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-th">Folio</th>
                <th className="table-th">Fundo</th>
                <th className="table-th">Contrato</th>
                <th className="table-th">Conductor</th>
                <th className="table-th">Vehículo</th>
                <th className="table-th">Fecha</th>
                <th className="table-th text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {guiasFiltradas.length === 0 && (
                <tr><td colSpan={7} className="table-td text-center text-gray-400 py-8">Sin guías registradas.</td></tr>
              )}
              {guiasFiltradas.map(g => (
                <tr key={g.id} onClick={() => navigate(`/guias-despacho/${g.id}`)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="table-td font-mono font-semibold">{formatFolio(g.folio)}</td>
                  <td className="table-td">{g.fundo}</td>
                  <td className="table-td font-mono text-xs">{g.contrato || '—'}</td>
                  <td className="table-td">{g.conductor || '—'}</td>
                  <td className="table-td">{g.patente || '—'}</td>
                  <td className="table-td text-xs text-gray-500">{fmtDate(g.created_at)}</td>
                  <td className="table-td text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_GUIA_INFO[g.estado].badgeClass}`}>
                      {ESTADO_GUIA_INFO[g.estado].label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCrear && (
        <CrearGuiaModal
          onClose={() => setShowCrear(false)}
          onCreated={() => { setShowCrear(false); refetch() }}
        />
      )}
    </div>
  )
}
