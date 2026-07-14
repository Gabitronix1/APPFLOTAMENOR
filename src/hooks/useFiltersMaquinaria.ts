import { createContext, useContext, useReducer, ReactNode, createElement } from 'react'

export interface FiltersMaquinaria {
  categoria: string
  linea: string
  turno: string
  actividad: string
  responsable: string
  desde: string
  hasta: string
  search: string
}

const DEFAULT_FILTERS: FiltersMaquinaria = {
  categoria: '',
  linea: '',
  turno: '',
  actividad: '',
  responsable: '',
  desde: '',
  hasta: '',
  search: '',
}

type FilterAction =
  | { type: 'SET'; key: keyof FiltersMaquinaria; value: FiltersMaquinaria[keyof FiltersMaquinaria] }
  | { type: 'RESET' }

function reducer(state: FiltersMaquinaria, action: FilterAction): FiltersMaquinaria {
  if (action.type === 'RESET') return DEFAULT_FILTERS
  return { ...state, [action.key]: action.value }
}

interface FiltersMaquinariaContextValue {
  filters: FiltersMaquinaria
  setFilter: <K extends keyof FiltersMaquinaria>(key: K, value: FiltersMaquinaria[K]) => void
  resetFilters: () => void
}

const FiltersMaquinariaContext = createContext<FiltersMaquinariaContextValue | null>(null)

export function FiltersMaquinariaProvider({ children }: { children: ReactNode }) {
  const [filters, dispatch] = useReducer(reducer, DEFAULT_FILTERS)

  function setFilter<K extends keyof FiltersMaquinaria>(key: K, value: FiltersMaquinaria[K]) {
    dispatch({ type: 'SET', key, value })
  }

  function resetFilters() {
    dispatch({ type: 'RESET' })
  }

  return createElement(FiltersMaquinariaContext.Provider, { value: { filters, setFilter, resetFilters } }, children)
}

export function useFiltersMaquinaria() {
  const ctx = useContext(FiltersMaquinariaContext)
  if (!ctx) throw new Error('useFiltersMaquinaria debe usarse dentro de FiltersMaquinariaProvider')
  return ctx
}
