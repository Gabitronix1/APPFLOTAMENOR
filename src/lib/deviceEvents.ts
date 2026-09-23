import { supabase } from './supabase'
import { db, type EventLogRow } from './db'

// Registro de uso del celular (inicios de sesión con/sin señal, periodos sin señal,
// sincronizaciones). Se guarda primero en IndexedDB y se sube a `eventos_dispositivo`
// cuando hay señal, para que los jefes vean en "Uso sin señal" cómo se está usando la app
// en faena aunque el evento haya ocurrido sin conexión.

export type TipoEvento =
  | 'app_abierta'
  | 'login'
  | 'logout'
  | 'sin_senal_inicio'
  | 'sin_senal_fin'
  | 'sincronizacion'

const DEVICE_ID_KEY = 'flota_device_id'
const OFFLINE_SINCE_KEY = 'flota_offline_since'
// Los eventos que no se logran subir (p. ej. de otra cuenta que ya no entra en este
// celular) se descartan pasado este plazo para no llenar el almacenamiento.
const MAX_EDAD_EVENTO_MS = 30 * 24 * 60 * 60 * 1000

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Sin localStorage el registro de uso es best-effort.
  }
}

export function getDeviceId(): string {
  let id = safeGet(DEVICE_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    safeSet(DEVICE_ID_KEY, id)
  }
  return id
}

let contexto: { userId: string | null; operadorId: string | null } = { userId: null, operadorId: null }

export function setEventContext(userId: string | null, operadorId: string | null) {
  contexto = { userId, operadorId }
}

export async function logEvent(tipo: TipoEvento, detalle: Record<string, unknown> = {}): Promise<void> {
  const row: EventLogRow = {
    id: crypto.randomUUID(),
    userId: contexto.userId,
    operadorId: contexto.operadorId,
    deviceId: getDeviceId(),
    tipo,
    ocurridoEn: new Date().toISOString(),
    detalle,
  }
  try {
    await db.eventLog.add(row)
  } catch {
    return
  }
  if (navigator.onLine) void flushEvents()
}

let flushing = false

export async function flushEvents(): Promise<void> {
  if (flushing || !navigator.onLine) return
  flushing = true
  try {
    const limite = new Date(Date.now() - MAX_EDAD_EVENTO_MS).toISOString()
    await db.eventLog.where('ocurridoEn').below(limite).delete()

    const { data } = await supabase.auth.getSession()
    const userId = data.session?.user.id
    if (!userId) return

    // Los eventos sin usuario (p. ej. "sin señal" registrado antes de cargar la sesión) se
    // atribuyen a quien usa el celular: cada trabajador usa su propio teléfono.
    const propios = (await db.eventLog.orderBy('ocurridoEn').toArray()).filter(
      e => e.userId === userId || e.userId === null,
    )
    const dispositivo = navigator.userAgent.slice(0, 250)
    for (const e of propios) {
      const { error } = await supabase.from('eventos_dispositivo').insert({
        id: e.id,
        user_id: userId,
        operador_id: e.operadorId,
        device_id: e.deviceId,
        tipo: e.tipo,
        ocurrido_en: e.ocurridoEn,
        detalle: e.detalle,
        dispositivo,
      })
      // 23505 = ya se había subido en un intento anterior que se cortó antes de borrarlo.
      if (error && error.code !== '23505') {
        // Sin red (o falla puntual): se reintenta en la próxima sincronización.
        if (!error.code) return
        // Rechazo permanente del servidor (datos inválidos): se descarta para no trabar la cola.
      }
      await db.eventLog.delete(e.id)
    }
  } catch {
    // Best-effort: se reintenta en la próxima sincronización.
  } finally {
    flushing = false
  }
}

/* ─── Periodos sin señal ─── */

function marcarSinSenal() {
  if (safeGet(OFFLINE_SINCE_KEY)) return
  const ahora = new Date().toISOString()
  safeSet(OFFLINE_SINCE_KEY, ahora)
  void logEvent('sin_senal_inicio')
}

function marcarConSenal() {
  const desde = safeGet(OFFLINE_SINCE_KEY)
  if (!desde) return
  safeSet(OFFLINE_SINCE_KEY, null)
  const duracionMin = Math.max(0, Math.round((Date.now() - new Date(desde).getTime()) / 60000))
  void logEvent('sin_senal_fin', { desde, duracion_min: duracionMin })
}

export function getOfflineSince(): string | null {
  return safeGet(OFFLINE_SINCE_KEY)
}

if (typeof window !== 'undefined') {
  window.addEventListener('offline', marcarSinSenal)
  window.addEventListener('online', () => {
    marcarConSenal()
    void flushEvents()
  })
  // Si la app se abre sin señal, o se abre con señal tras haberse cerrado estando sin
  // señal, el evento del navegador no se dispara: se revisa al arrancar.
  if (navigator.onLine) marcarConSenal()
  else marcarSinSenal()
}
