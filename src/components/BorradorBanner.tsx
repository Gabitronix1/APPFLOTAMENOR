import type { BorradorPendiente } from '../hooks/useBorrador'

function haceCuanto(ms: number): string {
  const min = Math.round((Date.now() - ms) / 60000)
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 48) return `hace ${h} h`
  return `hace ${Math.round(h / 24)} días`
}

export function BorradorBanner({
  pendiente,
  etiqueta,
  onContinuar,
  onDescartar,
}: {
  pendiente: BorradorPendiente | null
  etiqueta: string
  onContinuar: () => void
  onDescartar: () => void
}) {
  if (!pendiente) return null
  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      <div className="rounded-xl border border-warn/40 bg-warn/10 p-4">
        <p className="text-sm font-semibold text-gray-900">Tienes {etiqueta} sin terminar</p>
        <p className="text-xs text-gray-600 mt-0.5">
          Quedó guardado en el celular {haceCuanto(pendiente.actualizado)}, antes de registrarlo.
        </p>
        <div className="flex gap-2 mt-3">
          <button type="button" onClick={onContinuar} className="btn-primary btn-sm">
            Retomar
          </button>
          <button type="button" onClick={onDescartar} className="btn-secondary btn-sm">
            Descartar
          </button>
        </div>
      </div>
    </div>
  )
}
