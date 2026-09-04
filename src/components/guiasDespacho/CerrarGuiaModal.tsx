import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatFolio } from '../../lib/guiasDespacho'
import type { GuiaDespachoConDatos } from '../../types'

interface Props {
  guia: GuiaDespachoConDatos
  onClose: () => void
  onSaved: () => void
}

// El cierre lo hace bodega/administrativos desde oficina para conciliar la guía —
// se guarda directo (no offline), igual que el resto de las acciones de gestión en OT.
export function CerrarGuiaModal({ guia, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirmar() {
    if (!user) return
    setSaving(true)
    setError(null)
    const { error: err } = await supabase
      .from('guias_despacho')
      .update({ estado: 'cerrada', cerrado_por: user.id, fecha_cierre: new Date().toISOString() })
      .eq('id', guia.id)
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <h2 className="text-lg font-bold text-dark mb-1">Cerrar {formatFolio(guia.folio)}</h2>
        <p className="text-sm text-gray-500 mb-4">
          Confirma que revisaste lo recibido y las devoluciones quedaron conciliadas con bodega.
        </p>
        {error && <p className="text-fault text-xs mb-2">{error}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-secondary btn-sm">
            Cancelar
          </button>
          <button type="button" onClick={() => void handleConfirmar()} disabled={saving} className="btn-primary btn-sm">
            {saving ? 'Guardando...' : 'Cerrar guía'}
          </button>
        </div>
      </div>
    </div>
  )
}
