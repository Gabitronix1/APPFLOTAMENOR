import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { EstadoGuiaDespacho } from '../types'

interface ItemConEstado {
  cantidad_enviada: number | null
  cantidad_recibida: number | null
  guias_despacho: { estado: EstadoGuiaDespacho } | { estado: EstadoGuiaDespacho }[] | null
}

export interface GuiasDespachoKpis {
  // % de guías (no canceladas) que ya salieron de bodega (despachada/recibida/cerrada).
  pctGuiasDespachadas: number | null
  // % de las guías despachadas que efectivamente llegaron a confirmarse en faena (recibida/cerrada).
  pctGuiasEntregadasExito: number | null
  // % de las unidades enviadas que llegaron confirmadas en faena, sobre las guías ya recibidas/cerradas.
  pctProductosEntregadosExito: number | null
}

const GUIAS_LLEGADAS: EstadoGuiaDespacho[] = ['recibida', 'cerrada']

export function useGuiasDespachoKpis(): { kpis: GuiasDespachoKpis; loading: boolean; error: string | null } {
  const [kpis, setKpis] = useState<GuiasDespachoKpis>({
    pctGuiasDespachadas: null,
    pctGuiasEntregadasExito: null,
    pctProductosEntregadosExito: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const { data: guias, error: guiasErr } = await supabase.from('guias_despacho').select('estado')
      if (cancelled) return
      if (guiasErr) {
        setLoading(false)
        setError(guiasErr.message)
        return
      }

      const { data: items, error: itemsErr } = await supabase
        .from('guias_despacho_items')
        .select('cantidad_enviada, cantidad_recibida, guias_despacho!inner(estado)')
      if (cancelled) return
      if (itemsErr) {
        setLoading(false)
        setError(itemsErr.message)
        return
      }

      const guiasRows = (guias ?? []) as { estado: EstadoGuiaDespacho }[]
      const base = guiasRows.filter(g => g.estado !== 'cancelada')
      const despachadas = base.filter(g => g.estado !== 'borrador')
      const entregadas = base.filter(g => GUIAS_LLEGADAS.includes(g.estado))

      let totalEnviado = 0
      let totalRecibido = 0
      for (const item of (items ?? []) as unknown as ItemConEstado[]) {
        const guia = Array.isArray(item.guias_despacho) ? item.guias_despacho[0] : item.guias_despacho
        if (!guia || !GUIAS_LLEGADAS.includes(guia.estado)) continue
        totalEnviado += item.cantidad_enviada ?? 0
        totalRecibido += item.cantidad_recibida ?? 0
      }

      setKpis({
        pctGuiasDespachadas: base.length > 0 ? despachadas.length / base.length : null,
        pctGuiasEntregadasExito: despachadas.length > 0 ? entregadas.length / despachadas.length : null,
        pctProductosEntregadosExito: totalEnviado > 0 ? totalRecibido / totalEnviado : null,
      })
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return { kpis, loading, error }
}
