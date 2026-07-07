import { useState, FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { TIPOS_CIERRE_OT } from '../../lib/ordenesTrabajo'
import type { OrdenTrabajo, TipoResolucion } from '../../types'

interface Props {
  ot: OrdenTrabajo
  onClose: () => void
  onSaved: () => void
}

export function CerrarDirectoModal({ ot, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const [tipo, setTipo] = useState<TipoResolucion>('resuelto')
  const [descripcion, setDescripcion] = useState('')
  const [costo, setCosto] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user || !descripcion.trim()) return
    setSaving(true)
    setError(null)

    const ahora = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('resoluciones')
      .update({
        estado: 'cerrada',
        tipo,
        descripcion: descripcion.trim(),
        resuelta_por: user.id,
        fecha: ahora,
        fecha_cierre: ahora,
        costo: costo ? Number(costo) : null,
      })
      .eq('id', ot.id)

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
        <h2 className="text-lg font-bold text-dark mb-1">Cerrar directo</h2>
        <p className="text-sm text-gray-500 mb-4">
          <span className="font-mono font-semibold">{ot.patente}</span> · {ot.sistema}
        </p>
        <form onSubmit={e => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="label">Tipo de resolución</label>
            <select
              value={tipo}
              onChange={e => setTipo(e.target.value as TipoResolucion)}
              className="input"
              required
            >
              {TIPOS_CIERRE_OT.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              rows={3}
              placeholder="Describe la acción tomada..."
              className="input resize-none"
              required
            />
          </div>
          <div>
            <label className="label">Costo (CLP, opcional)</label>
            <input
              type="number"
              min={0}
              value={costo}
              onChange={e => setCosto(e.target.value)}
              placeholder="Ej: 60000"
              className="input"
            />
          </div>
          {error && <p className="text-fault text-xs">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary btn-sm">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !descripcion.trim()} className="btn-primary btn-sm">
              {saving ? 'Guardando...' : 'Cerrar orden'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
