import { supabase, readStoredSession } from './supabase'
import { logEvent } from './deviceEvents'
import { db, type QueueItem } from './db'
import type {
  ChecklistPayload,
  IntervencionPayload,
  IntervencionMaquinariaPayload,
  AnomaliaMaquinariaPayload,
  CrearConductorPayload,
  CrearVehiculoPayload,
  CrearLineaPayload,
  CrearFundoPayload,
  GuiaDespachoCrearPayload,
  GuiaDespachoDespacharPayload,
  GuiaDespachoRecibirPayload,
  QueueData,
  FotoLocal,
} from './offlineTypes'

export const QUEUE_CHANGED_EVENT = 'flota-queue-changed'

export type {
  ChecklistPayload,
  IntervencionPayload,
  IntervencionMaquinariaPayload,
  AnomaliaMaquinariaPayload,
  CrearConductorPayload,
  CrearVehiculoPayload,
  CrearLineaPayload,
  CrearFundoPayload,
  GuiaDespachoCrearPayload,
  GuiaDespachoDespacharPayload,
  GuiaDespachoRecibirPayload,
  QueueData,
}

/* ─── Cached count (for synchronous readers like Header.tsx) ─── */

let cachedCount = 0

function notifyChanged() {
  window.dispatchEvent(new Event(QUEUE_CHANGED_EVENT))
}

async function refreshCachedCount() {
  cachedCount = await db.syncQueue.count()
  notifyChanged()
}

export function getOfflineQueueCount(): number {
  return cachedCount
}

if (typeof window !== 'undefined') {
  void refreshCachedCount()
}

/* ─── Helpers de escritura idempotente ─── */

// Todas las filas llevan un id generado en el celular (ver asignarIds). Así:
//  - no se necesita `.select()` después del insert: los roles de terreno (conductor,
//    mecánicos) solo tienen permiso de INSERT, no de lectura, y el `insert().select()`
//    fallaba por RLS dejando el ítem trabado para siempre;
//  - si la señal se corta a mitad de un envío, el reintento no duplica nada: la fila que
//    ya había entrado responde 23505 (clave duplicada) y se sigue con la siguiente.
const DUPLICADO = '23505'

async function insertar(table: string, row: object): Promise<void> {
  const { error } = await supabase.from(table).insert(row)
  if (error && error.code !== DUPLICADO) throw error
}

async function insertarVarios(table: string, rows: object[]): Promise<void> {
  if (!rows.length) return
  const { error } = await supabase.from(table).insert(rows)
  if (!error) return
  if (error.code !== DUPLICADO) throw error
  // El lote se rechaza entero si alguna fila ya existía (envío anterior cortado a medias):
  // se reintenta fila por fila saltando las que ya están.
  for (const row of rows) await insertar(table, row)
}

function nuevoId(): string {
  return crypto.randomUUID()
}

/** Asigna ids locales a las filas que aún no tienen. Devuelve true si cambió algo. */
function asignarIds(data: QueueData): boolean {
  let cambio = false
  const conId = <T extends { id?: string }>(row: T | undefined) => {
    if (row && !row.id) {
      row.id = nuevoId()
      cambio = true
    }
  }
  const todos = <T extends { id?: string }>(rows: T[] | undefined) => rows?.forEach(conId)

  if (data.type === 'checklist') {
    conId(data.inspeccion)
    todos(data.respuestas)
  } else if (data.type === 'intervencion_preventiva' || data.type === 'intervencion_correctiva') {
    conId(data.intervencion)
    conId(data.preventiva)
    conId(data.correctiva)
    todos(data.fallas)
  } else if (data.type.startsWith('intervencion_maquinaria_')) {
    const d = data as IntervencionMaquinariaPayload
    conId(d.intervencion)
    conId(d.preventiva)
    conId(d.correctiva)
    conId(d.otra)
    todos(d.desviaciones)
    todos(d.insumos)
  } else if (data.type === 'anomalia_maquinaria') {
    conId(data.anomalia)
  } else if (data.type === 'guia_despacho_crear') {
    conId(data.guia)
    todos(data.items)
  }
  return cambio
}

