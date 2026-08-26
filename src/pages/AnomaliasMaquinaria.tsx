import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useCatalog } from '../hooks/useCatalog'
import { fetchTable, fetchCatalog, fetchResponsablesMaquinaria } from '../lib/masterDataCache'
import { useOfflineQueue } from '../hooks/useOfflineQueue'
import { useAnomaliasMaquinaria, type AnomaliaMaquinariaRow } from '../hooks/useAnomaliasMaquinaria'
import { supabase } from '../lib/supabase'
import { SearchSelect } from '../components/SearchSelect'
import { fmtDate } from '../lib/constants'
import { puedeEditarGestion } from '../lib/roles'
import { CRITICIDAD_ANOMALIA_INFO, CRITICIDADES_ANOMALIA, ESTADO_ANOMALIA_INFO, ESTADOS_ANOMALIA } from '../lib/anomaliasMaquinaria'
import type { Maquinaria, LineaOperacion, ResponsableMaquinaria, CriticidadAnomalia, EstadoAnomalia } from '../types'

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

function PendientesView() {
  const { perfil, user } = useAuth()
  const { rows, loading, error, refetch } = useAnomaliasMaquinaria()
  const responsables = useCatalog<ResponsableMaquinaria>('responsables_maquinaria', () => fetchResponsablesMaquinaria())
  const [soloPendientes, setSoloPendientes] = useState(true)
  const [criticidadFiltro, setCriticidadFiltro] = useState<CriticidadAnomalia | 'todas'>('todas')
  const [savingId, setSavingId] = useState<string | null>(null)

  const puedeGestionar = puedeEditarGestion(perfil?.rol)

  function puedeEditarFila(row: AnomaliaMaquinariaRow) {
    return puedeGestionar || (perfil?.rol === 'mecanico_maquinaria' && row.responsable_id === user?.id)
  }

  const filtradas = rows.filter(r => {
    if (soloPendientes && r.estado === 'resuelta') return false
    if (criticidadFiltro !== 'todas' && r.criticidad !== criticidadFiltro) return false
    return true
  })

  async function cambiarEstado(row: AnomaliaMaquinariaRow, estado: EstadoAnomalia) {
    setSavingId(row.id)
    const { error: err } = await supabase
      .from('anomalias_maquinaria')
      .update({ estado, fecha_cierre: estado === 'resuelta' ? todayISO() : null })
      .eq('id', row.id)
    setSavingId(null)
    if (err) { alert(err.message); return }
    refetch()
  }

  async function reasignar(row: AnomaliaMaquinariaRow, responsableId: string) {
    setSavingId(row.id)
    const { error: err } = await supabase
      .from('anomalias_maquinaria')
      .update({ responsable_id: responsableId || null })
      .eq('id', row.id)
    setSavingId(null)
    if (err) { alert(err.message); return }
    refetch()
  }

  const responsableOptions = responsables.data.map(r => ({ value: r.id, label: r.nombre }))

  return (
    <div className="max-w-3xl mx-auto px-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          {[{ v: true, label: 'Pendientes' }, { v: false, label: 'Todas' }].map(o => (
            <button
              key={String(o.v)}
              onClick={() => setSoloPendientes(o.v)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                soloPendientes === o.v ? 'bg-primary text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <select
          value={criticidadFiltro}
          onChange={e => setCriticidadFiltro(e.target.value as CriticidadAnomalia | 'todas')}
          className="input w-auto"
        >
          <option value="todas">Todas las criticidades</option>
          {CRITICIDADES_ANOMALIA.map(c => (
            <option key={c} value={c}>{CRITICIDAD_ANOMALIA_INFO[c].label}</option>
          ))}
        </select>
      </div>

      {error && <div className="text-fault text-sm">{error}</div>}

      {loading ? (
        <div className="text-sm text-gray-400 animate-pulse">Cargando anomalías...</div>
      ) : filtradas.length === 0 ? (
        <div className="card text-center text-gray-400 py-12">
          {soloPendientes ? 'No hay anomalías pendientes.' : 'No hay anomalías registradas.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(row => {
            const vencida =
              row.estado !== 'resuelta' &&
              !!row.plazo_reparacion &&
              new Date(row.plazo_reparacion) < new Date(new Date().toDateString())
            const editable = puedeEditarFila(row)
            return (
              <div key={row.id} className="card space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono font-bold text-dark text-sm">
                      {row.maquinariaCodigo}{row.maquinariaNombre ? ` — ${row.maquinariaNombre}` : ''}
                    </p>
                    <p className="text-xs text-gray-400">
                      {row.lineaCodigo ? `${row.lineaCodigo} · ` : ''}{fmtDate(row.fecha)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CRITICIDAD_ANOMALIA_INFO[row.criticidad].badgeClass}`}>
                      {CRITICIDAD_ANOMALIA_INFO[row.criticidad].label}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_ANOMALIA_INFO[row.estado].badgeClass}`}>
                      {ESTADO_ANOMALIA_INFO[row.estado].label}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-700">{row.descripcion}</p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                  {row.plazo_reparacion && (
                    <span className={vencida ? 'text-fault font-semibold' : ''}>
                      Plazo: {fmtDate(row.plazo_reparacion)}{vencida ? ' (vencido)' : ''}
                    </span>
                  )}
                  <span>Responsable: {row.responsableNombre ?? 'Sin asignar'}</span>
                </div>

                {editable && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                    <select
                      value={row.estado}
                      disabled={savingId === row.id}
                      onChange={e => void cambiarEstado(row, e.target.value as EstadoAnomalia)}
                      className="input w-auto text-xs py-1.5"
                    >
                      {ESTADOS_ANOMALIA.map(e => (
                        <option key={e} value={e}>{ESTADO_ANOMALIA_INFO[e].label}</option>
                      ))}
                    </select>
                    {puedeGestionar && (
                      <div className="w-56">
                        <SearchSelect
                          options={responsableOptions}
                          value={row.responsable_id ?? ''}
                          onChange={v => void reasignar(row, v)}
                          placeholder="Reasignar responsable..."
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function AnomaliasMaquinaria() {
  const [vista, setVista] = useState<'registrar' | 'pendientes'>('registrar')
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

      <div className="max-w-lg mx-auto px-4 mb-4">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          {([
            { v: 'registrar', label: 'Registrar' },
            { v: 'pendientes', label: 'Pendientes' },
          ] as const).map(o => (
            <button
              key={o.v}
              onClick={() => setVista(o.v)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                vista === o.v ? 'bg-primary text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {vista === 'pendientes' ? (
        <PendientesView />
      ) : loading ? (
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
