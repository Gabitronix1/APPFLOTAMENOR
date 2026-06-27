import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFormData } from '../hooks/useFormData'
import { useOfflineQueue } from '../hooks/useOfflineQueue'
import { SearchSelect } from '../components/SearchSelect'
import { supabase } from '../lib/supabase'

const TIPOS_VEHICULO = ['CAMIONETA', 'CAMIÓN', 'TRACTOR', 'EXCAVADORA', 'RETROEXCAVADORA', 'MOTONIVELADORA', 'MINIBÚS', 'OTRO']
const LINEAS = ['LINEA A', 'LINEA B', 'LINEA C', 'LINEA D', 'ESPECIAL']

type TipoInt = 'PREVENTIVA' | 'CORRECTIVA'

function todayISO() { return new Date().toISOString().slice(0, 10) }
function nowHHMM() { return new Date().toTimeString().slice(0, 5) }

export function Intervencion() {
  const navigate = useNavigate()
  const { operadores, patentes, tiposPreventiva, loading } = useFormData()
  const { enqueue } = useOfflineQueue()

  const [screen, setScreen] = useState<1 | 2>(1)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Screen 1
  const [operadorId, setOperadorId] = useState('')
  const [patenteId, setPatenteId] = useState('')
  const [tipoVehiculo, setTipoVehiculo] = useState('')
  const [linea, setLinea] = useState('')
  const [odometro, setOdometro] = useState(0)
  const [tipo, setTipo] = useState<TipoInt>('PREVENTIVA')

  // Screen 2 — Preventiva
  const [tipoPrevId, setTipoPrevId] = useState('')
  const [prevDesc, setPrevDesc] = useState('')
  const [prevImagen, setPrevImagen] = useState<File | null>(null)
  const [prevPreview, setPrevPreview] = useState<string | null>(null)
  const [prevFechaTermino, setPrevFechaTermino] = useState(todayISO())
  const [prevHoraTermino, setPrevHoraTermino] = useState(nowHHMM())

  // Screen 2 — Correctiva
  const [descFalla, setDescFalla] = useState('')
  const [fechaInicio, setFechaInicio] = useState(todayISO())
  const [horaInicio, setHoraInicio] = useState(nowHHMM())
  const [fechaTermino, setFechaTermino] = useState(todayISO())
  const [horaTermino, setHoraTermino] = useState(nowHHMM())
  const [causaProbable, setCausaProbable] = useState('')
  const [diagnostico, setDiagnostico] = useState('')
  const [fallas, setFallas] = useState<string[]>([''])

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const up = () => setIsOffline(false)
    const dn = () => setIsOffline(true)
    window.addEventListener('online', up)
    window.addEventListener('offline', dn)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', dn) }
  }, [])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setPrevImagen(file)
    if (file) {
      const url = URL.createObjectURL(file)
      setPrevPreview(url)
    } else {
      setPrevPreview(null)
    }
  }

  function removeImage() {
    setPrevImagen(null)
    setPrevPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function addFalla() { setFallas(prev => [...prev, '']) }
  function removeFalla(idx: number) { setFallas(prev => prev.filter((_, i) => i !== idx)) }
  function updateFalla(idx: number, v: string) { setFallas(prev => prev.map((f, i) => i === idx ? v : f)) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    const uuid_local = crypto.randomUUID()
    let imagenPath: string | null = null

    if (tipo === 'PREVENTIVA' && prevImagen && !isOffline) {
      const ext = prevImagen.name.split('.').pop() ?? 'jpg'
      const result = await supabase.storage
        .from('fotos-intervenciones')
        .upload(`${uuid_local}.${ext}`, prevImagen, { contentType: prevImagen.type, upsert: false })
      if (result.data?.path) imagenPath = result.data.path
    }

    const intervencion = {
      operador_id: operadorId,
      patente_id: patenteId,
      linea,
      tipo_vehiculo: tipoVehiculo,
      odometro,
      tipo,
      f_registro: new Date().toISOString(),
      uuid_local,
    }

    if (tipo === 'PREVENTIVA') {
      enqueue({
        type: 'intervencion_preventiva',
        intervencion,
        preventiva: {
          tipo_preventiva_id: tipoPrevId,
          descripcion: prevDesc,
          imagen_path: imagenPath,
          fecha_termino: prevFechaTermino,
          hora_termino: prevHoraTermino,
        },
      })
    } else {
      enqueue({
        type: 'intervencion_correctiva',
        intervencion,
        correctiva: {
          descripcion_falla: descFalla,
          fecha_inicio: fechaInicio,
          hora_inicio: horaInicio,
          fecha_termino: fechaTermino,
          hora_termino: horaTermino,
          causa_probable: causaProbable,
          diagnostico,
        },
        fallas: fallas.filter(f => f.trim()).map(f => ({ tipo_falla: f.trim() })),
      })
    }

    setSubmitting(false)
    setDone(true)
  }

  function resetForm() {
    setScreen(1)
    setOperadorId('')
    setPatenteId('')
    setTipoVehiculo('')
    setLinea('')
    setOdometro(0)
    setTipo('PREVENTIVA')
    setTipoPrevId('')
    setPrevDesc('')
    setPrevImagen(null)
    setPrevPreview(null)
    setPrevFechaTermino(todayISO())
    setPrevHoraTermino(nowHHMM())
    setDescFalla('')
    setFechaInicio(todayISO())
    setHoraInicio(nowHHMM())
    setFechaTermino(todayISO())
    setHoraTermino(nowHHMM())
    setCausaProbable('')
    setDiagnostico('')
    setFallas([''])
    setDone(false)
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
          <h2 className="text-xl font-bold text-dark mb-2">Intervención registrada</h2>
          <p className="text-sm text-gray-500 mb-6">
            {isOffline
              ? 'Guardado sin conexión. Se sincronizará automáticamente cuando haya red.'
              : 'Enviado correctamente.'}
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={resetForm} className="btn-primary">Nueva intervención</button>
            <button onClick={() => navigate('/dashboard')} className="btn-secondary">Dashboard</button>
          </div>
        </div>
      </div>
    )
  }

  const opOptions = operadores.map(o => ({ value: o.id, label: `${o.apellido}, ${o.nombre}` }))
  const patOptions = patentes.map(p => ({ value: p.id, label: p.patente + (p.descripcion ? ` — ${p.descripcion}` : '') }))
  const tipPrevOptions = tiposPreventiva.map(t => ({ value: t.id, label: t.nombre }))

  const screen1Valid = !!operadorId && !!patenteId && !!tipoVehiculo && !!linea
  const screen2Valid = tipo === 'PREVENTIVA'
    ? !!tipoPrevId && !!prevDesc
    : !!descFalla && !!causaProbable && !!diagnostico

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 pb-10">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 mb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {screen === 2 && (
                <button
                  type="button"
                  onClick={() => setScreen(1)}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
              )}
              <div>
                <h1 className="text-lg font-bold text-dark">Intervención</h1>
                <p className="text-xs text-gray-400">Paso {screen} de 2 — {tipo}</p>
              </div>
            </div>
            {isOffline && <span className="badge-fault">Sin conexión</span>}
          </div>
          <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: screen === 1 ? '50%' : '100%' }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando datos...</div>
      ) : screen === 1 ? (
        /* ── Screen 1: Header info ── */
        <div className="max-w-lg mx-auto px-4 space-y-4">
          <div className="card space-y-4">
            <h2 className="font-semibold text-dark text-sm">Datos generales</h2>
            <div>
              <label className="label">Operador</label>
              <SearchSelect options={opOptions} value={operadorId} onChange={setOperadorId} placeholder="Seleccionar operador..." />
            </div>
            <div>
              <label className="label">Patente / Vehículo</label>
              <SearchSelect options={patOptions} value={patenteId} onChange={setPatenteId} placeholder="Seleccionar patente..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Tipo vehículo</label>
                <select value={tipoVehiculo} onChange={e => setTipoVehiculo(e.target.value)} className="input">
                  <option value="">Seleccionar...</option>
                  {TIPOS_VEHICULO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Línea</label>
                <select value={linea} onChange={e => setLinea(e.target.value)} className="input">
                  <option value="">Seleccionar...</option>
                  {LINEAS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Odómetro (km)</label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setOdometro(v => Math.max(0, v - 10))} className="w-12 h-12 rounded-xl border border-gray-300 text-xl font-bold text-gray-600 hover:bg-gray-50 flex-shrink-0 flex items-center justify-center">−</button>
                <input type="number" min={0} value={odometro} onChange={e => setOdometro(Math.max(0, Number(e.target.value)))} className="flex-1 h-12 text-center border border-gray-300 rounded-xl text-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary" />
                <button type="button" onClick={() => setOdometro(v => v + 10)} className="w-12 h-12 rounded-xl border border-gray-300 text-xl font-bold text-gray-600 hover:bg-gray-50 flex-shrink-0 flex items-center justify-center">+</button>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold text-dark text-sm mb-3">Tipo de intervención</h2>
            <div className="grid grid-cols-2 gap-3">
              {(['PREVENTIVA', 'CORRECTIVA'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`h-16 rounded-xl border-2 font-bold text-sm transition-all ${
                    tipo === t
                      ? t === 'PREVENTIVA'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-fault bg-fault/5 text-fault'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={!screen1Valid}
            onClick={() => setScreen(2)}
            className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold text-base rounded-2xl disabled:opacity-40 transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            Continuar
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      ) : (
        /* ── Screen 2: Detalles ── */
        <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 space-y-4">
          {tipo === 'PREVENTIVA' ? (
            <>
              <div className="card space-y-4">
                <h2 className="font-semibold text-dark text-sm">Detalles preventiva</h2>
                <div>
                  <label className="label">Tipo de mantención</label>
                  {tipPrevOptions.length > 0 ? (
                    <SearchSelect options={tipPrevOptions} value={tipoPrevId} onChange={setTipoPrevId} placeholder="Seleccionar tipo..." />
                  ) : (
                    <input
                      type="text"
                      value={tipoPrevId}
                      onChange={e => setTipoPrevId(e.target.value)}
                      placeholder="Ej: Cambio de aceite"
                      className="input"
                    />
                  )}
                </div>
                <div>
                  <label className="label">Descripción</label>
                  <textarea
                    value={prevDesc}
                    onChange={e => setPrevDesc(e.target.value)}
                    rows={3}
                    placeholder="Detalle de la mantención realizada..."
                    className="input resize-none"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Fecha término</label>
                    <input type="date" value={prevFechaTermino} onChange={e => setPrevFechaTermino(e.target.value)} className="input" />
                  </div>
                  <div>
                    <label className="label">Hora término</label>
                    <input type="time" value={prevHoraTermino} onChange={e => setPrevHoraTermino(e.target.value)} className="input" />
                  </div>
                </div>
              </div>

              {/* Foto */}
              <div className="card">
                <h2 className="font-semibold text-dark text-sm mb-3">Foto (opcional)</h2>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  className="hidden"
                />
                {prevPreview ? (
                  <div className="relative">
                    <img src={prevPreview} alt="Vista previa" className="w-full h-48 object-cover rounded-xl" />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center text-sm hover:bg-black/70"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-primary hover:text-primary transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    <span className="text-sm font-medium">Tomar foto o seleccionar</span>
                  </button>
                )}
                {isOffline && prevImagen && (
                  <p className="text-xs text-warn mt-2">Sin conexión: la foto no se guardará hasta que haya red.</p>
                )}
              </div>
            </>
          ) : (
            /* CORRECTIVA */
            <>
              <div className="card space-y-4">
                <h2 className="font-semibold text-dark text-sm">Detalles correctiva</h2>
                <div>
                  <label className="label">Descripción de la falla</label>
                  <textarea
                    value={descFalla}
                    onChange={e => setDescFalla(e.target.value)}
                    rows={3}
                    placeholder="Describe la falla observada..."
                    className="input resize-none"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Fecha inicio</label>
                    <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="input" />
                  </div>
                  <div>
                    <label className="label">Hora inicio</label>
                    <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className="input" />
                  </div>
                  <div>
                    <label className="label">Fecha término</label>
                    <input type="date" value={fechaTermino} onChange={e => setFechaTermino(e.target.value)} className="input" />
                  </div>
                  <div>
                    <label className="label">Hora término</label>
                    <input type="time" value={horaTermino} onChange={e => setHoraTermino(e.target.value)} className="input" />
                  </div>
                </div>
                <div>
                  <label className="label">Causa probable</label>
                  <textarea
                    value={causaProbable}
                    onChange={e => setCausaProbable(e.target.value)}
                    rows={2}
                    placeholder="¿Qué pudo causar la falla?"
                    className="input resize-none"
                    required
                  />
                </div>
                <div>
                  <label className="label">Diagnóstico</label>
                  <textarea
                    value={diagnostico}
                    onChange={e => setDiagnostico(e.target.value)}
                    rows={2}
                    placeholder="Diagnóstico técnico..."
                    className="input resize-none"
                    required
                  />
                </div>
              </div>

              <div className="card space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-dark text-sm">Tipos de falla</h2>
                  <button type="button" onClick={addFalla} className="text-sm text-primary font-semibold hover:text-primary/80">
                    + Agregar
                  </button>
                </div>
                {fallas.map((f, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={f}
                      onChange={e => updateFalla(idx, e.target.value)}
                      placeholder={`Tipo de falla ${idx + 1}...`}
                      className="input flex-1"
                    />
                    {fallas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFalla(idx)}
                        className="w-10 h-10 rounded-lg border border-fault/30 text-fault hover:bg-fault/5 flex items-center justify-center flex-shrink-0 text-sm"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={submitting || !screen2Valid}
            className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold text-base rounded-2xl disabled:opacity-40 transition-colors shadow-sm"
          >
            {submitting ? 'Guardando...' : isOffline ? 'Guardar sin conexión' : 'Registrar intervención'}
          </button>
        </form>
      )}
    </div>
  )
}
