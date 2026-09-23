import Dexie, { type Table } from 'dexie'
import type { QueueData } from './offlineTypes'

export interface QueueItem {
  id: string
  timestamp: number
  data: QueueData
  attempts: number
  lastError?: string
  /** Usuario que registró el ítem: solo se sube con la sesión de esa misma persona. */
  userId?: string
}

export interface CatalogCacheRow {
  name: string
  data: unknown[]
  updatedAt: number
}

export interface PerfilCacheRow {
  userId: string
  rol: string
  operadorId: string | null
}

export interface EventLogRow {
  id: string
  userId: string | null
  operadorId: string | null
  deviceId: string
  tipo: string
  ocurridoEn: string
  detalle: Record<string, unknown>
}

export interface DraftRow {
  /** `${userId}:${formulario}` — cada persona tiene sus propios borradores. */
  key: string
  data: unknown
  updatedAt: number
}

export interface SubmittedLogRow {
  id: string
  timestamp: number
  label: string
}

class FlotaDB extends Dexie {
  syncQueue!: Table<QueueItem, string>
  catalogCache!: Table<CatalogCacheRow, string>
  perfilCache!: Table<PerfilCacheRow, string>
  submittedLog!: Table<SubmittedLogRow, string>
  eventLog!: Table<EventLogRow, string>
  drafts!: Table<DraftRow, string>

  constructor() {
    super('flota_offline_db')
    this.version(1).stores({
      syncQueue: 'id, timestamp',
      catalogCache: 'name',
      perfilCache: 'userId',
      submittedLog: 'id, timestamp',
    })
    this.version(2).stores({
      eventLog: 'id, ocurridoEn',
    })
    this.version(3).stores({
      drafts: 'key',
    })
  }
}

export const db = new FlotaDB()
