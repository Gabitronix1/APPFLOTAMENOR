interface KpiTileProps {
  label: string
  value: string | number
  foot?: string
  color?: string
}

export function KpiTile({ label, value, foot, color = 'text-dark' }: KpiTileProps) {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {foot && <p className="text-xs text-gray-400 mt-1">{foot}</p>}
    </div>
  )
}

interface KpiGridProps {
  items: KpiTileProps[]
  cols?: string
}

export function KpiGrid({ items, cols = 'grid-cols-2 lg:grid-cols-4' }: KpiGridProps) {
  return (
    <div className={`grid ${cols} gap-3 mb-5`}>
      {items.map(item => <KpiTile key={item.label} {...item} />)}
    </div>
  )
}
