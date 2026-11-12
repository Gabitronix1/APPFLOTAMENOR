// Centro de gestión Flota Menor: modelo y cálculos del tablero a partir de los checklist.
//
// Idea central: el "estado vivo" de cada vehículo. Para cada patente e ítem vale el ÚLTIMO
// reporte: si el lunes se reportó "Luces: falla" y el jueves "Luces: OK", la falla ya no está
// vigente aunque nadie haya cerrado su OT. Así el tablero refleja la realidad del vehículo aunque
// el taller no registre cada reparación.
import { CRITICIDAD_ITEM, PREGUNTAS } from './constants'
import type { PKey } from './constants'
import type { EstadoVehiculo } from '../types'

export type Severidad = 'P' | 'D'
export type Condicion = 'detencion' | 'restriccion' | 'apta' | 'sin_datos'

export const N_ITEMS = PREGUNTAS.length
export const DIA_MS = 86_400_000

export const CONDICION_INFO: Record<Condicion, { label: string; corto: string; dot: string; badge: string; orden: number }> = {
  detencion: { label: 'Detención', corto: 'Detención', dot: 'bg-fault', badge: 'bg-fault/15 text-fault', orden: 0 },
  restriccion: { label: 'Con restricción', corto: 'Restricción', dot: 'bg-warn', badge: 'bg-warn/15 text-warn', orden: 1 },
  apta: { label: 'Apta', corto: 'Apta', dot: 'bg-primary', badge: 'bg-lime/20 text-primary', orden: 2 },
  sin_datos: { label: 'Nunca revisado', corto: 'Nunca revisado', dot: 'bg-gray-300', badge: 'bg-gray-100 text-gray-500', orden: 3 },
}
export const CONDICIONES: Condicion[] = ['detencion', 'restriccion', 'apta', 'sin_datos']

// Estados operativos en que el vehículo no circula: no se espera checklist de ellos.
export const ESTADOS_FUERA_SERVICIO: EstadoVehiculo[] = ['en_mantencion', 'taller_externo', 'dado_de_baja']

export const SIN_CONTRATO = 'Sin contrato'

/* ─── Datos crudos ─── */

export interface ChecklistRow {
  id: string
  fecha: string
  tipo: string
  kilometraje: number | null
  operativo: boolean
  obs_general: string | null
  linea: string | null
  fundo: string | null
  patente_id: string
  operador_id: string
  // [pregunta_id, falla, observacion, testigo_critico, afecta_campo_visual]
  respuestas: [number, boolean, string | null, boolean, boolean][]
}

export interface PatenteRow {
  id: string
  patente: string
  descripcion: string | null
  marca: string | null
  modelo: string | null
  anno: number | null
  categoria_id: number | null
  condicion: string | null
  linea: string | null
  estado_actual: EstadoVehiculo
  afecta_indicadores: boolean
}

export interface OTRow {
  id: string
  inspeccion_id: string
  pregunta_id: number
  estado: string
  asignado_a: string | null
  created_at: string
  fecha_cierre: string | null
}

/* ─── Modelo ─── */

export interface Vehiculo {
  id: string
  patente: string
  descripcion: string
  marca: string
  modelo: string
  anno: number | null
  categoria: string
  condicion: string
  contrato: string
  estado: EstadoVehiculo
  afectaIndicadores: boolean
  camionCombustible: boolean
}

export interface Respuesta {
  idx: number // 0..N_ITEMS-1
  falla: boolean
  obs: string | null
  sev: Severidad | null // solo si falla
}

export interface Inspeccion {
  id: string
  fecha: string
  ts: number
  dia: string // YYYY-MM-DD local
  tipo: 'completo' | 'diario'
  km: number | null
  operativo: boolean
  obs: string | null
  contrato: string
  fundo: string | null
  patenteId: string
  conductorId: string
  conductor: string
  respuestas: Respuesta[]
  nFallas: number
  nFallasD: number
}

