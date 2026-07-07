import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { combinarDocumentos } from '../lib/documentos'
import type { DocumentoVencimiento, TipoDocumento, VDocumentoVencimiento } from '../types'

interface State {
  documentos: DocumentoVencimiento[]
  loading: boolean
  error: string | null
}

export function useDocumentosVehiculo(
  patenteId: string | undefined,
  patente: string | undefined,
): State & { refetch: () => void } {
  const [state, setState] = useState<State>({ documentos: [], loading: true, error: null })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!patenteId || !patente) return
    let cancelled = false

    async function load() {
      setState(prev => ({ ...prev, loading: true, error: null }))
      try {
        const [tiposRes, vencRes] = await Promise.all([
          supabase.from('tipos_documento').select('*').order('nombre', { ascending: true }),
          supabase.from('v_documentos_vencimientos').select('*').eq('patente_id', patenteId as string),
        ])
        if (tiposRes.error) throw tiposRes.error
        if (vencRes.error) throw vencRes.error

        const documentos = combinarDocumentos(
          [{ id: patenteId as string, patente: patente as string }],
          (tiposRes.data ?? []) as unknown as TipoDocumento[],
          (vencRes.data ?? []) as unknown as VDocumentoVencimiento[],
        )

        if (!cancelled) setState({ documentos, loading: false, error: null })
      } catch (e) {
        if (!cancelled) {
          setState({
            documentos: [],
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
  }, [patenteId, patente, reloadKey])

  return { ...state, refetch: () => setReloadKey(k => k + 1) }
}
