import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ESTADOS_VEHICULO } from '../lib/vehiculos'
import type { EstadoMaquinaria } from '../types'

export interface MaquinariaEstado {
  id: string
  codigo: string
  nombre: string
  estado: EstadoMaquinaria
  motivo: string | null
  fecha: string | null
}

interface HistorialRow {
  maquinaria_id: string
  estado: EstadoMaquinaria
  motivo: string | null
  created_at: string
}

interface State {
  maquinarias: MaquinariaEstado[]
  counts: Record<EstadoMaquinaria, number>
  loading: boolean
  error: string | null
}

function countsVacios(): Record<EstadoMaquinaria, number> {
  return ESTADOS_VEHICULO.reduce((acc, e) => ({ ...acc, [e]: 0 }), {} as Record<EstadoMaquinaria, number>)
}

export function useEstadoFlotaMaquinaria(enabled: boolean): State {
  const [state, setState] = useState<State>({
    maquinarias: [],
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
        const maqRes = await supabase
          .from('maquinarias')
          .select('id, codigo, nombre, estado_actual')
          .eq('activo', true)
          .order('codigo', { ascending: true })
        if (maqRes.error) throw maqRes.error

        const maquinarias = (maqRes.data ?? []) as unknown as {
          id: string
          codigo: string
          nombre: string
          estado_actual: EstadoMaquinaria
        }[]
        const maquinariaIds = maquinarias.map(m => m.id)

        const histRes = maquinariaIds.length
          ? await supabase
              .from('estado_maquinaria_historial')
              .select('maquinaria_id, estado, motivo, created_at')
              .in('maquinaria_id', maquinariaIds)
              .order('created_at', { ascending: false })
          : { data: [] as HistorialRow[], error: null }
        if (histRes.error) throw histRes.error

        const ultimoPorMaquinaria = new Map<string, HistorialRow>()
        for (const h of (histRes.data ?? []) as unknown as HistorialRow[]) {
          if (!ultimoPorMaquinaria.has(h.maquinaria_id)) ultimoPorMaquinaria.set(h.maquinaria_id, h)
        }

        const counts = countsVacios()
        const resultado: MaquinariaEstado[] = maquinarias.map(m => {
          counts[m.estado_actual] = (counts[m.estado_actual] ?? 0) + 1
          const ultimo = ultimoPorMaquinaria.get(m.id)
          return {
            id: m.id,
            codigo: m.codigo,
            nombre: m.nombre,
            estado: m.estado_actual,
            motivo: ultimo?.motivo ?? null,
            fecha: ultimo?.created_at ?? null,
          }
        })

        if (!cancelled) setState({ maquinarias: resultado, counts, loading: false, error: null })
      } catch (e) {
        if (!cancelled) {
          setState({
            maquinarias: [],
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