/* ─── Foto upload helper ─── */

async function subirFoto(bucket: string, path: string, foto: FotoLocal): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, foto.blob, { contentType: foto.blob.type || 'image/jpeg', upsert: false })
  if (data?.path) return data.path
  // La foto ya se había subido en un intento anterior que se cortó después: se reutiliza.
  const status = (error as { statusCode?: string } | null)?.statusCode
  if (status === '409' || /exist|duplicate/i.test(error?.message ?? '')) return path
  // Antes se seguía con la foto en null y se perdía en silencio; ahora el ítem queda
  // pendiente y se reintenta con la foto.
  throw error ?? new Error('No se pudo subir la foto')
}

/* ─── Sync logic ─── */

async function syncChecklist(payload: ChecklistPayload): Promise<void> {
  const inspeccionId = payload.inspeccion.id!
  await insertar('inspecciones', payload.inspeccion)
  await insertarVarios(
    'respuestas',
    payload.respuestas.map(r => ({ ...r, inspeccion_id: inspeccionId })),
  )
}

async function syncIntervencion(payload: IntervencionPayload): Promise<void> {
  const preventiva = payload.preventiva
  if (payload.fotoPreventiva && preventiva) {
    preventiva.imagen_path = await subirFoto(
      'fotos-intervenciones',
      `${payload.intervencion.uuid_local}.${payload.fotoPreventiva.ext}`,
      payload.fotoPreventiva,
    )
  }

  const invId = payload.intervencion.id!
  await insertar('intervenciones', payload.intervencion)

  if (payload.type === 'intervencion_preventiva' && preventiva) {
    await insertar('intervenciones_preventiva', { ...preventiva, intervencion_id: invId })
  } else if (payload.type === 'intervencion_correctiva' && payload.correctiva) {
    const corrId = payload.correctiva.id!
    await insertar('intervenciones_correctiva', { ...payload.correctiva, intervencion_id: invId })
    if (payload.fallas?.length) {
      await insertarVarios('fallas_correctiva', payload.fallas.map(f => ({ ...f, correctiva_id: corrId })))
    }
  }
}

async function syncIntervencionMaquinaria(payload: IntervencionMaquinariaPayload): Promise<void> {
  const uuid = payload.intervencion.uuid_local

  if (payload.fotoCabecera) {
    payload.intervencion.imagen_path = await subirFoto(
      'fotos-maquinaria',
      `${uuid}-cabecera.${payload.fotoCabecera.ext}`,
      payload.fotoCabecera,
    )
  }
  if (payload.fotoDetalle) {
    const path = await subirFoto('fotos-maquinaria', `${uuid}-detalle.${payload.fotoDetalle.ext}`, payload.fotoDetalle)
    if (payload.preventiva) payload.preventiva.imagen_path = path
    if (payload.correctiva) payload.correctiva.imagen_falla_path = path
  }

  const invId = payload.intervencion.id!
  await insertar('intervenciones_maquinaria', payload.intervencion)

  if (payload.type === 'intervencion_maquinaria_preventiva' && payload.preventiva) {
    const prevId = payload.preventiva.id!
    await insertar('intervencion_maquinaria_preventiva', { ...payload.preventiva, intervencion_id: invId })
    if (payload.desviaciones?.length) {
      await insertarVarios(
        'desviaciones_preventiva_maquinaria',
        payload.desviaciones.map(d => ({ ...d, preventiva_id: prevId })),
      )
    }
  } else if (payload.type === 'intervencion_maquinaria_correctiva' && payload.correctiva) {
    await insertar('intervencion_maquinaria_correctiva', { ...payload.correctiva, intervencion_id: invId })
  } else if (payload.type === 'intervencion_maquinaria_otra' && payload.otra) {
    await insertar('intervencion_maquinaria_otra', { ...payload.otra, intervencion_id: invId })
  }

  if (payload.insumos?.length) {
    await insertarVarios(
      'insumos_intervencion_maquinaria',
      payload.insumos.map(i => ({ ...i, intervencion_id: invId })),
    )
  }
}

