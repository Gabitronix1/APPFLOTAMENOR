import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PREGUNTAS } from '../lib/constants'
import type { EstadoOT, Operador, OrdenTrabajo, Resolucion, VInspeccion } from '../types'

export interface FallaFila {
  preguntaId: number
  sistema: string
  observacion: string | null
  ot: OrdenTrabajo | null
}

export interface GrupoInspeccion {
  inspeccion: VInspeccion
  fallas: FallaFila[]
  pendientes: number
  cerradas: number
}

interface State {
  ordenes: OrdenTrabajo[]
  grupos: GrupoInspeccion[]
  operadoresAsignables: Operador[]
  loading: boolean
  error: string | null
}

const ESTADOS_PENDIENTES: EstadoOT[] = ['abierta', 'asignada', 'en_progreso']

export function useOrdenesTrabajo(): State & { refetch: () => void } {
  const [state, setState] = useState<State>({
    ordenes: [],
    grupos: [],
    operadoresAsignables: [],
    loading: true,
    error: null,
  })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setState(prev => ({ ...prev, loading: true, error: null }))
      try {
        const [otRes, inspRes, perfilesOpRes, operadoresRes] = await Promise.all([
          supabase.from('resoluciones').select('*').order('created_at', { ascending: false }),
          supabase.from('v_inspecciones').select('*').gt('n_fallas', 0).order('fecha', { ascending: false }),
          supabase.from('perfiles').select('id').in('rol', ['mecanico_flota_menor', 'mecanico_maquinaria']),
          supabase.from('operadores').select('*').eq('activo', true).order('apellido', { ascending: true }),
        ])
        if (otRes.error) throw otRes.error
        if (inspRes.error) throw inspRes.error
        if (perfilesOpRes.error) throw perfilesOpRes.error
        if (operadoresRes.error) throw operadoresRes.error

        const resoluciones = (otRes.data ?? []) as unknown as Resolucion[]
        const inspecciones = (inspRes.data ?? []) as unknown as VInspeccion[]
        const patentePorInspeccion = new Map(inspecciones.map(i => [i.id, i.patente]))

        const idsMecanicoRol = new Set(((perfilesOpRes.data ?? []) as { id: string }[]).map(p => p.id))
        const operadoresTodos = (operadoresRes.data ?? []) as unknown as Operador[]
        const operadoresAsignables = operadoresTodos.filter(o => idsMecanicoRol.has(o.id))
        const operadorPorId = new Map(operadoresTodos.map(o => [o.id, o]))

        const ordenes: OrdenTrabajo[] = resoluciones.map(r => {
          const asignado = r.asignado_a ? operadorPorId.get(r.asignado_a) : undefined
          return {
            ...r,
            patente: patentePorInspeccion.get(r.inspeccion_id) ?? '—',
            sistema: PREGUNTAS[r.pregunta_id - 1]?.label ?? `Pregunta ${r.pregunta_id}`,
            asignadoNombre: asignado ? `${asignado.nombre} ${asignado.apellido}` : null,
          }
        })

        const otsPorInspeccion = new Map<string, OrdenTrabajo[]>()
        for (const ot of ordenes) {
          const list = otsPorInspeccion.get(ot.inspeccion_id) ?? []
          list.push(ot)
          otsPorInspeccion.set(ot.inspeccion_id, list)
        }

        const grupos: GrupoInspeccion[] = inspecciones.map(insp => {
          const otPorPregunta = new Map((otsPorInspeccion.get(insp.id) ?? []).map(o => [o.pregunta_id, o]))

          const fallas: FallaFila[] = PREGUNTAS.reduce<FallaFila[]>((acc, p, idx) => {
            const preguntaId = idx + 1
            const tieneFalla = insp[`p${preguntaId}` as keyof VInspeccion] === true
            if (!tieneFalla) return acc
            acc.push({
              preguntaId,
              sistema: p.label,
              observacion: (insp[`obs${preguntaId}` as keyof VInspeccion] as string | null) ?? null,
              ot: otPorPregunta.get(preguntaId) ?? null,
            })
            return acc
          }, [])

          const pendientes = fallas.filter(f => f.ot && ESTADOS_PENDIENTES.includes(f.ot.estado)).length
          const cerradas = fallas.filter(f => f.ot?.estado === 'cerrada').length

          return { inspeccion: insp, fallas, pendientes, cerradas }
        })

        if (!cancelled) setState({ ordenes, grupos, operadoresAsignables, loading: false, error: null })
      } catch (e) {
        if (!cancelled) {
          setState({
            ordenes: [],
            grupos: [],
            operadoresAsignables: [],
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
  }, [reloadKey])

  return { ...state, refetch: () => setReloadKey(k => k + 1) }
}
