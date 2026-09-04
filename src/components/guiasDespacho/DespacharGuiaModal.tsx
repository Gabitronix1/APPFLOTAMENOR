import { useRef, useState } from 'react'
import { useOfflineQueue } from '../../hooks/useOfflineQueue'
import { formatFolio } from '../../lib/guiasDespacho'
import type { GuiaDespachoConDatos, GuiaDespachoItemConDatos } from '../../types'

interface Props {
  guia: GuiaDespachoConDatos
  items: GuiaDespachoItemConDatos[]
  onClose: () => void
  onSaved: () => void
}

export function DespacharGuiaModal({ guia, items, onClose, onSaved }: Props) {
  const { enqueue } = useOfflineQueue()
  const [cantidades, setCantidades] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map(i => [i.id, String(i.cantidad_planificada)])),
  )
  const [foto, setFoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setFoto(file)
    setPreview(file ? URL.createObjectURL(file) : null)
  }

  async function handleSubmit() {
    setSaving(true)
    await enqueue({
      type: 'guia_despacho_despachar',
      guia_id: guia.id,
      items: items.map(i => ({ item_id: i.id, cantidad_enviada: Number(cantidades[i.id] || 0) })),
      fotoDespacho: foto ? { blob: foto, ext: foto.name.split('.').pop() ?? 'jpg' } : undefined,
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 my-8">
        <h2 className="text-lg font-bold text-dark mb-1">Despachar {formatFolio(guia.folio)}</h2>
        <p className="text-xs text-gray-400 mb-4">Confirma las cantidades que efectivamente se cargaron en el vehículo.</p>

        <div className="space-y-2 mb-4">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-3">
              <span className="flex-1 text-sm">{item.producto}</span>
              <span className="text-xs text-gray-400">Plan: {item.cantidad_planificada}</span>
              <input
                type="number"
                min={0}
                step="any"
                className="input w-24"
                value={cantidades[item.id] ?? ''}
                onChange={e => setCantidades(prev => ({ ...prev, [item.id]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <div className="mb-4">
          <h3 className="label mb-2">Foto de la carga (opcional)</h3>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFoto} className="hidden" />
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Vista previa" className="w-full h-40 object-cover rounded-xl" />
              <button
                type="button"
                onClick={() => { setFoto(null); setPreview(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center text-sm hover:bg-black/70"
              >
                ✕
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary btn-sm w-full">
              Tomar foto
            </button>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-secondary btn-sm">
            Cancelar
          </button>
          <button type="button" onClick={() => void handleSubmit()} disabled={saving} className="btn-primary btn-sm">
            {saving ? 'Guardando...' : 'Confirmar despacho'}
          </button>
        </div>
      </div>
    </div>
  )
}
