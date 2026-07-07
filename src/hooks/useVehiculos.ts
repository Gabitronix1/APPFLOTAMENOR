import { useEffect, useMemo, useState } from 'react'
import { useInspecciones } from './useInspecciones'
import { fetchAllPages } from '../lib/fetchAllPages'
import { sumaFallasActivas } from '../lib/vehiculos'
import type { EstadoVehiculo, VInspeccion } from '../types'

export interface VehiculoResumen {
  id: string
  patente: string
  descripcion: string
  estado: EstadoVehiculo
  ultimaActividad: string | null
  fallasActivas: number
}

interface TimelineFecha {
  patente_id: string
  fecha: string
}

interface State {
  vehiculos: VehiculoResumen[]
  loading: boolean
  error: string | null
}

export function useVehiculos(): State {
  const { allInspecciones, patentes, loading: loadingBase, error } = useInspecciones()
  const [ultimaActividad, setUltimaActividad] = useState<Map<string, string>>(new Map())
  const [loadingTimeline, setLoadingTimeline] = useState(true)

  useEffect(() => {
    async function load() {
      const rows = await fetchAllPages<TimelineFecha>(
        'v_vehiculo_timeline',
        'patente_id, fecha',
        { column: 'fecha', ascending: false },
      )
      const map = new Map<string, string>()
      for (const r of rows) {
        if (!map.has(r.patente_id)) map.set(r.patente_id, r.fecha)
      }
      setUltimaActividad(map)
      setLoadingTimeline(false)
    }
    void load()
  }, [])

  const vehiculos = useMemo(() => {
    const porPatente = new Map<string, VInspeccion[]>()
    for (const insp of allInspecciones) {
      const list = porPatente.get(insp.patente) ?? []
      list.push(insp)
      porPatente.set(insp.patente, list)
    }

    return patentes.map((p): VehiculoResumen => {
      const propias = porPatente.get(p.patente) ?? []
      return {
        id: p.id,
        patente: p.patente,
        descripcion: p.descripcion,
        estado: p.estado_actual,
        ultimaActividad: ultimaActividad.get(p.id) ?? null,
        fallasActivas: sumaFallasActivas(propias),
      }
    })
  }, [allInspecciones, patentes, ultimaActividad])

  return { vehiculos, loading: loadingBase || loadingTimeline, error }
}
