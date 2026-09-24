export interface ChecklistPayload {
  type: 'checklist'
  inspeccion: {
    /** Id generado en el celular antes del primer intento: hace idempotente el reintento. */
    id?: string
    operador_id: string
    patente_id: string
    kilometraje: number
    fecha: string
    uuid_local: string
    obs_general: string | null
    operativo: boolean
    linea: string | null
  }
  respuestas: {
    id?: string
    pregunta_id: number
    valor: boolean
    observacion: string | null
    /** Solo aplica a la pregunta Tablero (id 5); null en el resto de las preguntas. */
    testigo_naranjo?: boolean | null
    testigo_rojo?: boolean | null
    testigo_abs?: boolean | null
    /** Solo aplica a la pregunta Espejos (id 9); null en el resto de las preguntas. */
    afecta_campo_visual?: boolean | null
  }[]
}

export interface FotoLocal {
  blob: Blob
  ext: string
}

export interface IntervencionPayload {
  type: 'intervencion_preventiva' | 'intervencion_correctiva'
  intervencion: {
    id?: string
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
    id?: string
    tipo_preventiva_id: string
    descripcion: string
    imagen_path: string | null
    fecha_termino: string
    hora_termino: string
    costo: number | null
  }
  correctiva?: {
    id?: string
    descripcion_falla: string
    fecha_inicio: string
    hora_inicio: string
    fecha_termino: string
    hora_termino: string
    causa_probable: string
    diagnostico: string
    costo: number | null
  }
  fallas?: { id?: string; tipo_falla: string }[]
  /** Foto de la preventiva, guardada localmente y subida durante la sincronización. */
  fotoPreventiva?: FotoLocal
}

export interface IntervencionMaquinariaPayload {
  type: 'intervencion_maquinaria_preventiva' | 'intervencion_maquinaria_correctiva' | 'intervencion_maquinaria_otra'
  intervencion: {
    id?: string
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
    id?: string
    tipo_preventiva_id: string | null
    descripcion: string
    imagen_path: string | null
    fecha_termino: string
    hora_termino: string
    condicion_equipo_id: string | null
    costo: number | null
  }
  desviaciones?: { id?: string; descripcion: string }[]
  correctiva?: {
    id?: string
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
    id?: string
    tarea_id: string | null
    descripcion: string
    fecha_termino: string
    hora_termino: string
    condicion_equipo_id: string | null
    costo: number | null
  }
  insumos?: { id?: string; producto_id: string; barcode: string | null; cantidad: number }[]
  /** Foto de cabecera (equipo), guardada localmente y subida durante la sincronización. */
  fotoCabecera?: FotoLocal
  /** Foto de detalle (preventiva o falla correctiva), guardada localmente y subida durante la sincronización. */
  fotoDetalle?: FotoLocal
}

export interface AnomaliaMaquinariaPayload {
  type: 'anomalia_maquinaria'
  anomalia: {
    id?: string
    maquinaria_id: string
    linea_id: string | null
    fecha: string
    descripcion: string
    criticidad: 'baja' | 'media' | 'alta'
    plazo_reparacion: string | null
    responsable_id: string | null
  }
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
    marca?: string | null
    modelo?: string | null
    anno?: number | null
    vin?: string | null
    motor?: string | null
    condicion?: 'INTERNO' | 'ARRIENDO' | null
    area?: string | null
    responsable_nombre?: string | null
    responsable_cargo?: string | null
  }
}

export interface CrearLineaPayload {
  type: 'crear_linea'
  linea: { codigo: string; nombre: string | null }
}

export interface CrearFundoPayload {
  type: 'crear_fundo'
  fundo: { id: string; nombre: string; contrato: string }
}

export interface GuiaDespachoCrearPayload {
  type: 'guia_despacho_crear'
  guia: {
    id?: string
    fundo_id: string
    contrato: string | null
    patente_id: string | null
    conductor_id: string | null
    comentarios: string | null
  }
  items: { id?: string; producto_id: string; equipo_id: string | null; cantidad_planificada: number }[]
}

export interface GuiaDespachoDespacharPayload {
  type: 'guia_despacho_despachar'
  /** Id real de la guía en el servidor: solo se puede encolar sobre una guía ya sincronizada. */
  guia_id: string
  items: { item_id: string; cantidad_enviada: number }[]
  fotoDespacho?: FotoLocal
}

export interface GuiaDespachoRecibirPayload {
  type: 'guia_despacho_recibir'
  guia_id: string
  recibido_por_nombre: string
  items: { item_id: string; cantidad_recibida: number; cantidad_devuelta: number; observacion: string | null }[]
  fotoRecepcion?: FotoLocal
  firmaRecepcion: FotoLocal
}

export type QueueData =
  | ChecklistPayload
  | IntervencionPayload
  | IntervencionMaquinariaPayload
  | AnomaliaMaquinariaPayload
  | CrearConductorPayload
  | CrearVehiculoPayload
  | CrearLineaPayload
  | CrearFundoPayload
  | GuiaDespachoCrearPayload
  | GuiaDespachoDespacharPayload
  | GuiaDespachoRecibirPayload
