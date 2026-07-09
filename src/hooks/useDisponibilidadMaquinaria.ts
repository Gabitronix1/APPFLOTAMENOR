import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Disponibilidad } from '../types'

interface State {
  disponibilidad: Disponibilidad[]
  loading: boolean
  error: string | null
}

export function useDisponibilidadMaquinaria(enabled: boolean, maquinariaId?: string): State {
  const [state, setState] = useState<State>({ disponibilidad: [], loading: true, error: null })

  useEffect(() => {
    if (!enabled) return
    let cancelled = false

    async function load() {
      setState(prev => ({ ...prev, loading: true, error: null }))
      try {
        const { data, error } = await supabase.rpc(
          'fn_disponibilidad_maquinaria',
          maquinariaId ? { maquinaria_id: maquinariaId } : undefined,
        )
        if (error) throw error
        if (!cancelled) {
          setState({ disponibilidad: (data ?? []) as unknown as Disponibilidad[], loading: false, error: null })
        }
      } catch (e) {
        if (!cancelled) {
          setState({
            disponibilidad: [],
            loading: false,
            error: e instanceof Error ? e.message : 'Error desconocido',
          })
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [enabled, maquinariaId])

  return state
}
