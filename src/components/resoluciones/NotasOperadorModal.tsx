import { useState, FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import type { OrdenTrabajo } from '../../types'

interface Props {
  ot: OrdenTrabajo
  modo: 'iniciar' | 'agregar_notas'
  onClose: () => void
  onSaved: () => void
}

export function NotasOperadorModal({ ot, modo, onClose, onSaved }: Props) {
  const [notas, setNotas] = useState(modo === 'agregar_notas' ? ot.descripcion ?? '' : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload =
      modo === 'iniciar'
        ? { estado: 'en_progreso' as const, descripcion: notas.trim() || null }
        : { descripcion: notas.trim() || null }

    const { error: updateError } = await supabase.from('resoluciones').update(payload).eq('id', ot.id)

    setSaving(false)
    if (updateError) {
      setError(updateError.message)
    } else {
      onSaved()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-lg font-bold text-dark mb-1">
          {modo === 'iniciar' ? 'Iniciar trabajo' : 'Agregar notas'}
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          <span className="font-mono font-semibold">{ot.patente}</span> · {ot.sistema}
        </p>
        <form onSubmit={e => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="label">Notas (opcional)</label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={3}
              placeholder="Detalle del avance..."
              className="input resize-none"
            />
          </div>
          {error && <p className="text-fault text-xs">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary btn-sm">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary btn-sm">
              {saving ? 'Guardando...' : modo === 'iniciar' ? 'Iniciar trabajo' : 'Guardar notas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
