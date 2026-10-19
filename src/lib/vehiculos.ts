import type { CondicionVehiculo, VInspeccion, TipoEventoTimeline, EstadoVehiculo } from '../types'

export const ESTADOS_VEHICULO: EstadoVehiculo[] = [
  'operativo',
  'en_observacion',
  'en_mantencion',
  'taller_externo',
  'dado_de_baja',
]

export const ESTADOS_MAQUINARIA: EstadoVehiculo[] = [...ESTADOS_VEHICULO, 'r2', 'r6', 'r77']

export const ESTADO_VEHICULO_INFO: Record<
  EstadoVehiculo,
  { label: string; badgeClass: string; dotClass: string }
> = {
  operativo: { label: 'Operativo', badgeClass: 'bg-lime/20 text-primary', dotClass: 'bg-primary' },
  en_observacion: { label: 'En observación', badgeClass: 'bg-warn/20 text-warn', dotClass: 'bg-warn' },
  en_mantencion: { label: 'En mantención', badgeClass: 'bg-fault/20 text-fault', dotClass: 'bg-fault' },
  taller_externo: { label: 'Taller externo', badgeClass: 'bg-purple-100 text-purple-700', dotClass: 'bg-purple-500' },
  dado_de_baja: { label: 'Dado de baja', badgeClass: 'bg-gray-700 text-white', dotClass: 'bg-gray-300' },
  r2: { label: 'R2', badgeClass: 'bg-sky-100 text-sky-700', dotClass: 'bg-sky-500' },
  r6: { label: 'R6', badgeClass: 'bg-amber-100 text-amber-700', dotClass: 'bg-amber-400' },
  r77: { label: 'R77', badgeClass: 'bg-orange-100 text-orange-700', dotClass: 'bg-orange-500' },
}

// Un estado que la app no conoce (agregado directo en la BD) se muestra en gris en vez de
// romper la pantalla.
export function infoEstado(estado: string) {
  return (
    ESTADO_VEHICULO_INFO[estado as EstadoVehiculo] ?? {
      label: estado,
      badgeClass: 'bg-gray-200 text-gray-600',
      dotClass: 'bg-gray-400',
    }
  )
}

export const CONDICION_VEHICULO_INFO: Record<CondicionVehiculo, { label: string; badgeClass: string }> = {
  INTERNO: { label: 'Interno', badgeClass: 'bg-lime/20 text-primary' },
  ARRIENDO: { label: 'Arriendo', badgeClass: 'bg-purple-100 text-purple-700' },
}

export function sumaFallasActivas(inspecciones: VInspeccion[]): number {
  return inspecciones.reduce((acc, i) => acc + Math.max(0, i.n_fallas - i.n_resueltas), 0)
}

export function sumaFallasHistoricas(inspecciones: VInspeccion[]): number {
  return inspecciones.reduce((acc, i) => acc + i.n_fallas, 0)
}

export const TIPO_EVENTO_INFO: Record<
  TipoEventoTimeline,
  { label: string; labelPlural: string; iconBg: string; iconColor: string }
> = {
  inspeccion: { label: 'Inspección', labelPlural: 'Inspecciones', iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
  preventiva: { label: 'Preventiva', labelPlural: 'Preventivas', iconBg: 'bg-primary/10', iconColor: 'text-primary' },
  correctiva: { label: 'Correctiva', labelPlural: 'Correctivas', iconBg: 'bg-orange-50', iconColor: 'text-orange-600' },
  otra: { label: 'Otra', labelPlural: 'Otras', iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
  resolucion: { label: 'Resolución', labelPlural: 'Resoluciones', iconBg: 'bg-dark/10', iconColor: 'text-dark' },
  cambio_estado: { label: 'Cambio de estado', labelPlural: 'Cambios de estado', iconBg: 'bg-purple-50', iconColor: 'text-purple-600' },
}

export const TIPOS_EVENTO_TIMELINE: TipoEventoTimeline[] = [
  'inspeccion',
  'preventiva',
  'correctiva',
  'resolucion',
  'cambio_estado',
]
