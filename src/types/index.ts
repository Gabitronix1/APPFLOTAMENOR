export type Rol = 'operador' | 'encargado' | 'admin'

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

export interface Resolucion {
  id: string
  inspeccion_id: string
  pregunta_id: number
  resuelta_por: string
  descripcion: string
  tipo: 'resuelto' | 'derivado' | 'pendiente'
  fecha: string
}

export interface Operador {
  id: string
  nombre: string
  apellido: string
  rut: string
  email: string
  activo: boolean
}

export interface Patente {
  id: string
  patente: string
  descripcion: string
  activo: boolean
}

export interface Fundo {
  id: string
  nombre: string
  contrato: string
  activo: boolean
}

export type TipoResolucion = 'resuelto' | 'derivado' | 'pendiente'
