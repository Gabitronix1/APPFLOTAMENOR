import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Operador, Patente, Fundo } from '../types'

export interface TipoPreventiva {
  id: string
  nombre: string
}

interface FormDataState {
  operadores: Operador[]
  patentes: Patente[]
  fundos: Fundo[]
  tiposPreventiva: TipoPreventiva[]
  loading: boolean
}

export function useFormData(): FormDataState {
  const [state, setState] = useState<FormDataState>({
    operadores: [],
    patentes: [],
    fundos: [],
    tiposPreventiva: [],
    loading: true,
  })

  useEffect(() => {
    async function load() {
      const [opRes, patRes, funRes, tipRes] = await Promise.all([
        supabase.from('operadores').select('*').eq('activo', true).order('apellido', { ascending: true }),
        supabase.from('patentes').select('*').eq('activo', true).order('patente', { ascending: true }),
        supabase.from('fundos').select('*').eq('activo', true).order('nombre', { ascending: true }),
        supabase.from('tipos_preventiva').select('*').order('nombre', { ascending: true }),
      ])
      setState({
        operadores: (opRes.data ?? []) as unknown as Operador[],
        patentes: (patRes.data ?? []) as unknown as Patente[],
        fundos: (funRes.data ?? []) as unknown as Fundo[],
        tiposPreventiva: (tipRes.data ?? []) as unknown as TipoPreventiva[],
        loading: false,
      })
    }
    void load()
  }, [])

  return state
}
