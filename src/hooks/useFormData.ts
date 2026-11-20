import { useCatalog } from './useCatalog'
import { fetchTable, fetchCatalog, fetchTiposPreventiva, fetchKmPatentes } from '../lib/masterDataCache'
import type { HistorialKm } from '../lib/kilometraje'
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
  kmPatentes: HistorialKm[]
  loading: boolean
}

export function useFormData(): FormDataState {
  const operadores = useCatalog<Operador>('operadores', () => fetchTable('operadores', 'apellido'))
  const patentes = useCatalog<Patente>('patentes', () => fetchTable('patentes', 'patente'))
  const fundos = useCatalog<Fundo>('fundos', () => fetchTable('fundos', 'nombre'))
  const categoriasVehiculo = useCatalog<CategoriaPatente>('categorias_vehiculo', () => fetchCatalog('categorias_vehiculo'))
  const lineasOperacion = useCatalog<LineaOperacion>('lineas_operacion', () => fetchCatalog('lineas_operacion'))
  const tiposPreventiva = useCatalog<TipoPreventiva>('tipos_preventiva', fetchTiposPreventiva)
  // No bloquea la carga del formulario: es solo una guía.
  const kmPatentes = useCatalog<HistorialKm>('km_patentes', fetchKmPatentes)

  return {
    operadores: operadores.data,
    patentes: patentes.data,
    fundos: fundos.data,
    categoriasVehiculo: categoriasVehiculo.data,
    lineasOperacion: lineasOperacion.data,
    tiposPreventiva: tiposPreventiva.data,
    kmPatentes: kmPatentes.data,
    loading:
      operadores.loading ||
      patentes.loading ||
      fundos.loading ||
      categoriasVehiculo.loading ||
      lineasOperacion.loading ||
      tiposPreventiva.loading,
  }
}
