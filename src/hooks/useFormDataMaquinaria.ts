import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
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
  const [state, setState] = useState<FormDataMaquinariaState>({
    operadores: [],
    maquinarias: [],
    lineas: [],
    turnos: [],
    actividades: [],
    subEquipos: [],
    tiposPreventiva: [],
    sistemasCorrectivo: [],
    codigosFalla: [],
    tareasOtra: [],
    productosInsumo: [],
    condicionesEquipo: [],
    loading: true,
  })

  useEffect(() => {
    async function load() {
      const [
        opRes,
        maqRes,
        lineaRes,
        turnoRes,
        actividadRes,
        subEquipoRes,
        tipoPrevRes,
        sistemaRes,
        codigoFallaRes,
        tareaRes,
        productoRes,
        condicionRes,
      ] = await Promise.all([
        supabase.from('operadores').select('*').eq('activo', true).order('apellido', { ascending: true }),
        supabase.from('maquinarias').select('*').eq('activo', true).order('codigo', { ascending: true }),
        supabase.from('lineas_operacion').select('*').order('codigo', { ascending: true }),
        supabase.from('turnos').select('*').order('nombre', { ascending: true }),
        supabase.from('actividades_maquinaria').select('*').order('nombre', { ascending: true }),
        supabase.from('sub_equipos').select('*').order('nombre', { ascending: true }),
        supabase.from('tipos_preventiva_maquinaria').select('*').order('nombre', { ascending: true }),
        supabase.from('sistemas_correctivo_maquinaria').select('*').order('nombre', { ascending: true }),
        supabase.from('codigos_falla_maquinaria').select('id, codigo, descripcion, sistema_id').order('codigo', { ascending: true }),
        supabase.from('tareas_otra_maquinaria').select('*').order('nombre', { ascending: true }),
        supabase.from('productos_insumo').select('*').order('nombre', { ascending: true }),
        supabase.from('condiciones_equipo').select('*').order('nombre', { ascending: true }),
      ])

      const codigosFallaRaw = (codigoFallaRes.data ?? []) as unknown as {
        id: number
        codigo: string
        descripcion: string | null
        sistema_id: number | null
      }[]

      setState({
        operadores: (opRes.data ?? []) as unknown as Operador[],
        maquinarias: (maqRes.data ?? []) as unknown as Maquinaria[],
        lineas: (lineaRes.data ?? []) as unknown as LineaOperacion[],
        turnos: (turnoRes.data ?? []) as unknown as Turno[],
        actividades: (actividadRes.data ?? []) as unknown as ActividadMaquinaria[],
        subEquipos: (subEquipoRes.data ?? []) as unknown as SubEquipo[],
        tiposPreventiva: (tipoPrevRes.data ?? []) as unknown as TipoPreventivaMaquinaria[],
        sistemasCorrectivo: (sistemaRes.data ?? []) as unknown as SistemaCorrectivoMaquinaria[],
        codigosFalla: codigosFallaRaw.map(c => ({
          id: String(c.id),
          codigo: c.codigo,
          descripcion: c.descripcion,
          sistema_id: c.sistema_id != null ? String(c.sistema_id) : null,
          nombre: c.descripcion ? `${c.codigo} — ${c.descripcion}` : c.codigo,
        })),
        tareasOtra: (tareaRes.data ?? []) as unknown as TareaOtraMaquinaria[],
        productosInsumo: (productoRes.data ?? []) as unknown as ProductoInsumo[],
        condicionesEquipo: (condicionRes.data ?? []) as unknown as CondicionEquipo[],
        loading: false,
      })
    }
    void load()
  }, [])

  return state
}
