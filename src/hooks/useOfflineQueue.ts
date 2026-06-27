import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export const QUEUE_CHANGED_EVENT = 'flota-queue-changed'
const QUEUE_KEY = 'flota_offline_queue'

/* ─── Payload types ─── */

export interface ChecklistPayload {
  type: 'checklist'
  inspeccion: {
    operador_id: string
    patente_id: string
    linea: string
    tipo_vehiculo: string
    odometro: number
    f_registro: string
    uuid_local: string
    obs_general: string | null
    operativo: boolean
  }
  respuestas: { pregunta: number; respuesta: boolean; observacion: string | null }[]
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
  }
  correctiva?: {
    descripcion_falla: string
    fecha_inicio: string
    hora_inicio: string
    fecha_termino: string
    hora_termino: string
    causa_probable: string
    diagnostico: string
  }
  fallas?: { tipo_falla: string }[]
}

export type QueueItem = {
  id: string
  timestamp: number
  data: ChecklistPayload | IntervencionPayload
}

/* ─── LocalStorage helpers ─── */

function readQueue(): QueueItem[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') }
  catch { return [] }
}

function writeQueue(items: QueueItem[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event(QUEUE_CHANGED_EVENT))
}

export function getOfflineQueueCount(): number {
  return readQueue().length
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
  const { data: inv, error: invErr } = await supabase
    .from('intervenciones')
    .insert(payload.intervencion)
    .select('id')
    .single()
  if (invErr || !inv) throw invErr ?? new Error('No se pudo insertar intervención')
  const invId = (inv as { id: string }).id

  if (payload.type === 'intervencion_preventiva' && payload.preventiva) {
    const { error } = await supabase
      .from('intervenciones_preventiva')
      .insert({ ...payload.preventiva, intervencion_id: invId })
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

async function syncItem(item: QueueItem): Promise<void> {
  if (item.data.type === 'checklist') {
    await syncChecklist(item.data)
  } else {
    await syncIntervencion(item.data)
  }
}

/* ─── Hook ─── */

export function useOfflineQueue() {
  const [queue, setQueueState] = useState<QueueItem[]>(readQueue)
  const syncingRef = useRef(false)

  const syncAll = useCallback(async () => {
    const current = readQueue()
    if (!current.length || syncingRef.current) return
    syncingRef.current = true
    const failed: QueueItem[] = []
    for (const item of current) {
      try { await syncItem(item) }
      catch { failed.push(item) }
    }
    setQueueState(failed)
    writeQueue(failed)
    syncingRef.current = false
  }, [])

  const enqueue = useCallback((data: ChecklistPayload | IntervencionPayload) => {
    const item: QueueItem = { id: crypto.randomUUID(), timestamp: Date.now(), data }
    setQueueState(prev => {
      const next = [...prev, item]
      writeQueue(next)
      return next
    })
  }, [])

  // Sync on mount (if online) and when connection is restored
  useEffect(() => {
    if (navigator.onLine) void syncAll()
    const handleOnline = () => void syncAll()
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [syncAll])

  // Listen for external queue changes (from other tabs)
  useEffect(() => {
    const handleChanged = () => setQueueState(readQueue())
    window.addEventListener(QUEUE_CHANGED_EVENT, handleChanged)
    return () => window.removeEventListener(QUEUE_CHANGED_EVENT, handleChanged)
  }, [])

  return { queue, pendingCount: queue.length, enqueue, syncAll }
}
