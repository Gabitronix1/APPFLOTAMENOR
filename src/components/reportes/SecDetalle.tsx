import { useMemo, useState } from 'react'
import { PREGUNTAS, fmtDate, fmtNum } from '../../lib/constants'
import type { VInspeccion } from '../../types'
import type { PKey } from '../../lib/constants'

interface SecDetalleProps {
  data: VInspeccion[]
}

type SortKey = 'fecha' | 'patente' | 'conductor' | 'fundo' | 'contrato' | 'km' | 'nfaults' | 'operativo'

function sortData(rows: VInspeccion[], key: SortKey, dir: 1 | -1): VInspeccion[] {
  return [...rows].sort((a, b) => {
    if (key === 'fecha') return (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0) * dir
    if (key === 'km') return ((a.kilometraje ?? -1) - (b.kilometraje ?? -1)) * dir
    if (key === 'nfaults') return (a.n_fallas - b.n_fallas) * dir
    if (key === 'operativo') return (Number(a.operativo) - Number(b.operativo)) * dir
    const va = (a[key] ?? '').toString().toLowerCase()
    const vb = (b[key] ?? '').toString().toLowerCase()
    return va < vb ? -dir : va > vb ? dir : 0
  })
}

function exportCSV(rows: VInspeccion[]) {
  const meta = [
    ['Doña Isidora — Informe de inspección de flota'],
    ['Generado', new Date().toLocaleString('es-CL')],
    ['Inspecciones', String(rows.length)],
    [''],
  ]
  const head = ['Fecha', 'Patente', 'Conductor', 'Fundo', 'Contrato', 'Kilometraje', 'N_Fallas', 'Fallas', 'Operativo', 'Observacion_General']
  const esc = (c: unknown) => `"${String(c).replace(/"/g, '""')}"`
  const lines = meta.map(m => m.map(esc).join(';'))
  lines.push(head.map(esc).join(';'))
  rows.forEach(r => {
    const fallas = PREGUNTAS.filter(p => r[p.key]).map(p => p.short).join(' | ')
    lines.push([
      r.fecha.slice(0, 10), r.patente, r.conductor, r.fundo, r.contrato ?? '',
      r.kilometraje != null ? Math.round(r.kilometraje) : '', r.n_fallas, fallas,
      r.operativo ? 'SI' : 'NO', (r.obs_general ?? '').replace(/\s+/g, ' '),
    ].map(esc).join(';'))
  })
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'DonaIsidora-informe-flota.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

export function SecDetalle({ data }: SecDetalleProps) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'fecha', dir: -1 })
  const [openRows, setOpenRows] = useState<Set<string>>(new Set())
  const [allExpanded, setAllExpanded] = useState(false)

  const rows = useMemo(() => {
    const q = query.toLowerCase().trim()
    let filtered = data
    if (q) {
      filtered = data.filter(r => {
        const hay = [r.patente, r.conductor, r.fundo, r.contrato, r.obs_general, r.obs1, r.obs2, r.obs3, r.obs4, r.obs5, r.obs6]
          .map(x => (x ?? '').toLowerCase()).join(' ')
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
    { key: 'patente', label: 'Patente' },
    { key: 'conductor', label: 'Conductor' },
    { key: 'fundo', label: 'Fundo' },
    { key: 'contrato', label: 'Contrato' },
    { key: 'km', label: 'Km' },
    { key: 'nfaults', label: 'Fallas' },
    { key: 'operativo', label: 'Operativo' },
  ]

  return (
    <div>
      {/* Tools */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <input
          type="search"
          placeholder="Buscar en el detalle..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="input w-64 text-sm"
        />
        <span className="font-mono text-xs text-gray-400">{fmtNum(rows.length)} inspección(es)</span>
        <div className="flex gap-2 ml-auto">
          <button onClick={toggleAll} className="btn-secondary btn-sm">
            {allExpanded ? 'Contraer todo' : 'Expandir todo'}
          </button>
          <button onClick={() => exportCSV(rows)} className="btn-secondary btn-sm">
            CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead>
              <tr>
                {cols.map(c => (
                  <th
                    key={c.key}
                    onClick={() => toggleSort(c.key)}
                    className="table-th cursor-pointer select-none hover:text-gray-700"
                  >
                    {c.label}{sort.key === c.key && <span className="ml-1 text-gray-400">{sort.dir === 1 ? '▾' : '▴'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!rows.length && (
                <tr>
                  <td colSpan={cols.length} className="table-td text-center text-gray-400 py-8">
                    No hay inspecciones para los filtros aplicados.
                  </td>
                </tr>
              )}
              {rows.map(r => {
                const isOpen = allExpanded || openRows.has(r.id)
                const fallas = PREGUNTAS.filter(p => r[p.key])
                return [
                  <tr
                    key={`main-${r.id}`}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${isOpen ? 'bg-primary/5' : ''}`}
                    onClick={() => toggleRow(r.id)}
                  >
                    <td className="table-td text-xs font-mono whitespace-nowrap">{fmtDate(r.fecha)}</td>
                    <td className="table-td"><span className="font-mono font-bold text-dark">{r.patente}</span></td>
                    <td className="table-td text-sm">{r.conductor}</td>
                    <td className="table-td text-sm">{r.fundo}</td>
                    <td className="table-td text-sm">{r.contrato ?? '—'}</td>
                    <td className="table-td text-xs font-mono text-right">{r.kilometraje != null ? fmtNum(Math.round(r.kilometraje)) : '—'}</td>
                    <td className="table-td">
                      {fallas.length
                        ? <div className="flex flex-wrap gap-1">{fallas.map(p => <span key={p.key} className="badge-fault text-xs">{p.short}</span>)}</div>
                        : <span className="badge-ok text-xs">Sin fallas</span>
                      }
                    </td>
                    <td className="table-td">
                      {r.operativo ? <span className="badge-ok">Operativo</span> : <span className="badge-fault">NO OP.</span>}
                    </td>
                  </tr>,
                  isOpen && (
                    <tr key={`detail-${r.id}`}>
                      <td colSpan={cols.length} className="bg-gray-50 px-6 py-4">
                        <DetalleRespuestas insp={r} />
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

function DetalleRespuestas({ insp }: { insp: VInspeccion }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {PREGUNTAS.map(p => {
        const key = p.key as PKey
        const bad = insp[key]
        const obs = insp[p.obs]
        return (
          <div key={p.key} className={`flex gap-2 items-start p-2.5 rounded-lg border ${bad ? 'border-fault/30 bg-fault/5' : 'border-gray-200 bg-white'}`}>
            <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${bad ? 'bg-fault' : 'bg-primary'}`} />
            <div className="text-xs">
              <p className="font-semibold text-gray-700">{p.label}</p>
              <p className={bad ? 'text-fault' : 'text-primary'}>{bad ? 'SI · falla' : 'NO'}</p>
              {obs
                ? <p className="text-gray-500 italic mt-0.5">&ldquo;{obs}&rdquo;</p>
                : bad && <p className="text-gray-400 italic mt-0.5">sin comentario</p>
              }
            </div>
          </div>
        )
      })}
      {insp.obs_general && (
        <div className="sm:col-span-2 text-xs bg-white border border-gray-200 rounded-lg p-2.5">
          <p className="font-semibold text-gray-400 uppercase tracking-wide text-[10px] mb-1">Observación general</p>
          <p className="text-gray-600">{insp.obs_general}</p>
        </div>
      )}
    </div>
  )
}
