import type { CriticidadAnomalia, EstadoAnomalia } from '../types'

export const CRITICIDAD_ANOMALIA_INFO: Record<CriticidadAnomalia, { label: string; badgeClass: string }> = {
  baja: { label: 'Baja', badgeClass: 'bg-gray-200 text-gray-600' },
  media: { label: 'Media', badgeClass: 'bg-warn/20 text-warn' },
  alta: { label: 'Alta', badgeClass: 'bg-fault/20 text-fault' },
}

export const CRITICIDADES_ANOMALIA: CriticidadAnomalia[] = ['alta', 'media', 'baja']

export const ESTADO_ANOMALIA_INFO: Record<EstadoAnomalia, { label: string; badgeClass: string }> = {
  abierta: { label: 'Abierta', badgeClass: 'bg-blue-100 text-blue-700' },
  en_progreso: { label: 'En progreso', badgeClass: 'bg-orange-100 text-orange-700' },
  resuelta: { label: 'Resuelta', badgeClass: 'bg-lime/20 text-primary' },
}

export const ESTADOS_ANOMALIA: EstadoAnomalia[] = ['abierta', 'en_progreso', 'resuelta']
