import { useState, FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import type { ProductoInsumo } from '../../types'

interface Props {
  query: string
  onClose: () => void
  onCreated: (producto: ProductoInsumo) => void
}

// Crear un insumo nuevo requiere conexión: productos_insumo.id lo asigna el servidor
// (no es uuid) y necesitamos el id real de inmediato para agregarlo como ítem de la guía.
export function CrearProductoModal({ query, onClose, onCreated }: Props) {
  const [nombre, setNombre] = useState(query.trim())
  const [codigoBarras, setCodigoBarras] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSave = nombre.trim().length > 0 && navigator.onLine

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('productos_insumo')
      .insert({ nombre: nombre.trim(), codigo_barras: codigoBarras.trim() || null })
      .select('id, nombre, codigo_barras')
      .single()
    setSaving(false)
    if (err || !data) {
      setError(err?.message ?? 'No se pudo crear el producto.')
      return
    }
    onCreated(data as unknown as ProductoInsumo)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <h2 className="text-lg font-bold text-dark mb-1">Nuevo producto / insumo</h2>
        <p className="text-xs text-gray-400 mb-4">Requiere conexión para crearlo.</p>
        {!navigator.onLine && (
          <p className="text-xs text-fault mb-4">Sin conexión: vuelve a intentarlo cuando tengas señal.</p>
        )}
        <form onSubmit={e => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input autoFocus className="input" value={nombre} onChange={e => setNombre(e.target.value)} required />
          </div>
          <div>
            <label className="label">Código de barras (opcional)</label>
            <input className="input" value={codigoBarras} onChange={e => setCodigoBarras(e.target.value)} />
          </div>
          {error && <p className="text-fault text-xs">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary btn-sm">
              Cancelar
            </button>
            <button type="submit" disabled={!canSave || saving} className="btn-primary btn-sm">
              {saving ? 'Creando...' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
