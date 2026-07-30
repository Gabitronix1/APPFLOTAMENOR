import { useCallback, useEffect, useState } from 'react'
import type { QueueItem } from '../lib/db'
import {
  QUEUE_CHANGED_EVENT,
  enqueue as enqueueItem,
  getOfflineQueueCount,
  listQueue,
  syncAll as syncAllItems,
} from '../lib/offlineQueue'
import type { QueueData } from '../lib/offlineTypes'

export { QUEUE_CHANGED_EVENT, getOfflineQueueCount }
export type {
  ChecklistPayload,
  IntervencionPayload,
  IntervencionMaquinariaPayload,
  CrearConductorPayload,
  CrearVehiculoPayload,
  FotoLocal,
} from '../lib/offlineTypes'

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([])

  const refresh = useCallback(() => {
    void listQueue().then(setQueue)
  }, [])

  useEffect(() => {
    refresh()
    if (navigator.onLine) void syncAllItems().then(refresh)
    const handleOnline = () => { void syncAllItems().then(refresh) }
    window.addEventListener('online', handleOnline)
    window.addEventListener(QUEUE_CHANGED_EVENT, refresh)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener(QUEUE_CHANGED_EVENT, refresh)
    }
  }, [refresh])

  const enqueue = useCallback(async (data: QueueData) => {
    await enqueueItem(data)
  }, [])

  const syncAll = useCallback(async () => {
    await syncAllItems()
  }, [])

  return { queue, pendingCount: queue.length, enqueue, syncAll }
}
