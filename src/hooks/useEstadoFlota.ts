import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ESTADOS_VEHICULO } from '../lib/vehiculos'
import type { EstadoVehiculo } from '../types'

export interface VehiculoEstado {
  id: string
  patente: string
  descripcion: string
  estado: EstadoVehiculo
  motivo: string | null
  fecha: string | null
}

interface HistorialRow {
  patente_id: string
  estado: EstadoVehiculo
  motivo: string | null
  created_at: string
}

interface State {
  vehiculos: VehiculoEstado[]
  counts: Record<EstadoVehiculo, number>
  loading: boolean
  error: string | null
}

function countsVacios(): Record<EstadoVehiculo, number> {
  return ESTADOS_VEHICULO.reduce((acc, e) => ({ ...acc, [e]: 0 }), {} as Record<EstadoVehiculo, number>)
}

export function useEstadoFlota(enabled: boolean): State {
  const [state, setState] = useState<State>({
    vehiculos: [],
    counts: countsVacios(),
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!enabled) return
    let cancelled = false

    async function load() {
      setState(prev => ({ ...prev, loading: true, error: null }))
      try {
        const patRes = await supabase
          .from('patentes')
          .select('id, patente, descripcion, estado_actual')
          .eq('activo', true)
          .order('patente', { ascending: true })
        if (patRes.error) throw patRes.error

        const patentes = (patRes.data ?? []) as unknown as {
          id: string
          patente: string
          descripcion: string
          estado_actual: EstadoVehiculo
        }[]
        const patenteIds = patentes.map(p => p.id)

        const histRes = patenteIds.length
          ? await supabase
              .from('estado_vehiculo_historial')
              .select('patente_id, estado, motivo, created_at')
              .in('patente_id', patenteIds)
              .order('created_at', { ascending: false })
          : { data: [] as HistorialRow[], error: null }
        if (histRes.error) throw histRes.error

        const ultimoPorPatente = new Map<string, HistorialRow>()
        for (const h of (histRes.data ?? []) as unknown as HistorialRow[]) {
          if (!ultimoPorPatente.has(h.patente_id)) ultimoPorPatente.set(h.patente_id, h)
        }

        const counts = countsVacios()
        const vehiculos: VehiculoEstado[] = patentes.map(p => {
          counts[p.estado_actual] = (counts[p.estado_actual] ?? 0) + 1
          const ultimo = ultimoPorPatente.get(p.id)
          return {
            id: p.id,
            patente: p.patente,
            descripcion: p.descripcion,
            estado: p.estado_actual,
            motivo: ultimo?.motivo ?? null,
            fecha: ultimo?.created_at ?? null,
          }
        })

        if (!cancelled) setState({ vehiculos, counts, loading: false, error: null })
      } catch (e) {
        if (!cancelled) {
          setState({
            vehiculos: [],
            counts: countsVacios(),
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
  }, [enabled])

  return state
}
