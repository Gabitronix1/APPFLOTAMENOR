import { fmtNum } from '../../lib/constants'
import { CONDICIONES, CONDICION_INFO, pct } from '../../lib/gestionFlota'
import type { Condicion } from '../../lib/gestionFlota'
import type { FiltrosGestion } from '../../hooks/useFiltrosGestion'
import type { Tablero } from '../../hooks/useTableroGestion'
import { Delta, Seccion, Tile } from './ui'

const TONO: Record<Condicion, 'fault' | 'warn' | 'ok' | undefined> = {
  detencion: 'fault',
  restriccion: 'warn',
  apta: 'ok',
  sin_datos: undefined,
}

const AYUDA: Record<Condicion, string> = {
  detencion: 'Falla de detención vigente o declarado no operativo en su último checklist',
  restriccion: 'Solo fallas de precaución vigentes',
  apta: 'Último reporte de cada ítem en buen estado',
  sin_datos: 'Nunca ha tenido checklist',
}

export function FranjaAhora({ t, filtros, setFiltros, irA }: {
  t: Tablero
  filtros: FiltrosGestion
  setFiltros: (c: Partial<FiltrosGestion>) => void
  irA: (id: string) => void
}) {
  const total = CONDICIONES.reduce((s, c) => s + t.conteoCondicion[c], 0)
  return (
    <Seccion
      id="ahora"
      titulo="Estado de la flota ahora"
      hint="Según el último reporte de cada ítem en cada vehículo. Toca una situación para filtrar todo el tablero."
    >
      {/* Barra apilada de la condición de la flota */}
      {total > 0 && (
        <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-3" aria-hidden>
          {CONDICIONES.filter(c => t.conteoCondicion[c] > 0).map(c => (
            <div key={c} className={CONDICION_INFO[c].dot} style={{ width: `${(t.conteoCondicion[c] / total) * 100}%` }} />
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        {CONDICIONES.map(c => (
          <Tile
            key={c}
            label={CONDICION_INFO[c].label}
            value={fmtNum(t.conteoCondicion[c])}
            sub={`${pct(t.conteoCondicion[c], total)}% de ${fmtNum(total)} vehículos`}
            tono={t.conteoCondicion[c] > 0 ? TONO[c] : undefined}
            onClick={() => setFiltros({ situacion: filtros.situacion === c ? '' : c })}
            activo={filtros.situacion === c}
            title={AYUDA[c]}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile
          label="Checklist hoy"
          value={`${fmtNum(t.checklistHoy)} / ${fmtNum(t.esperados)}`}
          sub={`${pct(t.checklistHoy, t.esperados)}% de los vehículos en servicio`}
        />
        <Tile
          label={`Sin checklist hace ${filtros.umbral}+ días`}
          value={fmtNum(t.sinChecklist.length)}
          sub="Ver en bandeja de acción"
          tono={t.sinChecklist.length ? 'warn' : undefined}
          onClick={() => irA('bandeja-sin-checklist')}
        />
        <Tile
          label="Fallas vigentes"
          value={fmtNum(t.fallasVigentes)}
          sub={<><span className="text-fault font-semibold">{fmtNum(t.fallasVigentesD)}</span> de detención</>}
          tono={t.fallasVigentesD ? 'fault' : t.fallasVigentes ? 'warn' : undefined}
          onClick={() => irA('matriz')}
        />
        <Tile
          label="Fallas sin reparar"
          value={fmtNum(t.sinReparar.length)}
          sub="Repetidas 3+ veces o abiertas 30+ días"
          tono={t.sinReparar.length ? 'warn' : undefined}
          onClick={() => irA('bandeja-sin-reparar')}
        />
      </div>
    </Seccion>
  )
}

export function KpisPeriodo({ t }: { t: Tablero }) {
  const m = t.metricas
  const a = t.metricasAnterior
  return (
    <Seccion id="periodo" titulo="Resumen del período" hint={a ? 'Comparado con el período anterior de igual duración' : undefined}>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Tile label="Checklist realizados" value={fmtNum(m.checklist)} sub={<Delta actual={m.checklist} anterior={a?.checklist} />} />
        <Tile
          label="Promedio por día"
          value={m.promedioDia.toLocaleString('es-CL', { maximumFractionDigits: 1 })}
          sub={<Delta actual={m.promedioDia} anterior={a?.promedioDia} />}
        />
        <Tile
          label="Cobertura de flota"
          value={`${m.cobertura}%`}
          sub={a ? <Delta actual={m.cobertura} anterior={a.cobertura} puntos /> : `${fmtNum(m.vehiculosConChecklist)} de ${fmtNum(t.esperados)} vehículos`}
          tono={m.cobertura < 70 ? 'warn' : undefined}
          title={`${m.vehiculosConChecklist} de ${t.esperados} vehículos en servicio con al menos un checklist en el período`}
        />
        <Tile
          label="Checklist con falla"
          value={`${m.pctConFalla}%`}
          sub={a ? <Delta actual={m.pctConFalla} anterior={a.pctConFalla} puntos mejorSiBaja /> : `${fmtNum(m.conFalla)} checklist`}
          tono={m.pctConFalla >= 30 ? 'fault' : undefined}
        />
        <Tile
          label="Fallas reportadas"
          value={fmtNum(m.fallas)}
          sub={<><span className="text-fault font-semibold">{fmtNum(m.fallasD)}</span> de detención · {fmtNum(m.noOperativos)} no operativos</>}
        />
        <Tile
          label="Km recorridos"
          value={fmtNum(m.km)}
          sub={a ? <Delta actual={m.km} anterior={a.km} /> : 'Según odómetro de los checklist'}
          title="Suma del avance del odómetro entre checklist consecutivos de cada vehículo"
        />
      </div>
    </Seccion>
  )
}
