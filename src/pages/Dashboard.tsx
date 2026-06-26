import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { VInspeccion, KPIs } from '../types'

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <span className={`text-3xl font-bold ${color}`}>{value}</span>
    </div>
  )
}

function formatFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function Dashboard() {
  const [inspecciones, setInspecciones] = useState<VInspeccion[]>([])
  const [kpis, setKpis] = useState<KPIs>({ totalInspecciones: 0, conFallas: 0, noOperativos: 0, resueltas: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('v_inspecciones')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(200)

      if (err) {
        setError(err.message)
      } else {
        const rows = (data ?? []) as VInspeccion[]
        setInspecciones(rows)
        setKpis({
          totalInspecciones: rows.length,
          conFallas: rows.filter((r) => r.n_fallas > 0).length,
          noOperativos: rows.filter((r) => !r.operativo).length,
          resueltas: rows.reduce((acc, r) => acc + r.n_resueltas, 0),
        })
      }
      setLoading(false)
    }
    void load()
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Inspecciones" value={kpis.totalInspecciones} color="text-dark" />
        <KpiCard label="Con fallas" value={kpis.conFallas} color="text-fault" />
        <KpiCard label="No operativos" value={kpis.noOperativos} color="text-warn" />
        <KpiCard label="Fallas resueltas" value={kpis.resueltas} color="text-primary" />
      </div>

      {/* Tabla */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Últimas inspecciones</h2>
          {loading && <span className="text-xs text-gray-400 animate-pulse">Cargando...</span>}
        </div>

        {error && (
          <div className="p-4 text-fault text-sm">{error}</div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-th">Fecha</th>
                <th className="table-th">Patente</th>
                <th className="table-th">Conductor</th>
                <th className="table-th">Fundo</th>
                <th className="table-th text-center">Fallas</th>
                <th className="table-th text-center">Operativo</th>
                <th className="table-th text-center">Resueltas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!loading && inspecciones.length === 0 && (
                <tr>
                  <td colSpan={7} className="table-td text-center text-gray-400 py-8">
                    No hay inspecciones registradas.
                  </td>
                </tr>
              )}
              {inspecciones.map((insp) => (
                <tr key={insp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-td whitespace-nowrap">{formatFecha(insp.fecha)}</td>
                  <td className="table-td font-mono font-semibold text-dark">{insp.patente}</td>
                  <td className="table-td">{insp.conductor}</td>
                  <td className="table-td">{insp.fundo}</td>
                  <td className="table-td text-center">
                    {insp.n_fallas > 0 ? (
                      <span className="badge-fault">{insp.n_fallas}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="table-td text-center">
                    {insp.operativo ? (
                      <span className="badge-ok">Sí</span>
                    ) : (
                      <span className="badge-fault">No</span>
                    )}
                  </td>
                  <td className="table-td text-center">
                    {insp.n_resueltas > 0 ? (
                      <span className="badge-ok">{insp.n_resueltas}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
