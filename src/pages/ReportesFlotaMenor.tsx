import { useMemo } from 'react'
import { FiltersProvider, useFilters } from '../hooks/useFilters'
import type { Filters } from '../hooks/useFilters'
import { useInspecciones } from '../hooks/useInspecciones'
import { CollapsibleSection } from '../components/dashboard/CollapsibleSection'
import { SecSistemas } from '../components/dashboard/SecSistemas'
import { SecCalendario } from '../components/dashboard/SecCalendario'
import { SecVisualizacion } from '../components/dashboard/SecVisualizacion'
import { FilterBarReportes } from '../components/reportes/FilterBarReportes'
import { SecResumen } from '../components/reportes/SecResumen'
import { SecPrioridadesOT } from '../components/reportes/SecPrioridadesOT'
import { SecOperadoresReportes } from '../components/reportes/SecOperadoresReportes'
import { SecCoberturaReportes } from '../components/reportes/SecCoberturaReportes'
import { SecDetalle } from '../components/reportes/SecDetalle'
import { fmtDate } from '../lib/constants'
import type { VInspeccion } from '../types'

function applyFilters(data: VInspeccion[], f: Filters): VInspeccion[] {
  const q = f.search.toLowerCase().trim()
  return data.filter(r => {
    if (f.fundo && r.fundo !== f.fundo) return false
    if (f.contrato && r.contrato !== f.contrato) return false
    if (f.conductor && r.conductor !== f.conductor) return false
    if (f.patente && r.patente !== f.patente) return false
    if (f.desde && r.fecha.slice(0, 10) < f.desde) return false
    if (f.hasta && r.fecha.slice(0, 10) > f.hasta) return false
    if (f.soloConProblemas && r.n_fallas === 0) return false
    if (q) {
      const hay = [r.patente, r.conductor, r.fundo, r.contrato, r.obs_general, r.obs1, r.obs2, r.obs3, r.obs4, r.obs5, r.obs6]
        .map(x => (x ?? '').toLowerCase()).join(' ')
      if (!hay.includes(q)) return false
    }
    return true
  })
}

function ReportesFlotaMenorContent() {
  const { filters } = useFilters()
  const { allInspecciones, operadores, patentes, loading, error } = useInspecciones()

  const filteredData = useMemo(() => applyFilters(allInspecciones, filters), [allInspecciones, filters])

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
      <div className="rounded-lg bg-warn/10 border border-warn/30 text-warn text-xs px-3 py-2 mb-4">
        Vista de validación — réplica del informe de checklist con datos en vivo de Supabase.
        No reemplaza el Dashboard actual.
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-dark">Informe de inspección de flota menor</h1>
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

      <FilterBarReportes allData={allInspecciones} />

      <CollapsibleSection num="01" title="Resumen ejecutivo">
        <SecResumen data={filteredData} />
      </CollapsibleSection>

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
        hint="Basado en órdenes de trabajo reales"
      >
        <SecPrioridadesOT filters={filters} />
      </CollapsibleSection>

      <CollapsibleSection num="04" title="Reportes por operador">
        <SecOperadoresReportes data={filteredData} operadoresNomina={operadores} />
      </CollapsibleSection>

      <CollapsibleSection num="05" title="Calendario de reportes">
        <SecCalendario data={filteredData} operadoresNomina={operadores} />
      </CollapsibleSection>

      <CollapsibleSection num="06" title="Cobertura de la flota">
        <SecCoberturaReportes data={filteredData} patentesNomina={patentes} />
      </CollapsibleSection>

      <CollapsibleSection num="07" title="Visualización">
        <SecVisualizacion data={filteredData} />
      </CollapsibleSection>

      <CollapsibleSection num="08" title="Detalle de inspecciones" hint="Toca una fila para ver respuestas">
        <SecDetalle data={filteredData} />
      </CollapsibleSection>
    </div>
  )
}

export function ReportesFlotaMenor() {
  return (
    <FiltersProvider>
      <ReportesFlotaMenorContent />
    </FiltersProvider>
  )
}
