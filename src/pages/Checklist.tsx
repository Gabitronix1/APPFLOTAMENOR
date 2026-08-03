import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFormData } from '../hooks/useFormData'
import { useOfflineQueue } from '../hooks/useOfflineQueue'
import { SearchSelect } from '../components/SearchSelect'
import { CrearConductorModal, type NuevoConductorInput } from '../components/checklist/CrearConductorModal'
import { CrearVehiculoModal, type NuevoVehiculoInput } from '../components/checklist/CrearVehiculoModal'
import { appendToCatalogCache } from '../lib/masterDataCache'
import { PREGUNTAS, CRITICIDAD_ITEM, type PKey } from '../lib/constants'
import { esRolAdministrativo } from '../lib/roles'
import type { Operador, Patente, LineaOperacion } from '../types'

interface Respuesta {
  falla: boolean
  observacion: string
}

function emptyRespuestas(): Respuesta[] {
  return PREGUNTAS.map(() => ({ falla: false, observacion: '' }))
}

interface Sugerencia {
  tono: 'ok' | 'warn' | 'fault'
  texto: string
}

interface ContextoAgravante {
  nocturna: boolean
  lluvia: boolean
  testigoAbs: boolean
  camionCombustible: boolean
}

// Severidad efectiva de un ítem en mal estado según la matriz de criticidad:
// items "D" son siempre detención inmediata; items "P" escalan a "D" solo si
// se cumple su condición agravante (circulación nocturna, lluvia, etc).
function severidadEfectiva(key: PKey, ctx: ContextoAgravante): 'P' | 'D' {
  const item = CRITICIDAD_ITEM[key]
  if (item.base === 'D') return 'D'
  switch (item.agravante?.tipo) {
    case 'nocturna': return ctx.nocturna ? 'D' : 'P'
    case 'lluvia': return ctx.lluvia ? 'D' : 'P'
    case 'testigo_abs': return ctx.testigoAbs ? 'D' : 'P'
    case 'camion_combustible': return ctx.camionCombustible ? 'D' : 'P'
    default: return 'P'
  }
}

function getSugerencia(operativo: boolean, fallas: { key: PKey; label: string }[], ctx: ContextoAgravante): Sugerencia {
  if (!operativo) {
    return {
      tono: 'fault',
      texto: 'Marcaste el vehículo como no operativo. No debe circular hasta que mantención lo revise.',
    }
  }
  if (fallas.length === 0) {
    return {
      tono: 'ok',
      texto: 'Sin problemas detectados en la revisión. El vehículo puede continuar en servicio con normalidad.',
    }
  }

  // Regla de dominancia de la matriz: D si hay al menos un ítem crítico;
  // si no, P cuando hay 3 o más ítems de precaución en mal estado.
  const conSeveridad = fallas.map(f => ({ ...f, severidad: severidadEfectiva(f.key, ctx) }))
  const criticos = conSeveridad.filter(f => f.severidad === 'D')
  const precaucion = conSeveridad.filter(f => f.severidad === 'P')

  if (criticos.length > 0) {
    const listado = criticos.map(f => f.label).join(', ')
    return {
      tono: 'fault',
      texto: `Detención inmediata: ${listado}. ${criticos.length > 1 ? 'Requieren' : 'Requiere'} atención del vehículo lo antes posible, no debería seguir circulando hasta revisarlo.`,
    }
  }
  if (precaucion.length >= 3) {
    const listado = precaucion.map(f => f.label).join(', ')
    return {
      tono: 'warn',
      texto: `Operar con precaución: se requiere atención programada del vehículo. Se detectaron ${precaucion.length} problemas (${listado}).`,
    }
  }
  const listado = precaucion.map(f => f.label).join(', ')
  return {
    tono: 'warn',
    texto: `Se detectó${precaucion.length > 1 ? 'n' : ''} ${precaucion.length} problema${precaucion.length > 1 ? 's' : ''} (${listado}). El vehículo puede seguir circulando, pero avisa a mantención para que lo revisen pronto.`,
  }
}

