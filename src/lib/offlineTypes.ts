export interface ChecklistPayload {
  type: 'checklist'
  inspeccion: {
    operador_id: string
    patente_id: string
    kilometraje: number
    fecha: string
    uuid_local: string
    obs_general: string | null
    operativo: boolean
    linea: string | null
  }
  respuestas: { pregunta_id: number; valor: boolean; observacion: string | null }[]
}

export interface FotoLocal {
  blob: Blob
  ext: string
}

export interface IntervencionPayload {
  type: 'intervencion_preventiva' | 'intervencion_correctiva'
  intervencion: {
    operador_id: string
    patente_id: string
    linea: string
    tipo_vehiculo: string
    odometro: number
    tipo: 'PREVENTIVA' | 'CORRECTIVA'
    f_registro: string
    uuid_local: string
  }
  preventiva?: {
    tipo_preventiva_id: string
    descripcion: string
    imagen_path: string | null
    fecha_termino: string
    hora_termino: string
    costo: number | null
  }
  correctiva?: {
    descripcion_falla: string
    fecha_inicio: string
    hora_inicio: string
    fecha_termino: string
    hora_termino: string
    causa_probable: string
    diagnostico: string
    costo: number | null
  }
  fallas?: { tipo_falla: string }[]
  /** Foto de la preventiva, guardada localmente y subida durante la sincronización. */
  fotoPreventiva?: FotoLocal
}

export interface IntervencionMaquinariaPayload {
  type: 'intervencion_maquinaria_preventiva' | 'intervencion_maquinaria_correctiva' | 'intervencion_maquinaria_otra'
  intervencion: {
    responsable_id: string
    maquinaria_id: string
    linea_id: string
    turno_id: string | null
    actividad_id: string | null
    sub_equipo_id: string | null
    horometro: number
    imagen_path: string | null
    tipo: 'PREVENTIVA' | 'CORRECTIVA' | 'OTRA'
    fecha_inicio: string
    hora_inicio: string
    uuid_local: string
  }
  preventiva?: {
    tipo_preventiva_id: string | null
    descripcion: string
    imagen_path: string | null
    fecha_termino: string
    hora_termino: string
    condicion_equipo_id: string | null
    costo: number | null
  }
  desviaciones?: { descripcion: string }[]
  correctiva?: {
    hora_aviso_falla: string
    descripcion_falla: string
    imagen_falla_path: string | null
    sistema_id: string | null
    codigo_falla_id: string | null
    causa_probable: string
    solucion_propuesta: string
    fecha_termino: string
    hora_termino: string
    condicion_equipo_id: string | null
    costo: number | null
  }
  otra?: {
    tarea_id: string | null
    descripcion: string
    fecha_termino: string
    hora_termino: string
    condicion_equipo_id: string | null
    costo: number | null
  }
  insumos?: { producto_id: string; barcode: string | null; cantidad: number }[]
  /** Foto de cabecera (equipo), guardada localmente y subida durante la sincronización. */
  fotoCabecera?: FotoLocal
  /** Foto de detalle (preventiva o falla correctiva), guardada localmente y subida durante la sincronización. */
  fotoDetalle?: FotoLocal
}

export interface CrearConductorPayload {
  type: 'crear_conductor'
  conductor: { id: string; nombre: string; apellido: string; rut: string | null }
}

export interface CrearVehiculoPayload {
  type: 'crear_vehiculo'
  vehiculo: {
    id: string
    patente: string
    categoria_id: number | null
    linea: string | null
    descripcion: string | null
  }
}

export interface CrearLineaPayload {
  type: 'crear_linea'
  linea: { codigo: string; nombre: string | null }
}

export type QueueData =
  | ChecklistPayload
  | IntervencionPayload
  | IntervencionMaquinariaPayload
  | CrearConductorPayload
  | CrearVehiculoPayload
  | CrearLineaPayload
