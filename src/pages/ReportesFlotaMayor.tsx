import { useMemo } from 'react'
import { FiltersMaquinariaProvider, useFiltersMaquinaria } from '../hooks/useFiltersMaquinaria'
import type { FiltersMaquinaria } from '../hooks/useFiltersMaquinaria'
import { useIntervencionesMaquinaria } from '../hooks/useIntervencionesMaquinaria'
import type { IntervencionMaquinariaCompleta } from '../hooks/useIntervencionesMaquinaria'
import { CollapsibleSection } from '../components/dashboard/CollapsibleSection'
import { FilterBarMaquinaria } from '../components/reportes/FilterBarMaquinaria'
import { SecResumenMaquinaria } from '../components/reportes/SecResumenMaquinaria'
import { SecComponentesFalla } from '../components/reportes/SecComponentesFalla'
import { SecMaquinasAtencion } from '../components/reportes/SecMaquinasAtencion'
import { SecResponsables } from '../components/reportes/SecResponsables'
import { SecCalendarioMaquinaria } from '../components/reportes/SecCalendarioMaquinaria'
import { SecCoberturaMaquinaria } from '../components/reportes/SecCoberturaMaquinaria'
import { SecVisualizacionMaquinaria } from '../components/reportes/SecVisualizacionMaquinaria'
import { SecDetalleMaquinaria } from '../components/reportes/SecDetalleMaquinaria'
import { fmtDate } from '../lib/constants'

function applyFilters(data: IntervencionMaquinariaCompleta[], f: FiltersMaquinaria): IntervencionMaquinariaCompleta[] {
  const q = f.search.toLowerCase().trim()
  return data.filter(r => {
    if (f.categoria && r.categoria !== f.categoria) return false
    if (f.linea && r.lineaCodigo !== f.linea) return false
    if (f.turno && r.turnoNombre !== f.turno) return false
    if (f.actividad && r.actividadNombre !== f.actividad) return false
    if (f.responsable && r.responsableNombre !== f.responsable) return false
    if (f.desde && r.fecha.slice(0, 10) < f.desde) return false
    if (f.hasta && r.fecha.slice(0, 10) > f.hasta) return false
    if (q) {
      const hay = [
        r.maquinariaCodigo, r.maquinariaNombre, r.responsableNombre, r.sistemaNombre,
        r.descripcionFalla, r.descripcion, r.tareaNombre, r.tipoPreventivaNombre,
      ].map(x => (x ?? '').toLowerCase()).join(' ')
      if (!hay.includes(q)) return false
    }
    return true
  })
}

function ReportesFlotaMayorContent() {
  const { filters } = useFiltersMaquinaria()
  const { intervenciones, maquinarias, categorias, timeline, loading, error } = useIntervencionesMaquinaria()

  const filteredData = useMemo(() => applyFilters(intervenciones, filters), [intervenciones, filters])

  const { minFecha, maxFecha, uniqueMaquinas } = useMemo(() => {
    const fechas = filteredData.map(r => r.fecha.slice(0, 10)).sort()
    return {
      minFecha: fechas[0] ?? '',
      maxFecha: fechas[fechas.length - 1] ?? '',
      uniqueMaquinas: new Set(filteredData.map(r => r.maquinariaId)).size,
    }
  }, [filteredData])

  const isFiltered = intervenciones.length !== filteredData.length

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-gray-500 animate-pulse">Cargando intervenciones de maquinaria…</p>
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
        Vista de validación — informe de flota mayor con datos en vivo de Supabase, hermano de
        /reportes/flota-menor. No reemplaza el Dashboard actual.
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-dark">Informe de intervenciones de flota mayor</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            <span className="font-semibold text-gray-700">{filteredData.length}</span> intervenciones
            {' · '}
            <span className="font-semibold text-gray-700">{uniqueMaquinas}</span> maquinarias
            {minFecha && maxFecha && (
              <> · {fmtDate(minFecha)} – {fmtDate(maxFecha)}</>
            )}
          </p>
        </div>
        {isFiltered && (
          <span className="badge-warn text-xs">
            Filtrado: {filteredData.length} / {intervenciones.length}
          </span>
        )}
      </div>

      <FilterBarMaquinaria allData={intervenciones} />

      <CollapsibleSection num="01" title="Resumen ejecutivo">
        <SecResumenMaquinaria data={filteredData} />
      </CollapsibleSection>

      <CollapsibleSection
        num="02"
        title="Top componentes/sistemas con más fallas"
        hint="Toca un componente para ver máquinas afectadas"
      >
        <SecComponentesFalla data={filteredData} maquinarias={maquinarias} />
      </CollapsibleSection>

      <CollapsibleSection num="03" title="Máquinas que requieren atención" hint="Estado actual, sin filtro de período">
        <SecMaquinasAtencion maquinarias={maquinarias} categorias={categorias} />
      </CollapsibleSection>

      <CollapsibleSection num="04" title="Actividad por responsable">
        <SecResponsables data={filteredData} />
      </CollapsibleSection>

      <CollapsibleSection num="05" title="Calendario de actividad por máquina">
        <SecCalendarioMaquinaria timeline={timeline} maquinarias={maquinarias} categorias={categorias} filters={filters} />
      </CollapsibleSection>

      <CollapsibleSection num="06" title="Cobertura de la flota mayor">
        <SecCoberturaMaquinaria data={filteredData} maquinarias={maquinarias} categorias={categorias} />
      </CollapsibleSection>

      <CollapsibleSection num="07" title="Visualización">
        <SecVisualizacionMaquinaria data={filteredData} />
      </CollapsibleSection>

      <CollapsibleSection num="08" title="Detalle de intervenciones" hint="Toca una fila para ver el detalle completo">
        <SecDetalleMaquinaria data={filteredData} />
      </CollapsibleSection>
    </div>
  )
}

export function ReportesFlotaMayor() {
  return (
    <FiltersMaquinariaProvider>
      <ReportesFlotaMayorContent />
    </FiltersMaquinariaProvider>
  )
}
