import { useMemo } from 'react'
import { PREGUNTAS } from '../lib/constants'
import {
  CONDICIONES, DIA_MS, calcularEstadoVivo, diaLocal, diasEntre, inicioDia, kmRecorridos, metricasPeriodo,
  ordenarPorGravedad, pct, porVehiculo, resumenOT, sumarDias,
} from '../lib/gestionFlota'
import type {
  Condicion, EstadoVivo, Inspeccion, ItemEstado, MetricasPeriodo, OTRow, ResumenOT, Vehiculo,
} from '../lib/gestionFlota'
import type { FiltrosGestion } from './useFiltrosGestion'

export interface Rango {
  desde: string
  hasta: string
  dias: number
  desdeTs: number
  hastaTs: number
}

export interface FallaSinReparar {
  ev: EstadoVivo
  idx: number
  item: ItemEstado
  diasAbierta: number
}

export interface FilaContrato {
  contrato: string
  vehiculos: number
  conChecklist: number
  cobertura: number
  checklist: number
  pctConFalla: number
  detencion: number
  restriccion: number
  sinChecklist: number
  fallasVigentes: number
}

export interface FilaConductor {
  id: string
  conductor: string
  checklist: number
  vehiculos: number
  dias: number
  ultimo: string
  pctConFalla: number
  fallas: number
}

export interface PuntoTendencia {
  clave: string
  etiqueta: string
  sinFalla: number
  conFalla: number
  pctConFalla: number | null
  cobertura: number
  km: number
}

export type CeldaCalendario = 0 | 1 | 2 | 3 // sin checklist / OK / con falla P / con falla D

export interface Opciones {
  contratos: string[]
  categorias: string[]
  propiedades: string[]
  estados: string[]
  patentes: string[]
  conductores: { id: string; nombre: string }[]
}

export interface Tablero {
  hoy: string
  rango: Rango
  rangoAnterior: Rango | null
  opciones: Opciones
  // Ahora (estado vivo)
  estados: EstadoVivo[] // vehículos filtrados, ordenados por gravedad
  conteoCondicion: Record<Condicion, number>
  totalVehiculos: number
  esperados: number // vehículos en servicio (se espera checklist)
  checklistHoy: number
  sinChecklist: EstadoVivo[]
  fallasVigentes: number
  fallasVigentesD: number
  detencion: EstadoVivo[]
  sinReparar: FallaSinReparar[]
  // Período
  inspecciones: Inspeccion[]
  metricas: MetricasPeriodo
  metricasAnterior: MetricasPeriodo | null
  porItem: { idx: number; label: string; fallas: number; revisiones: number; tasa: number }[]
  antiguedad: { rango: string; P: number; D: number }[]
  porContrato: FilaContrato[]
  porConductor: FilaConductor[]
  tendencia: PuntoTendencia[]
  tendenciaSemanal: boolean
  calendario: { dias: string[]; filas: { ev: EstadoVivo; celdas: CeldaCalendario[] }[] }
  ot: ResumenOT
  historial: Map<string, Inspeccion[]>
  vehiculoPorId: Map<string, Vehiculo>
  estadoPorId: Map<string, EstadoVivo>
}

function uniq(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))
}

function rangoDesde(desde: string, hasta: string): Rango {
  return {
    desde,
    hasta,
    dias: diasEntre(desde, hasta) + 1,
    desdeTs: inicioDia(desde),
    hastaTs: inicioDia(sumarDias(hasta, 1)),
  }
}

// Lunes de la semana del día dado.
function lunes(dia: string): string {
  const d = new Date(`${dia}T12:00:00`)
  return sumarDias(dia, -((d.getDay() + 6) % 7))
}

