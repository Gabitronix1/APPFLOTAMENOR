import { useMemo } from 'react'
import { PREGUNTAS, fmtDate, fmtNum } from '../../lib/constants'
import type { VInspeccion } from '../../types'

interface SecResumenProps {
  data: VInspeccion[]
}

export function SecResumen({ data }: SecResumenProps) {
  const resumen = useMemo(() => {
    if (!data.length) return null

    const total = data.length
    const withProb = data.filter(r => r.n_fallas > 0).length
    const totalFaults = data.reduce((a, r) => a + r.n_fallas, 0)
    const noop = data.filter(r => !r.operativo).length
    const pct = Math.round((withProb / total) * 100)
    const vehicles = new Set(data.map(r => r.patente)).size

    const sysCounts = PREGUNTAS.map(p => ({ p, n: data.filter(r => r[p.key]).length })).sort((a, b) => b.n - a.n)
    const worst = sysCounts[0]

    // Operador más atrasado: el conductor con más días desde su última inspección
    // respecto a la fecha más reciente del período filtrado (solo entre quienes reportaron,
    // ya que el nombre del conductor en las inspecciones no siempre calza con nombre+apellido
    // de la nómina de operadores).
    const fechasOrdenadas = data.map(r => r.fecha.slice(0, 10)).sort()
    const maxFecha = fechasOrdenadas[fechasOrdenadas.length - 1] ?? null

    let atrasado: { nombre: string; dias: number } | null = null
    if (maxFecha) {
      const ultimoPorConductor: Record<string, string> = {}
      data.forEach(r => {
        if (!r.conductor) return
        const d = r.fecha.slice(0, 10)
        if (!ultimoPorConductor[r.conductor] || d > ultimoPorConductor[r.conductor]) {
          ultimoPorConductor[r.conductor] = d
        }
      })
      const conDias = Object.entries(ultimoPorConductor).map(([nombre, ultimo]) => ({
        nombre,
        dias: Math.round((new Date(maxFecha + 'T00:00').getTime() - new Date(ultimo + 'T00:00').getTime()) / 86400000),
      })).sort((a, b) => b.dias - a.dias)
      if (conDias.length && conDias[0].dias > 0) atrasado = conDias[0]
    }

    return { total, withProb, totalFaults, noop, pct, vehicles, worst, atrasado, maxFecha }
  }, [data])

  if (!resumen) {
    return (
      <div className="rounded-xl border-l-4 border-primary bg-primary/5 p-5 text-sm text-gray-600">
        No hay inspecciones que coincidan con los filtros aplicados.
      </div>
    )
  }

  const { total, withProb, totalFaults, noop, pct, vehicles, worst, atrasado, maxFecha } = resumen

  return (
    <div className="rounded-xl border-l-4 border-primary bg-primary/5 p-5 space-y-2.5 text-sm text-gray-700">
      <p>
        Se analizaron <b className="text-dark">{fmtNum(total)} inspecciones</b> sobre{' '}
        <b className="text-dark">{vehicles} vehículos</b>{maxFecha ? <> hasta el <b>{fmtDate(maxFecha)}</b></> : null}.
        De ellas, <b className="text-dark">{fmtNum(withProb)}</b>{' '}
        <span className="badge-fault">{pct}%</span> registraron al menos una falla, sumando{' '}
        <b className="text-dark">{fmtNum(totalFaults)} fallas</b> en total.
      </p>
      <p>
        El sistema con más fallas es <b className="text-dark">{worst.p.label}</b>, con{' '}
        <b className="text-dark">{fmtNum(worst.n)}</b> casos.
        {atrasado && (
          <>
            {' '}El operador más atrasado es <b className="text-dark">{atrasado.nombre}</b>{' '}
            (<b className="text-fault">{atrasado.dias}d</b> sin reportar).
          </>
        )}
      </p>
      <p>
        {noop > 0
          ? <><b className="text-fault">{noop}</b> inspección(es) marcaron el equipo como <b className="text-fault">NO operativo</b> — requieren atención inmediata.</>
          : <>Todos los equipos del período fueron reportados como <b className="text-primary">operativos</b>.</>
        }
      </p>
    </div>
  )
}
