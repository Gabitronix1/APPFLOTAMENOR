import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PREGUNTAS } from '../lib/constants'
import type { EstadoOT, PrioridadOT, Resolucion } from '../types'

export interface OTUrgente {
  id: string
  patente: string
  sistema: string
  estado: EstadoOT
  prioridad: PrioridadOT | null
  created_at: string
}

interface State {
  items: OTUrgente[]
  loading: boolean
  error: string | null
}

const ESTADOS_ACTIVOS: EstadoOT[] = ['abierta', 'asignada', 'en_progreso']
const RANGO_PRIORIDAD: Record<PrioridadOT | 'sin_prioridad', number> = {
  urgente: 0,
  alta: 1,
  media: 2,
  baja: 3,
  sin_prioridad: 4,
}

export function useOTUrgentes(enabled: boolean, limite = 5): State {
  const [state, setState] = useState<State>({ items: [], loading: true, error: null })

  useEffect(() => {
    if (!enabled) return
    let cancelled = false

    async function load() {
      setState(prev => ({ ...prev, loading: true, error: null }))
      try {
        const otRes = await supabase.from('resoluciones').select('*').in('estado', ESTADOS_ACTIVOS)
        if (otRes.error) throw otRes.error
        const ordenes = (otRes.data ?? []) as unknown as Resolucion[]

        const inspeccionIds = Array.from(new Set(ordenes.map(o => o.inspeccion_id)))
        const inspRes = inspeccionIds.length
          ? await supabase.from('v_inspecciones').select('id, patente').in('id', inspeccionIds)
          : { data: [] as { id: string; patente: string }[], error: null }
        if (inspRes.error) throw inspRes.error
        const patentePorInspeccion = new Map(
          ((inspRes.data ?? []) as { id: string; patente: string }[]).map(i => [i.id, i.patente]),
        )

        const items: OTUrgente[] = ordenes
          .map(o => ({
            id: o.id,
            patente: patentePorInspeccion.get(o.inspeccion_id) ?? '—',
            sistema: PREGUNTAS[o.pregunta_id - 1]?.label ?? `Pregunta ${o.pregunta_id}`,
            estado: o.estado,
            prioridad: o.prioridad,
            created_at: o.created_at,
          }))
          .sort((a, b) => {
            const rankDiff = RANGO_PRIORIDAD[a.prioridad ?? 'sin_prioridad'] - RANGO_PRIORIDAD[b.prioridad ?? 'sin_prioridad']
            if (rankDiff !== 0) return rankDiff
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          })
          .slice(0, limite)

        if (!cancelled) setState({ items, loading: false, error: null })
      } catch (e) {
        if (!cancelled) {
          setState({ items: [], loading: false, error: e instanceof Error ? e.message : 'Error desconocido' })
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
