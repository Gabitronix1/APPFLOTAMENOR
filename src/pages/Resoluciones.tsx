import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { VInspeccion, TipoResolucion } from '../types'

const PREGUNTAS: Record<number, string> = {
  1: 'Pregunta 1',
  2: 'Pregunta 2',
  3: 'Pregunta 3',
  4: 'Pregunta 4',
  5: 'Pregunta 5',
  6: 'Pregunta 6',
}

function fallas(insp: VInspeccion): number[] {
  const keys = [1, 2, 3, 4, 5, 6] as const
  return keys.filter((k) => insp[`p${k}` as keyof VInspeccion] === true)
}

function formatFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

interface ResolucionForm {
  tipo: TipoResolucion
  descripcion: string
}

interface ActiveForm {
  inspeccionId: string
  preguntaId: number
}

export function Resoluciones() {
  const { user } = useAuth()
  const [inspecciones, setInspecciones] = useState<VInspeccion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [activeForm, setActiveForm] = useState<ActiveForm | null>(null)
  const [form, setForm] = useState<ResolucionForm>({ tipo: 'resuelto', descripcion: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('v_inspecciones')
      .select('*')
      .gt('n_fallas', 0)
      .order('fecha', { ascending: false })

    if (err) setError(err.message)
    else setInspecciones((data ?? []) as VInspeccion[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openForm(inspeccionId: string, preguntaId: number) {
    setActiveForm({ inspeccionId, preguntaId })
    setForm({ tipo: 'resuelto', descripcion: '' })
    setSaveError(null)
  }

  function closeForm() {
    setActiveForm(null)
    setSaveError(null)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!activeForm || !user) return
    setSaving(true)
    setSaveError(null)

    const { error: upsertError } = await supabase.from('resoluciones').upsert(
      {
        inspeccion_id: activeForm.inspeccionId,
        pregunta_id: activeForm.preguntaId,
        resuelta_por: user.id,
        descripcion: form.descripcion,
        tipo: form.tipo,
        fecha: new Date().toISOString(),
      },
      { onConflict: 'inspeccion_id,pregunta_id' },
    )

    setSaving(false)
    if (upsertError) {
      setSaveError(upsertError.message)
    } else {
      closeForm()
      void load()
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Resoluciones</h1>
      <p className="text-sm text-gray-500 mb-6">Inspecciones con fallas pendientes de resolución.</p>

      {error && <div className="text-fault text-sm mb-4">{error}</div>}

      {loading ? (
        <div className="text-sm text-gray-400 animate-pulse">Cargando inspecciones...</div>
      ) : inspecciones.length === 0 ? (
        <div className="card text-center text-gray-400 py-12">
          No hay inspecciones con fallas pendientes.
        </div>
      ) : (
        <div className="space-y-3">
          {inspecciones.map((insp) => {
            const isOpen = expanded.has(insp.id)
            const fallasList = fallas(insp)

            return (
              <div key={insp.id} className="card p-0 overflow-hidden">
                {/* Header row */}
                <button
                  onClick={() => toggleExpand(insp.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="font-mono font-bold text-dark text-sm">{insp.patente}</span>
                    <span className="text-gray-600 text-sm">{insp.conductor}</span>
                    <span className="text-gray-500 text-sm">{insp.fundo}</span>
                    <span className="text-gray-400 text-xs">{formatFecha(insp.fecha)}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="badge-fault">{insp.n_fallas} falla{insp.n_fallas !== 1 ? 's' : ''}</span>
                    {insp.n_resueltas > 0 && (
                      <span className="badge-ok">{insp.n_resueltas} resuelta{insp.n_resueltas !== 1 ? 's' : ''}</span>
                    )}
                    {!insp.operativo && <span className="badge-warn">No operativo</span>}
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded fallas */}
                {isOpen && (
                  <div className="border-t border-gray-200 divide-y divide-gray-100">
                    {fallasList.map((pId) => {
                      const obs = insp[`obs${pId}` as keyof VInspeccion] as string | null
                      const isFormOpen =
                        activeForm?.inspeccionId === insp.id && activeForm.preguntaId === pId

                      return (
                        <div key={pId} className="px-5 py-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{PREGUNTAS[pId]}</p>
                              {obs && (
                                <p className="text-xs text-gray-500 mt-0.5">{obs}</p>
                              )}
                            </div>
                            {!isFormOpen && (
                              <button
                                onClick={() => openForm(insp.id, pId)}
                                className="btn-primary btn-sm shrink-0"
                              >
                                Marcar resuelta
                              </button>
                            )}
                          </div>

                          {/* Inline form */}
                          {isFormOpen && (
                            <form
                              onSubmit={(e) => void handleSave(e)}
                              className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3"
                            >
                              <div>
                                <label className="label">Tipo de resolución</label>
                                <select
                                  value={form.tipo}
                                  onChange={(e) =>
                                    setForm((f) => ({ ...f, tipo: e.target.value as TipoResolucion }))
                                  }
                                  className="input"
                                  required
                                >
                                  <option value="resuelto">Resuelto</option>
                                  <option value="derivado">Derivado</option>
                                  <option value="pendiente">Pendiente</option>
                                </select>
                              </div>
                              <div>
                                <label className="label">Descripción</label>
                                <textarea
                                  value={form.descripcion}
                                  onChange={(e) =>
                                    setForm((f) => ({ ...f, descripcion: e.target.value }))
                                  }
                                  className="input resize-none h-20"
                                  placeholder="Describe la acción tomada..."
                                  required
                                />
                              </div>
                              {saveError && (
                                <p className="text-fault text-xs">{saveError}</p>
                              )}
                              <div className="flex gap-2">
                                <button type="submit" disabled={saving} className="btn-primary btn-sm">
                                  {saving ? 'Guardando...' : 'Guardar'}
                                </button>
                                <button
                                  type="button"
                                  onClick={closeForm}
                                  className="btn-secondary btn-sm"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      )
                    })}
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
