import type { TipoEventoTimeline, TipoIntervencionMaquinaria } from '../types'

export const TIPOS_EVENTO_TIMELINE_MAQUINARIA: TipoEventoTimeline[] = [
  'preventiva',
  'correctiva',
  'otra',
  'cambio_estado',
]

export const TIPOS_INTERVENCION_MAQUINARIA: { value: TipoIntervencionMaquinaria; label: string }[] = [
  { value: 'PREVENTIVA', label: 'Preventiva' },
  { value: 'CORRECTIVA', label: 'Correctiva' },
  { value: 'OTRA', label: 'Otra' },
]
