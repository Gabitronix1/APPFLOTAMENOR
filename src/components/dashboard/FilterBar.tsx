import { useFilters } from '../../hooks/useFilters'
import type { VInspeccion } from '../../types'

interface FilterBarProps {
  allData: VInspeccion[]
}

function uniq(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))].sort()
}

export function FilterBar({ allData }: FilterBarProps) {
  const { filters, setFilter, resetFilters } = useFilters()

  const fundos = uniq(allData.map(r => r.fundo))
  const contratos = uniq(allData.map(r => r.contrato ?? ''))
  const conductores = uniq(allData.map(r => r.conductor))
  const patentes = uniq(allData.map(r => r.patente))

  const hasActive =
    filters.fundo || filters.contrato || filters.conductor ||
    filters.patente || filters.desde || filters.hasta || filters.soloConProblemas

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-4 sticky top-16 z-40">
      <div className="flex flex-wrap gap-2 items-end">
        <Select
          label="Fundo"
          value={filters.fundo}
          onChange={v => setFilter('fundo', v)}
          options={fundos}
          placeholder="Todos"
        />
        <Select
          label="Contrato"
          value={filters.contrato}
          onChange={v => setFilter('contrato', v)}
          options={contratos}
          placeholder="Todos"
        />
        <Select
          label="Conductor"
          value={filters.conductor}
          onChange={v => setFilter('conductor', v)}
          options={conductores}
          placeholder="Todos"
        />
        <Select
          label="Patente"
          value={filters.patente}
          onChange={v => setFilter('patente', v)}
          options={patentes}
          placeholder="Todas"
        />
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
        <label className="flex items-center gap-2 cursor-pointer pb-2">
          <input
            type="checkbox"
            checked={filters.soloConProblemas}
            onChange={e => setFilter('soloConProblemas', e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-sm text-gray-700 whitespace-nowrap">Solo con problemas</span>
        </label>
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
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input w-40 text-sm"
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
