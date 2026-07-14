import { useMemo } from 'react'
import { fmtNum } from '../../lib/constants'
import type { IntervencionMaquinariaCompleta } from '../../hooks/useIntervencionesMaquinaria'

interface SecResumenMaquinariaProps {
  data: IntervencionMaquinariaCompleta[]
}

export function SecResumenMaquinaria({ data }: SecResumenMaquinariaProps) {
  const resumen = useMemo(() => {
    if (!data.length) return null

    const total = data.length
    const preventivas = data.filter(d => d.tipo === 'PREVENTIVA').length
    const correctivas = data.filter(d => d.tipo === 'CORRECTIVA')
    const otras = data.filter(d => d.tipo === 'OTRA').length

    const porSistema: Record<string, number> = {}
    correctivas.forEach(c => {
      if (!c.sistemaNombre) return
      porSistema[c.sistemaNombre] = (porSistema[c.sistemaNombre] ?? 0) + 1
    })
    const peorSistema = Object.entries(porSistema).sort((a, b) => b[1] - a[1])[0] ?? null

    const porMaquina: Record<string, number> = {}
    correctivas.forEach(c => {
      porMaquina[c.maquinariaCodigo] = (porMaquina[c.maquinariaCodigo] ?? 0) + 1
    })
    const peorMaquina = Object.entries(porMaquina).sort((a, b) => b[1] - a[1])[0] ?? null

    return {
      total,
      preventivas,
      correctivasN: correctivas.length,
      otras,
      pctPreventivas: Math.round((preventivas / total) * 100),
      pctCorrectivas: Math.round((correctivas.length / total) * 100),
      pctOtras: Math.round((otras / total) * 100),
      peorSistema,
      peorMaquina,
    }
  }, [data])

  if (!resumen) {
    return (
      <div className="rounded-xl border-l-4 border-primary bg-primary/5 p-5 text-sm text-gray-600">
        No hay intervenciones que coincidan con los filtros aplicados.
      </div>
    )
  }

  const { total, pctPreventivas, pctCorrectivas, pctOtras, correctivasN, peorSistema, peorMaquina } = resumen

  return (
    <div className="rounded-xl border-l-4 border-primary bg-primary/5 p-5 space-y-2.5 text-sm text-gray-700">
      <p>
        Se registraron <b className="text-dark">{fmtNum(total)} intervenciones</b> en el período: {' '}
        <span className="badge-ok">{pctPreventivas}% preventivas</span>{' '}
        <span className="badge-fault">{pctCorrectivas}% correctivas</span>{' '}
        <span className="badge-warn">{pctOtras}% otras</span>.
      </p>
      <p>
        {peorSistema
          ? <>El componente/sistema con más fallas es <b className="text-dark">{peorSistema[0]}</b>, con{' '}
              <b className="text-dark">{fmtNum(peorSistema[1])}</b> correctivas de {fmtNum(correctivasN)} registradas.</>
          : 'No se registraron correctivas en el período.'
        }
        {peorMaquina && (
          <> La máquina con más correctivas es <b className="text-dark">{peorMaquina[0]}</b>{' '}
            (<b className="text-fault">{fmtNum(peorMaquina[1])}</b> correctiva{peorMaquina[1] !== 1 ? 's' : ''}).</>
        )}
      </p>
    </div>
  )
}
