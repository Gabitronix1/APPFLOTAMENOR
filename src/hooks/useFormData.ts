import { useCatalog } from './useCatalog'
import { fetchTable, fetchTiposPreventiva } from '../lib/masterDataCache'
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
