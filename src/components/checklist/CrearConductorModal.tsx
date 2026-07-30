import { useState, FormEvent } from 'react'

export interface NuevoConductorInput {
  nombre: string
  apellido: string
  rut: string
}

interface Props {
  query: string
  onClose: () => void
  onCreated: (conductor: NuevoConductorInput) => void
}

function splitNombreApellido(q: string): [string, string] {
  const parts = q.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return [parts[0] ?? '', '']
  return [parts.slice(0, -1).join(' '), parts[parts.length - 1]]
}

export function CrearConductorModal({ query, onClose, onCreated }: Props) {
  const [inicialNombre, inicialApellido] = splitNombreApellido(query)
  const [nombre, setNombre] = useState(inicialNombre)
  const [apellido, setApellido] = useState(inicialApellido)
  const [rut, setRut] = useState('')

  const canSave = !!nombre.trim() && !!apellido.trim()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSave) return
    onCreated({ nombre: nombre.trim(), apellido: apellido.trim(), rut: rut.trim() })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <h2 className="text-lg font-bold text-dark mb-1">Nuevo conductor</h2>
        <p className="text-xs text-gray-400 mb-4">
          Se guarda en el celular y se sincroniza automáticamente cuando haya conexión.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input
              autoFocus
              className="input"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Juan"
              required
            />
          </div>
          <div>
            <label className="label">Apellido</label>
            <input
              className="input"
              value={apellido}
              onChange={e => setApellido(e.target.value)}
              placeholder="Ej: Pérez"
              required
            />
          </div>
          <div>
            <label className="label">RUT (opcional)</label>
            <input
              className="input"
              value={rut}
              onChange={e => setRut(e.target.value)}
              placeholder="12.345.678-9"
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary btn-sm">
              Cancelar
            </button>
            <button type="submit" disabled={!canSave} className="btn-primary btn-sm">
              Crear conductor
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
