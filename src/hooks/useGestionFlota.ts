import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchAllPages } from '../lib/fetchAllPages'
import { construirInspecciones, construirVehiculos } from '../lib/gestionFlota'
import type { ChecklistRow, Inspeccion, OTRow, PatenteRow, Vehiculo } from '../lib/gestionFlota'

interface State {
  vehiculos: Vehiculo[]
  inspecciones: Inspeccion[]
  ots: OTRow[]
  loading: boolean
  error: string | null
}

const PAGE = 1000

async function cargarChecklist(): Promise<ChecklistRow[]> {
  const out: ChecklistRow[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .rpc('fn_dashboard_flota_menor_checklist')
      .range(from, from + PAGE - 1)
    if (error) throw error
    const rows = (data ?? []) as unknown as ChecklistRow[]
    out.push(...rows)
    if (rows.length < PAGE) break
  }
  return out
}

export function useGestionFlota(enabled: boolean, recarga = 0): State {
  const [state, setState] = useState<State>({ vehiculos: [], inspecciones: [], ots: [], loading: true, error: null })

  useEffect(() => {
    if (!enabled) return
    let cancelled = false

    async function load() {
      setState(prev => ({ ...prev, loading: true, error: null }))
      try {
        const [checklist, patRes, catRes, opRes, ots] = await Promise.all([
          cargarChecklist(),
          supabase
            .from('patentes')
            .select('id, patente, descripcion, marca, modelo, anno, categoria_id, condicion, linea, estado_actual, afecta_indicadores')
            .eq('activo', true)
            .order('patente'),
          supabase.from('categorias_vehiculo').select('id, nombre'),
          supabase.from('operadores').select('id, nombre, apellido'),
          fetchAllPages<OTRow>('resoluciones', 'id, inspeccion_id, pregunta_id, estado, asignado_a, created_at, fecha_cierre'),
        ])
        if (patRes.error) throw patRes.error
        if (catRes.error) throw catRes.error
        if (opRes.error) throw opRes.error

        const categorias = new Map(((catRes.data ?? []) as { id: number; nombre: string }[]).map(c => [c.id, c.nombre]))
        const conductores = new Map(
          ((opRes.data ?? []) as { id: string; nombre: string; apellido: string }[])
            .map(o => [o.id, `${o.apellido ?? ''} ${o.nombre ?? ''}`.trim()]),
        )
        const vehiculos = construirVehiculos((patRes.data ?? []) as unknown as PatenteRow[], categorias)
        const inspecciones = construirInspecciones(checklist, new Map(vehiculos.map(v => [v.id, v])), conductores)

        if (!cancelled) setState({ vehiculos, inspecciones, ots, loading: false, error: null })
      } catch (e) {
        if (!cancelled) {
          setState({
            vehiculos: [],
            inspecciones: [],
            ots: [],
            loading: false,
            error: e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error desconocido',
          })
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [enabled, recarga])

  return state
}
