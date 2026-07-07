import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Patente, VInspeccion, VVehiculoTimeline } from '../types'

interface OdometroReciente {
  valor: number
  fecha: string
}

interface OdometroRow {
  odometro: number
  f_registro: string
}

interface State {
  patente: Patente | null
  inspecciones: VInspeccion[]
  timeline: VVehiculoTimeline[]
  odometro: OdometroReciente | null
  loading: boolean
  error: string | null
  notFound: boolean
}

async function fetchOdometroReciente(patenteId: string): Promise<OdometroReciente | null> {
  const [inspRes, intRes] = await Promise.all([
    supabase
      .from('inspecciones')
      .select('odometro, f_registro')
      .eq('patente_id', patenteId)
      .order('f_registro', { ascending: false })
      .limit(1),
    supabase
      .from('intervenciones')
      .select('odometro, f_registro')
      .eq('patente_id', patenteId)
      .order('f_registro', { ascending: false })
      .limit(1),
  ])

  const candidatos = [
    ...((inspRes.data ?? []) as unknown as OdometroRow[]),
    ...((intRes.data ?? []) as unknown as OdometroRow[]),
  ]
  if (!candidatos.length) return null

  candidatos.sort((a, b) => (a.f_registro < b.f_registro ? 1 : -1))
  return { valor: candidatos[0].odometro, fecha: candidatos[0].f_registro }
}

export function useVehiculoDetalle(id: string | undefined): State & { refetch: () => void } {
  const [state, setState] = useState<State>({
    patente: null,
    inspecciones: [],
    timeline: [],
    odometro: null,
    loading: true,
    error: null,
    notFound: false,
  })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!id) return
    const vehiculoId = id
    let cancelled = false

    async function load() {
      setState(prev => ({ ...prev, loading: true, error: null, notFound: false }))
      try {
        const { data: patente, error: patError } = await supabase
          .from('patentes')
          .select('*')
          .eq('id', vehiculoId)
          .maybeSingle()
        if (patError) throw patError

        if (!patente) {
          if (!cancelled) setState(prev => ({ ...prev, loading: false, notFound: true }))
          return
        }

        const patenteRow = patente as unknown as Patente

        const [inspRes, timelineRes, odometro] = await Promise.all([
          supabase
            .from('v_inspecciones')
            .select('*')
            .eq('patente', patenteRow.patente)
            .order('fecha', { ascending: false }),
          supabase
            .from('v_vehiculo_timeline')
            .select('*')
            .eq('patente_id', vehiculoId)
            .order('fecha', { ascending: false }),
          fetchOdometroReciente(vehiculoId),
        ])

        if (inspRes.error) throw inspRes.error
        if (timelineRes.error) throw timelineRes.error

        if (!cancelled) {
          setState({
            patente: patenteRow,
            inspecciones: (inspRes.data ?? []) as unknown as VInspeccion[],
            timeline: (timelineRes.data ?? []) as unknown as VVehiculoTimeline[],
            odometro,
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
