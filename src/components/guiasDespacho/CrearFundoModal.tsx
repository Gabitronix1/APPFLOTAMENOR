import { useState, FormEvent } from 'react'
import { SearchSelect } from '../SearchSelect'
import type { LineaOperacion } from '../../types'

export interface NuevoFundoInput {
  nombre: string
  contrato: string
}

interface Props {
  query: string
  lineas: LineaOperacion[]
  onClose: () => void
  onCreated: (fundo: NuevoFundoInput) => void
  onCrearLinea: (codigo: string) => void
}

export function CrearFundoModal({ query, lineas, onClose, onCreated, onCrearLinea }: Props) {
  const [nombre, setNombre] = useState(query.trim().toUpperCase())
  const [contrato, setContrato] = useState('')

  const canSave = nombre.trim().length > 0 && contrato.trim().length > 0

  const lineaOptions = lineas.map(l => ({
    value: l.codigo,
    label: l.nombre && l.nombre !== l.codigo ? `${l.codigo} — ${l.nombre}` : l.codigo,
  }))

  function handleCrearLinea(q: string) {
    const codigo = q.trim().toUpperCase()
    onCrearLinea(codigo)
    setContrato(codigo)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSave) return
    onCreated({ nombre: nombre.trim().toUpperCase(), contrato })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <h2 className="text-lg font-bold text-dark mb-1">Nuevo fundo</h2>
        <p className="text-xs text-gray-400 mb-4">
          Se guarda en el celular y se sincroniza automáticamente cuando haya conexión.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input
              autoFocus
              className="input uppercase"
              value={nombre}
              onChange={e => setNombre(e.target.value.toUpperCase())}
              required
            />
          </div>
          <div>
            <label className="label">Contrato / línea de negocio</label>
            <SearchSelect
              options={lineaOptions}
              value={contrato}
              onChange={setContrato}
              placeholder="Seleccionar contrato..."
              onCreate={handleCrearLinea}
              createLabel={q => `Crear contrato "${q.trim().toUpperCase()}"`}
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary btn-sm">
              Cancelar
            </button>
            <button type="submit" disabled={!canSave} className="btn-primary btn-sm">
              Crear fundo
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
