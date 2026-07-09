import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useVehiculoDetalle } from '../hooks/useVehiculoDetalle'
import { useDocumentosVehiculo } from '../hooks/useDocumentosVehiculo'
import { useDisponibilidad } from '../hooks/useDisponibilidad'
import {
  ESTADO_VEHICULO_INFO,
  TIPOS_EVENTO_TIMELINE,
  TIPO_EVENTO_INFO,
  sumaFallasActivas,
  sumaFallasHistoricas,
} from '../lib/vehiculos'
import { diasRestantesLabel } from '../lib/documentos'
import { fmtDate, fmtNum, PREGUNTAS } from '../lib/constants'
import { puedeEditarGestion } from '../lib/roles'
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ClipboardIcon,
  FlagIcon,
  WrenchIcon,
} from '../components/vehiculos/icons'
import { EstadoBadge } from '../components/vehiculos/EstadoBadge'
import { EstadoDocumentoBadge } from '../components/vehiculos/EstadoDocumentoBadge'
import { CambiarEstadoModal } from '../components/vehiculos/CambiarEstadoModal'
import { ActualizarDocumentoModal } from '../components/vehiculos/ActualizarDocumentoModal'
import { KpiCard } from '../components/vehiculos/KpiCard'
import { DisponibilidadWidget } from '../components/dashboard/DisponibilidadWidget'
import type { DocumentoVencimiento, EstadoVehiculo, TipoEventoTimeline, VInspeccion, VVehiculoTimeline } from '../types'

const PAGE_SIZE = 20

function EventIcon({ tipo, className }: { tipo: TipoEventoTimeline; className?: string }) {
  switch (tipo) {
    case 'inspeccion':
      return <ClipboardIcon className={className} />
    case 'preventiva':
      return <WrenchIcon className={className} />
    case 'correctiva':
      return <AlertTriangleIcon className={className} />
    case 'resolucion':
      return <CheckCircleIcon className={className} />
    case 'cambio_estado':
      return <FlagIcon className={className} />
  }
}

function InspeccionDetalle({ insp }: { insp: VInspeccion }) {
  return (
    <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-2">
      {PREGUNTAS.map(p => {
        const falla = insp[p.key]
        const obs = insp[p.obs]
        return (
          <div
            key={p.key}
            className={`text-xs rounded-lg px-3 py-2 border ${
              falla ? 'border-fault/30 bg-fault/5 text-fault' : 'border-gray-100 bg-gray-50 text-gray-500'
            }`}
          >
            <p className="font-semibold">{p.label}</p>
            <p className="mt-0.5">{falla ? obs || 'Falla detectada, sin observación.' : 'Sin falla'}</p>
          </div>
        )
      })}
      {insp.obs_general && (
        <div className="sm:col-span-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
          <span className="font-semibold">Obs. general: </span>
          {insp.obs_general}
        </div>
      )}
    </div>
  )
}

function EventoCard({
  evento,
  inspDetalle,
  expanded,
  onToggle,
  isLast,
}: {
  evento: VVehiculoTimeline
  inspDetalle: VInspeccion | undefined
  expanded: boolean
  onToggle: () => void
  isLast: boolean
}) {
  const meta = TIPO_EVENTO_INFO[evento.tipo]
  const esInspeccion = evento.tipo === 'inspeccion'

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-dark text-sm">{evento.titulo}</p>
          {evento.subtitulo && <p className="text-xs text-gray-500 mt-0.5">{evento.subtitulo}</p>}
        </div>
        <span className="text-xs text-gray-400 shrink-0">{fmtDate(evento.fecha)}</span>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-400">{evento.operador ?? '—'}</span>
        {esInspeccion && (
          <span className="text-xs text-primary font-medium">{expanded ? 'Ocultar detalle ▲' : 'Ver detalle ▼'}</span>
        )}
      </div>
    </>
  )

  return (
    <div className="relative pl-12 pb-6 last:pb-0">
      {!isLast && <span className="absolute left-[17px] top-9 bottom-0 w-px bg-gray-200" />}
      <span className={`absolute left-0 top-0 w-9 h-9 rounded-full flex items-center justify-center ${meta.iconBg} ${meta.iconColor}`}>
        <EventIcon tipo={evento.tipo} className="w-4 h-4" />
      </span>

      {esInspeccion ? (
        <button onClick={onToggle} className="card w-full text-left hover:border-primary/30 transition-colors">
          {body}
          {expanded && (inspDetalle
            ? <InspeccionDetalle insp={inspDetalle} />
            : <p className="mt-3 text-xs text-gray-400">Detalle no disponible.</p>)}
        </button>
      ) : (
        <div className="card">{body}</div>
      )}
    </div>
  )
}

