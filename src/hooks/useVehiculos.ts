import { useEffect, useMemo, useState } from 'react'
import { useInspecciones } from './useInspecciones'
import { fetchAllPages } from '../lib/fetchAllPages'
import { sumaFallasActivas } from '../lib/vehiculos'
import type { CategoriaPatente, EstadoVehiculo, VInspeccion } from '../types'

export interface VehiculoResumen {
  id: string
  patente: string
  descripcion: string
  estado: EstadoVehiculo
  categoriaId: string | null
  categoriaNombre: string
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

const SIN_CATEGORIA = 'Sin categoría'

export function useVehiculos(): State {
  const { allInspecciones, patentes, loading: loadingBase, error } = useInspecciones()
  const [ultimaActividad, setUltimaActividad] = useState<Map<string, string>>(new Map())
  const [categorias, setCategorias] = useState<CategoriaPatente[]>([])
  const [loadingTimeline, setLoadingTimeline] = useState(true)

  useEffect(() => {
    async function load() {
      const [rows, categoriasRows] = await Promise.all([
        fetchAllPages<TimelineFecha>(
          'v_vehiculo_timeline',
          'patente_id, fecha',
          { column: 'fecha', ascending: false },
        ),
        fetchAllPages<CategoriaPatente>('categorias_vehiculo', '*'),
      ])
      const map = new Map<string, string>()
      for (const r of rows) {
        if (!map.has(r.patente_id)) map.set(r.patente_id, r.fecha)
      }
      setUltimaActividad(map)
      setCategorias(categoriasRows)
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
    const nombrePorCategoria = new Map(categorias.map(c => [c.id, c.nombre]))

    return patentes.map((p): VehiculoResumen => {
      const propias = porPatente.get(p.patente) ?? []
      return {
        id: p.id,
        patente: p.patente,
        descripcion: p.descripcion,
        estado: p.estado_actual,
        categoriaId: p.categoria_id,
        categoriaNombre: (p.categoria_id && nombrePorCategoria.get(p.categoria_id)) || SIN_CATEGORIA,
        ultimaActividad: ultimaActividad.get(p.id) ?? null,
        fallasActivas: sumaFallasActivas(propias),
      }
    })
  }, [allInspecciones, patentes, ultimaActividad, categorias])

  return { vehiculos, loading: loadingBase || loadingTimeline, error }
}
