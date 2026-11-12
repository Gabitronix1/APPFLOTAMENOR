import { useState } from 'react'
import { infoEstado } from '../../lib/vehiculos'
import { fmtDate } from '../../lib/constants'
import type { FiltrosGestion, Periodo } from '../../hooks/useFiltrosGestion'
import type { Opciones, Rango } from '../../hooks/useTableroGestion'

const PERIODOS: [Periodo, string][] = [
  ['7', '7 días'],
  ['30', '30 días'],
  ['90', '90 días'],
  ['365', '12 meses'],
  ['todo', 'Todo'],
  ['rango', 'Fechas'],
]

interface Props {
  filtros: FiltrosGestion
  setFiltros: (c: Partial<FiltrosGestion>) => void
  limpiar: () => void
  activos: number
  opciones: Opciones
  rango: Rango
}

export function FiltrosBar({ filtros: f, setFiltros, limpiar, activos, opciones, rango }: Props) {
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="bg-white/95 backdrop-blur border border-gray-200 rounded-xl shadow-sm p-3 mb-6 sticky top-16 z-30">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm bg-white max-w-full overflow-x-auto" role="group" aria-label="Período">
          {PERIODOS.map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => setFiltros({ periodo: v })}
              className={`px-3 py-1.5 font-medium whitespace-nowrap transition-colors ${f.periodo === v ? 'bg-dark text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              aria-pressed={f.periodo === v}
            >
              {l}
            </button>
          ))}
        </div>
        {f.periodo === 'rango' && (
          <div className="flex items-center gap-1.5">
            <input type="date" aria-label="Desde" value={f.desde || rango.desde} max={f.hasta || undefined}
              onChange={e => setFiltros({ desde: e.target.value })} className="input w-36 py-1.5" />
            <span className="text-gray-400 text-sm">a</span>
            <input type="date" aria-label="Hasta" value={f.hasta || rango.hasta} min={f.desde || undefined}
              onChange={e => setFiltros({ hasta: e.target.value })} className="input w-36 py-1.5" />
          </div>
        )}
        <span className="text-xs text-gray-500 hidden sm:inline">
          {fmtDate(rango.desde)} – {fmtDate(rango.hasta)} · {rango.dias} día{rango.dias !== 1 ? 's' : ''}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {activos > 0 && (
            <button type="button" onClick={limpiar} className="text-sm text-gray-500 hover:text-fault transition-colors">
              Limpiar filtros
            </button>
          )}
          <button
            type="button"
            onClick={() => setAbierto(a => !a)}
            className="md:hidden btn-secondary btn-sm"
            aria-expanded={abierto}
          >
            Filtros{activos ? ` (${activos})` : ''}
          </button>
        </div>
      </div>

      <div className={`${abierto ? 'grid' : 'hidden'} md:grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2 mt-3`}>
        <Select label="Contrato / Línea" value={f.contrato} onChange={v => setFiltros({ contrato: v })} opciones={opciones.contratos} todos="Todos" />
        <Select label="Tipo de vehículo" value={f.categoria} onChange={v => setFiltros({ categoria: v })} opciones={opciones.categorias} todos="Todos" />
        <Select label="Propiedad" value={f.propiedad} onChange={v => setFiltros({ propiedad: v })} opciones={opciones.propiedades} todos="Todas" />
        <Select
          label="Estado operativo"
          value={f.estado}
          onChange={v => setFiltros({ estado: v })}
          opciones={opciones.estados}
          etiqueta={e => infoEstado(e).label}
          todos="Todos"
        />
        <Select label="Patente" value={f.patente} onChange={v => setFiltros({ patente: v })} opciones={opciones.patentes} todos="Todas" />
        <div className="min-w-0">
          <label className="label text-xs">Conductor</label>
          <select value={f.conductor} onChange={e => setFiltros({ conductor: e.target.value })} className="input py-1.5 text-sm">
            <option value="">Todos</option>
            {opciones.conductores.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div className="min-w-0">
          <label className="label text-xs">Tipo de checklist</label>
          <select value={f.tipo} onChange={e => setFiltros({ tipo: e.target.value as FiltrosGestion['tipo'] })} className="input py-1.5 text-sm">
            <option value="">Todos</option>
            <option value="completo">Completo</option>
            <option value="diario">Diario</option>
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer self-end pb-2 min-w-0">
          <input
            type="checkbox"
            checked={f.indicadores}
            onChange={e => setFiltros({ indicadores: e.target.checked })}
            className="w-4 h-4 accent-primary shrink-0"
          />
          <span className="text-sm text-gray-700 leading-tight">Solo flota que afecta indicadores</span>
        </label>
      </div>
    </div>
  )
}

function Select({ label, value, onChange, opciones, todos, etiqueta = (o: string) => o }: {
  label: string
  value: string
  onChange: (v: string) => void
  opciones: string[]
  todos: string
  etiqueta?: (o: string) => string
}) {
  return (
    <div className="min-w-0">
      <label className="label text-xs">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="input py-1.5 text-sm">
        <option value="">{todos}</option>
        {opciones.map(o => <option key={o} value={o}>{etiqueta(o)}</option>)}
      </select>
    </div>
  )
}