export function useTableroGestion(
  vehiculosTodos: Vehiculo[],
  inspTodas: Inspeccion[],
  ots: OTRow[],
  f: FiltrosGestion,
): Tablero {
  const ahora = useMemo(() => Date.now(), [vehiculosTodos, inspTodas]) // eslint-disable-line react-hooks/exhaustive-deps
  const hoy = diaLocal(new Date(ahora))

  const historial = useMemo(() => porVehiculo(inspTodas), [inspTodas])

  // Estado vivo de toda la flota: siempre sobre el historial completo (no depende del período).
  const estadoVivo = useMemo(() => {
    const m = new Map<string, EstadoVivo>()
    vehiculosTodos.forEach(v => m.set(v.id, calcularEstadoVivo(v, historial.get(v.id) ?? [], ahora)))
    return m
  }, [vehiculosTodos, historial, ahora])

  const inspPorId = useMemo(() => new Map(inspTodas.map(i => [i.id, i])), [inspTodas])

  const opciones = useMemo<Opciones>(() => {
    const conductores = new Map<string, string>()
    inspTodas.forEach(i => conductores.set(i.conductorId, i.conductor))
    return {
      contratos: uniq([...vehiculosTodos.map(v => v.contrato), ...inspTodas.map(i => i.contrato)]),
      categorias: uniq(vehiculosTodos.map(v => v.categoria)),
      propiedades: uniq(vehiculosTodos.map(v => v.condicion)),
      estados: uniq(vehiculosTodos.map(v => v.estado)),
      patentes: uniq(vehiculosTodos.map(v => v.patente)),
      conductores: [...conductores].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    }
  }, [vehiculosTodos, inspTodas])

  return useMemo<Tablero>(() => {
    /* ── Período ── */
    let rango: Rango
    if (f.periodo === 'todo') {
      rango = rangoDesde(inspTodas[0]?.dia ?? hoy, hoy)
    } else if (f.periodo === 'rango') {
      const desde = f.desde || sumarDias(hoy, -29)
      const hasta = f.hasta && f.hasta >= desde ? f.hasta : (desde > hoy ? desde : hoy)
      rango = rangoDesde(desde, hasta)
    } else {
      rango = rangoDesde(sumarDias(hoy, -(Number(f.periodo) - 1)), hoy)
    }
    const rangoAnterior = f.periodo === 'todo'
      ? null
      : rangoDesde(sumarDias(rango.desde, -rango.dias), sumarDias(rango.desde, -1))

    /* ── Vehículos ── */
    // Conductor: los vehículos que esa persona revisó en el período.
    const delConductor = f.conductor
      ? new Set(inspTodas.filter(i => i.conductorId === f.conductor && i.ts >= rango.desdeTs && i.ts < rango.hastaTs).map(i => i.patenteId))
      : null
    const base = vehiculosTodos.filter(v =>
      (!f.categoria || v.categoria === f.categoria)
      && (!f.propiedad || v.condicion === f.propiedad)
      && (!f.estado || v.estado === f.estado)
      && (!f.patente || v.patente === f.patente)
      && (!f.indicadores || v.afectaIndicadores)
      && (!delConductor || delConductor.has(v.id)),
    )
    const enContrato = base.filter(v => !f.contrato || v.contrato === f.contrato)
    const conteoCondicion = Object.fromEntries(CONDICIONES.map(c => [c, 0])) as Record<Condicion, number>
    enContrato.forEach(v => conteoCondicion[estadoVivo.get(v.id)!.condicion]++)

    const pasaSituacion = (id: string) => !f.situacion || estadoVivo.get(id)!.condicion === f.situacion
    const vehiculos = enContrato.filter(v => pasaSituacion(v.id))
    const ids = new Set(vehiculos.map(v => v.id))
    const estados = vehiculos.map(v => estadoVivo.get(v.id)!).sort(ordenarPorGravedad)
    const enServicio = estados.filter(e => !e.fueraServicio)

    const sinChecklist = enServicio
      .filter(e => e.diasSinChecklist == null || e.diasSinChecklist >= f.umbral)
      .sort((a, b) => (b.diasSinChecklist ?? 99999) - (a.diasSinChecklist ?? 99999))

    const sinReparar: FallaSinReparar[] = []
    estados.forEach(ev => ev.items.forEach((item, idx) => {
      if (!item?.falla) return
      const diasAbierta = Math.floor((ahora - item.desde) / DIA_MS)
      if (item.reportes30d >= 3 || diasAbierta > 30) sinReparar.push({ ev, idx, item, diasAbierta })
    }))
    sinReparar.sort((a, b) => b.item.reportes30d - a.item.reportes30d || b.diasAbierta - a.diasAbierta)

    /* ── Inspecciones del período ── */
    // El contrato de un checklist es la línea con que se hizo (o la del vehículo si no la indicó).
    const idsBase = new Set(base.filter(v => pasaSituacion(v.id)).map(v => v.id))
    const filtrarInsp = (r: Rango) => inspTodas.filter(i =>
      i.ts >= r.desdeTs && i.ts < r.hastaTs
      && idsBase.has(i.patenteId)
      && (!f.contrato || i.contrato === f.contrato)
      && (!f.tipo || i.tipo === f.tipo)
      && (!f.conductor || i.conductorId === f.conductor),
    )
    const inspecciones = filtrarInsp(rango)
    const esperados = enServicio.length
    const metricas = metricasPeriodo(inspecciones, esperados, rango.dias, historial, ids, rango.desdeTs, rango.hastaTs)
    const metricasAnterior = rangoAnterior
      ? metricasPeriodo(filtrarInsp(rangoAnterior), esperados, rangoAnterior.dias, historial, ids, rangoAnterior.desdeTs, rangoAnterior.hastaTs)
      : null

    /* ── Fallas por ítem (período) ── */
    const porItem = PREGUNTAS.map((p, idx) => {
      let fallas = 0
      let revisiones = 0
      inspecciones.forEach(i => i.respuestas.forEach(r => {
        if (r.idx !== idx) return
        revisiones++
        if (r.falla) fallas++
      }))
      return { idx, label: p.label, fallas, revisiones, tasa: revisiones ? fallas / revisiones : 0 }
    }).sort((a, b) => b.fallas - a.fallas || b.tasa - a.tasa)

    /* ── Antigüedad de fallas vigentes ── */
    const rangosAnt = [
      { rango: '0–7 días', max: 7, P: 0, D: 0 },
      { rango: '8–30 días', max: 30, P: 0, D: 0 },
      { rango: '31–90 días', max: 90, P: 0, D: 0 },
      { rango: 'Más de 90', max: Infinity, P: 0, D: 0 },
    ]
    let fallasVigentes = 0
    let fallasVigentesD = 0
    estados.forEach(ev => ev.items.forEach(it => {
      if (!it?.falla) return
      fallasVigentes++
      if (it.sev === 'D') fallasVigentesD++
      const dias = (ahora - it.desde) / DIA_MS
      rangosAnt.find(r => dias <= r.max)![it.sev ?? 'P']++
    }))

    /* ── Por contrato ── */
    const contratos = new Map<string, FilaContrato & { _conChecklist: Set<string>; _conFalla: number }>()
    const fila = (c: string) => {
      let r = contratos.get(c)
      if (!r) {
        r = {
          contrato: c, vehiculos: 0, conChecklist: 0, cobertura: 0, checklist: 0, pctConFalla: 0,
          detencion: 0, restriccion: 0, sinChecklist: 0, fallasVigentes: 0, _conChecklist: new Set(), _conFalla: 0,
        }
        contratos.set(c, r)
      }
      return r
    }
    const sinChecklistIds = new Set(sinChecklist.map(e => e.vehiculo.id))
    estados.forEach(ev => {
      const r = fila(ev.vehiculo.contrato)
      if (!ev.fueraServicio) r.vehiculos++
      if (ev.condicion === 'detencion') r.detencion++
      if (ev.condicion === 'restriccion') r.restriccion++
      if (sinChecklistIds.has(ev.vehiculo.id)) r.sinChecklist++
      r.fallasVigentes += ev.fallasVigentes
    })
    const vehiculoPorId = new Map(vehiculos.map(v => [v.id, v]))
    inspecciones.forEach(i => {
      const r = fila(i.contrato)
      r.checklist++
      if (i.nFallas > 0) r._conFalla++
      const v = vehiculoPorId.get(i.patenteId)
      if (v && !estadoVivo.get(v.id)!.fueraServicio) fila(v.contrato)._conChecklist.add(v.id)
    })
    const porContrato = [...contratos.values()].map(({ _conChecklist, _conFalla, ...r }) => ({
      ...r,
      conChecklist: _conChecklist.size,
      cobertura: pct(_conChecklist.size, r.vehiculos),
      pctConFalla: pct(_conFalla, r.checklist),
    })).sort((a, b) => b.vehiculos - a.vehiculos || b.checklist - a.checklist || a.contrato.localeCompare(b.contrato))

    /* ── Por conductor ── */
    const cond = new Map<string, { conductor: string; checklist: number; v: Set<string>; d: Set<string>; ultimo: string; conFalla: number; fallas: number }>()
    inspecciones.forEach(i => {
      let c = cond.get(i.conductorId)
      if (!c) {
        c = { conductor: i.conductor, checklist: 0, v: new Set(), d: new Set(), ultimo: i.fecha, conFalla: 0, fallas: 0 }
        cond.set(i.conductorId, c)
      }
      c.checklist++
      c.v.add(i.patenteId)
      c.d.add(i.dia)
      if (i.fecha > c.ultimo) c.ultimo = i.fecha
      if (i.nFallas) c.conFalla++
      c.fallas += i.nFallas
    })
    const porConductor: FilaConductor[] = [...cond].map(([id, c]) => ({
      id,
      conductor: c.conductor,
      checklist: c.checklist,
      vehiculos: c.v.size,
      dias: c.d.size,
      ultimo: c.ultimo,
      pctConFalla: pct(c.conFalla, c.checklist),
      fallas: c.fallas,
    })).sort((a, b) => b.checklist - a.checklist || a.conductor.localeCompare(b.conductor, 'es'))

    /* ── Tendencia ── */
    const semanal = rango.dias > 45
    const buckets: { clave: string; desde: string; hasta: string }[] = []
    if (semanal) {
      for (let d = lunes(rango.desde); d <= rango.hasta; d = sumarDias(d, 7)) {
        buckets.push({ clave: d, desde: d, hasta: sumarDias(d, 6) })
      }
    } else {
      for (let d = rango.desde; d <= rango.hasta; d = sumarDias(d, 1)) buckets.push({ clave: d, desde: d, hasta: d })
    }
    const tendencia: PuntoTendencia[] = buckets.map(b => {
      const desdeTs = inicioDia(b.desde < rango.desde ? rango.desde : b.desde)
      const hastaTs = inicioDia(sumarDias(b.hasta > rango.hasta ? rango.hasta : b.hasta, 1))
      const enB = inspecciones.filter(i => i.ts >= desdeTs && i.ts < hastaTs)
      const conFalla = enB.filter(i => i.nFallas > 0).length
      let km = 0
      ids.forEach(id => { km += kmRecorridos(historial.get(id) ?? [], desdeTs, hastaTs) })
      const [, m, d] = b.desde.split('-')
      return {
        clave: b.clave,
        etiqueta: semanal ? `Sem ${d}/${m}` : `${d}/${m}`,
        sinFalla: enB.length - conFalla,
        conFalla,
        pctConFalla: enB.length ? pct(conFalla, enB.length) : null,
        cobertura: pct(new Set(enB.filter(i => !estadoVivo.get(i.patenteId)?.fueraServicio).map(i => i.patenteId)).size, esperados),
        km,
      }
    })

    /* ── Calendario de cumplimiento (hasta 31 días) ── */
    const nDias = Math.min(31, rango.dias)
    const diasCal = Array.from({ length: nDias }, (_, k) => sumarDias(rango.hasta, k - nDias + 1))
    const idxDia = new Map(diasCal.map((d, k) => [d, k]))
    const celdas = new Map<string, CeldaCalendario[]>()
    estados.forEach(ev => celdas.set(ev.vehiculo.id, diasCal.map(() => 0 as CeldaCalendario)))
    inspecciones.forEach(i => {
      const k = idxDia.get(i.dia)
      const row = celdas.get(i.patenteId)
      if (k == null || !row) return
      const val: CeldaCalendario = i.nFallasD > 0 || !i.operativo ? 3 : i.nFallas > 0 ? 2 : 1
      if (val > row[k]) row[k] = val
    })
    const calendario = {
      dias: diasCal,
      filas: [...estados]
        .sort((a, b) => a.vehiculo.contrato.localeCompare(b.vehiculo.contrato) || a.vehiculo.patente.localeCompare(b.vehiculo.patente))
        .map(ev => ({ ev, celdas: celdas.get(ev.vehiculo.id)! })),
    }

    /* ── OT ── */
    const estadosFiltrados = new Map(estados.map(e => [e.vehiculo.id, e]))
    const ot = resumenOT(ots, inspPorId, estadosFiltrados, rango.desdeTs, rango.hastaTs, ahora)

    return {
      hoy,
      rango,
      rangoAnterior,
      opciones,
      estados,
      conteoCondicion,
      totalVehiculos: enContrato.length,
      esperados,
      checklistHoy: enServicio.filter(e => e.ultimo?.dia === hoy).length,
      sinChecklist,
      fallasVigentes,
      fallasVigentesD,
      detencion: estados.filter(e => e.condicion === 'detencion'),
      sinReparar,
      inspecciones,
      metricas,
      metricasAnterior,
      porItem,
      antiguedad: rangosAnt.map(({ rango: r, P, D }) => ({ rango: r, P, D })),
      porContrato,
      porConductor,
      tendencia,
      tendenciaSemanal: semanal,
      calendario,
      ot,
      historial,
      vehiculoPorId: new Map(vehiculosTodos.map(v => [v.id, v])),
      estadoPorId: estadoVivo,
    }
  }, [vehiculosTodos, inspTodas, ots, f, hoy, ahora, historial, estadoVivo, inspPorId, opciones])
}
