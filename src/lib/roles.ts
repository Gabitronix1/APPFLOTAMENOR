import type { Rol } from '../types'

export const ROL_LABELS: Record<Rol, string> = {
  conductor_logistico: 'Conductor Logístico',
  mecanico_flota_menor: 'Mecánico Flota Menor',
  mecanico_maquinaria: 'Mecánico de Maquinaria',
  jefe_maquinarias: 'Jefe de Maquinarias',
  supervisor_maquinarias: 'Supervisor de Maquinarias',
  ingeniero_confiabilidad: 'Ingeniero de Confiabilidad',
  jefe_cdg: 'Jefe de CDG',
}

// Acceso a Dashboard, Vehículos y Vencimientos, y gestión de OT por igual.
export const ROLES_ADMINISTRATIVOS: Rol[] = [
  'supervisor_maquinarias',
  'ingeniero_confiabilidad',
  'jefe_maquinarias',
  'jefe_cdg',
]

// Único grupo con permisos de edición general (Cambiar estado, Actualizar documento, Maestros).
export const ROLES_JEFES: Rol[] = ['jefe_maquinarias', 'jefe_cdg']

export const ROLES_INTERVENCION: Rol[] = ['mecanico_flota_menor', 'jefe_maquinarias', 'jefe_cdg']

export const ROLES_ORDENES_TRABAJO: Rol[] = ['mecanico_flota_menor', ...ROLES_ADMINISTRATIVOS]

export const ROLES_MAESTROS: Rol[] = ROLES_JEFES

export function esRolAdministrativo(rol: Rol | undefined): boolean {
  return !!rol && ROLES_ADMINISTRATIVOS.includes(rol)
}

// Cambiar estado / Actualizar documento / Agregar-Editar en Maestros.
export function puedeEditarGestion(rol: Rol | undefined): boolean {
  return !!rol && ROLES_JEFES.includes(rol)
}

// Asignar / Cerrar directo / Cancelar / cambiar prioridad en Órdenes de trabajo:
// los 4 roles administrativos gestionan por igual (excepción respecto a la regla general).
export function puedeGestionarOT(rol: Rol | undefined): boolean {
  return esRolAdministrativo(rol)
}

export function getDefaultRoute(rol: Rol | undefined): string {
  return esRolAdministrativo(rol) ? '/dashboard' : '/checklist'
}
