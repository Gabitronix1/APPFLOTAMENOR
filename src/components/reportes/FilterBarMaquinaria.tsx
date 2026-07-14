import { useFiltersMaquinaria } from '../../hooks/useFiltersMaquinaria'
import type { IntervencionMaquinariaCompleta } from '../../hooks/useIntervencionesMaquinaria'

interface FilterBarMaquinariaProps {
  allData: IntervencionMaquinariaCompleta[]
}

function uniq(arr: (string | null)[]): string[] {
  return [...new Set(arr.filter((v): v is string => !!v))].sort()
}

export function FilterBarMaquinaria({ allData }: FilterBarMaquinariaProps) {
  const { filters, setFilter, resetFilters } = useFiltersMaquinaria()

  const categorias = uniq(allData.map(r => r.categoria))
  const lineas = uniq(allData.map(r => r.lineaCodigo))
  const turnos = uniq(allData.map(r => r.turnoNombre))
  const actividades = uniq(allData.map(r => r.actividadNombre))
  const responsables = uniq(allData.map(r => r.responsableNombre))

  const hasActive =
    filters.categoria || filters.linea || filters.turno || filters.actividad ||
    filters.responsable || filters.desde || filters.hasta || filters.search

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-4 sticky top-16 z-40">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="min-w-[200px] flex-1">
          <label className="label">Buscar</label>
          <input
            type="search"
            placeholder="Máquina, responsable, comentario..."
            value={filters.search}
            onChange={e => setFilter('search', e.target.value)}
            className="input"
          />
        </div>
        <Select label="Categoría" value={filters.categoria} onChange={v => setFilter('categoria', v)} options={categorias} placeholder="Todas" />
        <Select label="Línea" value={filters.linea} onChange={v => setFilter('linea', v)} options={lineas} placeholder="Todas" />
        <Select label="Turno" value={filters.turno} onChange={v => setFilter('turno', v)} options={turnos} placeholder="Todos" />
        <Select label="Actividad" value={filters.actividad} onChange={v => setFilter('actividad', v)} options={actividades} placeholder="Todas" />
        <Select label="Responsable" value={filters.responsable} onChange={v => setFilter('responsable', v)} options={responsables} placeholder="Todos" />
        <div>
          <label className="label">Desde</label>
          <input
            type="date"
            value={filters.desde}
            onChange={e => setFilter('desde', e.target.value)}
            className="input w-36"
          />
        </div>
        <div>
          <label className="label">Hasta</label>
          <input
            type="date"
            value={filters.hasta}
            onChange={e => setFilter('hasta', e.target.value)}
            className="input w-36"
          />
        </div>
        {hasActive && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-fault transition-colors pb-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Limpiar
          </button>
        )}
      </div>
    </div>
  )
}

interface SelectProps {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder: string
}

function Select({ label, value, onChange, options, placeholder }: SelectProps) {
  return (
    <div>
      <label className="label">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="input w-40 text-sm">
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
