import { useCatalog } from './useCatalog'
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

async function fetchTable<T>(table: string, orderBy: string): Promise<T[]> {
  const { data } = await supabase.from(table).select('*').eq('activo', true).order(orderBy, { ascending: true })
  return (data ?? []) as unknown as T[]
}

async function fetchTiposPreventiva(): Promise<TipoPreventiva[]> {
  const { data } = await supabase.from('tipos_preventiva').select('*').order('nombre', { ascending: true })
  return (data ?? []) as unknown as TipoPreventiva[]
}

export function useFormData(): FormDataState {
  const operadores = useCatalog<Operador>('operadores', () => fetchTable('operadores', 'apellido'))
  const patentes = useCatalog<Patente>('patentes', () => fetchTable('patentes', 'patente'))
  const fundos = useCatalog<Fundo>('fundos', () => fetchTable('fundos', 'nombre'))
  const tiposPreventiva = useCatalog<TipoPreventiva>('tipos_preventiva', fetchTiposPreventiva)

  return {
    operadores: operadores.data,
    patentes: patentes.data,
    fundos: fundos.data,
    tiposPreventiva: tiposPreventiva.data,
    loading: operadores.loading || patentes.loading || fundos.loading || tiposPreventiva.loading,
  }
}
