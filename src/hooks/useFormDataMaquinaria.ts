import { useCatalog } from './useCatalog'
import { fetchTable } from '../lib/masterDataCache'
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
  const lineas = useCatalog<LineaOperacion>('lineas_operacion', () => fetchTable('lineas_operacion', 'codigo'))
  const turnos = useCatalog<Turno>('turnos', () => fetchTable('turnos', 'nombre'))
  const actividades = useCatalog<ActividadMaquinaria>('actividades_maquinaria', () => fetchTable('actividades_maquinaria', 'nombre'))
  const subEquipos = useCatalog<SubEquipo>('sub_equipos', () => fetchTable('sub_equipos', 'nombre'))
  const tiposPreventiva = useCatalog<TipoPreventivaMaquinaria>('tipos_preventiva_maquinaria', () =>
    fetchTable('tipos_preventiva_maquinaria', 'nombre'),
  )
  const sistemasCorrectivo = useCatalog<SistemaCorrectivoMaquinaria>('sistemas_correctivo_maquinaria', () =>
    fetchTable('sistemas_correctivo_maquinaria', 'nombre'),
  )
  const codigosFalla = useCatalog<CodigoFallaMaquinaria>('codigos_falla_maquinaria', () => fetchTable('codigos_falla_maquinaria', 'nombre'))
  const tareasOtra = useCatalog<TareaOtraMaquinaria>('tareas_otra_maquinaria', () => fetchTable('tareas_otra_maquinaria', 'nombre'))
  const productosInsumo = useCatalog<ProductoInsumo>('productos_insumo', () => fetchTable('productos_insumo', 'nombre'))
  const condicionesEquipo = useCatalog<CondicionEquipo>('condiciones_equipo', () => fetchTable('condiciones_equipo', 'nombre'))

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
