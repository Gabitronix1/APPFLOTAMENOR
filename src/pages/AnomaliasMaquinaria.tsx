import { useState, useEffect } from 'react'
import { useCatalog } from '../hooks/useCatalog'
import { fetchTable, fetchCatalog, fetchResponsablesMaquinaria } from '../lib/masterDataCache'
import { useOfflineQueue } from '../hooks/useOfflineQueue'
import { SearchSelect } from '../components/SearchSelect'
import type { Maquinaria, LineaOperacion, ResponsableMaquinaria, CriticidadAnomalia } from '../types'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

const CRITICIDADES: { value: CriticidadAnomalia; label: string; activo: string }[] = [
  { value: 'baja', label: 'Baja', activo: 'bg-gray-400 text-white border-gray-400 shadow-sm' },
  { value: 'media', label: 'Media', activo: 'bg-warn text-white border-warn shadow-sm' },
  { value: 'alta', label: 'Alta', activo: 'bg-fault text-white border-fault shadow-sm' },
]

interface AnomaliaRegistrada {
  id: string
  descripcion: string
  criticidad: CriticidadAnomalia
}

export function AnomaliasMaquinaria() {
  const maquinarias = useCatalog<Maquinaria>('maquinarias', () => fetchTable('maquinarias', 'codigo'))
  const lineas = useCatalog<LineaOperacion>('lineas_operacion', () => fetchCatalog('lineas_operacion'))
  const responsables = useCatalog<ResponsableMaquinaria>('responsables_maquinaria', () => fetchResponsablesMaquinaria())
  const { enqueue } = useOfflineQueue()

  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [maquinariaId, setMaquinariaId] = useState('')
  const [lineaId, setLineaId] = useState('')
  const [fecha, setFecha] = useState(todayISO())
  const [descripcion, setDescripcion] = useState('')
  const [criticidad, setCriticidad] = useState<CriticidadAnomalia>('media')
  const [plazoReparacion, setPlazoReparacion] = useState('')
  const [responsableId, setResponsableId] = useState('')
  const [saving, setSaving] = useState(false)
  const [registradas, setRegistradas] = useState<AnomaliaRegistrada[]>([])

  useEffect(() => {
    const up = () => setIsOffline(false)
    const dn = () => setIsOffline(true)
    window.addEventListener('online', up)
    window.addEventListener('offline', dn)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', dn) }
  }, [])

  const maquinariaSeleccionada = maquinarias.data.find(m => m.id === maquinariaId)
  const canSubmit = !!maquinariaId && !!lineaId && !!descripcion.trim()

  function resetDetalle() {
    setFecha(todayISO())
    setDescripcion('')
    setCriticidad('media')
    setPlazoReparacion('')
    setResponsableId('')
  }

  function cambiarMaquina() {
    setMaquinariaId('')
    setLineaId('')
    setRegistradas([])
    resetDetalle()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    await enqueue({
      type: 'anomalia_maquinaria',
      anomalia: {
        maquinaria_id: maquinariaId,
        linea_id: lineaId,
        fecha,
        descripcion: descripcion.trim(),
        criticidad,
        plazo_reparacion: plazoReparacion || null,
        responsable_id: responsableId || null,
      },
    })
    setRegistradas(prev => [{ id: crypto.randomUUID(), descripcion: descripcion.trim(), criticidad }, ...prev])
    setSaving(false)
    resetDetalle()
  }

  const maqOptions = maquinarias.data.map(m => ({ value: m.id, label: `${m.codigo} — ${m.nombre}` }))
  const responsableOptions = responsables.data.map(r => ({ value: r.id, label: r.nombre }))
  const loading = maquinarias.loading || lineas.loading

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 pb-10">
      <div className="bg-white border-b border-gray-200 px-4 py-4 mb-6">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-dark">Anomalías TPM</h1>
            <p className="text-xs text-gray-400">Detección de anomalías y plan de acción</p>
          </div>
          {isOffline && <span className="badge-fault">Sin conexión</span>}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando datos...</div>
      ) : (
        <div className="max-w-lg mx-auto px-4 space-y-4">
          <div className="card space-y-4">
            <h2 className="font-semibold text-dark text-sm">Equipo</h2>
            <div>
              <label className="label">Maquinaria</label>
              <SearchSelect
                options={maqOptions}
                value={maquinariaId}
                onChange={v => { setMaquinariaId(v); setLineaId(''); setRegistradas([]) }}
                placeholder="Seleccionar maquinaria..."
              />
            </div>
            <div>
              <label className="label">Línea / Contrato</label>
              {lineas.data.length === 0 ? (
                <p className="text-xs text-gray-400 italic border border-dashed border-gray-300 rounded-lg px-3 py-2.5 bg-gray-50">
                  Aún no hay líneas de operación registradas.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {lineas.data.map(l => (
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
          </div>

          {maquinariaId && lineaId && (
            <>
              {registradas.length > 0 && (
                <div className="card space-y-2">
                  <h2 className="font-semibold text-dark text-sm">
                    Anomalías registradas para {maquinariaSeleccionada?.codigo}
                  </h2>
                  {registradas.map(r => (
                    <div key={r.id} className="flex items-start gap-2 text-sm border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                      <span
                        className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                          r.criticidad === 'alta' ? 'bg-fault' : r.criticidad === 'media' ? 'bg-warn' : 'bg-gray-300'
                        }`}
                      />
                      <span className="text-gray-700">{r.descripcion}</span>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={e => void handleSubmit(e)} className="card space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-dark text-sm">Nueva anomalía</h2>
                  <button type="button" onClick={cambiarMaquina} className="text-xs font-medium underline text-gray-500">
                    Cambiar máquina
                  </button>
                </div>

                <div>
                  <label className="label">Fecha</label>
                  <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="input" />
                </div>

                <div>
                  <label className="label">Anomalía detectada</label>
                  <textarea
                    value={descripcion}
                    onChange={e => setDescripcion(e.target.value)}
                    rows={3}
                    placeholder="Describe la anomalía..."
                    className="input resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="label">Criticidad</label>
                  <div className="grid grid-cols-3 gap-2">
                    {CRITICIDADES.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setCriticidad(c.value)}
                        className={`h-12 rounded-xl text-sm font-bold transition-all border ${
                          criticidad === c.value ? c.activo : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">Plazo de reparación (opcional)</label>
                  <input type="date" value={plazoReparacion} onChange={e => setPlazoReparacion(e.target.value)} className="input" />
                </div>

                <div>
                  <label className="label">Responsable (opcional)</label>
                  <SearchSelect
                    options={responsableOptions}
                    value={responsableId}
                    onChange={setResponsableId}
                    placeholder="Seleccionar responsable..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit || saving}
                  className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold text-base rounded-2xl disabled:opacity-40 transition-colors shadow-sm"
                >
                  {saving ? 'Guardando...' : isOffline ? 'Guardar sin conexión' : '+ Registrar anomalía'}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  )
}
