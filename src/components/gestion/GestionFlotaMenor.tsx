import { useCallback, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { esRolAdministrativo } from '../../lib/roles'
import { fmtNum } from '../../lib/constants'
import { useGestionFlota } from '../../hooks/useGestionFlota'
import { useFiltrosGestion } from '../../hooks/useFiltrosGestion'
import { useTableroGestion } from '../../hooks/useTableroGestion'
import { useDisponibilidad } from '../../hooks/useDisponibilidad'
import type { EstadoVivo } from '../../lib/gestionFlota'
import { FiltrosBar } from './FiltrosBar'
import { FranjaAhora, KpisPeriodo } from './Resumen'
import { BandejaAccion } from './BandejaAccion'
import type { TabBandeja } from './BandejaAccion'
import { MatrizSalud } from './MatrizSalud'
import { FichaVehiculo } from './FichaVehiculo'
import { SecContratos, SecCumplimiento, SecFallas, SecMantenimiento, SecTendencias } from './Analisis'

const NAV: [string, string][] = [
  ['ahora', 'Ahora'],
  ['bandeja', 'Bandeja'],
  ['matriz', 'Matriz'],
  ['periodo', 'Período'],
  ['tendencias', 'Tendencias'],
  ['fallas', 'Fallas'],
  ['contratos', 'Contratos'],
  ['cumplimiento', 'Cumplimiento'],
  ['mantenimiento', 'OT'],
]

export function GestionFlotaMenor() {
  const { perfil } = useAuth()
  const [recarga, setRecarga] = useState(0)
  const datos = useGestionFlota(true, recarga)
  const disp = useDisponibilidad(true)
  const { filtros, setFiltros, limpiar, activos } = useFiltrosGestion()
  const t = useTableroGestion(datos.vehiculos, datos.inspecciones, datos.ots, filtros)
  const [tab, setTab] = useState<TabBandeja>('detencion')
  const [fichaId, setFichaId] = useState<string | null>(null)

  const ficha = useMemo(() => (fichaId ? t.estados.find(e => e.vehiculo.id === fichaId) ?? null : null), [fichaId, t.estados])
  const onVer = useCallback((ev: EstadoVivo) => setFichaId(ev.vehiculo.id), [])
  const cerrarFicha = useCallback(() => setFichaId(null), [])

  const irA = useCallback((id: string) => {
    let destino = id
    if (id.startsWith('bandeja-')) {
      setTab(id.slice('bandeja-'.length) as TabBandeja)
      destino = 'bandeja'
    }
    document.getElementById(destino)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  if (datos.loading && !datos.inspecciones.length) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-gray-500 animate-pulse">Cargando checklist y estado de la flota…</p>
      </div>
    )
  }

  if (datos.error) {
    return (
      <div className="text-fault text-sm bg-fault/10 border border-fault/30 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <span className="flex-1">Error al cargar el tablero: {datos.error}</span>
        <button type="button" className="btn-secondary btn-sm" onClick={() => setRecarga(r => r + 1)}>Reintentar</button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-dark">Centro de gestión · Flota Menor</h2>
          <p className="text-sm text-gray-500">
            {fmtNum(t.totalVehiculos)} vehículos · {fmtNum(datos.inspecciones.length)} checklist registrados
            {activos > 0 && <span className="badge-warn ml-2">{activos} filtro{activos !== 1 ? 's' : ''} activo{activos !== 1 ? 's' : ''}</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRecarga(r => r + 1)}
          disabled={datos.loading}
          className="btn-secondary btn-sm disabled:opacity-50"
        >
          {datos.loading ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      <nav className="flex gap-1.5 overflow-x-auto pb-2 mb-2 -mx-1 px-1" aria-label="Secciones">
        {NAV.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => irA(id)}
            className="px-3 py-1 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:border-primary hover:text-primary whitespace-nowrap"
          >
            {label}
          </button>
        ))}
      </nav>

      <FiltrosBar filtros={filtros} setFiltros={setFiltros} limpiar={limpiar} activos={activos} opciones={t.opciones} rango={t.rango} />

      <FranjaAhora t={t} filtros={filtros} setFiltros={setFiltros} irA={irA} />
      <BandejaAccion t={t} tab={tab} setTab={setTab} filtros={filtros} setFiltros={setFiltros} onVer={onVer} />
      <MatrizSalud estados={t.estados} umbral={filtros.umbral} onVer={onVer} />
      <KpisPeriodo t={t} />
      <SecTendencias t={t} />
      <SecFallas t={t} />
      <SecContratos t={t} filtros={filtros} setFiltros={setFiltros} />
      <SecCumplimiento t={t} onVer={onVer} />
      <SecMantenimiento t={t} disponibilidad={{ data: disp.disponibilidad, loading: disp.loading, error: disp.error }} />

      {ficha && (
        <FichaVehiculo
          ev={ficha}
          historial={t.historial.get(ficha.vehiculo.id) ?? []}
          rango={t.rango}
          puedeVerDetalle={esRolAdministrativo(perfil?.rol)}
          onClose={cerrarFicha}
        />
      )}
    </div>
  )
}
