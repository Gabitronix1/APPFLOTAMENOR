import { useEffect, useState } from 'react'
import { fetchAllPages } from '../lib/fetchAllPages'
import type { CategoriaMaquinaria, Maquinaria } from '../types'

export interface MaquinariaResumen {
  id: string
  codigo: string
  nombre: string
  categoriaId: string | null
  categoriaNombre: string
  estado: Maquinaria['estado_actual']
  esAditamento: boolean
  padreCodigo: string | null
}

interface State {
  maquinarias: MaquinariaResumen[]
  loading: boolean
  error: string | null
}

const SIN_CATEGORIA = 'Sin categoría'

export function useMaquinarias(): State {
  const [state, setState] = useState<State>({ maquinarias: [], loading: true, error: null })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [maquinarias, categorias] = await Promise.all([
          fetchAllPages<Maquinaria>('maquinarias', '*', { column: 'codigo', ascending: true }),
          fetchAllPages<CategoriaMaquinaria>('categorias_maquinaria', '*'),
        ])
        const nombrePorCategoria = new Map(categorias.map(c => [c.id, c.nombre]))
        const codigoPorId = new Map(maquinarias.map(m => [m.id, m.codigo]))

        const resumen: MaquinariaResumen[] = maquinarias
          .filter(m => m.activo)
          .map(m => ({
            id: m.id,
            codigo: m.codigo,
            nombre: m.nombre,
            categoriaId: m.categoria_id,
            categoriaNombre: (m.categoria_id && nombrePorCategoria.get(m.categoria_id)) || SIN_CATEGORIA,
            estado: m.estado_actual,
            esAditamento: !!m.maquinaria_padre_id,
            padreCodigo: (m.maquinaria_padre_id && codigoPorId.get(m.maquinaria_padre_id)) || null,
          }))

        if (!cancelled) setState({ maquinarias: resumen, loading: false, error: null })
      } catch (e) {
        if (!cancelled) {
          setState({ maquinarias: [], loading: false, error: e instanceof Error ? e.message : 'Error desconocido' })
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