export function VehiculoDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const { patente, inspecciones, timeline, odometro, otsPendientes, loading, error, notFound, refetch } =
    useVehiculoDetalle(id)
  const {
    documentos,
    loading: loadingDocumentos,
    error: errorDocumentos,
    refetch: refetchDocumentos,
  } = useDocumentosVehiculo(patente?.id, patente?.patente)
  const disponibilidad = useDisponibilidad(!!patente, patente?.id)

  const [filtro, setFiltro] = useState<Record<TipoEventoTimeline, boolean>>({
    inspeccion: true,
    preventiva: true,
    correctiva: true,
    resolucion: true,
    cambio_estado: true,
  })
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [estadoModalInicial, setEstadoModalInicial] = useState<EstadoVehiculo | null>(null)
  const [documentoEnEdicion, setDocumentoEnEdicion] = useState<DocumentoVencimiento | null>(null)

  const puedeGestionarFlota = puedeEditarGestion(perfil?.rol)
  const mostrarBannerAlta =
    puedeGestionarFlota && !!patente && patente.estado_actual !== 'operativo' && otsPendientes === 0

  function abrirModalEstado(estadoInicial: EstadoVehiculo | null) {
    setEstadoModalInicial(estadoInicial)
    setModalOpen(true)
  }

  function toggleTipo(t: TipoEventoTimeline) {
    setFiltro(prev => ({ ...prev, [t]: !prev[t] }))
    setVisibleCount(PAGE_SIZE)
  }

  function toggleExpand(eventId: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(eventId)) next.delete(eventId)
      else next.add(eventId)
      return next
    })
  }

  const inspeccionesPorId = useMemo(() => {
    const map = new Map<string, VInspeccion>()
    for (const insp of inspecciones) map.set(insp.id, insp)
    return map
  }, [inspecciones])

  const timelineFiltrado = useMemo(
    () => timeline.filter(ev => filtro[ev.tipo]),
    [timeline, filtro],
  )
  const eventosVisibles = timelineFiltrado.slice(0, visibleCount)
  const hayMas = timelineFiltrado.length > visibleCount

  const totalInspecciones = useMemo(() => timeline.filter(ev => ev.tipo === 'inspeccion').length, [timeline])
  const totalIntervenciones = useMemo(
    () => timeline.filter(ev => ev.tipo === 'preventiva' || ev.tipo === 'correctiva').length,
    [timeline],
  )
  const fallasHistoricas = useMemo(() => sumaFallasHistoricas(inspecciones), [inspecciones])
  const fallasActivas = useMemo(() => sumaFallasActivas(inspecciones), [inspecciones])

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-16 text-center text-gray-400 animate-pulse">Cargando vehículo...</div>
  }

  if (notFound || !patente) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">No se encontró el vehículo solicitado.</p>
        <button onClick={() => navigate('/vehiculos')} className="btn-secondary">Volver a vehículos</button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {error && <div className="text-fault text-sm mb-4">{error}</div>}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/vehiculos')}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 shrink-0 mt-1"
          >
            <ChevronLeftIcon className="w-4 h-4 text-gray-500" />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono font-bold text-3xl text-dark">{patente.patente}</span>
              <EstadoBadge estado={patente.estado_actual} />
            </div>
            <p className="text-sm text-gray-500 mt-1">{patente.descripcion || 'Sin descripción'}</p>
          </div>
        </div>
        {puedeGestionarFlota && (
          <button onClick={() => abrirModalEstado(null)} className="btn-secondary btn-sm shrink-0">
            Cambiar estado
          </button>
        )}
      </div>

      {mostrarBannerAlta && (
        <div className="bg-warn/10 border border-warn/30 rounded-xl p-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-gray-700">
            Este vehículo no tiene fallas activas pendientes pero sigue marcado como{' '}
            <span className="font-semibold">{ESTADO_VEHICULO_INFO[patente.estado_actual].label}</span>.
            ¿Actualizar a Operativo?
          </p>
          <button onClick={() => abrirModalEstado('operativo')} className="btn-primary btn-sm shrink-0">
            Actualizar a Operativo
          </button>
        </div>
      )}

      {modalOpen && (
        <CambiarEstadoModal
          patenteId={patente.id}
          estadoActual={estadoModalInicial ?? patente.estado_actual}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false)
            refetch()
          }}
        />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        <KpiCard label="Total inspecciones" value={totalInspecciones} />
        <KpiCard label="Total intervenciones" value={totalIntervenciones} />
        <KpiCard label="Fallas históricas" value={fallasHistoricas} />
        <KpiCard label="Fallas activas sin resolver" value={fallasActivas} accent={fallasActivas > 0} />
        <KpiCard label="Kilometraje más reciente" value={odometro ? `${fmtNum(odometro.valor)} km` : '—'} />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <h2 className="font-semibold text-dark text-sm">Historial</h2>
        <div className="flex flex-wrap gap-3">
          {TIPOS_EVENTO_TIMELINE.map(t => (
            <label key={t} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filtro[t]}
                onChange={() => toggleTipo(t)}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              {TIPO_EVENTO_INFO[t].labelPlural}
            </label>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {timelineFiltrado.length === 0 ? (
        <div className="card text-center text-gray-400 py-12">Sin eventos para mostrar.</div>
      ) : (
        <>
          <div className="relative">
            {eventosVisibles.map((ev, idx) => (
              <EventoCard
                key={ev.id}
                evento={ev}
                inspDetalle={ev.tipo === 'inspeccion' ? inspeccionesPorId.get(ev.id) : undefined}
                expanded={expandedIds.has(ev.id)}
                onToggle={() => toggleExpand(ev.id)}
                isLast={idx === eventosVisibles.length - 1 && !hayMas}
              />
            ))}
          </div>

          {hayMas && (
            <div className="text-center mt-2">
              <button onClick={() => setVisibleCount(c => c + PAGE_SIZE)} className="btn-secondary btn-sm">
                Cargar más ({timelineFiltrado.length - visibleCount} restantes)
              </button>
            </div>
          )}
        </>
      )}

      {/* Disponibilidad */}
      <div className="mt-10">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-semibold text-dark text-sm">Disponibilidad</h2>
          <span className="text-xs text-gray-400">Últimos 30 días</span>
        </div>
        <div className="card">
          <DisponibilidadWidget
            data={disponibilidad.disponibilidad}
            loading={disponibilidad.loading}
            error={disponibilidad.error}
          />
        </div>
      </div>

      {/* Documentos y vencimientos */}
      <div className="mt-10">
        <h2 className="font-semibold text-dark text-sm mb-4">Documentos y vencimientos</h2>

        {errorDocumentos && <div className="text-fault text-sm mb-4">{errorDocumentos}</div>}

        {loadingDocumentos ? (
          <div className="text-sm text-gray-400 animate-pulse">Cargando documentos...</div>
        ) : (
          <div className="card p-0 overflow-hidden divide-y divide-gray-100">
            {documentos.map(doc => (
              <div
                key={doc.tipoDocumentoId}
                className="flex items-center justify-between gap-4 px-5 py-4 flex-wrap"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-dark text-sm">{doc.tipoDocumento}</p>
                  {doc.estado === 'sin_registro' ? (
                    <span className="mt-1.5 inline-block">
                      <EstadoDocumentoBadge estado="sin_registro" />
                    </span>
                  ) : (
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs text-gray-500">Vence {fmtDate(doc.fechaVencimiento as string)}</span>
                      <EstadoDocumentoBadge estado={doc.estado} />
                      <span className="text-xs text-gray-400">{diasRestantesLabel(doc.diasRestantes as number)}</span>
                    </div>
                  )}
                </div>
                {puedeGestionarFlota && (
                  <button
                    onClick={() => setDocumentoEnEdicion(doc)}
                    className="btn-secondary btn-sm shrink-0"
                  >
                    Actualizar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {documentoEnEdicion && (
        <ActualizarDocumentoModal
          patenteId={documentoEnEdicion.patenteId}
          tipoDocumentoId={documentoEnEdicion.tipoDocumentoId}
          tipoDocumentoNombre={documentoEnEdicion.tipoDocumento}
          onClose={() => setDocumentoEnEdicion(null)}
          onSaved={() => {
            setDocumentoEnEdicion(null)
            refetchDocumentos()
          }}
        />
      )}
    </div>
  )
}
