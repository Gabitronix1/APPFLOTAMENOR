interface Props {
  label: string
  value: string | number
  accent?: boolean
}

export function KpiCard({ label, value, accent }: Props) {
  return (
    <div className="card py-3 px-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${accent ? 'text-fault' : 'text-dark'}`}>{value}</p>
    </div>
  )
}
