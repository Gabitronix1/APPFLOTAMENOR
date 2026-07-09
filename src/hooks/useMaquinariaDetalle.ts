import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Maquinaria, VMaquinariaTimeline } from '../types'

interface HorometroReciente {
  valor: number
  fecha: string
}

interface HorometroRow {
  horometro: number
  f_registro: string
}

export interface MaquinariaRef {
  id: string
  codigo: string
  nombre: string
}

interface State {
  maquinaria: Maquinaria | null
  timeline: VMaquinariaTimeline[]
  horometro: HorometroReciente | null
  padre: MaquinariaRef | null
  hijos: MaquinariaRef[]
  loading: boolean
  error: string | null
  notFound: boolean
}

async function fetchHorometroReciente(maquinariaId: string): Promise<HorometroReciente | null> {
  const { data, error } = await supabase
    .from('intervenciones_maquinaria')
    .select('horometro, f_registro')
    .eq('maquinaria_id', maquinariaId)
    .order('f_registro', { ascending: false })
    .limit(1)
  if (error || !data?.length) return null
  const row = data[0] as unknown as HorometroRow
  return { valor: row.horometro, fecha: row.f_registro }
}

export function useMaquinariaDetalle(id: string | undefined): State & { refetch: () => void } {
  const [state, setState] = useState<State>({
    maquinaria: null,
    timeline: [],
    horometro: null,
    padre: null,
    hijos: [],
    loading: true,
    error: null,
    notFound: false,
  })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!id) return
    const maquinariaId = id
    let cancelled = false

    async function load() {
      setState(prev => ({ ...prev, loading: true, error: null, notFound: false }))
      try {
        const { data: maquinariaRow, error: maqError } = await supabase
          .from('maquinarias')
          .select('*')
          .eq('id', maquinariaId)
          .maybeSingle()
        if (maqError) throw maqError

        if (!maquinariaRow) {
          if (!cancelled) setState(prev => ({ ...prev, loading: false, notFound: true }))
          return
        }

        const maquinaria = maquinariaRow as unknown as Maquinaria

        const [timelineRes, horometro, padreRes, hijosRes] = await Promise.all([
          supabase
            .from('v_maquinaria_timeline')
            .select('*')
            .eq('maquinaria_id', maquinariaId)
            .order('fecha', { ascending: false }),
          fetchHorometroReciente(maquinariaId),
          maquinaria.maquinaria_padre_id
            ? supabase
                .from('maquinarias')
                .select('id, codigo, nombre')
                .eq('id', maquinaria.maquinaria_padre_id)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          supabase
            .from('maquinarias')
            .select('id, codigo, nombre')
            .eq('maquinaria_padre_id', maquinariaId)
            .eq('activo', true)
            .order('codigo', { ascending: true }),
        ])
        if (timelineRes.error) throw timelineRes.error

        if (!cancelled) {
          setState({
            maquinaria,
            timeline: (timelineRes.data ?? []) as unknown as VMaquinariaTimeline[],
            horometro,
            padre: (padreRes.data as unknown as MaquinariaRef | null) ?? null,
            hijos: (hijosRes.data ?? []) as unknown as MaquinariaRef[],
            loading: false,
            error: null,
            notFound: false,
          })
        }
      } catch (e) {
        if (!cancelled) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: e instanceof Error ? e.message : 'Error desconocido',
          }))
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [id, reloadKey])

  return { ...state, refetch: () => setReloadKey(k => k + 1) }
}
