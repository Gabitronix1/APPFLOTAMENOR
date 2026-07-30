import { useState, FormEvent } from 'react'
import type { CategoriaPatente } from '../../types'

export interface NuevoVehiculoInput {
  patente: string
  categoriaId: string
  linea: string
  descripcion: string
}

interface Props {
  query: string
  categorias: CategoriaPatente[]
  onClose: () => void
  onCreated: (vehiculo: NuevoVehiculoInput) => void
}

export function CrearVehiculoModal({ query, categorias, onClose, onCreated }: Props) {
  const [patente, setPatente] = useState(query.trim().toUpperCase())
  const [categoriaId, setCategoriaId] = useState('')
  const [linea, setLinea] = useState('')
  const [descripcion, setDescripcion] = useState('')

  const canSave = patente.trim().length >= 4

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSave) return
    onCreated({
      patente: patente.trim().toUpperCase(),
      categoriaId,
      linea: linea.trim().toUpperCase(),
      descripcion: descripcion.trim(),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <h2 className="text-lg font-bold text-dark mb-1">Nuevo vehículo</h2>
        <p className="text-xs text-gray-400 mb-4">
          Se guarda en el celular y se sincroniza automáticamente cuando haya conexión.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Patente</label>
            <input
              autoFocus
              className="input uppercase"
              value={patente}
              onChange={e => setPatente(e.target.value.toUpperCase())}
              placeholder="Ej: ABCD12"
              required
            />
          </div>
          <div>
            <label className="label">Tipo de vehículo (opcional)</label>
            <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)} className="input">
              <option value="">Seleccionar...</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Línea (opcional)</label>
            <input
              className="input"
              value={linea}
              onChange={e => setLinea(e.target.value)}
              placeholder="Ej: CP2"
            />
          </div>
          <div>
            <label className="label">Descripción (opcional)</label>
            <input
              className="input"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Ej: Camioneta Hilux blanca"
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary btn-sm">
              Cancelar
            </button>
            <button type="submit" disabled={!canSave} className="btn-primary btn-sm">
              Crear vehículo
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
