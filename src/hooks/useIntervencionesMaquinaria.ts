import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchAllPages } from '../lib/fetchAllPages'
import type {
  ActividadMaquinaria,
  CategoriaMaquinaria,
  CondicionEquipo,
  EstadoMaquinaria,
  InsumoIntervencionMaquinaria,
  IntervencionMaquinariaCabecera,
  IntervencionMaquinariaCorrectiva,
  IntervencionMaquinariaOtra,
  IntervencionMaquinariaPreventiva,
  LineaOperacion,
  Maquinaria,
  Operador,
  ProductoInsumo,
  SistemaCorrectivoMaquinaria,
  TareaOtraMaquinaria,
  TipoIntervencionMaquinaria,
  TipoPreventivaMaquinaria,
  Turno,
} from '../types'

export interface IntervencionMaquinariaCompleta {
  id: string
  fecha: string
  horaInicio: string
  horometro: number | null
  tipo: TipoIntervencionMaquinaria
  maquinariaId: string
  maquinariaCodigo: string
  maquinariaNombre: string
  categoria: string
  responsableId: string
  responsableNombre: string
  lineaCodigo: string | null
  turnoNombre: string | null
  actividadNombre: string | null
  subEquipoNombre: string | null
  sistemaNombre: string | null
  descripcionFalla: string | null
  causaProbable: string | null
  solucionPropuesta: string | null
  tipoPreventivaNombre: string | null
  tareaNombre: string | null
  descripcion: string | null
  fechaTermino: string | null
  condicionNombre: string | null
  condicionEstado: EstadoMaquinaria | null
  costo: number | null
  insumos: { nombre: string; cantidad: number }[]
}

export interface TimelineEvento {
  maquinariaId: string
  fecha: string
}

const SIN_CATEGORIA = 'Sin categoría'

interface State {
  intervenciones: IntervencionMaquinariaCompleta[]
  maquinarias: Maquinaria[]
  categorias: CategoriaMaquinaria[]
  lineas: LineaOperacion[]
  turnos: Turno[]
  actividades: ActividadMaquinaria[]
  responsables: Operador[]
  timeline: TimelineEvento[]
  loading: boolean
  error: string | null
}

