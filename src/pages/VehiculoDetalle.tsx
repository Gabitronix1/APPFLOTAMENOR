import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useVehiculoDetalle } from '../hooks/useVehiculoDetalle'
import {
  TIPOS_EVENTO_TIMELINE,
  TIPO_EVENTO_INFO,
  sumaFallasActivas,
  sumaFallasHistoricas,
} from '../lib/vehiculos'
import { fmtDate, fmtNum, PREGUNTAS } from '../lib/constants'
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ClipboardIcon,
  FlagIcon,
  WrenchIcon,
} from '../components/vehiculos/icons'
import { EstadoBadge } from '../components/vehiculos/EstadoBadge'
import { CambiarEstadoModal } from '../components/vehiculos/CambiarEstadoModal'
import type { TipoEventoTimeline, VInspeccion, VVehiculoTimeline } from '../types'

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

function KpiCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="card py-3 px-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${accent ? 'text-fault' : 'text-dark'}`}>{value}</p>
    </div>
  )
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
  const { patente, inspecciones, timeline, odometro, loading, error, notFound, refetch } = useVehiculoDetalle(id)

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

  const puedeCambiarEstado = perfil?.rol === 'encargado' || perfil?.rol === 'admin'

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
        {puedeCambiarEstado && (
          <button onClick={() => setModalOpen(true)} className="btn-secondary btn-sm shrink-0">
            Cambiar estado
          </button>
        )}
      </div>

      {modalOpen && (
        <CambiarEstadoModal
          patenteId={patente.id}
          estadoActual={patente.estado_actual}
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
    </div>
  )
}
