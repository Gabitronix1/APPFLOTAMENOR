import { useEffect, useState } from 'react'
import { db } from '../lib/db'

/**
 * Carga un catálogo maestro con estrategia "cache primero, red en segundo plano":
 * muestra inmediatamente la última copia guardada en IndexedDB (funciona sin conexión
 * desde el arranque) y la reemplaza por datos frescos si hay red.
 */
export function useCatalog<T>(name: string, fetcher: () => Promise<T[]>): { data: T[]; loading: boolean } {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function run() {
      const cached = await db.catalogCache.get(name)
      if (cached && !cancelled) {
        setData(cached.data as T[])
        setLoading(false)
      }
      if (navigator.onLine) {
        try {
          const fresh = await fetcher()
          if (!cancelled) {
            setData(fresh)
            setLoading(false)
          }
          await db.catalogCache.put({ name, data: fresh as unknown[], updatedAt: Date.now() })
        } catch {
          if (!cancelled && !cached) setLoading(false)
        }
      } else if (!cached && !cancelled) {
        setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name])

  return { data, loading }
}
