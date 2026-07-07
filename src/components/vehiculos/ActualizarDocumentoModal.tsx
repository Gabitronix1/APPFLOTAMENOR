import { useState, FormEvent, ChangeEvent } from 'react'
import { supabase } from '../../lib/supabase'

interface Props {
  patenteId: string
  tipoDocumentoId: string
  tipoDocumentoNombre: string
  onClose: () => void
  onSaved: () => void
}

export function ActualizarDocumentoModal({
  patenteId,
  tipoDocumentoId,
  tipoDocumentoNombre,
  onClose,
  onSaved,
}: Props) {
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [fechaEmision, setFechaEmision] = useState('')
  const [numeroDocumento, setNumeroDocumento] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setArchivo(e.target.files?.[0] ?? null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!fechaVencimiento) return
    setSaving(true)
    setError(null)

    let archivoPath: string | null = null
    if (archivo) {
      const ext = archivo.name.split('.').pop() ?? 'pdf'
      const path = `${patenteId}/${tipoDocumentoId}-${crypto.randomUUID()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documentos-vehiculos')
        .upload(path, archivo, { contentType: archivo.type, upsert: false })
      if (uploadError) {
        setSaving(false)
        setError(uploadError.message)
        return
      }
      archivoPath = uploadData?.path ?? path
    }

    const { error: insertError } = await supabase.from('documentos_vehiculo').insert({
      patente_id: patenteId,
      tipo_documento_id: tipoDocumentoId,
      fecha_vencimiento: fechaVencimiento,
      fecha_emision: fechaEmision || null,
      numero_documento: numeroDocumento.trim() || null,
      archivo_path: archivoPath,
    })

    setSaving(false)
    if (insertError) {
      setError(insertError.message)
    } else {
      onSaved()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-lg font-bold text-dark mb-1">Actualizar documento</h2>
        <p className="text-sm text-gray-500 mb-4">{tipoDocumentoNombre}</p>
        <form onSubmit={e => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="label">Fecha de vencimiento</label>
            <input
              type="date"
              value={fechaVencimiento}
              onChange={e => setFechaVencimiento(e.target.value)}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Fecha de emisión (opcional)</label>
            <input
              type="date"
              value={fechaEmision}
              onChange={e => setFechaEmision(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">N° de documento / folio (opcional)</label>
            <input
              type="text"
              value={numeroDocumento}
              onChange={e => setNumeroDocumento(e.target.value)}
              placeholder="Ej: 123456"
              className="input"
            />
          </div>
          <div>
            <label className="label">Archivo (opcional)</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-semibold hover:file:bg-primary/20"
            />
          </div>
          {error && <p className="text-fault text-xs">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary btn-sm">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !fechaVencimiento} className="btn-primary btn-sm">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
