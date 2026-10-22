import type { VInspeccion } from '../types'
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

export function applyFilters(data: VInspeccion[], f: Filters): VInspeccion[] {
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
