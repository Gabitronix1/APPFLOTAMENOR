import type { VInspeccion, TipoEventoTimeline, EstadoVehiculo } from '../types'

export const ESTADOS_VEHICULO: EstadoVehiculo[] = [
  'operativo',
  'en_observacion',
  'en_mantencion',
  'taller_externo',
  'dado_de_baja',
]

export const ESTADO_VEHICULO_INFO: Record<
  EstadoVehiculo,
  { label: string; badgeClass: string; dotClass: string }
> = {
  operativo: { label: 'Operativo', badgeClass: 'bg-lime/20 text-primary', dotClass: 'bg-primary' },
  en_observacion: { label: 'En observación', badgeClass: 'bg-warn/20 text-warn', dotClass: 'bg-warn' },
  en_mantencion: { label: 'En mantención', badgeClass: 'bg-fault/20 text-fault', dotClass: 'bg-fault' },
  taller_externo: { label: 'Taller externo', badgeClass: 'bg-purple-100 text-purple-700', dotClass: 'bg-purple-500' },
  dado_de_baja: { label: 'Dado de baja', badgeClass: 'bg-gray-700 text-white', dotClass: 'bg-gray-300' },
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
