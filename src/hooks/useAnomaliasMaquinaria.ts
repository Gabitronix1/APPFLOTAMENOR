import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { CriticidadAnomalia, EstadoAnomalia } from '../types'

export interface AnomaliaMaquinariaRow {
  id: string
  maquinaria_id: string
  linea_id: string | null
  fecha: string
  descripcion: string
  criticidad: CriticidadAnomalia
  plazo_reparacion: string | null
  responsable_id: string | null
  estado: EstadoAnomalia
  fecha_cierre: string | null
  costo: number | null
  created_at: string
  maquinariaCodigo: string
  maquinariaNombre: string
  lineaCodigo: string | null
  responsableNombre: string | null
}

interface RawRow {
  id: string
  maquinaria_id: string
  linea_id: string | null
  fecha: string
  descripcion: string
  criticidad: CriticidadAnomalia
  plazo_reparacion: string | null
  responsable_id: string | null
  estado: EstadoAnomalia
  fecha_cierre: string | null
  costo: number | null
  created_at: string
  maquinarias: { codigo: string; nombre: string | null } | null
  lineas_operacion: { codigo: string } | null
  responsable: { operadores: { nombre: string; apellido: string } | null } | null
}

interface State {
  rows: AnomaliaMaquinariaRow[]
  loading: boolean
  error: string | null
}

export function useAnomaliasMaquinaria(): State & { refetch: () => void } {
  const [state, setState] = useState<State>({ rows: [], loading: true, error: null })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setState(prev => ({ ...prev, loading: true, error: null }))
      const { data, error } = await supabase
        .from('anomalias_maquinaria')
        .select(
          `id, maquinaria_id, linea_id, fecha, descripcion, criticidad, plazo_reparacion,
           responsable_id, estado, fecha_cierre, costo, created_at,
           maquinarias(codigo, nombre),
           lineas_operacion(codigo),
           responsable:perfiles!anomalias_maquinaria_responsable_id_fkey(operadores(nombre, apellido))`,
        )
        .order('created_at', { ascending: false })

      if (cancelled) return
      if (error) {
        setState({ rows: [], loading: false, error: error.message })
        return
      }

      const raw = (data ?? []) as unknown as RawRow[]
      const rows: AnomaliaMaquinariaRow[] = raw.map(r => ({
        id: r.id,
        maquinaria_id: r.maquinaria_id,
        linea_id: r.linea_id,
        fecha: r.fecha,
        descripcion: r.descripcion,
        criticidad: r.criticidad,
        plazo_reparacion: r.plazo_reparacion,
        responsable_id: r.responsable_id,
        estado: r.estado,
        fecha_cierre: r.fecha_cierre,
        costo: r.costo,
        created_at: r.created_at,
        maquinariaCodigo: r.maquinarias?.codigo ?? '—',
        maquinariaNombre: r.maquinarias?.nombre ?? '',
        lineaCodigo: r.lineas_operacion?.codigo ?? null,
        responsableNombre: r.responsable?.operadores
          ? `${r.responsable.operadores.apellido}, ${r.responsable.operadores.nombre}`
          : null,
      }))
      setState({ rows, loading: false, error: null })
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  return { ...state, refetch: () => setReloadKey(k => k + 1) }
}
