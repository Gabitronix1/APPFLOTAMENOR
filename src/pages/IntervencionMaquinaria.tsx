import { useEffect, useRef, useState, ChangeEvent, RefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFormDataMaquinaria } from '../hooks/useFormDataMaquinaria'
import { useOfflineQueue } from '../hooks/useOfflineQueue'
import { TIPOS_INTERVENCION_MAQUINARIA } from '../lib/maquinaria'
import { SearchSelect } from '../components/SearchSelect'
import { CatalogSelect } from '../components/CatalogSelect'
import type { TipoIntervencionMaquinaria } from '../types'

type Paso = 'cabecera' | 'detalle' | 'insumos'

interface Desviacion {
  id: string
  texto: string
}

interface InsumoAgregado {
  id: string
  productoId: string
  productoNombre: string
  codigoBarras: string
  cantidad: number
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
function nowHHMM() {
  return new Date().toTimeString().slice(0, 5)
}

function FotoCapture({
  label,
  preview,
  onChange,
  onRemove,
  fileInputRef,
}: {
  label: string
  preview: string | null
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  onRemove: () => void
  fileInputRef: RefObject<HTMLInputElement>
}) {
  return (
    <div className="card">
      <h2 className="font-semibold text-dark text-sm mb-3">{label}</h2>
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={onChange} className="hidden" />
      {preview ? (
        <div className="relative">
          <img src={preview} alt="Vista previa" className="w-full h-48 object-cover rounded-xl" />
          <button
            type="button"
            onClick={onRemove}
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
    </div>
  )
}

export function IntervencionMaquinaria() {
  const navigate = useNavigate()
  const {
    operadores,
    maquinarias,
    lineas,
    turnos,
    actividades,
    subEquipos,
    tiposPreventiva,
    sistemasCorrectivo,
    codigosFalla,
    tareasOtra,
    productosInsumo,
    condicionesEquipo,
    loading,
  } = useFormDataMaquinaria()
  const { enqueue } = useOfflineQueue()

  const [paso, setPaso] = useState<Paso>('cabecera')
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Cabecera
  const [fechaInicio, setFechaInicio] = useState(todayISO())
  const [horaInicio, setHoraInicio] = useState(nowHHMM())
  const [responsableId, setResponsableId] = useState('')
  const [maquinariaId, setMaquinariaId] = useState('')
  const [lineaId, setLineaId] = useState('')
  const [turnoId, setTurnoId] = useState('')
  const [actividadId, setActividadId] = useState('')
  const [subEquipoId, setSubEquipoId] = useState('')
  const [horometro, setHorometro] = useState(0)
  const [imagen, setImagen] = useState<File | null>(null)
  const [imagenPreview, setImagenPreview] = useState<string | null>(null)
  const [tipo, setTipo] = useState<TipoIntervencionMaquinaria | null>(null)
  const imagenInputRef = useRef<HTMLInputElement>(null)

  // Preventiva
  const [prevTipoId, setPrevTipoId] = useState('')
  const [prevDescripcion, setPrevDescripcion] = useState('')
  const [prevImagen, setPrevImagen] = useState<File | null>(null)
  const [prevImagenPreview, setPrevImagenPreview] = useState<string | null>(null)
  const [desviaciones, setDesviaciones] = useState<Desviacion[]>([])
  const [prevFechaTermino, setPrevFechaTermino] = useState(todayISO())
  const [prevHoraTermino, setPrevHoraTermino] = useState(nowHHMM())
  const [prevCondicionId, setPrevCondicionId] = useState('')
  const [prevCosto, setPrevCosto] = useState('')
  const prevImagenInputRef = useRef<HTMLInputElement>(null)

  // Correctiva
  const [horaAvisoFalla, setHoraAvisoFalla] = useState(nowHHMM())
  const [descripcionFalla, setDescripcionFalla] = useState('')
  const [imagenFalla, setImagenFalla] = useState<File | null>(null)
  const [imagenFallaPreview, setImagenFallaPreview] = useState<string | null>(null)
  const [sistemaId, setSistemaId] = useState('')
  const [codigoFallaId, setCodigoFallaId] = useState('')
  const [causaProbable, setCausaProbable] = useState('')
  const [solucionPropuesta, setSolucionPropuesta] = useState('')
  const [corrFechaTermino, setCorrFechaTermino] = useState(todayISO())
  const [corrHoraTermino, setCorrHoraTermino] = useState(nowHHMM())
  const [corrCondicionId, setCorrCondicionId] = useState('')
  const [corrCosto, setCorrCosto] = useState('')
  const imagenFallaInputRef = useRef<HTMLInputElement>(null)

  // Otra
  const [tareaId, setTareaId] = useState('')
  const [otraDescripcion, setOtraDescripcion] = useState('')
  const [otraFechaTermino, setOtraFechaTermino] = useState(todayISO())
  const [otraHoraTermino, setOtraHoraTermino] = useState(nowHHMM())
  const [otraCondicionId, setOtraCondicionId] = useState('')
  const [otraCosto, setOtraCosto] = useState('')

  // Insumos
  const [insumos, setInsumos] = useState<InsumoAgregado[]>([])
  const [nuevoProductoId, setNuevoProductoId] = useState('')
  const [nuevoCodigoBarras, setNuevoCodigoBarras] = useState('')
  const [nuevaCantidad, setNuevaCantidad] = useState(1)

  useEffect(() => {
    const up = () => setIsOffline(false)
    const dn = () => setIsOffline(true)
    window.addEventListener('online', up)
    window.addEventListener('offline', dn)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', dn) }
  }, [])

  function fotoHandler(setFile: (f: File | null) => void, setPreview: (p: string | null) => void) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null
      setFile(file)
      setPreview(file ? URL.createObjectURL(file) : null)
    }
  }

  const cabeceraValida = !!responsableId && !!maquinariaId && !!lineaId

  const codigosFallaFiltrados = sistemaId ? codigosFalla.filter(c => c.sistema_id === sistemaId) : codigosFalla

  function agregarDesviacion() {
    setDesviaciones(prev => [...prev, { id: crypto.randomUUID(), texto: '' }])
  }
  function actualizarDesviacion(id: string, texto: string) {
    setDesviaciones(prev => prev.map(d => (d.id === id ? { ...d, texto } : d)))
  }
  function quitarDesviacion(id: string) {
    setDesviaciones(prev => prev.filter(d => d.id !== id))
  }

  function handleCodigoBarrasChange(v: string) {
    setNuevoCodigoBarras(v)
    const match = productosInsumo.find(p => p.codigo_barras && p.codigo_barras === v.trim())
    if (match) setNuevoProductoId(match.id)
  }

  function agregarInsumo() {
    if (!nuevoProductoId || nuevaCantidad <= 0) return
    const producto = productosInsumo.find(p => p.id === nuevoProductoId)
    setInsumos(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        productoId: nuevoProductoId,
        productoNombre: producto?.nombre ?? '—',
        codigoBarras: nuevoCodigoBarras.trim(),
        cantidad: nuevaCantidad,
      },
    ])
    setNuevoProductoId('')
    setNuevoCodigoBarras('')
    setNuevaCantidad(1)
  }
  function quitarInsumo(id: string) {
    setInsumos(prev => prev.filter(i => i.id !== id))
  }

  function screen2Valido(): boolean {
    if (tipo === 'PREVENTIVA') return !!prevDescripcion.trim() && !!prevFechaTermino && !!prevHoraTermino
    if (tipo === 'CORRECTIVA') {
      return !!descripcionFalla.trim() && !!causaProbable.trim() && !!solucionPropuesta.trim() && !!corrFechaTermino && !!corrHoraTermino
    }
    if (tipo === 'OTRA') return !!otraDescripcion.trim() && !!otraFechaTermino && !!otraHoraTermino
    return false
  }

  async function finalizar() {
    if (!tipo) return
    setSubmitting(true)
    const uuid_local = crypto.randomUUID()

    const intervencion = {
      responsable_id: responsableId,
      maquinaria_id: maquinariaId,
      linea_id: lineaId,
      turno_id: turnoId || null,
      actividad_id: actividadId || null,
      sub_equipo_id: subEquipoId || null,
      horometro,
      imagen_path: null,
      tipo,
      fecha_inicio: fechaInicio,
      hora_inicio: horaInicio,
      uuid_local,
    }
    const fotoCabecera = imagen ? { blob: imagen, ext: imagen.name.split('.').pop() ?? 'jpg' } : undefined
    const detalleFile = tipo === 'PREVENTIVA' ? prevImagen : tipo === 'CORRECTIVA' ? imagenFalla : null
    const fotoDetalle = detalleFile ? { blob: detalleFile, ext: detalleFile.name.split('.').pop() ?? 'jpg' } : undefined

    const insumosPayload = insumos.length
      ? insumos.map(i => ({ producto_id: i.productoId, barcode: i.codigoBarras || null, cantidad: i.cantidad }))
      : undefined

    if (tipo === 'PREVENTIVA') {
      const desviacionesPayload = desviaciones.filter(d => d.texto.trim()).map(d => ({ descripcion: d.texto.trim() }))
      await enqueue({
        type: 'intervencion_maquinaria_preventiva',
        intervencion,
        preventiva: {
          tipo_preventiva_id: prevTipoId || null,
          descripcion: prevDescripcion.trim(),
          imagen_path: null,
          fecha_termino: prevFechaTermino,
          hora_termino: prevHoraTermino,
          condicion_equipo_id: prevCondicionId || null,
          costo: prevCosto ? Number(prevCosto) : null,
        },
        desviaciones: desviacionesPayload.length ? desviacionesPayload : undefined,
        insumos: insumosPayload,
        fotoCabecera,
        fotoDetalle,
      })
    } else if (tipo === 'CORRECTIVA') {
      await enqueue({
        type: 'intervencion_maquinaria_correctiva',
        intervencion,
        correctiva: {
          hora_aviso_falla: horaAvisoFalla,
          descripcion_falla: descripcionFalla.trim(),
          imagen_falla_path: null,
          sistema_id: sistemaId || null,
          codigo_falla_id: codigoFallaId || null,
          causa_probable: causaProbable.trim(),
          solucion_propuesta: solucionPropuesta.trim(),
          fecha_termino: corrFechaTermino,
          hora_termino: corrHoraTermino,
          condicion_equipo_id: corrCondicionId || null,
          costo: corrCosto ? Number(corrCosto) : null,
        },
        insumos: insumosPayload,
        fotoCabecera,
        fotoDetalle,
      })
    } else {
      await enqueue({
        type: 'intervencion_maquinaria_otra',
        intervencion,
        otra: {
          tarea_id: tareaId || null,
          descripcion: otraDescripcion.trim(),
          fecha_termino: otraFechaTermino,
          hora_termino: otraHoraTermino,
          condicion_equipo_id: otraCondicionId || null,
          costo: otraCosto ? Number(otraCosto) : null,
        },
        insumos: insumosPayload,
        fotoCabecera,
      })
    }

    setSubmitting(false)
    setDone(true)
  }

  function resetForm() {
    setPaso('cabecera')
    setFechaInicio(todayISO())
    setHoraInicio(nowHHMM())
    setResponsableId('')
    setMaquinariaId('')
    setLineaId('')
    setTurnoId('')
    setActividadId('')
    setSubEquipoId('')
    setHorometro(0)
    setImagen(null)
    setImagenPreview(null)
    setTipo(null)
    setPrevTipoId('')
    setPrevDescripcion('')
    setPrevImagen(null)
    setPrevImagenPreview(null)
    setDesviaciones([])
    setPrevFechaTermino(todayISO())
    setPrevHoraTermino(nowHHMM())
    setPrevCondicionId('')
    setPrevCosto('')
    setHoraAvisoFalla(nowHHMM())
    setDescripcionFalla('')
    setImagenFalla(null)
    setImagenFallaPreview(null)
    setSistemaId('')
    setCodigoFallaId('')
    setCausaProbable('')
    setSolucionPropuesta('')
    setCorrFechaTermino(todayISO())
    setCorrHoraTermino(nowHHMM())
    setCorrCondicionId('')
    setCorrCosto('')
    setTareaId('')
    setOtraDescripcion('')
    setOtraFechaTermino(todayISO())
    setOtraHoraTermino(nowHHMM())
    setOtraCondicionId('')
    setOtraCosto('')
    setInsumos([])
    setNuevoProductoId('')
    setNuevoCodigoBarras('')
    setNuevaCantidad(1)
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
  const maqOptions = maquinarias.map(m => ({ value: m.id, label: `${m.codigo} — ${m.nombre}` }))
  const productoOptions = productosInsumo.map(p => ({ value: p.id, label: p.nombre }))

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 pb-10">
      <div className="bg-white border-b border-gray-200 px-4 py-4 mb-6">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-dark">Intervención Maquinaria</h1>
            <p className="text-xs text-gray-400">
              {paso === 'cabecera' && 'Paso 1 de 3 — Cabecera'}
              {paso === 'detalle' && `Paso 2 de 3 — ${tipo ? TIPOS_INTERVENCION_MAQUINARIA.find(t => t.value === tipo)?.label : ''}`}
              {paso === 'insumos' && 'Paso 3 de 3 — Insumos'}
            </p>
          </div>
          {isOffline && <span className="badge-fault">Sin conexión</span>}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando datos...</div>
      ) : paso === 'cabecera' ? (
        <div className="max-w-lg mx-auto px-4 space-y-4">
          <div className="card space-y-4">
            <h2 className="font-semibold text-dark text-sm">Datos generales</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Fecha inicio</label>
                <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Hora inicio</label>
                <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className="input" />
              </div>
            </div>
            <div>
              <label className="label">Responsable</label>
              <SearchSelect options={opOptions} value={responsableId} onChange={setResponsableId} placeholder="Seleccionar responsable..." />
            </div>
            <div>
              <label className="label">Maquinaria</label>
              <SearchSelect options={maqOptions} value={maquinariaId} onChange={setMaquinariaId} placeholder="Seleccionar maquinaria..." />
            </div>
            <div>
              <label className="label">Línea</label>
              {lineas.length === 0 ? (
                <p className="text-xs text-gray-400 italic border border-dashed border-gray-300 rounded-lg px-3 py-2.5 bg-gray-50">
                  Aún no hay líneas de operación registradas.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {lineas.map(l => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setLineaId(l.id)}
                      className={`h-12 rounded-xl border-2 font-bold text-sm transition-all ${
                        lineaId === l.id
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {l.codigo}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <CatalogSelect label="Turno" value={turnoId} onChange={setTurnoId} options={turnos} />
              <CatalogSelect label="Actividad" value={actividadId} onChange={setActividadId} options={actividades} />
              <CatalogSelect label="Sub Equipo" value={subEquipoId} onChange={setSubEquipoId} options={subEquipos} />
            </div>
            <div>
              <label className="label">Horómetro</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHorometro(v => Math.max(0, v - 10))}
                  className="w-12 h-12 rounded-xl border border-gray-300 text-xl font-bold text-gray-600 hover:bg-gray-50 flex-shrink-0 flex items-center justify-center"
                >
                  −
                </button>
                <input
                  type="number"
                  min={0}
                  value={horometro}
                  onChange={e => setHorometro(Math.max(0, Number(e.target.value)))}
                  className="flex-1 h-12 text-center border border-gray-300 rounded-xl text-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setHorometro(v => v + 10)}
                  className="w-12 h-12 rounded-xl border border-gray-300 text-xl font-bold text-gray-600 hover:bg-gray-50 flex-shrink-0 flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <FotoCapture
            label="Imagen"
            preview={imagenPreview}
            onChange={fotoHandler(setImagen, setImagenPreview)}
            onRemove={() => { setImagen(null); setImagenPreview(null); if (imagenInputRef.current) imagenInputRef.current.value = '' }}
            fileInputRef={imagenInputRef}
          />

          <div className="card">
            <h2 className="font-semibold text-dark text-sm mb-3">Tipo de intervención</h2>
            <div className="grid grid-cols-3 gap-3">
              {TIPOS_INTERVENCION_MAQUINARIA.map(t => (
                <button
                  key={t.value}
                  type="button"
                  disabled={!cabeceraValida}
                  onClick={() => { setTipo(t.value); setPaso('detalle') }}
                  className="h-20 rounded-xl border-2 border-gray-200 font-bold text-sm text-gray-600 hover:border-primary hover:text-primary disabled:opacity-40 disabled:pointer-events-none transition-all"
                >
                  {t.label}
                </button>
              ))}
            </div>
            {!cabeceraValida && (
              <p className="text-xs text-warn mt-2">Completa responsable, maquinaria y línea para continuar.</p>
            )}
          </div>
        </div>
      ) : paso === 'detalle' ? (
        <div className="max-w-lg mx-auto px-4 space-y-4">
          <button
            type="button"
            onClick={() => setPaso('cabecera')}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          {tipo === 'PREVENTIVA' && (
            <>
              <div className="card space-y-4">
                <h2 className="font-semibold text-dark text-sm">Detalles preventiva</h2>
                <CatalogSelect label="Tipo" value={prevTipoId} onChange={setPrevTipoId} options={tiposPreventiva} />
                <div>
                  <label className="label">Descripción de intervención</label>
                  <textarea
                    value={prevDescripcion}
                    onChange={e => setPrevDescripcion(e.target.value)}
                    rows={3}
                    placeholder="Detalle de la mantención realizada..."
                    className="input resize-none"
                    required
                  />
                </div>
              </div>

              <FotoCapture
                label="Imagen (opcional)"
                preview={prevImagenPreview}
                onChange={fotoHandler(setPrevImagen, setPrevImagenPreview)}
                onRemove={() => { setPrevImagen(null); setPrevImagenPreview(null); if (prevImagenInputRef.current) prevImagenInputRef.current.value = '' }}
                fileInputRef={prevImagenInputRef}
              />

              <div className="card space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-dark text-sm">Desviaciones</h2>
                  <button type="button" onClick={agregarDesviacion} className="text-sm text-primary font-semibold hover:text-primary/80">
                    ＋ Agregar desviación
                  </button>
                </div>
                {desviaciones.length === 0 ? (
                  <p className="text-xs text-gray-400">Sin desviaciones registradas.</p>
                ) : (
                  desviaciones.map((d, idx) => (
                    <div key={d.id} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={d.texto}
                        onChange={e => actualizarDesviacion(d.id, e.target.value)}
                        placeholder={`Desviación ${idx + 1}...`}
                        className="input flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => quitarDesviacion(d.id)}
                        className="w-10 h-10 rounded-lg border border-fault/30 text-fault hover:bg-fault/5 flex items-center justify-center flex-shrink-0 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="card space-y-4">
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
                <CatalogSelect label="Condición del equipo" value={prevCondicionId} onChange={setPrevCondicionId} options={condicionesEquipo} />
                <div>
                  <label className="label">Costo (CLP, opcional)</label>
                  <input type="number" min={0} value={prevCosto} onChange={e => setPrevCosto(e.target.value)} placeholder="Ej: 45000" className="input" />
                </div>
              </div>
            </>
          )}

          {tipo === 'CORRECTIVA' && (
            <>
              <div className="card space-y-4">
                <h2 className="font-semibold text-dark text-sm">Detalles correctiva</h2>
                <div>
                  <label className="label">Hora aviso falla</label>
                  <input type="time" value={horaAvisoFalla} onChange={e => setHoraAvisoFalla(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="label">Descripción falla</label>
                  <textarea
                    value={descripcionFalla}
                    onChange={e => setDescripcionFalla(e.target.value)}
                    rows={3}
                    placeholder="Describe la falla observada..."
                    className="input resize-none"
                    required
                  />
                </div>
              </div>

              <FotoCapture
                label="Imagen falla"
                preview={imagenFallaPreview}
                onChange={fotoHandler(setImagenFalla, setImagenFallaPreview)}
                onRemove={() => { setImagenFalla(null); setImagenFallaPreview(null); if (imagenFallaInputRef.current) imagenFallaInputRef.current.value = '' }}
                fileInputRef={imagenFallaInputRef}
              />

              <div className="card space-y-4">
                <CatalogSelect
                  label="Sistema (correctivo)"
                  value={sistemaId}
                  onChange={v => { setSistemaId(v); setCodigoFallaId('') }}
                  options={sistemasCorrectivo}
                />
                <CatalogSelect label="Código falla" value={codigoFallaId} onChange={setCodigoFallaId} options={codigosFallaFiltrados} />
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
                  <label className="label">Solución propuesta</label>
                  <textarea
                    value={solucionPropuesta}
                    onChange={e => setSolucionPropuesta(e.target.value)}
                    rows={2}
                    placeholder="Solución propuesta o aplicada..."
                    className="input resize-none"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Fecha término</label>
                    <input type="date" value={corrFechaTermino} onChange={e => setCorrFechaTermino(e.target.value)} className="input" />
                  </div>
                  <div>
                    <label className="label">Hora término</label>
                    <input type="time" value={corrHoraTermino} onChange={e => setCorrHoraTermino(e.target.value)} className="input" />
                  </div>
                </div>
                <CatalogSelect label="Condición del equipo" value={corrCondicionId} onChange={setCorrCondicionId} options={condicionesEquipo} />
                <div>
                  <label className="label">Costo (CLP, opcional)</label>
                  <input type="number" min={0} value={corrCosto} onChange={e => setCorrCosto(e.target.value)} placeholder="Ej: 85000" className="input" />
                </div>
              </div>
            </>
          )}

          {tipo === 'OTRA' && (
            <div className="card space-y-4">
              <h2 className="font-semibold text-dark text-sm">Detalles</h2>
              <CatalogSelect label="Tarea" value={tareaId} onChange={setTareaId} options={tareasOtra} />
              <div>
                <label className="label">Descripción</label>
                <textarea
                  value={otraDescripcion}
                  onChange={e => setOtraDescripcion(e.target.value)}
                  rows={3}
                  placeholder="Detalle de la tarea realizada..."
                  className="input resize-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Fecha término</label>
                  <input type="date" value={otraFechaTermino} onChange={e => setOtraFechaTermino(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="label">Hora término</label>
                  <input type="time" value={otraHoraTermino} onChange={e => setOtraHoraTermino(e.target.value)} className="input" />
                </div>
              </div>
              <CatalogSelect label="Condición del equipo" value={otraCondicionId} onChange={setOtraCondicionId} options={condicionesEquipo} />
              <div>
                <label className="label">Costo (CLP, opcional)</label>
                <input type="number" min={0} value={otraCosto} onChange={e => setOtraCosto(e.target.value)} placeholder="Ej: 20000" className="input" />
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={!screen2Valido()}
            onClick={() => setPaso('insumos')}
            className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold text-base rounded-2xl disabled:opacity-40 transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            Continuar
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="max-w-lg mx-auto px-4 space-y-4">
          <button
            type="button"
            onClick={() => setPaso('detalle')}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div className="card space-y-4">
            <h2 className="font-semibold text-dark text-sm">¿Se usaron insumos?</h2>

            {insumos.length > 0 && (
              <div className="space-y-2">
                {insumos.map(i => (
                  <div key={i.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-gray-100 bg-gray-50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-dark truncate">{i.productoNombre}</p>
                      <p className="text-xs text-gray-400">Cantidad: {i.cantidad}{i.codigoBarras ? ` · ${i.codigoBarras}` : ''}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => quitarInsumo(i.id)}
                      className="w-8 h-8 rounded-lg border border-fault/30 text-fault hover:bg-fault/5 flex items-center justify-center flex-shrink-0 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div>
                <label className="label">Producto</label>
                <SearchSelect options={productoOptions} value={nuevoProductoId} onChange={setNuevoProductoId} placeholder="Seleccionar producto..." />
              </div>
              <div>
                <label className="label">Código de barras (opcional)</label>
                <input
                  type="text"
                  value={nuevoCodigoBarras}
                  onChange={e => handleCodigoBarrasChange(e.target.value)}
                  placeholder="Escanear o escribir código..."
                  className="input"
                />
              </div>
              <div>
                <label className="label">Cantidad</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNuevaCantidad(v => Math.max(1, v - 1))}
                    className="w-12 h-12 rounded-xl border border-gray-300 text-xl font-bold text-gray-600 hover:bg-gray-50 flex-shrink-0 flex items-center justify-center"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={nuevaCantidad}
                    onChange={e => setNuevaCantidad(Math.max(1, Number(e.target.value)))}
                    className="flex-1 h-12 text-center border border-gray-300 rounded-xl text-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setNuevaCantidad(v => v + 1)}
                    className="w-12 h-12 rounded-xl border border-gray-300 text-xl font-bold text-gray-600 hover:bg-gray-50 flex-shrink-0 flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
              <button type="button" onClick={agregarInsumo} disabled={!nuevoProductoId} className="btn-secondary btn-sm w-full disabled:opacity-40">
                ＋ Agregar insumo
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={() => void finalizar()}
            className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold text-base rounded-2xl disabled:opacity-40 transition-colors shadow-sm"
          >
            {submitting ? 'Guardando...' : isOffline ? 'Guardar sin conexión' : 'Finalizar'}
          </button>
        </div>
      )}
    </div>
  )
}
