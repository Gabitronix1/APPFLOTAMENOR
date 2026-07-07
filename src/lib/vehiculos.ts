import type { VInspeccion, TipoEventoTimeline } from '../types'

export type EstadoVehiculo = 'operativo' | 'no_operativo' | 'con_fallas' | 'sin_datos'

export const ESTADO_TOOLTIP =
  'Estado inferido de la última inspección — todavía no es un estado persistente real.'

export function inferirEstado(ultimaInspeccion: VInspeccion | undefined): EstadoVehiculo {
  if (!ultimaInspeccion) return 'sin_datos'
  if (!ultimaInspeccion.operativo) return 'no_operativo'
  if (ultimaInspeccion.n_fallas - ultimaInspeccion.n_resueltas > 0) return 'con_fallas'
  return 'operativo'
}

export const ESTADO_VEHICULO_INFO: Record<
  EstadoVehiculo,
  { label: string; emoji: string; badgeClass: string }
> = {
  operativo: { label: 'Operativo', emoji: '🟢', badgeClass: 'badge-ok' },
  no_operativo: { label: 'No operativo', emoji: '🔴', badgeClass: 'badge-fault' },
  con_fallas: { label: 'Con fallas', emoji: '🟡', badgeClass: 'badge-warn' },
  sin_datos: { label: 'Sin datos', emoji: '⚪', badgeClass: 'bg-gray-200 text-gray-500' },
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
}

export const TIPOS_EVENTO_TIMELINE: TipoEventoTimeline[] = [
  'inspeccion',
  'preventiva',
  'correctiva',
  'resolucion',
]
