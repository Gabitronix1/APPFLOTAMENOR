import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { FiltersProvider, useFilters } from '../hooks/useFilters'
import type { Filters } from '../hooks/useFilters'
import { useInspecciones } from '../hooks/useInspecciones'
import { useEstadoFlota } from '../hooks/useEstadoFlota'
import { useDisponibilidad } from '../hooks/useDisponibilidad'
import { useCostoMensual } from '../hooks/useCostoMensual'
import { useOTUrgentes } from '../hooks/useOTUrgentes'
import { useVencimientosResumen } from '../hooks/useVencimientosResumen'
import { CollapsibleSection } from '../components/dashboard/CollapsibleSection'
import { PanelSection } from '../components/dashboard/PanelSection'
import { SemaforoFlota } from '../components/dashboard/SemaforoFlota'
import { VehiculosAtencion } from '../components/dashboard/VehiculosAtencion'
import { DisponibilidadWidget } from '../components/dashboard/DisponibilidadWidget'
import { CostoMantencion } from '../components/dashboard/CostoMantencion'
import { OTUrgentesSection } from '../components/dashboard/OTUrgentesSection'
import { DocumentosPorVencer } from '../components/dashboard/DocumentosPorVencer'
import { FilterBar } from '../components/dashboard/FilterBar'
import { SecSistemas } from '../components/dashboard/SecSistemas'
import { SecPrioridades } from '../components/dashboard/SecPrioridades'
import { SecOperadores } from '../components/dashboard/SecOperadores'
import { SecCalendario } from '../components/dashboard/SecCalendario'
import { SecCobertura } from '../components/dashboard/SecCobertura'
import { SecVisualizacion } from '../components/dashboard/SecVisualizacion'
import { fmtDate } from '../lib/constants'
import type { EstadoVehiculo, VInspeccion } from '../types'

function applyFilters(data: VInspeccion[], f: Filters): VInspeccion[] {
  return data.filter(r => {
    if (f.fundo && r.fundo !== f.fundo) return false
    if (f.contrato && r.contrato !== f.contrato) return false
    if (f.conductor && r.conductor !== f.conductor) return false
    if (f.patente && r.patente !== f.patente) return false
    if (f.desde && r.fecha.slice(0, 10) < f.desde) return false
    if (f.hasta && r.fecha.slice(0, 10) > f.hasta) return false
    if (f.soloConProblemas && r.n_fallas === 0) return false
    return true
  })
}

function DashboardContent() {
  const { filters } = useFilters()
  const { perfil } = useAuth()
  const { allInspecciones, operadores, patentes, loading, error } = useInspecciones()

  const puedeGestionarFlota = perfil?.rol === 'encargado' || perfil?.rol === 'admin'
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<EstadoVehiculo | null>(null)

  const estadoFlota = useEstadoFlota(puedeGestionarFlota)
  const disponibilidad = useDisponibilidad(puedeGestionarFlota)
  const costoMensual = useCostoMensual(puedeGestionarFlota)
  const otUrgentes = useOTUrgentes(puedeGestionarFlota)
  const vencimientos = useVencimientosResumen(puedeGestionarFlota)

  const filteredData = useMemo(
    () => applyFilters(allInspecciones, filters),
    [allInspecciones, filters],
  )

  const { minFecha, maxFecha, uniqueVehicles } = useMemo(() => {
    const dates = filteredData.map(r => r.fecha.slice(0, 10)).sort()
    return {
      minFecha: dates[0] ?? '',
      maxFecha: dates[dates.length - 1] ?? '',
      uniqueVehicles: new Set(filteredData.map(r => r.patente)).size,
    }
  }, [filteredData])

  const isFiltered = allInspecciones.length !== filteredData.length

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-gray-500 animate-pulse">Cargando inspecciones…</p>
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
      {puedeGestionarFlota && (
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-dark mb-1">Panel del día</h1>
          <p className="text-sm text-gray-500 mb-5">Estado general de la flota, ahora mismo.</p>

          <PanelSection title="Semáforo de flota ahora mismo" hint="Click en un chip filtra la lista de abajo">
            <SemaforoFlota
              counts={estadoFlota.counts}
              loading={estadoFlota.loading}
              selected={estadoSeleccionado}
              onSelect={setEstadoSeleccionado}
            />
          </PanelSection>

          <PanelSection title="Vehículos que requieren atención">
            <VehiculosAtencion
              vehiculos={estadoFlota.vehiculos}
              filtroEstado={estadoSeleccionado}
              loading={estadoFlota.loading}
              error={estadoFlota.error}
            />
          </PanelSection>

          <PanelSection title="Disponibilidad de flota" hint="Últimos 30 días">
            <div className="card">
              <DisponibilidadWidget
                data={disponibilidad.disponibilidad}
                loading={disponibilidad.loading}
                error={disponibilidad.error}
              />
            </div>
          </PanelSection>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
            <PanelSection title="Costo de mantención este mes">
              <CostoMantencion
                total={costoMensual.total}
                top5={costoMensual.top5}
                loading={costoMensual.loading}
                error={costoMensual.error}
              />
            </PanelSection>

            <PanelSection title="Documentos por vencer">
              <DocumentosPorVencer
                total={vencimientos.total}
                top5={vencimientos.top5}
                loading={vencimientos.loading}
                error={vencimientos.error}
              />
            </PanelSection>
          </div>

          <PanelSection title="Órdenes de trabajo urgentes">
            <OTUrgentesSection items={otUrgentes.items} loading={otUrgentes.loading} error={otUrgentes.error} />
          </PanelSection>

          <div className="border-b border-gray-200 mb-6" />
        </div>
      )}

      {/* Meta header */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-dark">Panel de Inspección de Flota</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            <span className="font-semibold text-gray-700">{filteredData.length}</span> inspecciones
            {' · '}
            <span className="font-semibold text-gray-700">{uniqueVehicles}</span> vehículos
            {minFecha && maxFecha && (
              <> · {fmtDate(minFecha)} – {fmtDate(maxFecha)}</>
            )}
          </p>
        </div>
        {isFiltered && (
          <span className="badge-warn text-xs">
            Filtrado: {filteredData.length} / {allInspecciones.length}
          </span>
        )}
      </div>

      {/* Sticky filters */}
      <FilterBar allData={allInspecciones} />

      {/* Sections */}
      <CollapsibleSection
        num="02"
        title="Estado por sistema inspeccionado"
        hint="Toca un sistema para ver patentes afectadas"
      >
        <SecSistemas data={filteredData} />
      </CollapsibleSection>

      <CollapsibleSection
        num="03"
        title="Prioridades de mantención"
        hint="Ranking accionable · estado actual por vehículo"
      >
        <SecPrioridades data={filteredData} />
      </CollapsibleSection>

      <CollapsibleSection num="04" title="Reportes por operador">
        <SecOperadores data={filteredData} operadoresNomina={operadores} />
      </CollapsibleSection>

      <CollapsibleSection num="05" title="Calendario de reportes">
        <SecCalendario data={filteredData} operadoresNomina={operadores} />
      </CollapsibleSection>

      <CollapsibleSection num="06" title="Cobertura de la flota">
        <SecCobertura data={filteredData} patentesNomina={patentes} />
      </CollapsibleSection>

      <CollapsibleSection num="07" title="Visualización">
        <SecVisualizacion data={filteredData} />
      </CollapsibleSection>
    </div>
  )
}

export function Dashboard() {
  return (
    <FiltersProvider>
      <DashboardContent />
    </FiltersProvider>
  )
}
