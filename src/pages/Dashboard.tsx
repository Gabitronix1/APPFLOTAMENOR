import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { FiltersProvider, useFilters } from '../hooks/useFilters'
import type { Filters } from '../hooks/useFilters'
import { useInspecciones } from '../hooks/useInspecciones'
import { useEstadoFlota } from '../hooks/useEstadoFlota'
import { useDisponibilidad } from '../hooks/useDisponibilidad'
import { useOTUrgentes } from '../hooks/useOTUrgentes'
import { useVencimientosResumen } from '../hooks/useVencimientosResumen'
import { useEstadoFlotaMaquinaria } from '../hooks/useEstadoFlotaMaquinaria'
import { useDisponibilidadMaquinaria } from '../hooks/useDisponibilidadMaquinaria'
import { PanelSection } from '../components/dashboard/PanelSection'
import { SemaforoFlota } from '../components/dashboard/SemaforoFlota'
import { VehiculosAtencion } from '../components/dashboard/VehiculosAtencion'
import { MaquinariasAtencion } from '../components/dashboard/MaquinariasAtencion'
import { DisponibilidadWidget } from '../components/dashboard/DisponibilidadWidget'
import { OTUrgentesSection } from '../components/dashboard/OTUrgentesSection'
import { DocumentosPorVencer } from '../components/dashboard/DocumentosPorVencer'
import { FilterBar } from '../components/dashboard/FilterBar'
import { SecSistemas } from '../components/dashboard/SecSistemas'
import { SecPrioridades } from '../components/dashboard/SecPrioridades'
import { SecTrazabilidadOperadores } from '../components/dashboard/SecTrazabilidadOperadores'
import { SecCobertura } from '../components/dashboard/SecCobertura'
import { fmtDate } from '../lib/constants'
import { esRolAdministrativo } from '../lib/roles'
import type { EstadoMaquinaria, EstadoVehiculo, VInspeccion } from '../types'

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

  const puedeGestionarFlota = esRolAdministrativo(perfil?.rol)
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<EstadoVehiculo | null>(null)
  const [estadoMaquinariaSeleccionado, setEstadoMaquinariaSeleccionado] = useState<EstadoMaquinaria | null>(null)

  const estadoFlota = useEstadoFlota(puedeGestionarFlota)
  const disponibilidad = useDisponibilidad(puedeGestionarFlota)
  const otUrgentes = useOTUrgentes(puedeGestionarFlota)
  const vencimientos = useVencimientosResumen(puedeGestionarFlota)
  const estadoFlotaMaquinaria = useEstadoFlotaMaquinaria(puedeGestionarFlota)
  const disponibilidadMaquinaria = useDisponibilidadMaquinaria(puedeGestionarFlota)

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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark mb-1">Gestión de flota</h1>
        <p className="text-sm text-gray-500">Estado, atención requerida y trazabilidad de reportes.</p>
      </div>

      {puedeGestionarFlota && (
        <div className="mb-10">
          <h2 className="text-lg font-bold text-dark mb-1">Flota Menor</h2>
          <p className="text-sm text-gray-500 mb-5">Vehículos — estado operativo ahora mismo.</p>

          <PanelSection title="Semáforo de flota" hint="Click en un chip filtra la lista de abajo">
            <SemaforoFlota
              counts={estadoFlota.counts}
              loading={estadoFlota.loading}
              selected={estadoSeleccionado}
              onSelect={setEstadoSeleccionado}
            />
          </PanelSection>

          <PanelSection title="Vehículos que requieren atención" hint="Por estado operativo asignado manualmente">
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
            <PanelSection title="Órdenes de trabajo urgentes">
              <OTUrgentesSection items={otUrgentes.items} loading={otUrgentes.loading} error={otUrgentes.error} />
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
        </div>
      )}

      {/* Inspecciones — trazabilidad */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-bold text-dark">Trazabilidad de inspecciones</h2>
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

      <FilterBar allData={allInspecciones} />

      <PanelSection title="Estado por sistema inspeccionado" hint="Toca un sistema para ver patentes afectadas">
        <SecSistemas data={filteredData} />
      </PanelSection>

      <PanelSection title="Prioridades de mantención" hint="Ranking por fallas de checklist · estado actual por vehículo">
        <SecPrioridades data={filteredData} />
      </PanelSection>

      <PanelSection title="Trazabilidad de operadores" hint="Cumplimiento de reporte 5×5">
        <SecTrazabilidadOperadores data={filteredData} operadoresNomina={operadores} />
      </PanelSection>

      <PanelSection title="Cobertura de la flota">
        <SecCobertura data={filteredData} patentesNomina={patentes} />
      </PanelSection>

      {puedeGestionarFlota && (
        <div className="mt-10">
          <div className="border-b border-gray-200 mb-6" />
          <h2 className="text-lg font-bold text-dark mb-1">Flota Mayor</h2>
          <p className="text-sm text-gray-500 mb-5">Maquinaria — estado operativo ahora mismo.</p>

          <PanelSection title="Semáforo de maquinarias" hint="Click en un chip filtra la lista de abajo">
            <SemaforoFlota
              counts={estadoFlotaMaquinaria.counts}
              loading={estadoFlotaMaquinaria.loading}
              selected={estadoMaquinariaSeleccionado}
              onSelect={setEstadoMaquinariaSeleccionado}
            />
          </PanelSection>

          <PanelSection title="Maquinarias que requieren atención">
            <MaquinariasAtencion
              maquinarias={estadoFlotaMaquinaria.maquinarias}
              filtroEstado={estadoMaquinariaSeleccionado}
              loading={estadoFlotaMaquinaria.loading}
              error={estadoFlotaMaquinaria.error}
            />
          </PanelSection>

          <PanelSection title="Disponibilidad de maquinarias" hint="Últimos 30 días">
            <div className="card">
              <DisponibilidadWidget
                data={disponibilidadMaquinaria.disponibilidad}
                loading={disponibilidadMaquinaria.loading}
                error={disponibilidadMaquinaria.error}
              />
            </div>
          </PanelSection>
        </div>
      )}
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
