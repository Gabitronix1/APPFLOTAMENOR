import { useMemo, useState } from 'react'
import { fmtDate, fmtNum } from '../../lib/constants'
import type { IntervencionMaquinariaCompleta } from '../../hooks/useIntervencionesMaquinaria'

interface SecDetalleMaquinariaProps {
  data: IntervencionMaquinariaCompleta[]
}

type SortKey = 'fecha' | 'maquinaria' | 'tipo' | 'responsable' | 'horometro'

const TIPO_BADGE: Record<IntervencionMaquinariaCompleta['tipo'], string> = {
  PREVENTIVA: 'badge-ok',
  CORRECTIVA: 'badge-fault',
  OTRA: 'badge-warn',
}

function resumenDetalle(r: IntervencionMaquinariaCompleta): string {
  if (r.tipo === 'CORRECTIVA') return [r.sistemaNombre, r.descripcionFalla].filter(Boolean).join(' — ') || '—'
  if (r.tipo === 'PREVENTIVA') return [r.tipoPreventivaNombre, r.descripcion].filter(Boolean).join(' — ') || '—'
  return [r.tareaNombre, r.descripcion].filter(Boolean).join(' — ') || '—'
}

function sortData(rows: IntervencionMaquinariaCompleta[], key: SortKey, dir: 1 | -1): IntervencionMaquinariaCompleta[] {
  return [...rows].sort((a, b) => {
    if (key === 'fecha') return (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0) * dir
    if (key === 'horometro') return ((a.horometro ?? -1) - (b.horometro ?? -1)) * dir
    if (key === 'maquinaria') return a.maquinariaCodigo.localeCompare(b.maquinariaCodigo) * dir
    if (key === 'tipo') return a.tipo.localeCompare(b.tipo) * dir
    return a.responsableNombre.localeCompare(b.responsableNombre) * dir
  })
}