async function syncAnomaliaMaquinaria(payload: AnomaliaMaquinariaPayload): Promise<void> {
  await insertar('anomalias_maquinaria', payload.anomalia)
}

// Si el conductor/vehículo creado sin señal ya existía en el servidor (mismo RUT o patente,
// p. ej. otra persona lo creó antes), se usa el id del servidor y se corrigen los registros
// pendientes que apuntaban al id local; si no, quedarían trabados por clave foránea.
async function syncCrearConductor(payload: CrearConductorPayload): Promise<void> {
  const { error } = await supabase.from('operadores').insert(payload.conductor)
  if (!error) return
  if (error.code !== DUPLICADO) throw error
  // Sin RUT, el único duplicado posible es el id: ya se había subido.
  if (!payload.conductor.rut) return
  const { data } = await supabase.from('operadores').select('id').eq('rut', payload.conductor.rut).maybeSingle()
  const existente = (data as { id: string } | null)?.id
  if (existente && existente !== payload.conductor.id) await reemplazarIdLocal('operadores', payload.conductor.id, existente)
}

async function syncCrearVehiculo(payload: CrearVehiculoPayload): Promise<void> {
  const { error } = await supabase.from('patentes').insert(payload.vehiculo)
  if (!error) return
  if (error.code !== DUPLICADO) throw error
  const { data } = await supabase.from('patentes').select('id').eq('patente', payload.vehiculo.patente).maybeSingle()
  const existente = (data as { id: string } | null)?.id
  if (existente && existente !== payload.vehiculo.id) await reemplazarIdLocal('patentes', payload.vehiculo.id, existente)
}

async function syncCrearLinea(payload: CrearLineaPayload): Promise<void> {
  // lineas_operacion.id se autoasigna en el servidor (no tiene sentido client-side
  // porque no es un uuid); si dos personas crean la misma línea sin conexión, el
  // conflicto de `codigo` único simplemente descarta el duplicado.
  await insertar('lineas_operacion', payload.linea)
}

async function syncCrearFundo(payload: CrearFundoPayload): Promise<void> {
  await insertar('fundos', { ...payload.fundo, activo: true })
}

async function syncGuiaDespachoCrear(payload: GuiaDespachoCrearPayload, registradoEn: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Sesión inválida, no se pudo crear la guía.')

  const guiaId = payload.guia.id!
  await insertar('guias_despacho', { ...payload.guia, creado_por: user.id, created_at: registradoEn })
  await insertarVarios(
    'guias_despacho_items',
    payload.items.map(i => ({ ...i, guia_id: guiaId })),
  )
}

async function syncGuiaDespachoDespachar(payload: GuiaDespachoDespacharPayload, registradoEn: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Sesión inválida, no se pudo despachar la guía.')

  let fotoPath: string | null = null
  if (payload.fotoDespacho) {
    fotoPath = await subirFoto('fotos-guias-despacho', `${payload.guia_id}-despacho.${payload.fotoDespacho.ext}`, payload.fotoDespacho)
  }

  for (const item of payload.items) {
    const { error } = await supabase
      .from('guias_despacho_items')
      .update({ cantidad_enviada: item.cantidad_enviada })
      .eq('id', item.item_id)
    if (error) throw error
  }

  const { error: guiaErr } = await supabase
    .from('guias_despacho')
    .update({
      estado: 'despachada',
      despachado_por: user.id,
      // Hora real en que se despachó en terreno, no la hora en que volvió la señal.
      fecha_despacho: registradoEn,
      ...(fotoPath ? { foto_despacho_path: fotoPath } : {}),
    })
    .eq('id', payload.guia_id)
  if (guiaErr) throw guiaErr
}

