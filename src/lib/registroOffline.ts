import { FunctionsHttpError, isAuthRetryableFetchError } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { db } from './db'
import { appendToCatalogCache } from './masterDataCache'
import { enqueue } from './offlineQueue'
import { emailDeRut, rutCanonico } from './rut'
import type { Operador, Rol } from '../types'

// Registro de cuentas nuevas con RUT, con o sin señal.
//
// Sin señal no se puede crear la cuenta en el servidor, así que el registro queda guardado
// en el celular y la persona entra en "modo provisional": puede usar el Checklist, y lo que
// registre queda en la cola. Al volver la señal se crea la cuenta, se inicia sesión y la
// cola se sube a su nombre.
//
// La clave queda guardada en este celular hasta que se crea la cuenta (hace falta para
// iniciar sesión sola al volver la señal) y se borra en ese momento.

export interface RegistroPendiente {
  rut: string
  nombre: string
  apellido: string
  /** Rol pedido si eligió una función base; null si eligió o agregó otra función. */
  rolSolicitado: Rol | null
  /** Función (cargo) elegida cuando no es una de las base. */
  funcion?: string
  password: string
  /** Operador local que el Checklist ya usa como conductor mientras no hay cuenta. */
  operadorId: string
  creadoEn: string
}

const KEY = 'flota_registro_pendiente'
const ERROR_KEY = 'flota_registro_error'
export const REGISTRO_CAMBIO_EVENT = 'flota-registro-cambio'

function avisar() {
  window.dispatchEvent(new Event(REGISTRO_CAMBIO_EVENT))
}

export function leerRegistroPendiente(): RegistroPendiente | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as RegistroPendiente) : null
  } catch {
    return null
  }
}

function guardar(r: RegistroPendiente | null) {
  try {
    if (r) localStorage.setItem(KEY, JSON.stringify(r))
    else localStorage.removeItem(KEY)
  } catch {
    // sin localStorage no hay modo provisional
  }
  avisar()
}

export function cancelarRegistroPendiente() {
  guardar(null)
}

/** Mensaje para mostrar en el Login si el registro sin señal no se pudo completar. */
export function tomarErrorRegistro(): string | null {
  try {
    const msg = localStorage.getItem(ERROR_KEY)
    localStorage.removeItem(ERROR_KEY)
    return msg
  } catch {
    return null
  }
}

function guardarError(msg: string) {
  try {
    localStorage.setItem(ERROR_KEY, msg)
  } catch {
    // best-effort
  }
}

export type ResultadoRegistro = { ok: true } | { ok: false; error: string; code?: string; sinConexion?: boolean }

async function leerErrorFuncion(error: unknown): Promise<{ error: string; code?: string; sinConexion?: boolean }> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: string; code?: string }
      return { error: body.error ?? 'No se pudo crear la cuenta.', code: body.code }
    } catch {
      return { error: 'No se pudo crear la cuenta.' }
    }
  }
  return { error: 'Sin conexión con el servidor.', sinConexion: true }
}

/** Crea la cuenta en el servidor (requiere señal). No inicia sesión. */
export async function crearCuenta(datos: {
  rut: string
  nombre: string
  apellido: string
  rolSolicitado: Rol | null
  funcion?: string
  password: string
  operadorId?: string
}): Promise<ResultadoRegistro> {
  const { error } = await supabase.functions.invoke('solicitar-acceso', {
    body: {
      rut: rutCanonico(datos.rut),
      nombre: datos.nombre,
      apellido: datos.apellido,
      rol_solicitado: datos.rolSolicitado,
      funcion: datos.funcion,
      password: datos.password,
      operador_id: datos.operadorId,
    },
  })
  if (!error) return { ok: true }
  return { ok: false, ...(await leerErrorFuncion(error)) }
}

/** Registro sin señal: guarda la solicitud en el celular y deja a la persona como provisional. */
export async function registrarSinSenal(datos: Omit<RegistroPendiente, 'operadorId' | 'creadoEn'>): Promise<void> {
  const operadorId = crypto.randomUUID()
  // La persona aparece de inmediato como conductor en el Checklist de este celular.
  const operador: Operador = {
    id: operadorId,
    nombre: datos.nombre,
    apellido: datos.apellido,
    rut: rutCanonico(datos.rut),
    email: '',
    activo: true,
  }
  await appendToCatalogCache('operadores', operador)
  // Al subir la cola, si el servidor vinculó a la persona con un operador que ya existía
  // (mismo RUT o mismo nombre), este alta choca por RUT y la cola corrige sola los
  // registros que usaron el id local (ver syncCrearConductor).
  await enqueue({
    type: 'crear_conductor',
    conductor: { id: operadorId, nombre: datos.nombre, apellido: datos.apellido, rut: operador.rut },
  })
  guardar({ ...datos, rut: rutCanonico(datos.rut), operadorId, creadoEn: new Date().toISOString() })
}

/** Catálogos mínimos para un celular sin cuenta (ver catalogos_publicos() en la BD). */
export async function descargarCatalogosPublicos(): Promise<void> {
  if (!navigator.onLine) return
  try {
    const { data, error } = await supabase.rpc('catalogos_publicos')
    if (error || !data) return
    const catalogos = data as Record<string, unknown[]>
    for (const [name, rows] of Object.entries(catalogos)) {
      // No pisa una copia más completa descargada con sesión.
      const actual = await db.catalogCache.get(name)
      if (actual && actual.data.length > 0) continue
      await db.catalogCache.put({ name, data: rows, updatedAt: Date.now() })
    }
  } catch {
    // best-effort
  }
}

let procesando = false

/**
 * Si hay un registro sin señal pendiente y ya hay señal: crea la cuenta e inicia sesión.
 * Devuelve true si la persona quedó con sesión.
 */
export async function procesarRegistroPendiente(): Promise<boolean> {
  const pendiente = leerRegistroPendiente()
  if (!pendiente || procesando || !navigator.onLine) return false
  procesando = true
  try {
    const resultado = await crearCuenta(pendiente)
    if (!resultado.ok) {
      if (resultado.sinConexion) return false
      // "Ya registrado": la persona ya tenía cuenta con ese RUT; se intenta entrar con la
      // clave que escribió. Cualquier otro rechazo se informa en el Login.
      if (resultado.code !== 'ya_registrado') {
        guardar(null)
        guardarError(`No se pudo crear tu cuenta: ${resultado.error}`)
        return false
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailDeRut(pendiente.rut),
      password: pendiente.password,
    })
    if (error || !data.session) {
      if (error && isAuthRetryableFetchError(error)) return false // falla de red: se reintenta
      guardar(null)
      guardarError(
        resultado.ok
          ? 'Tu cuenta se creó, pero no se pudo iniciar sesión. Ingresa con tu RUT y clave.'
          : 'Ese RUT ya tenía una cuenta y la clave no coincide. Ingresa con tu clave; en caso de pérdida de clave, consulta a Control de Gestión. Lo que registraste sigue guardado en el celular.',
      )
      return false
    }
    guardar(null)
    return true
  } finally {
    procesando = false
  }
}
