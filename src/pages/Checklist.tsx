import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFormData } from '../hooks/useFormData'
import { useOfflineQueue } from '../hooks/useOfflineQueue'
import { SearchSelect } from '../components/SearchSelect'
import { PREGUNTAS } from '../lib/constants'

const TIPOS_VEHICULO = ['CAMIONETA', 'CAMIÓN', 'TRACTOR', 'EXCAVADORA', 'RETROEXCAVADORA', 'MOTONIVELADORA', 'MINIBÚS', 'OTRO']
const LINEAS = ['LINEA A', 'LINEA B', 'LINEA C', 'LINEA D', 'ESPECIAL']

interface Respuesta {
  falla: boolean
  observacion: string
}

function emptyRespuestas(): Respuesta[] {
  return PREGUNTAS.map(() => ({ falla: false, observacion: '' }))
}

export function Checklist() {
  const navigate = useNavigate()
  const { operadores, patentes, loading } = useFormData()
  const { enqueue } = useOfflineQueue()

  const today = new Date().toISOString().slice(0, 10)

  const [operadorId, setOperadorId] = useState('')
  const [patenteId, setPatenteId] = useState('')
  const [tipoVehiculo, setTipoVehiculo] = useState('')
  const [linea, setLinea] = useState('')
  const [odometro, setOdometro] = useState(0)
  const [obsGeneral, setObsGeneral] = useState('')
  const [operativo, setOperativo] = useState(true)
  const [respuestas, setRespuestas] = useState<Respuesta[]>(emptyRespuestas)
  const [done, setDone] = useState(false)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const up = () => setIsOffline(false)
    const dn = () => setIsOffline(true)
    window.addEventListener('online', up)
    window.addEventListener('offline', dn)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', dn) }
  }, [])

  function setFalla(idx: number, v: boolean) {
    setRespuestas(prev => prev.map((r, i) =>
      i === idx ? { ...r, falla: v, observacion: v ? r.observacion : '' } : r
    ))
  }

  function setObs(idx: number, v: string) {
    setRespuestas(prev => prev.map((r, i) => i === idx ? { ...r, observacion: v } : r))
  }

  function resetForm() {
    setPatenteId('')
    setOdometro(0)
    setObsGeneral('')
    setOperativo(true)
    setRespuestas(emptyRespuestas())
    setDone(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!operadorId || !patenteId || !tipoVehiculo || !linea) return
    enqueue({
      type: 'checklist',
      inspeccion: {
        operador_id: operadorId,
        patente_id: patenteId,
        linea,
        tipo_vehiculo: tipoVehiculo,
        odometro,
        f_registro: new Date().toISOString(),
        uuid_local: crypto.randomUUID(),
        obs_general: obsGeneral || null,
        operativo,
      },
      respuestas: PREGUNTAS.map((_, idx) => ({
        pregunta: idx + 1,
        respuesta: respuestas[idx].falla,
        observacion: respuestas[idx].observacion || null,
      })),
    })
    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gray-50 flex items-center justify-center p-4">
        <div className="card max-w-sm w-full text-center py-10">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-primary" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-dark mb-2">Checklist registrado</h2>
          <p className="text-sm text-gray-500 mb-6">
            {isOffline
              ? 'Guardado sin conexión. Se sincronizará automáticamente cuando haya red.'
              : 'Enviado correctamente.'}
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={resetForm} className="btn-primary">Nuevo checklist</button>
            <button onClick={() => navigate('/dashboard')} className="btn-secondary">Dashboard</button>
          </div>
        </div>
      </div>
    )
  }

  const opOptions = operadores.map(o => ({ value: o.id, label: `${o.apellido}, ${o.nombre}` }))
  const patOptions = patentes.map(p => ({ value: p.id, label: p.patente + (p.descripcion ? ` — ${p.descripcion}` : '') }))
  const canSubmit = !!operadorId && !!patenteId && !!tipoVehiculo && !!linea

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 pb-10">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 mb-6">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-dark">Checklist Diario</h1>
            <p className="text-xs text-gray-400">{today}</p>
          </div>
          {isOffline && <span className="badge-fault">Sin conexión</span>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 space-y-4">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Cargando datos...</div>
        ) : (
          <>
            {/* Datos generales */}
            <div className="card space-y-4">
              <h2 className="font-semibold text-dark text-sm">Datos generales</h2>
              <div>
                <label className="label">Operador</label>
                <SearchSelect
                  options={opOptions}
                  value={operadorId}
                  onChange={setOperadorId}
                  placeholder="Seleccionar operador..."
                />
              </div>
              <div>
                <label className="label">Patente / Vehículo</label>
                <SearchSelect
                  options={patOptions}
                  value={patenteId}
                  onChange={setPatenteId}
                  placeholder="Seleccionar patente..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Tipo vehículo</label>
                  <select
                    value={tipoVehiculo}
                    onChange={e => setTipoVehiculo(e.target.value)}
                    className="input"
                  >
                    <option value="">Seleccionar...</option>
                    {TIPOS_VEHICULO.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Línea</label>
                  <select
                    value={linea}
                    onChange={e => setLinea(e.target.value)}
                    className="input"
                  >
                    <option value="">Seleccionar...</option>
                    {LINEAS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Odómetro (km)</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOdometro(v => Math.max(0, v - 10))}
                    className="w-12 h-12 rounded-xl border border-gray-300 text-xl font-bold text-gray-600 hover:bg-gray-50 flex-shrink-0 flex items-center justify-center"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={odometro}
                    onChange={e => setOdometro(Math.max(0, Number(e.target.value)))}
                    className="flex-1 h-12 text-center border border-gray-300 rounded-xl text-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setOdometro(v => v + 10)}
                    className="w-12 h-12 rounded-xl border border-gray-300 text-xl font-bold text-gray-600 hover:bg-gray-50 flex-shrink-0 flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* 6 preguntas SI/NO */}
            <div className="space-y-3">
              <h2 className="font-semibold text-dark text-sm px-1">Revisión de sistemas</h2>
              <p className="text-xs text-gray-400 px-1">SI = sin falla · NO = falla detectada</p>
              {PREGUNTAS.map((p, idx) => {
                const r = respuestas[idx]
                return (
                  <div
                    key={p.key}
                    className={`bg-white rounded-xl border-2 p-4 transition-colors ${r.falla ? 'border-fault/50 bg-fault/[0.03]' : 'border-gray-200'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-dark text-sm mb-2">{idx + 1}. {p.label}</p>
                        {r.falla && (
                          <textarea
                            placeholder="Observación (opcional)..."
                            value={r.observacion}
                            onChange={e => setObs(idx, e.target.value)}
                            rows={2}
                            className="w-full text-sm border border-fault/30 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-fault/30 resize-none bg-white"
                          />
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setFalla(idx, false)}
                          className={`min-w-[52px] h-12 rounded-xl text-sm font-bold transition-all border ${
                            !r.falla
                              ? 'bg-primary text-white border-primary shadow-sm'
                              : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          SI
                        </button>
                        <button
                          type="button"
                          onClick={() => setFalla(idx, true)}
                          className={`min-w-[52px] h-12 rounded-xl text-sm font-bold transition-all border ${
                            r.falla
                              ? 'bg-fault text-white border-fault shadow-sm'
                              : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          NO
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Operativo + obs general */}
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-dark text-sm">¿Vehículo operativo?</p>
                  <p className="text-xs text-gray-400 mt-0.5">¿Puede continuar en servicio?</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOperativo(v => !v)}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ${operativo ? 'bg-primary' : 'bg-fault'}`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${operativo ? 'translate-x-7' : 'translate-x-1'}`}
                  />
                </button>
              </div>
              <p className={`text-xs font-semibold ${operativo ? 'text-primary' : 'text-fault'}`}>
                {operativo ? 'Operativo — puede circular' : 'No operativo — requiere atención'}
              </p>
              <div>
                <label className="label">Observación general (opcional)</label>
                <textarea
                  value={obsGeneral}
                  onChange={e => setObsGeneral(e.target.value)}
                  rows={3}
                  placeholder="Comentarios adicionales sobre el estado del vehículo..."
                  className="input resize-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold text-base rounded-2xl disabled:opacity-40 transition-colors shadow-sm"
            >
              {isOffline ? 'Guardar sin conexión' : 'Registrar checklist'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}
