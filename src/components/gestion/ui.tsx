import type { ReactNode } from 'react'
import { BRAND, fmtDate } from '../../lib/constants'
import { CONDICION_INFO } from '../../lib/gestionFlota'
import type { Condicion, ItemEstado } from '../../lib/gestionFlota'

export const COLOR = {
  ok: BRAND.primary,
  P: BRAND.warn,
  D: BRAND.fault,
  dark: BRAND.dark,
  muted: '#9CA3AF',
  grid: '#E5E7EB',
} as const

export const tooltipStyle = {
  contentStyle: { borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,.08)' },
  labelStyle: { fontWeight: 600, color: BRAND.dark, marginBottom: 2 },
  cursor: { fill: 'rgba(6,45,44,0.05)' },
}

export function Seccion({ id, titulo, hint, acciones, children }: {
  id?: string
  titulo: string
  hint?: string
  acciones?: ReactNode
  children: ReactNode
}) {
  return (
    <section id={id} className="mb-8 scroll-mt-40">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h2 className="font-bold text-dark text-base">{titulo}</h2>
          {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
        </div>
        {acciones && <div className="flex items-center gap-2">{acciones}</div>}
      </div>
      {children}
    </section>
  )
}

// Variación respecto al período anterior. `mejorSiBaja` invierte el color (ej: % con falla).
export function Delta({ actual, anterior, mejorSiBaja = false, sufijo = '', puntos = false }: {
  actual: number
  anterior: number | null | undefined
  mejorSiBaja?: boolean
  sufijo?: string
  puntos?: boolean
}) {
  if (anterior == null) return null
  const diff = actual - anterior
  if (!puntos && anterior === 0 && actual === 0) return <span className="text-xs text-gray-400">sin cambio</span>
  const valor = puntos ? diff : anterior ? Math.round((diff / anterior) * 100) : null
  if (valor === 0 || (valor == null && diff === 0)) return <span className="text-xs text-gray-400">sin cambio</span>
  const sube = diff > 0
  const bueno = mejorSiBaja ? !sube : sube
  const texto = valor == null ? 'nuevo' : `${sube ? '+' : ''}${valor}${puntos ? ' pts' : '%'}${sufijo}`
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${bueno ? 'text-primary' : 'text-fault'}`}>
      <span aria-hidden>{sube ? '▲' : '▼'}</span>
      {texto}
      <span className="text-gray-400 font-normal ml-1">vs anterior</span>
    </span>
  )
}

export function Tile({ label, value, sub, tono, onClick, activo, title }: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tono?: 'fault' | 'warn' | 'ok'
  onClick?: () => void
  activo?: boolean
  title?: string
}) {
  const color = tono === 'fault' ? 'text-fault' : tono === 'warn' ? 'text-warn' : tono === 'ok' ? 'text-primary' : 'text-dark'
  const cls = `card py-3 px-4 text-left min-w-0 ${onClick ? 'hover:shadow-md transition-shadow cursor-pointer' : ''} ${activo ? 'ring-2 ring-primary' : ''}`
  const body = (
    <>
      <p className="text-xs text-gray-500 mb-1 truncate">{label}</p>
      <p className={`text-2xl font-bold leading-tight tabular-nums ${color}`}>{value}</p>
      {sub && <div className="mt-1 text-xs text-gray-500 truncate">{sub}</div>}
    </>
  )
  return onClick
    ? <button type="button" className={cls} onClick={onClick} title={title} aria-pressed={activo}>{body}</button>
    : <div className={cls} title={title}>{body}</div>
}

export function CondicionBadge({ c }: { c: Condicion }) {
  const info = CONDICION_INFO[c]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${info.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${info.dot}`} />
      {info.corto}
    </span>
  )
}

export function SevBadge({ sev }: { sev: 'P' | 'D' | null }) {
  return sev === 'D'
    ? <span className="badge-fault whitespace-nowrap">Detención</span>
    : <span className="badge-warn whitespace-nowrap">Precaución</span>
}

// Celda de la matriz de salud: estado vivo de un ítem en un vehículo.
export function CeldaItem({ item, label }: { item: ItemEstado | null; label: string }) {
  let cls = 'bg-gray-100 text-gray-300'
  let simbolo = '·'
  let titulo = `${label}: nunca revisado`
  if (item) {
    const desde = fmtDate(new Date(item.desde).toISOString())
    if (!item.falla) {
      cls = 'bg-lime/25 text-primary'
      simbolo = '✓'
      titulo = `${label}: OK (último reporte ${fmtDate(new Date(item.ultimo).toISOString())})`
    } else {
      cls = item.sev === 'D' ? 'bg-fault text-white' : 'bg-warn/80 text-white'
      simbolo = item.sev === 'D' ? '✕' : '!'
      titulo = `${label}: falla ${item.sev === 'D' ? 'de detención' : 'de precaución'} desde ${desde}`
        + ` · ${item.reportes} reporte${item.reportes !== 1 ? 's seguidos' : ''}${item.obs ? ` · "${item.obs}"` : ''}`
    }
  }
  return (
    <span title={titulo} aria-label={titulo} className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold ${cls}`}>
      {simbolo}
    </span>
  )
}

export function LeyendaMatriz() {
  const items: [string, string, string][] = [
    ['bg-lime/25 text-primary', '✓', 'OK'],
    ['bg-warn/80 text-white', '!', 'Falla de precaución'],
    ['bg-fault text-white', '✕', 'Falla de detención'],
    ['bg-gray-100 text-gray-300', '·', 'Nunca revisado'],
  ]
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
      {items.map(([cls, s, l]) => (
        <span key={l} className="inline-flex items-center gap-1.5">
          <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${cls}`}>{s}</span>
          {l}
        </span>
      ))}
    </div>
  )
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="text-sm text-gray-400 text-center py-8">{children}</p>
}

export function diasTexto(d: number | null): string {
  if (d == null) return 'Nunca'
  if (d === 0) return 'Hoy'
  if (d === 1) return 'Ayer'
  return `Hace ${d} días`
}
