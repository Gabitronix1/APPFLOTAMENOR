import { useState, FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { PRIORIDADES_OT, PRIORIDAD_OT_INFO } from '../../lib/ordenesTrabajo'
import type { Operador, OrdenTrabajo, PrioridadOT } from '../../types'

interface Props {
  ot: OrdenTrabajo
  operadores: Operador[]
  onClose: () => void
  onSaved: () => void
}

export function AsignarModal({ ot, operadores, onClose, onSaved }: Props) {
  const [operadorId, setOperadorId] = useState(ot.asignado_a ?? '')
  const [prioridad, setPrioridad] = useState<PrioridadOT>(ot.prioridad ?? 'media')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!operadorId) return
    setSaving(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('resoluciones')
      .update({
        estado: 'asignada',
        asignado_a: operadorId,
        prioridad,
        fecha_asignacion: new Date().toISOString(),
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
        <h2 className="text-lg font-bold text-dark mb-1">
          {ot.estado === 'abierta' ? 'Asignar orden de trabajo' : 'Reasignar orden de trabajo'}
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          <span className="font-mono font-semibold">{ot.patente}</span> · {ot.sistema}
        </p>
        <form onSubmit={e => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="label">Operador</label>
            <select
              value={operadorId}
              onChange={e => setOperadorId(e.target.value)}
              className="input"
              required
            >
              <option value="">Seleccionar operador...</option>
              {operadores.map(o => (
                <option key={o.id} value={o.id}>{o.apellido}, {o.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Prioridad</label>
            <select
              value={prioridad}
              onChange={e => setPrioridad(e.target.value as PrioridadOT)}
              className="input"
              required
            >
              {PRIORIDADES_OT.map(p => (
                <option key={p} value={p}>{PRIORIDAD_OT_INFO[p].label}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-fault text-xs">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary btn-sm">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !operadorId} className="btn-primary btn-sm">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