export interface ItemEstado {
  falla: boolean
  sev: Severidad | null
  desde: number // ts del primer reporte de la racha actual (falla u OK)
  ultimo: number // ts del último reporte
  reportes: number // reportes consecutivos en la racha actual
  obs: string | null
  reportes30d: number // reportes con falla en los últimos 30 días
}

export interface EstadoVivo {
  vehiculo: Vehiculo
  condicion: Condicion
  items: (ItemEstado | null)[] // null = nunca revisado
  fallasVigentes: number
  fallasD: number
  ultimo: Inspeccion | null
  diasSinChecklist: number | null
  ultimoKm: number | null
  declaradoNoOperativo: boolean
  fueraServicio: boolean
}

/* ─── Utilidades ─── */

export function diaLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function inicioDia(dia: string): number {
  return new Date(`${dia}T00:00:00`).getTime()
}

export function sumarDias(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00`)
  d.setDate(d.getDate() + n)
  return diaLocal(d)
}

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((inicioDia(hasta) - inicioDia(desde)) / DIA_MS)
}

export function pct(n: number, total: number): number {
  return total ? Math.round((n / total) * 100) : 0
}

export function hora(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

// Severidad efectiva de un ítem en mal estado según la matriz de criticidad (misma regla que el
// formulario de checklist). Circulación nocturna y lluvia no se guardan con el checklist, así que
// Luces y Parabrisas quedan en precaución salvo que la base sea detención.
export function severidad(key: PKey, testigoCritico: boolean, afectaVisual: boolean, camionCombustible: boolean): Severidad {
  const item = CRITICIDAD_ITEM[key]
  if (item.base === 'D') return 'D'
  switch (item.agravante?.tipo) {
    case 'testigo_critico': return testigoCritico ? 'D' : 'P'
    case 'afecta_visual': return afectaVisual ? 'D' : 'P'
    case 'camion_combustible': return camionCombustible ? 'D' : 'P'
    default: return 'P'
  }
}

/* ─── Construcción del modelo ─── */

export function construirVehiculos(patentes: PatenteRow[], categorias: Map<number, string>): Vehiculo[] {
  return patentes.map(p => {
    const categoria = (p.categoria_id != null && categorias.get(p.categoria_id)) || 'Sin categoría'
    return {
      id: p.id,
      patente: p.patente,
      descripcion: p.descripcion ?? '',
      marca: p.marca ?? '',
      modelo: p.modelo ?? '',
      anno: p.anno,
      categoria,
      condicion: p.condicion === 'INTERNO' ? 'Interno' : p.condicion === 'ARRIENDO' ? 'Arriendo' : 'Sin dato',
      contrato: p.linea || SIN_CONTRATO,
      estado: p.estado_actual,
      afectaIndicadores: p.afecta_indicadores,
      camionCombustible: categoria.toUpperCase().includes('COMBUSTIBLE'),
    }
  })
}

export function construirInspecciones(
  rows: ChecklistRow[],
  vehiculos: Map<string, Vehiculo>,
  conductores: Map<string, string>,
): Inspeccion[] {
  const out: Inspeccion[] = []
  for (const r of rows) {
    const v = vehiculos.get(r.patente_id)
    if (!v) continue
    const d = new Date(r.fecha)
    const respuestas: Respuesta[] = []
    let nFallas = 0
    let nFallasD = 0
    for (const [pid, falla, obs, testigo, visual] of r.respuestas ?? []) {
      const idx = pid - 1
      if (idx < 0 || idx >= N_ITEMS) continue
      const sev = falla ? severidad(PREGUNTAS[idx].key, testigo, visual, v.camionCombustible) : null
      if (falla) {
        nFallas++
        if (sev === 'D') nFallasD++
      }
      respuestas.push({ idx, falla, obs, sev })
    }
    out.push({
      id: r.id,
      fecha: r.fecha,
      ts: d.getTime(),
      dia: diaLocal(d),
      tipo: r.tipo === 'diario' ? 'diario' : 'completo',
      km: r.kilometraje && r.kilometraje > 0 ? r.kilometraje : null,
      operativo: r.operativo,
      obs: r.obs_general,
      contrato: r.linea || v.contrato,
      fundo: r.fundo,
      patenteId: r.patente_id,
      conductorId: r.operador_id,
      conductor: conductores.get(r.operador_id) ?? 'Sin conductor',
      respuestas,
      nFallas,
      nFallasD,
    })
  }
  return out.sort((a, b) => a.ts - b.ts)
}

// Inspecciones agrupadas por vehículo, en orden cronológico.
export function porVehiculo(insp: Inspeccion[]): Map<string, Inspeccion[]> {
  const m = new Map<string, Inspeccion[]>()
  for (const i of insp) {
    const arr = m.get(i.patenteId)
    if (arr) arr.push(i)
    else m.set(i.patenteId, [i])
  }
  return m
}

export function calcularEstadoVivo(v: Vehiculo, historial: Inspeccion[], ahora: number): EstadoVivo {
  const items: (ItemEstado | null)[] = PREGUNTAS.map(() => null)
  const hace30 = ahora - 30 * DIA_MS
  let ultimoKm: number | null = null
  for (const i of historial) {
    if (i.km) ultimoKm = i.km
    for (const r of i.respuestas) {
      const prev = items[r.idx]
      const misma = prev && prev.falla === r.falla
      items[r.idx] = {
        falla: r.falla,
        sev: r.sev,
        desde: misma ? prev.desde : i.ts,
        ultimo: i.ts,
        reportes: misma ? prev.reportes + 1 : 1,
        obs: r.falla ? (r.obs || (misma ? prev.obs : null)) : null,
        reportes30d: (prev?.reportes30d ?? 0) + (r.falla && i.ts >= hace30 ? 1 : 0),
      }
    }
  }
  const ultimo = historial.length ? historial[historial.length - 1] : null
  const vigentes = items.filter((it): it is ItemEstado => !!it?.falla)
  const fallasD = vigentes.filter(it => it.sev === 'D').length
  const declaradoNoOperativo = !!ultimo && !ultimo.operativo
  let condicion: Condicion
  if (!ultimo) condicion = 'sin_datos'
  else if (fallasD > 0 || declaradoNoOperativo) condicion = 'detencion'
  else if (vigentes.length > 0) condicion = 'restriccion'
  else condicion = 'apta'
  return {
    vehiculo: v,
    condicion,
    items,
    fallasVigentes: vigentes.length,
    fallasD,
    ultimo,
    diasSinChecklist: ultimo ? Math.floor((inicioDia(diaLocal(new Date(ahora))) - inicioDia(ultimo.dia)) / DIA_MS) : null,
    ultimoKm,
    declaradoNoOperativo,
    fueraServicio: ESTADOS_FUERA_SERVICIO.includes(v.estado),
  }
}

export function ordenarPorGravedad(a: EstadoVivo, b: EstadoVivo): number {
  return CONDICION_INFO[a.condicion].orden - CONDICION_INFO[b.condicion].orden
    || b.fallasD - a.fallasD
    || b.fallasVigentes - a.fallasVigentes
    || (b.diasSinChecklist ?? 9999) - (a.diasSinChecklist ?? 9999)
    || a.vehiculo.patente.localeCompare(b.vehiculo.patente)
}

// Kilómetros recorridos según odómetro: suma de avances entre lecturas consecutivas del vehículo.
// Se descartan retrocesos y saltos imposibles (más de 2.000 km, o 800 km por día transcurrido si es
// más), que suelen ser errores de digitación; la lectura siguiente vuelve a servir de base.
export function kmRecorridos(historial: Inspeccion[], desdeTs: number, hastaTs: number): number {
  let total = 0
  let prev: Inspeccion | null = null
  for (const i of historial) {
    if (!i.km) continue
    if (prev?.km && i.ts >= desdeTs && i.ts < hastaTs) {
      const d = i.km - prev.km
      const max = Math.max(2000, 800 * ((i.ts - prev.ts) / DIA_MS))
      if (d > 0 && d <= max) total += d
    }
    prev = i
  }
  return total
}

/* ─── Métricas de un período ─── */

export interface MetricasPeriodo {
  checklist: number
  dias: number
  promedioDia: number
  vehiculosConChecklist: number
  cobertura: number
  conFalla: number
  pctConFalla: number
  fallas: number
  fallasD: number
  conductores: number
  noOperativos: number
  km: number
}

export function metricasPeriodo(
  insp: Inspeccion[],
  totalVehiculos: number,
  dias: number,
  historialVehiculos: Map<string, Inspeccion[]>,
  vehiculoIds: Set<string>,
  desdeTs: number,
  hastaTs: number,
): MetricasPeriodo {
  const conFalla = insp.filter(i => i.nFallas > 0).length
  const vehiculosConChecklist = new Set(insp.map(i => i.patenteId)).size
  let km = 0
  for (const id of vehiculoIds) km += kmRecorridos(historialVehiculos.get(id) ?? [], desdeTs, hastaTs)
  return {
    checklist: insp.length,
    dias,
    promedioDia: dias ? insp.length / dias : 0,
    vehiculosConChecklist,
    cobertura: pct(vehiculosConChecklist, totalVehiculos),
    conFalla,
    pctConFalla: pct(conFalla, insp.length),
    fallas: insp.reduce((s, i) => s + i.nFallas, 0),
    fallasD: insp.reduce((s, i) => s + i.nFallasD, 0),
    conductores: new Set(insp.map(i => i.conductorId)).size,
    noOperativos: insp.filter(i => !i.operativo).length,
    km,
  }
}

/* ─── OT (resoluciones) ─── */

export const OT_ABIERTAS = ['abierta', 'asignada', 'en_progreso']

export interface ResumenOT {
  abiertas: number
  sinAsignar: number
  mas30: number
  cerradasPeriodo: number
  diasPromCierre: number | null
  yaOk: number // abiertas cuyo ítem salió OK en un checklist posterior a la OT
  porAntiguedad: { rango: string; n: number }[]
}

export function resumenOT(
  ots: OTRow[],
  inspPorId: Map<string, Inspeccion>,
  estados: Map<string, EstadoVivo>,
  desdeTs: number,
  hastaTs: number,
  ahora: number,
): ResumenOT {
  const rangos = [
    { rango: '0–7 días', max: 7, n: 0 },
    { rango: '8–30 días', max: 30, n: 0 },
    { rango: '31–90 días', max: 90, n: 0 },
    { rango: 'Más de 90', max: Infinity, n: 0 },
  ]
  let abiertas = 0, sinAsignar = 0, mas30 = 0, cerradasPeriodo = 0, yaOk = 0
  let sumaCierre = 0, nCierre = 0
  for (const ot of ots) {
    const insp = inspPorId.get(ot.inspeccion_id)
    if (!insp) continue
    const ev = estados.get(insp.patenteId)
    if (!ev) continue
    const creada = new Date(ot.created_at).getTime()
    if (OT_ABIERTAS.includes(ot.estado)) {
      abiertas++
      if (!ot.asignado_a) sinAsignar++
      const dias = (ahora - creada) / DIA_MS
      if (dias > 30) mas30++
      rangos.find(r => dias <= r.max)!.n++
      const it = ev.items[ot.pregunta_id - 1]
      if (it && !it.falla && it.desde > insp.ts) yaOk++
    } else if (ot.estado === 'cerrada' && ot.fecha_cierre) {
      const cierre = new Date(ot.fecha_cierre).getTime()
      if (cierre >= desdeTs && cierre < hastaTs) {
        cerradasPeriodo++
        sumaCierre += (cierre - creada) / DIA_MS
        nCierre++
      }
    }
  }
  return {
    abiertas,
    sinAsignar,
    mas30,
    cerradasPeriodo,
    diasPromCierre: nCierre ? sumaCierre / nCierre : null,
    yaOk,
    porAntiguedad: rangos.map(({ rango, n }) => ({ rango, n })),
  }
}
