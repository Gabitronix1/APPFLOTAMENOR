import { useCallback, useEffect, useRef, useState } from 'react'
import { db } from '../lib/db'
import { readStoredSession } from '../lib/supabase'

// Borrador automático de un formulario de terreno. Guarda el estado en IndexedDB mientras
// se llena (y al instante cuando la app pasa a segundo plano), para que si el celular
// cierra la app —administrador de tareas, falta de memoria, batería— al volver a abrirla
// se pueda continuar donde quedó, con o sin señal. Las fotos (File) se guardan tal cual.

interface Opciones<T> {
  /** true si el estado no tiene nada que valga la pena guardar (formulario recién abierto). */
  vacio: (estado: T) => boolean
  /** Carga el borrador en el formulario. */
  restaurar: (estado: T) => void
  /** false mientras no se está editando (p. ej. pantalla de "registrado con éxito"). */
  activo?: boolean
}

export interface BorradorPendiente {
  actualizado: number
}

const DEBOUNCE_MS = 400

export function useBorrador<T>(formulario: string, estado: T, { vacio, restaurar, activo = true }: Opciones<T>) {
  const key = `${readStoredSession()?.user.id ?? 'anon'}:${formulario}`
  const [pendiente, setPendiente] = useState<BorradorPendiente | null>(null)

  // No se escribe nada hasta saber si había un borrador y qué decidió la persona: si no,
  // el formulario vacío pisaría el borrador antes de poder ofrecer "Continuar".
  const decidido = useRef(false)
  const datosPendientes = useRef<T | null>(null)
  const ultimo = useRef(estado)
  ultimo.current = estado
  const activoRef = useRef(activo)
  activoRef.current = activo
  const vacioRef = useRef(vacio)
  vacioRef.current = vacio
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const guardar = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    if (!decidido.current || !activoRef.current) return
    try {
      if (vacioRef.current(ultimo.current)) await db.drafts.delete(key)
      else await db.drafts.put({ key, data: ultimo.current, updatedAt: Date.now() })
    } catch {
      // Best-effort: sin IndexedDB no hay borrador, pero el formulario sigue funcionando.
    }
  }, [key])

  useEffect(() => {
    let cancelado = false
    decidido.current = false
    void db.drafts
      .get(key)
      .then(row => {
        if (cancelado) return
        if (row && !vacioRef.current(row.data as T)) {
          datosPendientes.current = row.data as T
          setPendiente({ actualizado: row.updatedAt })
        } else {
          decidido.current = true
        }
      })
      .catch(() => {
        decidido.current = true
      })
    return () => {
      cancelado = true
    }
  }, [key])

  useEffect(() => {
    if (!decidido.current || !activo) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void guardar(), DEBOUNCE_MS)
  }, [estado, activo, guardar])

  // Al pasar a segundo plano se guarda sin esperar: es justo cuando el sistema puede matar la app.
  useEffect(() => {
    const alOcultar = () => {
      if (document.visibilityState === 'hidden') void guardar()
    }
    const alSalir = () => void guardar()
    document.addEventListener('visibilitychange', alOcultar)
    window.addEventListener('pagehide', alSalir)
    return () => {
      document.removeEventListener('visibilitychange', alOcultar)
      window.removeEventListener('pagehide', alSalir)
      void guardar()
    }
  }, [guardar])

  const continuar = useCallback(() => {
    if (datosPendientes.current) restaurar(datosPendientes.current)
    datosPendientes.current = null
    decidido.current = true
    setPendiente(null)
  }, [restaurar])

  const descartar = useCallback(() => {
    datosPendientes.current = null
    decidido.current = true
    setPendiente(null)
    void db.drafts.delete(key).catch(() => undefined)
  }, [key])

  /** Llamar después de registrar con éxito: el borrador ya no hace falta. */
  const limpiar = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    await db.drafts.delete(key).catch(() => undefined)
  }, [key])

  return { pendiente, continuar, descartar, limpiar }
}
