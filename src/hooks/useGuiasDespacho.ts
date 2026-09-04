import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { EstadoGuiaDespacho, GuiaDespacho, GuiaDespachoConDatos } from '../types'

interface GuiaRow extends GuiaDespacho {
  fundos: { nombre: string } | null
  patentes: { patente: string } | null
  operadores: { nombre: string; apellido: string } | null
}

interface State {
  guias: GuiaDespachoConDatos[]
  loading: boolean
  error: string | null
}

function mapRow(row: GuiaRow): GuiaDespachoConDatos {
  const { fundos, patentes, operadores, ...guia } = row
  return {
    ...guia,
    fundo: fundos?.nombre ?? '—',
    patente: patentes?.patente ?? null,
    conductor: operadores ? `${operadores.apellido}, ${operadores.nombre}` : null,
  }
}

export function useGuiasDespacho(): State & { refetch: () => void } {
  const [state, setState] = useState<State>({ guias: [], loading: true, error: null })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setState(prev => ({ ...prev, loading: true, error: null }))
      const { data, error } = await supabase
        .from('guias_despacho')
        .select('*, fundos(nombre), patentes(patente), operadores(nombre, apellido)')
        .order('folio', { ascending: false })

      if (cancelled) return
      if (error) {
        setState({ guias: [], loading: false, error: error.message })
        return
      }
      setState({ guias: ((data ?? []) as unknown as GuiaRow[]).map(mapRow), loading: false, error: null })
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  return { ...state, refetch: () => setReloadKey(k => k + 1) }
}

export const ESTADOS_GUIA_FILTRO: { value: EstadoGuiaDespacho | 'todas'; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'despachada', label: 'Despachada' },
  { value: 'recibida', label: 'Recibida' },
  { value: 'cerrada', label: 'Cerrada' },
  { value: 'cancelada', label: 'Cancelada' },
]
