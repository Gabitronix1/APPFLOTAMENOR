import { supabase } from './supabase'
import { db, type QueueItem } from './db'
import type {
  ChecklistPayload,
  IntervencionPayload,
  IntervencionMaquinariaPayload,
  CrearConductorPayload,
  CrearVehiculoPayload,
  CrearLineaPayload,
  QueueData,
  FotoLocal,
} from './offlineTypes'

export const QUEUE_CHANGED_EVENT = 'flota-queue-changed'

export type {
  ChecklistPayload,
  IntervencionPayload,
  IntervencionMaquinariaPayload,
  CrearConductorPayload,
  CrearVehiculoPayload,
  CrearLineaPayload,
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

/* ─── Foto upload helper ─── */

async function subirFoto(bucket: string, path: string, foto: FotoLocal): Promise<string | null> {
  const result = await supabase.storage
    .from(bucket)
    .upload(path, foto.blob, { contentType: foto.blob.type || 'image/jpeg', upsert: false })
  return result.data?.path ?? null
}

/* ─── Sync logic ─── */

async function syncChecklist(payload: ChecklistPayload): Promise<void> {
  const { data: ins, error: insErr } = await supabase
    .from('inspecciones')
    .insert(payload.inspeccion)
    .select('id')
    .single()
  if (insErr || !ins) throw insErr ?? new Error('No se pudo insertar inspección')
  const { error: respErr } = await supabase
    .from('respuestas')
    .insert(payload.respuestas.map(r => ({ ...r, inspeccion_id: (ins as { id: string }).id })))
  if (respErr) throw respErr
}

async function syncIntervencion(payload: IntervencionPayload): Promise<void> {
  const preventiva = payload.preventiva
  if (payload.fotoPreventiva && preventiva) {
    const path = await subirFoto(
      'fotos-intervenciones',
      `${payload.intervencion.uuid_local}.${payload.fotoPreventiva.ext}`,
      payload.fotoPreventiva,
    )
    preventiva.imagen_path = path
  }

  const { data: inv, error: invErr } = await supabase
    .from('intervenciones')
    .insert(payload.intervencion)
    .select('id')
    .single()
  if (invErr || !inv) throw invErr ?? new Error('No se pudo insertar intervención')
  const invId = (inv as { id: string }).id

  if (payload.type === 'intervencion_preventiva' && preventiva) {
    const { error } = await supabase
      .from('intervenciones_preventiva')
      .insert({ ...preventiva, intervencion_id: invId })
    if (error) throw error
  } else if (payload.type === 'intervencion_correctiva' && payload.correctiva) {
    const { data: corr, error: corrErr } = await supabase
      .from('intervenciones_correctiva')
      .insert({ ...payload.correctiva, intervencion_id: invId })
      .select('id')
      .single()
    if (corrErr || !corr) throw corrErr ?? new Error('No se pudo insertar correctiva')
    const corrId = (corr as { id: string }).id
    if (payload.fallas?.length) {
      const { error: fallErr } = await supabase
        .from('fallas_correctiva')
        .insert(payload.fallas.map(f => ({ ...f, correctiva_id: corrId })))
      if (fallErr) throw fallErr
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

  const { data: inv, error: invErr } = await supabase
    .from('intervenciones_maquinaria')
    .insert(payload.intervencion)
    .select('id')
    .single()
  if (invErr || !inv) throw invErr ?? new Error('No se pudo insertar intervención de maquinaria')
  const invId = (inv as { id: string }).id

  if (payload.type === 'intervencion_maquinaria_preventiva' && payload.preventiva) {
    const { data: prev, error: prevErr } = await supabase
      .from('intervencion_maquinaria_preventiva')
      .insert({ ...payload.preventiva, intervencion_id: invId })
      .select('id')
      .single()
    if (prevErr || !prev) throw prevErr ?? new Error('No se pudo insertar preventiva')
    if (payload.desviaciones?.length) {
      const prevId = (prev as { id: string }).id
      const { error: desvErr } = await supabase
        .from('desviaciones_preventiva_maquinaria')
        .insert(payload.desviaciones.map(d => ({ ...d, preventiva_id: prevId })))
      if (desvErr) throw desvErr
    }
  } else if (payload.type === 'intervencion_maquinaria_correctiva' && payload.correctiva) {
    const { error } = await supabase
      .from('intervencion_maquinaria_correctiva')
      .insert({ ...payload.correctiva, intervencion_id: invId })
    if (error) throw error
  } else if (payload.type === 'intervencion_maquinaria_otra' && payload.otra) {
    const { error } = await supabase
      .from('intervencion_maquinaria_otra')
      .insert({ ...payload.otra, intervencion_id: invId })
    if (error) throw error
  }

  if (payload.insumos?.length) {
    const { error: insErr } = await supabase
      .from('insumos_intervencion_maquinaria')
      .insert(payload.insumos.map(i => ({ ...i, intervencion_id: invId })))
    if (insErr) throw insErr
  }
}

async function syncCrearConductor(payload: CrearConductorPayload): Promise<void> {
  const { error } = await supabase.from('operadores').insert(payload.conductor)
  if (error) throw error
}

async function syncCrearVehiculo(payload: CrearVehiculoPayload): Promise<void> {
  const { error } = await supabase.from('patentes').insert(payload.vehiculo)
  if (error) throw error
}

async function syncCrearLinea(payload: CrearLineaPayload): Promise<void> {
  // lineas_operacion.id se autoasigna en el servidor (no tiene sentido client-side
  // porque no es un uuid); si dos personas crean la misma línea sin conexión, el
  // conflicto de `codigo` único simplemente descarta el duplicado.
  const { error } = await supabase.from('lineas_operacion').insert(payload.linea)
  if (error && error.code !== '23505') throw error
}

async function syncItem(item: QueueItem): Promise<void> {
  if (item.data.type === 'checklist') {
    await syncChecklist(item.data)
  } else if (item.data.type === 'crear_conductor') {
    await syncCrearConductor(item.data)
  } else if (item.data.type === 'crear_vehiculo') {
    await syncCrearVehiculo(item.data)
  } else if (item.data.type === 'crear_linea') {
    await syncCrearLinea(item.data)
  } else if (item.data.type.startsWith('intervencion_maquinaria_')) {
    await syncIntervencionMaquinaria(item.data as IntervencionMaquinariaPayload)
  } else {
    await syncIntervencion(item.data as IntervencionPayload)
  }
}

/* ─── Queue operations ─── */

export async function enqueue(data: QueueData): Promise<void> {
  const item: QueueItem = { id: crypto.randomUUID(), timestamp: Date.now(), data, attempts: 0 }
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
  try {
    const items = await listQueue()
    for (const item of items) {
      try {
        await syncItem(item)
        await db.syncQueue.delete(item.id)
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
        await db.syncQueue.update(item.id, {
          attempts: item.attempts + 1,
          lastError: describeError(err),
        })
      }
    }
  } finally {
    await refreshCachedCount()
    syncing = false
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
