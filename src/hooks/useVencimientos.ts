import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchAllPages } from '../lib/fetchAllPages'
import { combinarDocumentos } from '../lib/documentos'
import type { DocumentoVencimiento, Patente, TipoDocumento, VDocumentoVencimiento } from '../types'

interface State {
  documentos: DocumentoVencimiento[]
  loading: boolean
  error: string | null
}

export function useVencimientos(): State & { refetch: () => void } {
  const [state, setState] = useState<State>({ documentos: [], loading: true, error: null })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setState(prev => ({ ...prev, loading: true, error: null }))
      try {
        const [patRes, tipRes, vencimientos] = await Promise.all([
          supabase.from('patentes').select('id, patente').eq('activo', true).order('patente', { ascending: true }),
          supabase.from('tipos_documento').select('*').order('nombre', { ascending: true }),
          fetchAllPages<VDocumentoVencimiento>('v_documentos_vencimientos', '*'),
        ])
        if (patRes.error) throw patRes.error
        if (tipRes.error) throw tipRes.error

        const documentos = combinarDocumentos(
          (patRes.data ?? []) as unknown as Pick<Patente, 'id' | 'patente'>[],
          (tipRes.data ?? []) as unknown as TipoDocumento[],
          vencimientos,
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
  }, [reloadKey])

  return { ...state, refetch: () => setReloadKey(k => k + 1) }
}
