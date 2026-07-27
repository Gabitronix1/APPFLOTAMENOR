import { useCatalog } from './useCatalog'
import { fetchTable, fetchCatalog, fetchCodigosFalla } from '../lib/masterDataCache'
import type {
  ActividadMaquinaria,
  CodigoFallaMaquinaria,
  CondicionEquipo,
  LineaOperacion,
  Maquinaria,
  Operador,
  ProductoInsumo,
  SistemaCorrectivoMaquinaria,
  SubEquipo,
  TareaOtraMaquinaria,
  TipoPreventivaMaquinaria,
  Turno,
} from '../types'

interface FormDataMaquinariaState {
  operadores: Operador[]
  maquinarias: Maquinaria[]
  lineas: LineaOperacion[]
  turnos: Turno[]
  actividades: ActividadMaquinaria[]
  subEquipos: SubEquipo[]
  tiposPreventiva: TipoPreventivaMaquinaria[]
  sistemasCorrectivo: SistemaCorrectivoMaquinaria[]
  codigosFalla: CodigoFallaMaquinaria[]
  tareasOtra: TareaOtraMaquinaria[]
  productosInsumo: ProductoInsumo[]
  condicionesEquipo: CondicionEquipo[]
  loading: boolean
}

export function useFormDataMaquinaria(): FormDataMaquinariaState {
  const operadores = useCatalog<Operador>('operadores', () => fetchTable('operadores', 'apellido'))
  const maquinarias = useCatalog<Maquinaria>('maquinarias', () => fetchTable('maquinarias', 'codigo'))
  const lineas = useCatalog<LineaOperacion>('lineas_operacion', () => fetchCatalog('lineas_operacion'))
  const turnos = useCatalog<Turno>('turnos', () => fetchCatalog('turnos'))
  const actividades = useCatalog<ActividadMaquinaria>('actividades_maquinaria', () => fetchCatalog('actividades_maquinaria'))
  const subEquipos = useCatalog<SubEquipo>('sub_equipos', () => fetchCatalog('sub_equipos'))
  const tiposPreventiva = useCatalog<TipoPreventivaMaquinaria>('tipos_preventiva_maquinaria', () =>
    fetchCatalog('tipos_preventiva_maquinaria'),
  )
  const sistemasCorrectivo = useCatalog<SistemaCorrectivoMaquinaria>('sistemas_correctivo_maquinaria', () =>
    fetchCatalog('sistemas_correctivo_maquinaria'),
  )
  const codigosFalla = useCatalog<CodigoFallaMaquinaria>('codigos_falla_maquinaria', () => fetchCodigosFalla())
  const tareasOtra = useCatalog<TareaOtraMaquinaria>('tareas_otra_maquinaria', () => fetchCatalog('tareas_otra_maquinaria'))
  const productosInsumo = useCatalog<ProductoInsumo>('productos_insumo', () => fetchCatalog('productos_insumo'))
  const condicionesEquipo = useCatalog<CondicionEquipo>('condiciones_equipo', () => fetchCatalog('condiciones_equipo'))

  const loading = [
    operadores, maquinarias, lineas, turnos, actividades, subEquipos,
    tiposPreventiva, sistemasCorrectivo, codigosFalla, tareasOtra, productosInsumo, condicionesEquipo,
  ].some(c => c.loading)

  return {
    operadores: operadores.data,
    maquinarias: maquinarias.data,
    lineas: lineas.data,
    turnos: turnos.data,
    actividades: actividades.data,
    subEquipos: subEquipos.data,
    tiposPreventiva: tiposPreventiva.data,
    sistemasCorrectivo: sistemasCorrectivo.data,
    codigosFalla: codigosFalla.data,
    tareasOtra: tareasOtra.data,
    productosInsumo: productosInsumo.data,
    condicionesEquipo: condicionesEquipo.data,
    loading,
  }
}
