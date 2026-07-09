interface CatalogOption {
  id: string
  nombre: string
}

interface Props {
  label: string
  value: string
  onChange: (value: string) => void
  options: CatalogOption[]
  required?: boolean
  emptyMessage?: string
}

export function CatalogSelect({ label, value, onChange, options, required, emptyMessage }: Props) {
  return (
    <div>
      <label className="label">{label}</label>
      {options.length === 0 ? (
        <p className="text-xs text-gray-400 italic border border-dashed border-gray-300 rounded-lg px-3 py-2.5 bg-gray-50">
          {emptyMessage ?? `Aún no hay opciones de "${label}" registradas.`}
        </p>
      ) : (
        <select value={value} onChange={e => onChange(e.target.value)} className="input" required={required}>
          <option value="">Seleccionar...</option>
          {options.map(o => (
            <option key={o.id} value={o.id}>{o.nombre}</option>
          ))}
        </select>
      )}
    </div>
  )
}