function exportCSV(rows: IntervencionMaquinariaCompleta[]) {
  const meta = [
    ['Doña Isidora — Informe de intervenciones de maquinaria'],
    ['Generado', new Date().toLocaleString('es-CL')],
    ['Intervenciones', String(rows.length)],
    [''],
  ]
  const head = ['Fecha', 'Maquina', 'Tipo', 'Responsable', 'Linea', 'Turno', 'Actividad', 'Resumen', 'Horometro', 'Costo']
  const esc = (c: unknown) => `"${String(c).replace(/"/g, '""')}"`
  const lines = meta.map(m => m.map(esc).join(';'))
  lines.push(head.map(esc).join(';'))
  rows.forEach(r => {
    lines.push([
      r.fecha.slice(0, 10), r.maquinariaCodigo, r.tipo, r.responsableNombre,
      r.lineaCodigo ?? '', r.turnoNombre ?? '', r.actividadNombre ?? '',
      resumenDetalle(r).replace(/\s+/g, ' '), r.horometro ?? '', r.costo ?? '',
    ].map(esc).join(';'))
  })
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'DonaIsidora-informe-maquinaria.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

export function SecDetalleMaquinaria({ data }: SecDetalleMaquinariaProps) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'fecha', dir: -1 })
  const [openRows, setOpenRows] = useState<Set<string>>(new Set())
  const [allExpanded, setAllExpanded] = useState(false)

  const rows = useMemo(() => {
    const q = query.toLowerCase().trim()
    let filtered = data
    if (q) {
      filtered = data.filter(r => {
        const hay = [
          r.maquinariaCodigo, r.maquinariaNombre, r.responsableNombre, r.sistemaNombre,
          r.descripcionFalla, r.causaProbable, r.solucionPropuesta, r.tipoPreventivaNombre,
          r.tareaNombre, r.descripcion,
        ].map(x => (x ?? '').toLowerCase()).join(' ')
        return hay.includes(q)
      })
    }
    return sortData(filtered, sort.key, sort.dir)
  }, [data, query, sort])

  function toggleSort(key: SortKey) {
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 1 ? -1 : 1 } : { key, dir: -1 })
  }

  function toggleRow(id: string) {
    setOpenRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setAllExpanded(v => !v)
    setOpenRows(new Set())
  }

  const cols: { key: SortKey; label: string }[] = [
    { key: 'fecha', label: 'Fecha' },
    { key: 'maquinaria', label: 'Máquina' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'responsable', label: 'Responsable' },
    { key: 'horometro', label: 'Horómetro' },
  ]

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <input
          type="search"
          placeholder="Buscar en el detalle..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="input w-64 text-sm"
        />
        <span className="font-mono text-xs text-gray-400">{fmtNum(rows.length)} intervención(es)</span>
        <div className="flex gap-2 ml-auto">
          <button onClick={toggleAll} className="btn-secondary btn-sm">
            {allExpanded ? 'Contraer todo' : 'Expandir todo'}
          </button>
          <button onClick={() => exportCSV(rows)} className="btn-secondary btn-sm">CSV</button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead>
              <tr>
                {cols.map(c => (
                  <th key={c.key} onClick={() => toggleSort(c.key)} className="table-th cursor-pointer select-none hover:text-gray-700">
                    {c.label}{sort.key === c.key && <span className="ml-1 text-gray-400">{sort.dir === 1 ? '▾' : '▴'}</span>}
                  </th>
                ))}
                <th className="table-th">Resumen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!rows.length && (
                <tr>
                  <td colSpan={cols.length + 1} className="table-td text-center text-gray-400 py-8">
                    No hay intervenciones para los filtros aplicados.
                  </td>
                </tr>
              )}
              {rows.map(r => {
                const isOpen = allExpanded || openRows.has(r.id)
                return [
                  <tr
                    key={`main-${r.id}`}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${isOpen ? 'bg-primary/5' : ''}`}
                    onClick={() => toggleRow(r.id)}
                  >
                    <td className="table-td text-xs font-mono whitespace-nowrap">{fmtDate(r.fecha)}</td>
                    <td className="table-td">
                      <span className="font-mono font-bold text-dark">{r.maquinariaCodigo}</span>
                      <span className="text-xs text-gray-400 block">{r.maquinariaNombre}</span>
                    </td>
                    <td className="table-td"><span className={TIPO_BADGE[r.tipo]}>{r.tipo}</span></td>
                    <td className="table-td text-sm">{r.responsableNombre}</td>
                    <td className="table-td text-xs font-mono text-right">{r.horometro != null ? fmtNum(r.horometro) : '—'}</td>
                    <td className="table-td text-sm text-gray-600 max-w-xs truncate">{resumenDetalle(r)}</td>
                  </tr>,
                  isOpen && (
                    <tr key={`detail-${r.id}`}>
                      <td colSpan={cols.length + 1} className="bg-gray-50 px-6 py-4">
                        <DetalleIntervencion insp={r} />
                      </td>
                    </tr>
                  ),
                ]
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function DetalleIntervencion({ insp }: { insp: IntervencionMaquinariaCompleta }) {
  const campos: { label: string; value: string | null }[] = [
    { label: 'Línea', value: insp.lineaCodigo },
    { label: 'Turno', value: insp.turnoNombre },
    { label: 'Actividad', value: insp.actividadNombre },
    { label: 'Sub equipo', value: insp.subEquipoNombre },
    { label: 'Fecha término', value: insp.fechaTermino ? fmtDate(insp.fechaTermino) : null },
    { label: 'Condición del equipo', value: insp.condicionNombre },
    { label: 'Costo', value: insp.costo != null ? `$${fmtNum(Math.round(insp.costo))}` : null },
  ]

  if (insp.tipo === 'CORRECTIVA') {
    campos.unshift(
      { label: 'Sistema', value: insp.sistemaNombre },
      { label: 'Causa probable', value: insp.causaProbable },
      { label: 'Solución propuesta', value: insp.solucionPropuesta },
    )
  } else if (insp.tipo === 'PREVENTIVA') {
    campos.unshift({ label: 'Tipo preventiva', value: insp.tipoPreventivaNombre })
  } else {
    campos.unshift({ label: 'Tarea', value: insp.tareaNombre })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {campos.filter(c => c.value).map(c => (
          <div key={c.label} className="text-xs bg-white border border-gray-200 rounded-lg p-2.5">
            <p className="font-semibold text-gray-400 uppercase tracking-wide text-[10px] mb-0.5">{c.label}</p>
            <p className="text-gray-700">{c.value}</p>
          </div>
        ))}
        {insp.tipo === 'CORRECTIVA' && insp.descripcionFalla && (
          <div className="sm:col-span-2 text-xs bg-white border border-fault/30 rounded-lg p-2.5">
            <p className="font-semibold text-fault uppercase tracking-wide text-[10px] mb-0.5">Descripción de la falla</p>
            <p className="text-gray-700 italic">&ldquo;{insp.descripcionFalla}&rdquo;</p>
          </div>
        )}
        {insp.tipo !== 'CORRECTIVA' && insp.descripcion && (
          <div className="sm:col-span-2 text-xs bg-white border border-gray-200 rounded-lg p-2.5">
            <p className="font-semibold text-gray-400 uppercase tracking-wide text-[10px] mb-0.5">Descripción</p>
            <p className="text-gray-700">{insp.descripcion}</p>
          </div>
        )}
      </div>

      {insp.insumos.length > 0 && (
        <div>
          <p className="font-semibold text-gray-400 uppercase tracking-wide text-[10px] mb-1.5">Insumos usados</p>
          <div className="flex flex-wrap gap-1.5">
            {insp.insumos.map((i, idx) => (
              <span key={idx} className="badge-warn">{i.nombre} × {i.cantidad}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
