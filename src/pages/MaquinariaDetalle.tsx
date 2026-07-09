import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useMaquinariaDetalle } from '../hooks/useMaquinariaDetalle'
import { useDisponibilidadMaquinaria } from '../hooks/useDisponibilidadMaquinaria'
import { TIPOS_EVENTO_TIMELINE_MAQUINARIA } from '../lib/maquinaria'
import { TIPO_EVENTO_INFO } from '../lib/vehiculos'
import { fmtDate, fmtNum } from '../lib/constants'
import { puedeEditarGestion } from '../lib/roles'
import { ChevronLeftIcon, ClipboardIcon, WrenchIcon, AlertTriangleIcon, FlagIcon } from '../components/vehiculos/icons'
import { EstadoBadge } from '../components/vehiculos/EstadoBadge'
import { CambiarEstadoMaquinariaModal } from '../components/maquinaria/CambiarEstadoMaquinariaModal'
import { KpiCard } from '../components/vehiculos/KpiCard'
import { DisponibilidadWidget } from '../components/dashboard/DisponibilidadWidget'
import type { TipoEventoTimeline } from '../types'

const PAGE_SIZE = 20

function EventIcon({ tipo, className }: { tipo: TipoEventoTimeline; className?: string }) {
  switch (tipo) {
    case 'preventiva':
      return <WrenchIcon className={className} />
    case 'correctiva':
      return <AlertTriangleIcon className={className} />
    case 'cambio_estado':
      return <FlagIcon className={className} />
    default:
      return <ClipboardIcon className={className} />
  }
}

export function MaquinariaDetalle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const { maquinaria, timeline, horometro, loading, error, notFound, refetch } = useMaquinariaDetalle(id)
  const disponibilidad = useDisponibilidadMaquinaria(!!maquinaria, maquinaria?.id)

  const [filtro, setFiltro] = useState<Record<TipoEventoTimeline, boolean>>({
    inspeccion: true,
    preventiva: true,
    correctiva: true,
    otra: true,
    resolucion: true,
    cambio_estado: true,
  })
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [modalOpen, setModalOpen] = useState(false)

  const puedeEditar = puedeEditarGestion(perfil?.rol)

  const timelineFiltrado = useMemo(() => timeline.filter(ev => filtro[ev.tipo]), [timeline, filtro])
  const eventosVisibles = timelineFiltrado.slice(0, visibleCount)
  const hayMas = timelineFiltrado.length > visibleCount

  const totalPreventivas = useMemo(() => timeline.filter(ev => ev.tipo === 'preventiva').length, [timeline])
  const totalCorrectivas = useMemo(() => timeline.filter(ev => ev.tipo === 'correctiva').length, [timeline])
  const totalOtras = useMemo(() => timeline.filter(ev => ev.tipo === 'otra').length, [timeline])

  function toggleTipo(t: TipoEventoTimeline) {
    setFiltro(prev => ({ ...prev, [t]: !prev[t] }))
    setVisibleCount(PAGE_SIZE)
  }

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-16 text-center text-gray-400 animate-pulse">Cargando maquinaria...</div>
  }

  if (notFound || !maquinaria) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">No se encontró la maquinaria solicitada.</p>
        <button onClick={() => navigate('/maquinarias')} className="btn-secondary">Volver a maquinarias</button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {error && <div className="text-fault text-sm mb-4">{error}</div>}

      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/maquinarias')}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 shrink-0 mt-1"
          >
            <ChevronLeftIcon className="w-4 h-4 text-gray-500" />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono font-bold text-3xl text-dark">{maquinaria.codigo}</span>
              <EstadoBadge estado={maquinaria.estado_actual} />
            </div>
            <p className="text-sm text-gray-500 mt-1">{maquinaria.nombre}</p>
          </div>
        </div>
        {puedeEditar && (
          <button onClick={() => setModalOpen(true)} className="btn-secondary btn-sm shrink-0">
            Cambiar estado
          </button>
        )}
      </div>

      {modalOpen && (
        <CambiarEstadoMaquinariaModal
          maquinariaId={maquinaria.id}
          estadoActual={maquinaria.estado_actual}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false)
            refetch()
          }}
        />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <KpiCard label="Total preventivas" value={totalPreventivas} />
        <KpiCard label="Total correctivas" value={totalCorrectivas} accent={totalCorrectivas > 0} />
        <KpiCard label="Total otras" value={totalOtras} />
        <KpiCard label="Horómetro más reciente" value={horometro ? `${fmtNum(horometro.valor)} h` : '—'} />
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <h2 className="font-semibold text-dark text-sm">Historial</h2>
        <div className="flex flex-wrap gap-3">
          {TIPOS_EVENTO_TIMELINE_MAQUINARIA.map(t => (
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

      {timelineFiltrado.length === 0 ? (
        <div className="card text-center text-gray-400 py-12">Sin eventos para mostrar.</div>
      ) : (
        <>
          <div className="relative">
            {eventosVisibles.map((ev, idx) => {
              const meta = TIPO_EVENTO_INFO[ev.tipo]
              return (
                <div key={ev.id} className="relative pl-12 pb-6 last:pb-0">
                  {!(idx === eventosVisibles.length - 1 && !hayMas) && (
                    <span className="absolute left-[17px] top-9 bottom-0 w-px bg-gray-200" />
                  )}
                  <span className={`absolute left-0 top-0 w-9 h-9 rounded-full flex items-center justify-center ${meta.iconBg} ${meta.iconColor}`}>
                    <EventIcon tipo={ev.tipo} className="w-4 h-4" />
                  </span>
                  <div className="card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-dark text-sm">{ev.titulo}</p>
                        {ev.subtitulo && <p className="text-xs text-gray-500 mt-0.5">{ev.subtitulo}</p>}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{fmtDate(ev.fecha)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{ev.operador ?? '—'}</p>
                  </div>
                </div>
              )
            })}
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
    </div>
  )
}
