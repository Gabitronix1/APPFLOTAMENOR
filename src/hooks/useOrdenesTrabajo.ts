import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PREGUNTAS } from '../lib/constants'
import type { Operador, OrdenTrabajo, Resolucion } from '../types'

interface State {
  ordenes: OrdenTrabajo[]
  operadoresAsignables: Operador[]
  loading: boolean
  error: string | null
}

function unicos<T>(vals: (T | null | undefined)[]): T[] {
  return Array.from(new Set(vals.filter((v): v is T => v != null)))
}

export function useOrdenesTrabajo(): State & { refetch: () => void } {
  const [state, setState] = useState<State>({
    ordenes: [],
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
        const [otRes, perfilesOpRes, operadoresRes] = await Promise.all([
          supabase.from('resoluciones').select('*').order('created_at', { ascending: false }),
          supabase.from('perfiles').select('id').eq('rol', 'operador'),
          supabase.from('operadores').select('*').eq('activo', true).order('apellido', { ascending: true }),
        ])
        if (otRes.error) throw otRes.error
        if (perfilesOpRes.error) throw perfilesOpRes.error
        if (operadoresRes.error) throw operadoresRes.error

        const resoluciones = (otRes.data ?? []) as unknown as Resolucion[]

        const inspeccionIds = unicos(resoluciones.map(r => r.inspeccion_id))
        const inspeccionesRes = inspeccionIds.length
          ? await supabase.from('inspecciones').select('id, patente_id').in('id', inspeccionIds)
          : { data: [] as { id: string; patente_id: string }[], error: null }
        if (inspeccionesRes.error) throw inspeccionesRes.error
        const patenteIdPorInspeccion = new Map(
          ((inspeccionesRes.data ?? []) as { id: string; patente_id: string }[]).map(i => [i.id, i.patente_id]),
        )

        const patenteIds = unicos(Array.from(patenteIdPorInspeccion.values()))
        const patentesRes = patenteIds.length
          ? await supabase.from('patentes').select('id, patente').in('id', patenteIds)
          : { data: [] as { id: string; patente: string }[], error: null }
        if (patentesRes.error) throw patentesRes.error
        const patentePorId = new Map(
          ((patentesRes.data ?? []) as { id: string; patente: string }[]).map(p => [p.id, p.patente]),
        )

        const idsOperadorRol = new Set(((perfilesOpRes.data ?? []) as { id: string }[]).map(p => p.id))
        const operadoresTodos = (operadoresRes.data ?? []) as unknown as Operador[]
        const operadoresAsignables = operadoresTodos.filter(o => idsOperadorRol.has(o.id))
        const operadorPorId = new Map(operadoresTodos.map(o => [o.id, o]))

        const ordenes: OrdenTrabajo[] = resoluciones.map(r => {
          const patenteId = patenteIdPorInspeccion.get(r.inspeccion_id)
          const asignado = r.asignado_a ? operadorPorId.get(r.asignado_a) : undefined
          return {
            ...r,
            patente: (patenteId && patentePorId.get(patenteId)) || '—',
            sistema: PREGUNTAS[r.pregunta_id - 1]?.label ?? `Pregunta ${r.pregunta_id}`,
            asignadoNombre: asignado ? `${asignado.nombre} ${asignado.apellido}` : null,
          }
        })

        if (!cancelled) setState({ ordenes, operadoresAsignables, loading: false, error: null })
      } catch (e) {
        if (!cancelled) {
          setState({
            ordenes: [],
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