async function syncGuiaDespachoRecibir(payload: GuiaDespachoRecibirPayload, registradoEn: string): Promise<void> {
  const [fotoPath, firmaPath] = await Promise.all([
    payload.fotoRecepcion
      ? subirFoto('fotos-guias-despacho', `${payload.guia_id}-recepcion.${payload.fotoRecepcion.ext}`, payload.fotoRecepcion)
      : Promise.resolve(null),
    subirFoto('fotos-guias-despacho', `${payload.guia_id}-firma.${payload.firmaRecepcion.ext}`, payload.firmaRecepcion),
  ])

  for (const item of payload.items) {
    const { error } = await supabase
      .from('guias_despacho_items')
      .update({
        cantidad_recibida: item.cantidad_recibida,
        cantidad_devuelta: item.cantidad_devuelta,
        observacion: item.observacion,
      })
      .eq('id', item.item_id)
    if (error) throw error
  }

  const { error: guiaErr } = await supabase
    .from('guias_despacho')
    .update({
      estado: 'recibida',
      recibido_por_nombre: payload.recibido_por_nombre,
      // Hora real de la recepción en faena, no la de sincronización.
      fecha_recepcion: registradoEn,
      ...(fotoPath ? { foto_recepcion_path: fotoPath } : {}),
      firma_recepcion_path: firmaPath,
    })
    .eq('id', payload.guia_id)
  if (guiaErr) throw guiaErr
}

async function syncItem(item: QueueItem): Promise<void> {
  const registradoEn = new Date(item.timestamp).toISOString()
  if (item.data.type === 'checklist') {
    await syncChecklist(item.data)
  } else if (item.data.type === 'crear_conductor') {
    await syncCrearConductor(item.data)
  } else if (item.data.type === 'crear_vehiculo') {
    await syncCrearVehiculo(item.data)
  } else if (item.data.type === 'crear_linea') {
    await syncCrearLinea(item.data)
  } else if (item.data.type === 'crear_fundo') {
    await syncCrearFundo(item.data)
  } else if (item.data.type === 'guia_despacho_crear') {
    await syncGuiaDespachoCrear(item.data, registradoEn)
  } else if (item.data.type === 'guia_despacho_despachar') {
    await syncGuiaDespachoDespachar(item.data, registradoEn)
  } else if (item.data.type === 'guia_despacho_recibir') {
    await syncGuiaDespachoRecibir(item.data, registradoEn)
  } else if (item.data.type === 'anomalia_maquinaria') {
    await syncAnomaliaMaquinaria(item.data)
  } else if (item.data.type.startsWith('intervencion_maquinaria_')) {
    await syncIntervencionMaquinaria(item.data as IntervencionMaquinariaPayload)
  } else {
    await syncIntervencion(item.data as IntervencionPayload)
  }
}

/* ─── Reemplazo de ids locales ─── */

// Recorre el payload cambiando cada string igual a `viejo` por `nuevo`, sin tocar las
// fotos (Blob), que no sobreviven un JSON.stringify.
function reemplazarEnObjeto(obj: unknown, viejo: string, nuevo: string): boolean {
  let cambio = false
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => {
      if (v === viejo) {
        obj[i] = nuevo
        cambio = true
      } else if (reemplazarEnObjeto(v, viejo, nuevo)) cambio = true
    })
  } else if (obj && typeof obj === 'object' && !(obj instanceof Blob)) {
    const rec = obj as Record<string, unknown>
    for (const k of Object.keys(rec)) {
      if (rec[k] === viejo) {
        rec[k] = nuevo
        cambio = true
      } else if (reemplazarEnObjeto(rec[k], viejo, nuevo)) cambio = true
    }
  }
  return cambio
}

async function reemplazarIdLocal(catalogo: string, viejo: string, nuevo: string): Promise<void> {
  const items = await db.syncQueue.toArray()
  for (const it of items) {
    if (reemplazarEnObjeto(it.data, viejo, nuevo)) await db.syncQueue.update(it.id, { data: it.data })
  }
  const cache = await db.catalogCache.get(catalogo)
  if (cache) {
    await db.catalogCache.put({
      ...cache,
      data: (cache.data as { id: string }[]).filter(r => r.id !== viejo),
    })
  }
}

/* ─── Queue operations ─── */

export async function enqueue(data: QueueData): Promise<void> {
  asignarIds(data)
  const item: QueueItem = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    data,
    attempts: 0,
    userId: readStoredSession()?.user.id,
  }
  await db.syncQueue.add(item)
  await refreshCachedCount()
  if (navigator.onLine) void syncAll()
}

export async function listQueue(): Promise<QueueItem[]> {
  return db.syncQueue.orderBy('timestamp').toArray()
}

