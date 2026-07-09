import { useState, FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ESTADOS_VEHICULO, ESTADO_VEHICULO_INFO } from '../../lib/vehiculos'
import type { EstadoMaquinaria } from '../../types'

interface Props {
  maquinariaId: string
  estadoActual: EstadoMaquinaria
  onClose: () => void
  onSaved: () => void
}

export function CambiarEstadoMaquinariaModal({ maquinariaId, estadoActual, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const [estado, setEstado] = useState<EstadoMaquinaria>(estadoActual)
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user || !motivo.trim()) return
    setSaving(true)
    setError(null)

    const { error: insertError } = await supabase.from('estado_maquinaria_historial').insert({
      maquinaria_id: maquinariaId,
      estado,
      motivo: motivo.trim(),
      cambiado_por: user.id,
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
        <h2 className="text-lg font-bold text-dark mb-4">Cambiar estado</h2>
        <form onSubmit={e => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="label">Nuevo estado</label>
            <select
              value={estado}
              onChange={e => setEstado(e.target.value as EstadoMaquinaria)}
              className="input"
              required
            >
              {ESTADOS_VEHICULO.map(e => (
                <option key={e} value={e}>{ESTADO_VEHICULO_INFO[e].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Motivo del cambio</label>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              rows={3}
              placeholder="Describe el motivo del cambio de estado..."
              className="input resize-none"
              required
            />
          </div>
          {error && <p className="text-fault text-xs">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary btn-sm">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !motivo.trim()} className="btn-primary btn-sm">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
