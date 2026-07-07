import { useEffect, useState } from 'react'
import { fetchAllPages } from '../lib/fetchAllPages'
import type { VInspeccion, Operador, Patente } from '../types'

interface InspeccionesState {
  allInspecciones: VInspeccion[]
  operadores: Operador[]
  patentes: Patente[]
  loading: boolean
  error: string | null
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
