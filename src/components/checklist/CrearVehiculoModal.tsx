import { useState, FormEvent, ReactNode } from 'react'
import { SearchSelect } from '../SearchSelect'
import type { CategoriaPatente, CondicionVehiculo, LineaOperacion } from '../../types'

export interface NuevoVehiculoInput {
  patente: string
  categoriaId: string
  linea: string
  descripcion: string
  marca: string
  modelo: string
  anno: number | null
  vin: string
  motor: string
  condicion: CondicionVehiculo | ''
  area: string
  responsableNombre: string
  responsableCargo: string
}

interface Props {
  query: string
  categorias: CategoriaPatente[]
  lineas: LineaOperacion[]
  /** Patentes ya registradas, para avisar si se intenta crear una repetida. */
  patentesExistentes?: string[]
  onClose: () => void
  onCreated: (vehiculo: NuevoVehiculoInput) => void
  onCrearLinea: (codigo: string) => void
}

function normalizarPatente(valor: string): string {
  return valor.replace(/[^0-9a-zA-Z]/g, '').toUpperCase()
}

function Campo({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

// Cualquier usuario puede agregar un vehículo que no esté en la lista, también sin señal:
// queda guardado en el celular y se sube a Maestros cuando vuelve la conexión.
export function CrearVehiculoModal({ query, categorias, lineas, patentesExistentes = [], onClose, onCreated, onCrearLinea }: Props) {
  const [patente, setPatente] = useState(query.trim().toUpperCase())
  const [categoriaId, setCategoriaId] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')
  const [anno, setAnno] = useState('')
  const [condicion, setCondicion] = useState<CondicionVehiculo | ''>('')
  const [area, setArea] = useState('')
  const [linea, setLinea] = useState('')
  const [vin, setVin] = useState('')
  const [motor, setMotor] = useState('')
  const [responsableNombre, setResponsableNombre] = useState('')
  const [responsableCargo, setResponsableCargo] = useState('')

  const anioActual = new Date().getFullYear()
  const annoNum = anno ? Number(anno) : null
  const annoValido = annoNum === null || (Number.isInteger(annoNum) && annoNum >= 1950 && annoNum <= anioActual + 1)
  const repetida = patentesExistentes.some(p => normalizarPatente(p) === normalizarPatente(patente))
  const canSave = normalizarPatente(patente).length >= 4 && !repetida && annoValido

  const lineaOptions = lineas.map(l => ({
    value: l.codigo,
    label: l.nombre && l.nombre !== l.codigo ? `${l.codigo} — ${l.nombre}` : l.codigo,
  }))

  function handleCrearLinea(q: string) {
    const codigo = q.trim().toUpperCase()
    onCrearLinea(codigo)
    setLinea(codigo)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSave) return
    onCreated({
      patente: patente.trim().toUpperCase(),
      categoriaId,
      linea,
      descripcion: descripcion.trim(),
      marca: marca.trim(),
      modelo: modelo.trim(),
      anno: annoNum,
      vin: vin.trim().toUpperCase(),
      motor: motor.trim().toUpperCase(),
      condicion,
      area: area.trim(),
      responsableNombre: responsableNombre.trim(),
      responsableCargo: responsableCargo.trim(),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center sm:p-4 z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-w-lg w-full max-h-[92vh] flex flex-col">
        <div className="px-6 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-bold text-dark">Agregar vehículo</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Solo la patente es obligatoria. Sin señal se guarda en el celular y se sube sola al volver la conexión.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <Campo label="Patente *">
            <input
              autoFocus
              className="input uppercase font-mono"
              value={patente}
              onChange={e => setPatente(e.target.value.toUpperCase())}
              placeholder="Ej: ABCD12"
              required
            />
            {repetida && <p className="text-xs text-fault mt-1">Esa patente ya está registrada: búscala en la lista.</p>}
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Tipo de vehículo">
              <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)} className="input">
                <option value="">Seleccionar...</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Condición">
              <select value={condicion} onChange={e => setCondicion(e.target.value as CondicionVehiculo | '')} className="input">
                <option value="">Seleccionar...</option>
                <option value="INTERNO">Interno</option>
                <option value="ARRIENDO">Arriendo</option>
              </select>
            </Campo>
          </div>

          <Campo label="Descripción">
            <input
              className="input"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Ej: Camioneta Hilux blanca"
            />
          </Campo>

          <div className="grid grid-cols-3 gap-3">
            <Campo label="Marca">
              <input className="input" value={marca} onChange={e => setMarca(e.target.value)} placeholder="Toyota" />
            </Campo>
            <Campo label="Modelo">
              <input className="input" value={modelo} onChange={e => setModelo(e.target.value)} placeholder="Hilux" />
            </Campo>
            <Campo label="Año">
              <input
                className="input"
                inputMode="numeric"
                value={anno}
                onChange={e => setAnno(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder={String(anioActual)}
              />
            </Campo>
          </div>
          {!annoValido && <p className="text-xs text-fault -mt-2">Año no válido.</p>}

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Área">
              <input className="input" value={area} onChange={e => setArea(e.target.value)} placeholder="Ej: Cosecha" />
            </Campo>
            <Campo label="Línea">
              <SearchSelect
                options={lineaOptions}
                value={linea}
                onChange={setLinea}
                placeholder="Seleccionar..."
                onCreate={handleCrearLinea}
                createLabel={q => `Crear línea "${q.trim().toUpperCase()}"`}
              />
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="VIN (chasis)">
              <input className="input uppercase font-mono" value={vin} onChange={e => setVin(e.target.value)} />
            </Campo>
            <Campo label="N° de motor">
              <input className="input uppercase font-mono" value={motor} onChange={e => setMotor(e.target.value)} />
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Responsable">
              <input
                className="input"
                value={responsableNombre}
                onChange={e => setResponsableNombre(e.target.value)}
                placeholder="Nombre"
              />
            </Campo>
            <Campo label="Cargo del responsable">
              <input
                className="input"
                value={responsableCargo}
                onChange={e => setResponsableCargo(e.target.value)}
                placeholder="Ej: Supervisor"
              />
            </Campo>
          </div>

          <div className="flex gap-2 justify-end pt-2 pb-1 sticky bottom-0 bg-white">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={!canSave} className="btn-primary">
              Agregar vehículo
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
