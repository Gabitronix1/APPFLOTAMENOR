import type { EstadoOT, PrioridadOT, TipoResolucion } from '../types'

export const COLUMNAS_OT: { estado: EstadoOT; label: string; emoji: string }[] = [
  { estado: 'abierta', label: 'Abiertas', emoji: '🔵' },
  { estado: 'asignada', label: 'Asignadas', emoji: '🟡' },
  { estado: 'en_progreso', label: 'En progreso', emoji: '🟠' },
  { estado: 'cerrada', label: 'Cerradas', emoji: '🟢' },
]

export const PRIORIDADES_OT: PrioridadOT[] = ['baja', 'media', 'alta', 'urgente']

export const PRIORIDAD_OT_INFO: Record<PrioridadOT, { label: string; badgeClass: string }> = {
  baja: { label: 'Baja', badgeClass: 'bg-gray-200 text-gray-600' },
  media: { label: 'Media', badgeClass: 'bg-blue-100 text-blue-700' },
  alta: { label: 'Alta', badgeClass: 'bg-orange-100 text-orange-700' },
  urgente: { label: 'Urgente', badgeClass: 'bg-fault/20 text-fault' },
}

export const TIPOS_CIERRE_OT: { value: TipoResolucion; label: string }[] = [
  { value: 'resuelto', label: 'Resuelto' },
  { value: 'derivado', label: 'Derivado' },
  { value: 'pendiente', label: 'Pendiente' },
]
