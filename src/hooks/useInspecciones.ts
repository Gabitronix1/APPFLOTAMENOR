import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { VInspeccion, Operador, Patente } from '../types'

interface InspeccionesState {
  allInspecciones: VInspeccion[]
  operadores: Operador[]
  patentes: Patente[]
  loading: boolean
  error: string | null
}

async function fetchAllPages<T>(
  table: string,
  select = '*',
  order?: { column: string; ascending: boolean },
): Promise<T[]> {
  const PAGE = 1000
  const result: T[] = []
  let from = 0
  while (true) {
    let q = supabase.from(table).select(select).range(from, from + PAGE - 1)
    if (order) q = q.order(order.column, { ascending: order.ascending })
    const { data, error } = await q
    if (error || !data || data.length === 0) break
    result.push(...(data as unknown as T[]))
    if (data.length < PAGE) break
    from += PAGE
  }
  return result
}

export function useInspecciones(): InspeccionesState {
  const [state, setState] = useState<InspeccionesState>({
    allInspecciones: [],
    operadores: [],
    patentes: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    async function load() {
      try {
        const [inspData, opData, patData] = await Promise.all([
          fetchAllPages<VInspeccion>('v_inspecciones', '*', { column: 'fecha', ascending: false }),
          fetchAllPages<Operador>('operadores', '*', { column: 'apellido', ascending: true }),
          fetchAllPages<Patente>('patentes', '*', { column: 'patente', ascending: true }),
        ])
        setState({
          allInspecciones: inspData,
          operadores: opData,
          patentes: patData,
          loading: false,
          error: null,
        })
      } catch (e) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: e instanceof Error ? e.message : 'Error desconocido',
        }))
      }
    }
    void load()
  }, [])

  return state
}