export function useIntervencionesMaquinaria(): State {
  const [state, setState] = useState<State>({
    intervenciones: [],
    maquinarias: [],
    categorias: [],
    lineas: [],
    turnos: [],
    actividades: [],
    responsables: [],
    timeline: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [
          maquinariasData,
          categoriasData,
          lineasData,
          turnosData,
          actividadesData,
          subEquiposData,
          responsablesData,
          sistemasData,
          condicionesData,
          tiposPreventivaData,
          tareasData,
          productosData,
          cabecerasData,
          correctivasData,
          preventivasData,
          otrasData,
          insumosData,
          timelineRes,
        ] = await Promise.all([
          fetchAllPages<Maquinaria>('maquinarias', '*', { column: 'codigo', ascending: true }),
          fetchAllPages<CategoriaMaquinaria>('categorias_maquinaria', '*'),
          fetchAllPages<LineaOperacion>('lineas_operacion', '*', { column: 'codigo', ascending: true }),
          fetchAllPages<Turno>('turnos', '*'),
          fetchAllPages<ActividadMaquinaria>('actividades_maquinaria', '*'),
          fetchAllPages<{ id: string; nombre: string }>('sub_equipos', '*'),
          fetchAllPages<Operador>('operadores', '*'),
          fetchAllPages<SistemaCorrectivoMaquinaria>('sistemas_correctivo_maquinaria', '*'),
          fetchAllPages<CondicionEquipo>('condiciones_equipo', '*'),
          fetchAllPages<TipoPreventivaMaquinaria>('tipos_preventiva_maquinaria', '*'),
          fetchAllPages<TareaOtraMaquinaria>('tareas_otra_maquinaria', '*'),
          fetchAllPages<ProductoInsumo>('productos_insumo', '*'),
          fetchAllPages<IntervencionMaquinariaCabecera>('intervenciones_maquinaria', '*', { column: 'fecha_inicio', ascending: false }),
          fetchAllPages<IntervencionMaquinariaCorrectiva>('intervencion_maquinaria_correctiva', '*'),
          fetchAllPages<IntervencionMaquinariaPreventiva>('intervencion_maquinaria_preventiva', '*'),
          fetchAllPages<IntervencionMaquinariaOtra>('intervencion_maquinaria_otra', '*'),
          fetchAllPages<InsumoIntervencionMaquinaria>('insumos_intervencion_maquinaria', '*'),
          supabase.from('v_maquinaria_timeline').select('maquinaria_id, fecha'),
        ])
        if (timelineRes.error) throw timelineRes.error

        const categoriaPorId = new Map(categoriasData.map(c => [c.id, c.nombre]))
        const maquinariaPorId = new Map(maquinariasData.map(m => [m.id, m]))
        const lineaPorId = new Map(lineasData.map(l => [l.id, l.codigo]))
        const turnoPorId = new Map(turnosData.map(t => [t.id, t.nombre]))
        const actividadPorId = new Map(actividadesData.map(a => [a.id, a.nombre]))
        const subEquipoPorId = new Map(subEquiposData.map(s => [s.id, s.nombre]))
        const responsablePorId = new Map(responsablesData.map(o => [o.id, `${o.apellido}, ${o.nombre}`]))
        const sistemaPorId = new Map(sistemasData.map(s => [s.id, s.nombre]))
        const condicionPorId = new Map(condicionesData.map(c => [c.id, c]))
        const tipoPreventivaPorId = new Map(tiposPreventivaData.map(t => [t.id, t.nombre]))
        const tareaPorId = new Map(tareasData.map(t => [t.id, t.nombre]))
        const productoPorId = new Map(productosData.map(p => [p.id, p.nombre]))

        const correctivaPorIntervencion = new Map(correctivasData.map(c => [c.intervencion_id, c]))
        const preventivaPorIntervencion = new Map(preventivasData.map(p => [p.intervencion_id, p]))
        const otraPorIntervencion = new Map(otrasData.map(o => [o.intervencion_id, o]))
        const insumosPorIntervencion = new Map<string, { nombre: string; cantidad: number }[]>()
        insumosData.forEach(i => {
          const list = insumosPorIntervencion.get(i.intervencion_id) ?? []
          list.push({ nombre: (i.producto_id && productoPorId.get(i.producto_id)) || '—', cantidad: i.cantidad })
          insumosPorIntervencion.set(i.intervencion_id, list)
        })

        const intervenciones: IntervencionMaquinariaCompleta[] = cabecerasData.map(c => {
          const maq = maquinariaPorId.get(c.maquinaria_id)
          const correctiva = correctivaPorIntervencion.get(c.id) ?? null
          const preventiva = preventivaPorIntervencion.get(c.id) ?? null
          const otra = otraPorIntervencion.get(c.id) ?? null
          const condicionId = correctiva?.condicion_equipo_id ?? preventiva?.condicion_equipo_id ?? otra?.condicion_equipo_id ?? null
          const condicion = condicionId ? condicionPorId.get(condicionId) : undefined

          return {
            id: c.id,
            fecha: c.fecha_inicio,
            horaInicio: c.hora_inicio,
            horometro: c.horometro,
            tipo: c.tipo,
            maquinariaId: c.maquinaria_id,
            maquinariaCodigo: maq?.codigo ?? '—',
            maquinariaNombre: maq?.nombre ?? '—',
            categoria: (maq?.categoria_id && categoriaPorId.get(maq.categoria_id)) || SIN_CATEGORIA,
            responsableId: c.responsable_id,
            responsableNombre: responsablePorId.get(c.responsable_id) ?? '—',
            lineaCodigo: c.linea_id ? lineaPorId.get(c.linea_id) ?? null : null,
            turnoNombre: c.turno_id ? turnoPorId.get(c.turno_id) ?? null : null,
            actividadNombre: c.actividad_id ? actividadPorId.get(c.actividad_id) ?? null : null,
            subEquipoNombre: c.sub_equipo_id ? subEquipoPorId.get(c.sub_equipo_id) ?? null : null,
            sistemaNombre: correctiva?.sistema_id ? sistemaPorId.get(correctiva.sistema_id) ?? null : null,
            descripcionFalla: correctiva?.descripcion_falla ?? null,
            causaProbable: correctiva?.causa_probable ?? null,
            solucionPropuesta: correctiva?.solucion_propuesta ?? null,
            tipoPreventivaNombre: preventiva?.tipo_preventiva_id ? tipoPreventivaPorId.get(preventiva.tipo_preventiva_id) ?? null : null,
            tareaNombre: otra?.tarea_id ? tareaPorId.get(otra.tarea_id) ?? null : null,
            descripcion: preventiva?.descripcion ?? otra?.descripcion ?? null,
            fechaTermino: correctiva?.fecha_termino ?? preventiva?.fecha_termino ?? otra?.fecha_termino ?? null,
            condicionNombre: condicion?.nombre ?? null,
            condicionEstado: condicion?.mapea_estado ?? null,
            costo: correctiva?.costo ?? preventiva?.costo ?? otra?.costo ?? null,
            insumos: insumosPorIntervencion.get(c.id) ?? [],
          }
        })

        const timeline: TimelineEvento[] = ((timelineRes.data ?? []) as unknown as { maquinaria_id: string; fecha: string }[])
          .map(t => ({ maquinariaId: t.maquinaria_id, fecha: t.fecha }))

        if (!cancelled) {
          setState({
            intervenciones,
            maquinarias: maquinariasData,
            categorias: categoriasData,
            lineas: lineasData,
            turnos: turnosData,
            actividades: actividadesData,
            responsables: responsablesData,
            timeline,
            loading: false,
            error: null,
          })
        }
      } catch (e) {
        if (!cancelled) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: e instanceof Error ? e.message : 'Error desconocido',
          }))
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