export function Checklist() {
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const puedeCrearMaestros = esRolAdministrativo(perfil?.rol)
  const { operadores, patentes, categoriasVehiculo, lineasOperacion, loading } = useFormData()
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
  const [nocturna, setNocturna] = useState(false)
  const [lluvia, setLluvia] = useState(false)
  const [testigoAbs, setTestigoAbs] = useState(false)
  const [done, setDone] = useState(false)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  // Conductores/vehículos/líneas creados en esta sesión (aún no confirmados por el servidor),
  // para que aparezcan de inmediato en los buscadores sin esperar la sincronización.
  const [conductoresLocales, setConductoresLocales] = useState<Operador[]>([])
  const [vehiculosLocales, setVehiculosLocales] = useState<Patente[]>([])
  const [lineasLocales, setLineasLocales] = useState<LineaOperacion[]>([])
  const [crearConductorQuery, setCrearConductorQuery] = useState<string | null>(null)
  const [crearVehiculoQuery, setCrearVehiculoQuery] = useState<string | null>(null)

  const allOperadores = [...operadores, ...conductoresLocales]
  const allPatentes = [...patentes, ...vehiculosLocales]
  const allLineas = [...lineasOperacion, ...lineasLocales]

  useEffect(() => {
    const up = () => setIsOffline(false)
    const dn = () => setIsOffline(true)
    window.addEventListener('online', up)
    window.addEventListener('offline', dn)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', dn) }
  }, [])

  // Al elegir la patente, se completan solos el tipo de vehículo y la línea
  // (vienen del registro del vehículo, no se piden a mano).
  useEffect(() => {
    const p = allPatentes.find(x => x.id === patenteId)
    if (!p) {
      setTipoVehiculo('')
      setLinea('')
      return
    }
    const categoria = categoriasVehiculo.find(c => String(c.id) === String(p.categoria_id))
    setTipoVehiculo(categoria?.nombre ?? '')
    setLinea(p.linea ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patenteId, patentes, vehiculosLocales, categoriasVehiculo])

  function setFalla(idx: number, v: boolean) {
    setRespuestas(prev => prev.map((r, i) =>
      i === idx ? { ...r, falla: v, observacion: v ? r.observacion : '' } : r
    ))
    if (!v && PREGUNTAS[idx]?.key === 'p5') setTestigoAbs(false)
  }

  function setObs(idx: number, v: string) {
    setRespuestas(prev => prev.map((r, i) => i === idx ? { ...r, observacion: v } : r))
  }

  async function handleCrearConductor(input: NuevoConductorInput) {
    const id = crypto.randomUUID()
    const conductor: Operador = {
      id,
      nombre: input.nombre,
      apellido: input.apellido,
      rut: input.rut,
      email: '',
      activo: true,
    }
    setConductoresLocales(prev => [...prev, conductor])
    await appendToCatalogCache('operadores', conductor)
    await enqueue({
      type: 'crear_conductor',
      conductor: { id, nombre: input.nombre, apellido: input.apellido, rut: input.rut || null },
    })
    setOperadorId(id)
    setCrearConductorQuery(null)
  }

  async function handleCrearVehiculo(input: NuevoVehiculoInput) {
    const id = crypto.randomUUID()
    const vehiculo: Patente = {
      id,
      patente: input.patente,
      descripcion: input.descripcion,
      activo: true,
      estado_actual: 'operativo',
      categoria_id: input.categoriaId || null,
      marca: null,
      modelo: null,
      anno: null,
      vin: null,
      motor: null,
      condicion: null,
      area: null,
      linea: input.linea || null,
      responsable_nombre: null,
      responsable_cargo: null,
      afecta_indicadores: true,
    }
    setVehiculosLocales(prev => [...prev, vehiculo])
    await appendToCatalogCache('patentes', vehiculo)
    await enqueue({
      type: 'crear_vehiculo',
      vehiculo: {
        id,
        patente: input.patente,
        categoria_id: input.categoriaId ? Number(input.categoriaId) : null,
        linea: input.linea || null,
        descripcion: input.descripcion || null,
      },
    })
    setPatenteId(id)
    setCrearVehiculoQuery(null)
  }

  function handleCrearLinea(codigo: string) {
    if (allLineas.some(l => l.codigo === codigo)) return
    const linea: LineaOperacion = { id: crypto.randomUUID(), codigo, nombre: codigo, activo: true }
    setLineasLocales(prev => [...prev, linea])
    void appendToCatalogCache('lineas_operacion', linea)
    void enqueue({ type: 'crear_linea', linea: { codigo, nombre: codigo } })
  }

  function resetForm() {
    setPatenteId('')
    setOdometro(0)
    setObsGeneral('')
    setOperativo(true)
    setRespuestas(emptyRespuestas())
    setNocturna(false)
    setLluvia(false)
    setTestigoAbs(false)
    setDone(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!operadorId || !patenteId) return
    await enqueue({
      type: 'checklist',
      inspeccion: {
        operador_id: operadorId,
        patente_id: patenteId,
        kilometraje: odometro,
        fecha: new Date().toISOString(),
        uuid_local: crypto.randomUUID(),
        obs_general: obsGeneral || null,
        operativo,
        linea: linea || null,
      },
      respuestas: PREGUNTAS.map((_, idx) => ({
        pregunta_id: idx + 1,
        valor: respuestas[idx].falla,
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

  const opOptions = allOperadores.map(o => ({ value: o.id, label: `${o.apellido}, ${o.nombre}` }))
  const patOptions = allPatentes.map(p => ({ value: p.id, label: p.patente + (p.descripcion ? ` — ${p.descripcion}` : '') }))
  const lineaOptions = allLineas.map(l => ({
    value: l.codigo,
    label: l.nombre && l.nombre !== l.codigo ? `${l.codigo} — ${l.nombre}` : l.codigo,
  }))
  const canSubmit = !!operadorId && !!patenteId

  const fallasActivas = PREGUNTAS.filter((_, idx) => respuestas[idx]?.falla)
  const camionCombustible = tipoVehiculo.trim().toUpperCase().includes('COMBUSTIBLE')
  const sugerencia = getSugerencia(
    operativo,
    fallasActivas.map(p => ({ key: p.key, label: p.label })),
    { nocturna, lluvia, testigoAbs, camionCombustible },
  )
  const idxTablero = PREGUNTAS.findIndex(p => p.key === 'p5')

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
                <label className="label">Conductor</label>
                <SearchSelect
                  options={opOptions}
                  value={operadorId}
                  onChange={setOperadorId}
                  placeholder="Seleccionar conductor..."
                  onCreate={puedeCrearMaestros ? q => setCrearConductorQuery(q) : undefined}
                  createLabel={q => `Crear conductor "${q}"`}
                />
              </div>
              <div>
                <label className="label">Patente / Vehículo</label>
                <SearchSelect
                  options={patOptions}
                  value={patenteId}
                  onChange={setPatenteId}
                  placeholder="Seleccionar patente..."
                  onCreate={puedeCrearMaestros ? q => setCrearVehiculoQuery(q) : undefined}
                  createLabel={q => `Crear vehículo "${q}"`}
                />
              </div>
              <div>
                <label className="label">Tipo de vehículo</label>
                <div className="min-h-[48px] border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50 flex items-center text-sm">
                  {!patenteId ? (
                    <span className="text-gray-400">Se completa solo al elegir la patente</span>
                  ) : (
                    <span className="font-medium text-gray-700">{tipoVehiculo || 'Sin tipo registrado'}</span>
                  )}
                </div>
              </div>
              <div>
                <label className="label">Línea</label>
                <SearchSelect
                  options={lineaOptions}
                  value={linea}
                  onChange={setLinea}
                  placeholder={patenteId ? 'Seleccionar línea...' : 'Se completa sola al elegir la patente'}
                  onCreate={q => {
                    const codigo = q.trim().toUpperCase()
                    handleCrearLinea(codigo)
                    setLinea(codigo)
                  }}
                  createLabel={q => `Crear línea "${q.trim().toUpperCase()}"`}
                />
                <p className="text-xs text-gray-400 mt-1">Se completa sola con la línea del vehículo, pero puedes cambiarla.</p>
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

            {/* Preguntas de estado */}
            <div className="space-y-3">
              <h2 className="font-semibold text-dark text-sm px-1">Revisión de sistemas</h2>
              <p className="text-xs text-gray-400 px-1">Marca el estado de cada sistema del vehículo</p>
              {PREGUNTAS.map((p, idx) => {
                const r = respuestas[idx]
                return (
                  <div
                    key={p.key}
                    className={`bg-white rounded-xl border-2 p-4 transition-colors ${r.falla ? 'border-fault/50 bg-fault/[0.03]' : 'border-gray-200'}`}
                  >
                    <p className="font-medium text-dark text-sm mb-1">{idx + 1}. {p.label}</p>
                    <p className="text-xs text-gray-500 mb-3">{p.descripcion}</p>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Estado</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setFalla(idx, false)}
                          className={`h-12 rounded-xl text-sm font-bold transition-all border ${
                            !r.falla
                              ? 'bg-primary text-white border-primary shadow-sm'
                              : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          Buen estado
                        </button>
                        <button
                          type="button"
                          onClick={() => setFalla(idx, true)}
                          className={`h-12 rounded-xl text-sm font-bold transition-all border ${
                            r.falla
                              ? 'bg-fault text-white border-fault shadow-sm'
                              : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          Mal estado
                        </button>
                      </div>
                    </div>
                    {r.falla && (
                      <textarea
                        placeholder="Observación (opcional)..."
                        value={r.observacion}
                        onChange={e => setObs(idx, e.target.value)}
                        rows={2}
                        className="w-full mt-3 text-sm border border-fault/30 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-fault/30 resize-none bg-white"
                      />
                    )}
                    {r.falla && idx === idxTablero && (
                      <label className="flex items-center gap-2 mt-3 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={testigoAbs}
                          onChange={e => setTestigoAbs(e.target.checked)}
                          className="w-4 h-4 accent-fault"
                        />
                        Es el testigo ABS (eleva la severidad a detención inmediata)
                      </label>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Condiciones que agravan la severidad de algunas fallas */}
            <div className="card space-y-3">
              <h2 className="font-semibold text-dark text-sm">Condiciones de circulación</h2>
              <p className="text-xs text-gray-400">Algunas fallas son más graves bajo estas condiciones.</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNocturna(v => !v)}
                  className={`h-12 rounded-xl text-sm font-bold transition-all border ${
                    nocturna ? 'bg-dark text-white border-dark shadow-sm' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Circulación nocturna
                </button>
                <button
                  type="button"
                  onClick={() => setLluvia(v => !v)}
                  className={`h-12 rounded-xl text-sm font-bold transition-all border ${
                    lluvia ? 'bg-dark text-white border-dark shadow-sm' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Con lluvia
                </button>
              </div>
              {camionCombustible && (
                <p className="text-xs text-gray-400">Vehículo tipo camión combustible: el kit de emergencia es crítico.</p>
              )}
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

              <div className={`rounded-xl border px-4 py-3 ${
                sugerencia.tono === 'ok' ? 'bg-primary/5 border-primary/20'
                : sugerencia.tono === 'warn' ? 'bg-warn/5 border-warn/20'
                : 'bg-fault/5 border-fault/20'
              }`}>
                <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${
                  sugerencia.tono === 'ok' ? 'text-primary' : sugerencia.tono === 'warn' ? 'text-warn' : 'text-fault'
                }`}>
                  Sugerencia
                </p>
                <p className="text-sm text-gray-700">{sugerencia.texto}</p>
              </div>

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

      {crearConductorQuery !== null && (
        <CrearConductorModal
          query={crearConductorQuery}
          onClose={() => setCrearConductorQuery(null)}
          onCreated={conductor => void handleCrearConductor(conductor)}
        />
      )}
      {crearVehiculoQuery !== null && (
        <CrearVehiculoModal
          query={crearVehiculoQuery}
          categorias={categoriasVehiculo}
          lineas={allLineas}
          onClose={() => setCrearVehiculoQuery(null)}
          onCreated={vehiculo => void handleCrearVehiculo(vehiculo)}
          onCrearLinea={handleCrearLinea}
        />
      )}
    </div>
  )
}
