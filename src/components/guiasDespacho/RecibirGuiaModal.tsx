import { useRef, useState } from 'react'
import { useOfflineQueue } from '../../hooks/useOfflineQueue'
import { formatFolio } from '../../lib/guiasDespacho'
import { FirmaPad, type FirmaPadHandle } from './FirmaPad'
import type { GuiaDespachoConDatos, GuiaDespachoItemConDatos } from '../../types'

interface Props {
  guia: GuiaDespachoConDatos
  items: GuiaDespachoItemConDatos[]
  onClose: () => void
  onSaved: () => void
}

interface ItemState {
  recibida: string
  devuelta: string
  observacion: string
}

export function RecibirGuiaModal({ guia, items, onClose, onSaved }: Props) {
  const { enqueue } = useOfflineQueue()
  const [recibidoPor, setRecibidoPor] = useState('')
  const [estados, setEstados] = useState<Record<string, ItemState>>(() =>
    Object.fromEntries(
      items.map(i => [i.id, { recibida: String(i.cantidad_enviada ?? i.cantidad_planificada), devuelta: '0', observacion: '' }]),
    ),
  )
  const [foto, setFoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const firmaRef = useRef<FirmaPadHandle>(null)

  function actualizar(id: string, patch: Partial<ItemState>) {
    setEstados(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setFoto(file)
    setPreview(file ? URL.createObjectURL(file) : null)
  }

  async function handleSubmit() {
    if (!recibidoPor.trim()) return
    const firmaBlob = await firmaRef.current?.getBlob()
    if (!firmaBlob) {
      setError('Falta la firma de quien recibe.')
      return
    }
    setError(null)
    setSaving(true)
    await enqueue({
      type: 'guia_despacho_recibir',
      guia_id: guia.id,
      recibido_por_nombre: recibidoPor.trim(),
      items: items.map(i => ({
        item_id: i.id,
        cantidad_recibida: Number(estados[i.id]?.recibida || 0),
        cantidad_devuelta: Number(estados[i.id]?.devuelta || 0),
        observacion: estados[i.id]?.observacion.trim() || null,
      })),
      fotoRecepcion: foto ? { blob: foto, ext: foto.name.split('.').pop() ?? 'jpg' } : undefined,
      firmaRecepcion: { blob: firmaBlob, ext: 'png' },
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 my-8">
        <h2 className="text-lg font-bold text-dark mb-1">Recepción {formatFolio(guia.folio)}</h2>
        <p className="text-xs text-gray-400 mb-4">Marca qué llegó conforme y qué se devuelve, con evidencia de la faena.</p>

        <div className="mb-4">
          <label className="label">Recibido por (nombre en terreno)</label>
          <input className="input" value={recibidoPor} onChange={e => setRecibidoPor(e.target.value)} required />
        </div>

        <div className="space-y-3 mb-4">
          {items.map(item => (
            <div key={item.id} className="border border-gray-200 rounded-xl p-3">
              <p className="text-sm font-medium mb-2">
                {item.producto} <span className="text-xs text-gray-400 font-normal">· enviado: {item.cantidad_enviada ?? item.cantidad_planificada}</span>
              </p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-xs text-gray-500">Recibido conforme</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    className="input"
                    value={estados[item.id]?.recibida ?? ''}
                    onChange={e => actualizar(item.id, { recibida: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Devuelto</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    className="input"
                    value={estados[item.id]?.devuelta ?? ''}
                    onChange={e => actualizar(item.id, { devuelta: e.target.value })}
                  />
                </div>
              </div>
              <input
                className="input"
                placeholder="Observación (opcional)"
                value={estados[item.id]?.observacion ?? ''}
                onChange={e => actualizar(item.id, { observacion: e.target.value })}
              />
            </div>
          ))}
        </div>

        <div className="mb-4">
          <h3 className="label mb-2">Foto de la recepción (opcional)</h3>
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

        <div className="mb-4">
          <h3 className="label mb-2">Firma de quien recibe</h3>
          <FirmaPad ref={firmaRef} />
        </div>

        {error && <p className="text-fault text-xs mb-2">{error}</p>}

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-secondary btn-sm">
            Cancelar
          </button>
          <button type="button" onClick={() => void handleSubmit()} disabled={saving || !recibidoPor.trim()} className="btn-primary btn-sm">
            {saving ? 'Guardando...' : 'Confirmar recepción'}
          </button>
        </div>
      </div>
    </div>
  )
}
