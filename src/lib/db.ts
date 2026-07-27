import Dexie, { type Table } from 'dexie'
import type { QueueData } from './offlineTypes'

export interface QueueItem {
  id: string
  timestamp: number
  data: QueueData
  attempts: number
  lastError?: string
}

export interface CatalogCacheRow {
  name: string
  data: unknown[]
  updatedAt: number
}

export interface PerfilCacheRow {
  userId: string
  rol: string
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

  constructor() {
    super('flota_offline_db')
    this.version(1).stores({
      syncQueue: 'id, timestamp',
      catalogCache: 'name',
      perfilCache: 'userId',
      submittedLog: 'id, timestamp',
    })
  }
}

export const db = new FlotaDB()
