import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { VDocumentoVencimiento } from '../types'

interface State {
  total: number
  top5: VDocumentoVencimiento[]
  loading: boolean
  error: string | null
}

export function useVencimientosResumen(enabled: boolean, limite = 5): State {
  const [state, setState] = useState<State>({ total: 0, top5: [], loading: true, error: null })

  useEffect(() => {
    if (!enabled) return
    let cancelled = false

    async function load() {
      setState(prev => ({ ...prev, loading: true, error: null }))
      try {
        const { data, error } = await supabase
          .from('v_documentos_vencimientos')
          .select('*')
          .in('estado', ['vencido', 'por_vencer'])
          .order('dias_restantes', { ascending: true })
        if (error) throw error

        const rows = (data ?? []) as unknown as VDocumentoVencimiento[]
        if (!cancelled) setState({ total: rows.length, top5: rows.slice(0, limite), loading: false, error: null })
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
  }, [enabled, limite])

  return state
}
