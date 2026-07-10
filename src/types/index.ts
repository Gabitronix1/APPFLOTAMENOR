export type Rol =
  | 'conductor_logistico'
  | 'mecanico_flota_menor'
  | 'mecanico_maquinaria'
  | 'jefe_maquinarias'
  | 'supervisor_maquinarias'
  | 'ingeniero_confiabilidad'
  | 'jefe_cdg'

export interface Perfil {
  id: string
  rol: Rol
}

export interface VInspeccion {
  id: string
  fecha: string
  patente: string
  conductor: string
  fundo: string
  contrato: string | null
  operativo: boolean
  kilometraje: number | null
  obs_general: string | null
  p1: boolean
  p2: boolean
  p3: boolean
  p4: boolean
  p5: boolean
  p6: boolean
  obs1: string | null
  obs2: string | null
  obs3: string | null
  obs4: string | null
  obs5: string | null
  obs6: string | null
  n_fallas: number
  n_resueltas: number
}

export type EstadoOT = 'abierta' | 'asignada' | 'en_progreso' | 'cerrada' | 'cancelada'

export type PrioridadOT = 'baja' | 'media' | 'alta' | 'urgente'

export interface Resolucion {
  id: string
  inspeccion_id: string
  pregunta_id: number
  resuelta_por: string | null
  descripcion: string | null
  tipo: 'resuelto' | 'derivado' | 'pendiente' | null
  fecha: string | null
  estado: EstadoOT
  prioridad: PrioridadOT | null
  asignado_a: string | null
  fecha_asignacion: string | null
  fecha_cierre: string | null
  costo: number | null
  created_at: string
}

export interface OrdenTrabajo extends Resolucion {
  patente: string
  sistema: string
  asignadoNombre: string | null
}

export interface Operador {
  id: string
  nombre: string
  apellido: string
  rut: string
  email: string
  activo: boolean
}

export type EstadoVehiculo =
  | 'operativo'
  | 'en_observacion'
  | 'en_mantencion'
  | 'taller_externo'
  | 'dado_de_baja'

export type CondicionVehiculo = 'INTERNO' | 'ARRIENDO'

export interface CategoriaPatente {
  id: string
  nombre: string
}

export interface Patente {
  id: string
  patente: string
  descripcion: string
  activo: boolean
  estado_actual: EstadoVehiculo
  categoria_id: string | null
  marca: string | null
  modelo: string | null
  anno: number | null
  vin: string | null
  motor: string | null
  condicion: CondicionVehiculo | null
  area: string | null
  linea: string | null
  responsable_nombre: string | null
  responsable_cargo: string | null
  afecta_indicadores: boolean
}

export interface Fundo {
  id: string
  nombre: string
  contrato: string
  activo: boolean
}

export type TipoResolucion = 'resuelto' | 'derivado' | 'pendiente'

export type TipoEventoTimeline = 'inspeccion' | 'preventiva' | 'correctiva' | 'otra' | 'resolucion' | 'cambio_estado'

export interface VVehiculoTimeline {
  id: string
  patente_id: string
  tipo: TipoEventoTimeline
  fecha: string
  titulo: string
  subtitulo: string | null
  operador: string | null
}

export interface TipoDocumento {
  id: string
  nombre: string
}

export type EstadoDocumento = 'vencido' | 'por_vencer' | 'vigente' | 'sin_registro'

export interface VDocumentoVencimiento {
  id: string
  patente_id: string
  patente: string
  tipo_documento_id: string
  tipo_documento: string
  fecha_vencimiento: string
  fecha_emision: string | null
  numero_documento: string | null
  archivo_path: string | null
  estado: Exclude<EstadoDocumento, 'sin_registro'>
  dias_restantes: number
}

export interface DocumentoVencimiento {
  patenteId: string
  patente: string
  tipoDocumentoId: string
  tipoDocumento: string
  estado: EstadoDocumento
  fechaVencimiento: string | null
  diasRestantes: number | null
  documentoId: string | null
  numeroDocumento: string | null
  archivoPath: string | null
}

export interface Disponibilidad {
  estado: EstadoVehiculo
  dias: number
  porcentaje: number
}

export interface CostoVehiculo {
  patente_id: string
  patente: string
  mes: string
  costo_total: number
}

/* ─── Flota Mayor (Maquinaria) ─── */

// Maquinaria reutiliza el mismo semáforo operativo de 5 estados que Vehículo.
export type EstadoMaquinaria = EstadoVehiculo

export interface CategoriaMaquinaria {
  id: string
  nombre: string
}

export interface LineaOperacion {
  id: string
  codigo: string
  nombre: string | null
}

export interface Turno {
  id: string
  nombre: string
}

export interface ActividadMaquinaria {
  id: string
  nombre: string
}

export interface SubEquipo {
  id: string
  nombre: string
}

export interface TipoPreventivaMaquinaria {
  id: string
  nombre: string
}

export interface SistemaCorrectivoMaquinaria {
  id: string
  nombre: string
}

// codigos_falla_maquinaria no tiene columna `nombre`: solo `codigo` y `descripcion`.
// `nombre` aquí es una etiqueta derivada para mostrar en selects, no una columna real.
export interface CodigoFallaMaquinaria {
  id: string
  codigo: string
  descripcion: string | null
  sistema_id: string | null
  nombre: string
}

export interface TareaOtraMaquinaria {
  id: string
  nombre: string
}

export interface ProductoInsumo {
  id: string
  nombre: string
  codigo_barras: string | null
}

export interface CondicionEquipo {
  id: string
  nombre: string
}

export interface Maquinaria {
  id: string
  codigo: string
  nombre: string
  categoria_id: string | null
  descripcion: string | null
  activo: boolean
  estado_actual: EstadoMaquinaria
  marca: string | null
  modelo: string | null
  serie: string | null
  anno: number | null
  n_motor: string | null
  rendimiento_teorico: number | null
  patente: string | null
  horometro_llegada: number | null
  fecha_llegada: string | null
  fecha_instalacion: string | null
  fecha_compra: string | null
  dealer: string | null
  propietario: string | null
  maquinaria_padre_id: string | null
}

export type TipoIntervencionMaquinaria = 'PREVENTIVA' | 'CORRECTIVA' | 'OTRA'

export interface VMaquinariaTimeline {
  id: string
  maquinaria_id: string
  tipo: TipoEventoTimeline
  fecha: string
  titulo: string
  subtitulo: string | null
  operador: string | null
}

export interface CostoMaquinaria {
  maquinaria_id: string
  codigo: string
  mes: string
  costo_total: number
}
