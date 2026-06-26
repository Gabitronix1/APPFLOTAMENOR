import { createContext, useContext, useReducer, ReactNode, createElement } from 'react'

export interface Filters {
  fundo: string
  contrato: string
  conductor: string
  patente: string
  desde: string
  hasta: string
  soloConProblemas: boolean
}

const DEFAULT_FILTERS: Filters = {
  fundo: '',
  contrato: '',
  conductor: '',
  patente: '',
  desde: '',
  hasta: '',
  soloConProblemas: false,
}

type FilterAction =
  | { type: 'SET'; key: keyof Filters; value: Filters[keyof Filters] }
  | { type: 'RESET' }

function reducer(state: Filters, action: FilterAction): Filters {
  if (action.type === 'RESET') return DEFAULT_FILTERS
  return { ...state, [action.key]: action.value }
}

interface FiltersContextValue {
  filters: Filters
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void
  resetFilters: () => void
}

const FiltersContext = createContext<FiltersContextValue | null>(null)

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, dispatch] = useReducer(reducer, DEFAULT_FILTERS)

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    dispatch({ type: 'SET', key, value })
  }

  function resetFilters() {
    dispatch({ type: 'RESET' })
  }

  return createElement(FiltersContext.Provider, { value: { filters, setFilter, resetFilters } }, children)
}

export function useFilters() {
  const ctx = useContext(FiltersContext)
  if (!ctx) throw new Error('useFilters debe usarse dentro de FiltersProvider')
  return ctx
}
