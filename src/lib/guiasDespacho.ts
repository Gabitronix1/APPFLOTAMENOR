import type { EstadoGuiaDespacho, GuiaDespacho, Rol } from '../types'
import { puedeGestionarGuia } from './roles'

export const ESTADO_GUIA_INFO: Record<EstadoGuiaDespacho, { label: string; badgeClass: string }> = {
  borrador: { label: 'Borrador', badgeClass: 'bg-gray-200 text-gray-600' },
  despachada: { label: 'Despachada', badgeClass: 'bg-blue-100 text-blue-700' },
  recibida: { label: 'Recibida', badgeClass: 'bg-warn/20 text-warn' },
  cerrada: { label: 'Cerrada', badgeClass: 'bg-lime/20 text-primary' },
  cancelada: { label: 'Cancelada', badgeClass: 'bg-gray-200 text-gray-500' },
}

export function formatFolio(folio: number): string {
  return `N° ${String(folio).padStart(6, '0')}`
}

// El conductor asignado marca despacho/recepción de sus propias guías (comparando su
// operador vinculado, no su id de usuario, ya que guias_despacho.conductor_id referencia
// operadores). Bodega/administrativos gestionan cualquier guía en cualquier estado.
function esConductorDeGuia(guia: GuiaDespacho, operadorId: string | null): boolean {
  return !!operadorId && guia.conductor_id === operadorId
}

export function puedeDespacharGuia(guia: GuiaDespacho, rol: Rol | undefined, operadorId: string | null): boolean {
  if (guia.estado !== 'borrador') return false
  return puedeGestionarGuia(rol) || esConductorDeGuia(guia, operadorId)
}

export function puedeRecibirGuia(guia: GuiaDespacho, rol: Rol | undefined, operadorId: string | null): boolean {
  if (guia.estado !== 'despachada') return false
  return puedeGestionarGuia(rol) || esConductorDeGuia(guia, operadorId)
}

export function puedeCerrarGuia(guia: GuiaDespacho, rol: Rol | undefined): boolean {
  return guia.estado === 'recibida' && puedeGestionarGuia(rol)
}