let syncing = false

export async function syncAll(): Promise<void> {
  if (syncing) return
  syncing = true
  let subidos = 0
  let conError = 0
  try {
    const items = await listQueue()
    if (!items.length) return
    const { data: sesion } = await supabase.auth.getSession()
    const userId = sesion.session?.user.id
    // Sin sesión válida (sin señal y token vencido) no tiene sentido intentar: fallaría por
    // permisos y sumaría intentos fallidos. Se reintenta cuando se renueve la sesión.
    if (!userId) return

    for (const listado of items) {
      // Se relee de IndexedDB: un ítem anterior pudo corregirle ids (ver reemplazarIdLocal).
      const item = await db.syncQueue.get(listado.id)
      if (!item) continue
      // Cada registro se sube con la cuenta de quien lo hizo: con otra cuenta fallaría por
      // permisos o quedaría a nombre de otra persona.
      if (item.userId && item.userId !== userId) {
        const aviso = 'Registrado por otra cuenta: se subirá cuando esa persona vuelva a entrar en este celular.'
        if (item.lastError !== aviso) await db.syncQueue.update(item.id, { lastError: aviso })
        continue
      }
      try {
        // Ítems encolados con una versión anterior de la app: se les asignan ids y se
        // guardan antes de enviar, para que un reintento use los mismos.
        if (asignarIds(item.data)) await db.syncQueue.update(item.id, { data: item.data })
        await syncItem(item)
        await db.syncQueue.delete(item.id)
        subidos++
        await db.submittedLog.add({
          id: item.id,
          timestamp: Date.now(),
          label: labelFor(item.data),
        })
        const count = await db.submittedLog.count()
        if (count > 50) {
          const oldest = await db.submittedLog.orderBy('timestamp').limit(count - 50).toArray()
          await db.submittedLog.bulkDelete(oldest.map(o => o.id))
        }
      } catch (err) {
        conError++
        await db.syncQueue.update(item.id, {
          attempts: item.attempts + 1,
          lastError: describeError(err),
          // Guarda las rutas de fotos ya subidas para no depender de volver a subirlas.
          data: item.data,
        })
      }
    }
  } finally {
    await refreshCachedCount()
    syncing = false
    if (subidos || conError) {
      void logEvent('sincronizacion', { subidos, con_error: conError, pendientes: cachedCount })
    }
  }
}

// Los errores de supabase-js (Postgrest/Storage) son objetos planos {message, details, code},
// no instancias de Error — err instanceof Error los pasaba por alto y perdía el mensaje real.
function describeError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    const e = err as { message: string; details?: string; code?: string }
    return [e.code, e.message, e.details].filter(Boolean).join(' — ')
  }
  try {
    return JSON.stringify(err)
  } catch {
    return 'Error desconocido'
  }
}

function labelFor(data: QueueData): string {
  if (data.type === 'checklist') return 'Checklist'
  if (data.type === 'crear_conductor') return 'Conductor nuevo'
  if (data.type === 'crear_vehiculo') return 'Vehículo nuevo'
  if (data.type === 'crear_linea') return 'Línea nueva'
  if (data.type === 'crear_fundo') return 'Fundo nuevo'
  if (data.type === 'guia_despacho_crear') return 'Guía de despacho nueva'
  if (data.type === 'guia_despacho_despachar') return 'Guía de despacho: despacho'
  if (data.type === 'guia_despacho_recibir') return 'Guía de despacho: recepción'
  if (data.type === 'anomalia_maquinaria') return 'Anomalía de maquinaria'
  if (data.type.startsWith('intervencion_maquinaria_')) return 'Intervención de maquinaria'
  return 'Intervención de vehículo'
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void syncAll())
  // El evento 'online' del navegador no siempre se dispara de forma confiable en celulares
  // (p. ej. al desactivar modo avión con la app en segundo plano). Este chequeo periódico
  // es un respaldo: si hay conexión y algo pendiente, reintenta sin depender de ese evento.
  setInterval(() => {
    if (navigator.onLine && cachedCount > 0) void syncAll()
  }, 15000)
}
