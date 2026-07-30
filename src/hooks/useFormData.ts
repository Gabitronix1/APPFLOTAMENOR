import { useCatalog } from './useCatalog'
import { fetchTable, fetchCatalog, fetchTiposPreventiva } from '../lib/masterDataCache'
import type { Operador, Patente, Fundo, CategoriaPatente, LineaOperacion } from '../types'

export interface TipoPreventiva {
  id: string
  nombre: string
}

interface FormDataState {
  operadores: Operador[]
  patentes: Patente[]
  fundos: Fundo[]
  categoriasVehiculo: CategoriaPatente[]
  lineasOperacion: LineaOperacion[]
  tiposPreventiva: TipoPreventiva[]
  loading: boolean
}

export function useFormData(): FormDataState {
  const operadores = useCatalog<Operador>('operadores', () => fetchTable('operadores', 'apellido'))
  const patentes = useCatalog<Patente>('patentes', () => fetchTable('patentes', 'patente'))
  const fundos = useCatalog<Fundo>('fundos', () => fetchTable('fundos', 'nombre'))
  const categoriasVehiculo = useCatalog<CategoriaPatente>('categorias_vehiculo', () => fetchCatalog('categorias_vehiculo'))
  const lineasOperacion = useCatalog<LineaOperacion>('lineas_operacion', () => fetchCatalog('lineas_operacion'))
  const tiposPreventiva = useCatalog<TipoPreventiva>('tipos_preventiva', fetchTiposPreventiva)

  return {
    operadores: operadores.data,
    patentes: patentes.data,
    fundos: fundos.data,
    categoriasVehiculo: categoriasVehiculo.data,
    lineasOperacion: lineasOperacion.data,
    tiposPreventiva: tiposPreventiva.data,
    loading:
      operadores.loading ||
      patentes.loading ||
      fundos.loading ||
      categoriasVehiculo.loading ||
      lineasOperacion.loading ||
      tiposPreventiva.loading,
  }
}
