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
    f_registro: string
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
  insumos?: { producto_id: string; codigo_barras: string | null; cantidad: number }[]
}

export type QueueItem = {
  id: string
  timestamp: number
  data: ChecklistPayload | IntervencionPayload | IntervencionMaquinariaPayload
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

async function syncIntervencionMaquinaria(payload: IntervencionMaquinariaPayload): Promise<void> {
  const { data: inv, error: invErr } = await supabase
    .from('intervenciones_maquinaria')
    .insert(payload.intervencion)
    .select('id')
    .single()
  if (invErr || !inv) throw invErr ?? new Error('No se pudo insertar intervención de maquinaria')
  const invId = (inv as { id: string }).id

  if (payload.type === 'intervencion_maquinaria_preventiva' && payload.preventiva) {
    const { data: prev, error: prevErr } = await supabase
      .from('intervenciones_preventiva_maquinaria')
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
      .from('intervenciones_correctiva_maquinaria')
      .insert({ ...payload.correctiva, intervencion_id: invId })
    if (error) throw error
  } else if (payload.type === 'intervencion_maquinaria_otra' && payload.otra) {
    const { error } = await supabase
      .from('intervenciones_otra_maquinaria')
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

async function syncItem(item: QueueItem): Promise<void> {
  if (item.data.type === 'checklist') {
    await syncChecklist(item.data)
  } else if (item.data.type.startsWith('intervencion_maquinaria_')) {
    await syncIntervencionMaquinaria(item.data as IntervencionMaquinariaPayload)
  } else {
    await syncIntervencion(item.data as IntervencionPayload)
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

  const enqueue = useCallback((data: ChecklistPayload | IntervencionPayload | IntervencionMaquinariaPayload) => {
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
