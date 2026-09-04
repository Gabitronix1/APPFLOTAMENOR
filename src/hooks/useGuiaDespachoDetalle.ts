import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { GuiaDespacho, GuiaDespachoConDatos, GuiaDespachoItemConDatos } from '../types'

interface GuiaRow extends GuiaDespacho {
  fundos: { nombre: string } | null
  patentes: { patente: string } | null
  operadores: { nombre: string; apellido: string } | null
}

interface ItemRow {
  id: string
  guia_id: string
  producto_id: string
  equipo_id: string | null
  cantidad_planificada: number
  cantidad_enviada: number | null
  cantidad_recibida: number | null
  cantidad_devuelta: number | null
  observacion: string | null
  orden: number | null
  productos_insumo: { nombre: string } | null
  maquinarias: { codigo: string; nombre: string } | null
}

interface State {
  guia: GuiaDespachoConDatos | null
  items: GuiaDespachoItemConDatos[]
  loading: boolean
  error: string | null
  notFound: boolean
}

export function useGuiaDespachoDetalle(id: string | undefined): State & { refetch: () => void } {
  const [state, setState] = useState<State>({ guia: null, items: [], loading: true, error: null, notFound: false })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!id) return
    const guiaId = id
    let cancelled = false

    async function load() {
      setState(prev => ({ ...prev, loading: true, error: null, notFound: false }))

      const { data: guiaRow, error: guiaErr } = await supabase
        .from('guias_despacho')
        .select('*, fundos(nombre), patentes(patente), operadores(nombre, apellido)')
        .eq('id', guiaId)
        .maybeSingle()
      if (cancelled) return
      if (guiaErr) {
        setState(prev => ({ ...prev, loading: false, error: guiaErr.message }))
        return
      }
      if (!guiaRow) {
        setState(prev => ({ ...prev, loading: false, notFound: true }))
        return
      }

      const { data: itemsRows, error: itemsErr } = await supabase
        .from('guias_despacho_items')
        .select('*, productos_insumo(nombre), maquinarias(codigo, nombre)')
        .eq('guia_id', guiaId)
        .order('orden', { ascending: true })
      if (cancelled) return
      if (itemsErr) {
        setState(prev => ({ ...prev, loading: false, error: itemsErr.message }))
        return
      }

      const { fundos, patentes, operadores, ...guia } = guiaRow as unknown as GuiaRow
      const items: GuiaDespachoItemConDatos[] = ((itemsRows ?? []) as unknown as ItemRow[]).map(row => {
        const { productos_insumo, maquinarias, ...item } = row
        return {
          ...item,
          producto: productos_insumo?.nombre ?? '—',
          equipo: maquinarias ? `${maquinarias.codigo} — ${maquinarias.nombre}` : null,
        }
      })

      setState({
        guia: {
          ...guia,
          fundo: fundos?.nombre ?? '—',
          patente: patentes?.patente ?? null,
          conductor: operadores ? `${operadores.apellido}, ${operadores.nombre}` : null,
        },
        items,
        loading: false,
        error: null,
        notFound: false,
      })
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [id, reloadKey])

  return { ...state, refetch: () => setReloadKey(k => k + 1) }
}
