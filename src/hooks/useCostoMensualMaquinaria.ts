import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { CostoMaquinaria } from '../types'

interface State {
  total: number
  top5: CostoMaquinaria[]
  loading: boolean
  error: string | null
}

export function useCostoMensualMaquinaria(enabled: boolean): State {
  const [state, setState] = useState<State>({ total: 0, top5: [], loading: true, error: null })

  useEffect(() => {
    if (!enabled) return
    let cancelled = false

    async function load() {
      setState(prev => ({ ...prev, loading: true, error: null }))
      try {
        const { data, error } = await supabase.from('v_costo_mensual_maquinaria').select('*')
        if (error) throw error

        const hoy = new Date()
        const delMes = ((data ?? []) as unknown as CostoMaquinaria[]).filter(c => {
          const m = new Date(c.mes)
          return m.getFullYear() === hoy.getFullYear() && m.getMonth() === hoy.getMonth()
        })

        const total = delMes.reduce((acc, c) => acc + (c.costo_total ?? 0), 0)
        const top5 = [...delMes].sort((a, b) => b.costo_total - a.costo_total).slice(0, 5)

        if (!cancelled) setState({ total, top5, loading: false, error: null })
      } catch (e) {
        if (!cancelled) {
          setState({ total: 0, top5: [], loading: false, error: e instanceof Error ? e.message : 'Error desconocido' })
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [enabled])

  return state
}
