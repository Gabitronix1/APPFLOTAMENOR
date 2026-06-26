import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { Operador, Patente, Fundo } from '../types'

type Tab = 'operadores' | 'patentes' | 'fundos'

/* ─── Operadores ─── */
function OperadoresTab() {
  const [rows, setRows] = useState<Operador[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nombre: '', apellido: '', rut: '', email: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error: err } = await supabase.from('operadores').select('*').order('apellido')
    if (err) setError(err.message)
    else setRows((data ?? []) as Operador[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error: err } = await supabase.from('operadores').insert({ ...form, activo: true })
    setSaving(false)
    if (err) { setError(err.message); return }
    setForm({ nombre: '', apellido: '', rut: '', email: '' })
    setShowForm(false)
    void load()
  }

  async function toggleActivo(op: Operador) {
    await supabase.from('operadores').update({ activo: !op.activo }).eq('id', op.id)
    void load()
  }

  return (
    <div className="space-y-4">
      {error && <div className="text-fault text-sm">{error}</div>}
      <div className="flex justify-end">
        <button className="btn-primary btn-sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancelar' : '+ Nuevo operador'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={(e) => void handleSubmit(e)} className="card grid grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre</label>
            <input className="input" required value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} />
          </div>
          <div>
            <label className="label">Apellido</label>
            <input className="input" required value={form.apellido} onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))} />
          </div>
          <div>
            <label className="label">RUT</label>
            <input className="input" required value={form.rut} onChange={(e) => setForm((f) => ({ ...f, rut: e.target.value }))} placeholder="12.345.678-9" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary btn-sm">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-gray-400 animate-pulse">Cargando...</div>
        ) : (
          <table className="w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-th">Nombre</th>
                <th className="table-th">RUT</th>
                <th className="table-th">Email</th>
                <th className="table-th text-center">Estado</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 && (
                <tr><td colSpan={5} className="table-td text-center text-gray-400 py-8">Sin registros.</td></tr>
              )}
              {rows.map((op) => (
                <tr key={op.id} className="hover:bg-gray-50">
                  <td className="table-td">{op.apellido}, {op.nombre}</td>
                  <td className="table-td font-mono text-xs">{op.rut}</td>
                  <td className="table-td text-xs">{op.email}</td>
                  <td className="table-td text-center">
                    {op.activo ? <span className="badge-ok">Activo</span> : <span className="badge-fault">Inactivo</span>}
                  </td>
                  <td className="table-td text-right">
                    <button
                      onClick={() => void toggleActivo(op)}
                      className={`text-xs font-medium underline ${op.activo ? 'text-fault' : 'text-primary'}`}
                    >
                      {op.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/* ─── Patentes ─── */
function PatentesTab() {
  const [rows, setRows] = useState<Patente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ patente: '', descripcion: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error: err } = await supabase.from('patentes').select('*').order('patente')
    if (err) setError(err.message)
    else setRows((data ?? []) as Patente[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error: err } = await supabase.from('patentes').insert({ ...form, activo: true })
    setSaving(false)
    if (err) { setError(err.message); return }
    setForm({ patente: '', descripcion: '' })
    setShowForm(false)
    void load()
  }

  async function toggleActivo(row: Patente) {
    await supabase.from('patentes').update({ activo: !row.activo }).eq('id', row.id)
    void load()
  }

  return (
    <div className="space-y-4">
      {error && <div className="text-fault text-sm">{error}</div>}
      <div className="flex justify-end">
        <button className="btn-primary btn-sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancelar' : '+ Nueva patente'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={(e) => void handleSubmit(e)} className="card grid grid-cols-2 gap-4">
          <div>
            <label className="label">Patente</label>
            <input className="input uppercase" required value={form.patente} onChange={(e) => setForm((f) => ({ ...f, patente: e.target.value.toUpperCase() }))} placeholder="AB-1234" />
          </div>
          <div>
            <label className="label">Descripción</label>
            <input className="input" required value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} placeholder="Camioneta Toyota Hilux" />
          </div>
          <div className="col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary btn-sm">{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      )}

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-gray-400 animate-pulse">Cargando...</div>
        ) : (
          <table className="w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-th">Patente</th>
                <th className="table-th">Descripción</th>
                <th className="table-th text-center">Estado</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 && (
                <tr><td colSpan={4} className="table-td text-center text-gray-400 py-8">Sin registros.</td></tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="table-td font-mono font-bold text-dark">{row.patente}</td>
                  <td className="table-td text-sm">{row.descripcion}</td>
                  <td className="table-td text-center">
                    {row.activo ? <span className="badge-ok">Activa</span> : <span className="badge-fault">Inactiva</span>}
                  </td>
                  <td className="table-td text-right">
                    <button onClick={() => void toggleActivo(row)} className={`text-xs font-medium underline ${row.activo ? 'text-fault' : 'text-primary'}`}>
                      {row.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/* ─── Fundos ─── */
function FundosTab() {
  const [rows, setRows] = useState<Fundo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nombre: '', contrato: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error: err } = await supabase.from('fundos').select('*').order('nombre')
    if (err) setError(err.message)
    else setRows((data ?? []) as Fundo[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error: err } = await supabase.from('fundos').insert({ ...form, activo: true })
    setSaving(false)
    if (err) { setError(err.message); return }
    setForm({ nombre: '', contrato: '' })
    setShowForm(false)
    void load()
  }

  async function toggleActivo(row: Fundo) {
    await supabase.from('fundos').update({ activo: !row.activo }).eq('id', row.id)
    void load()
  }

  return (
    <div className="space-y-4">
      {error && <div className="text-fault text-sm">{error}</div>}
      <div className="flex justify-end">
        <button className="btn-primary btn-sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancelar' : '+ Nuevo fundo'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={(e) => void handleSubmit(e)} className="card grid grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre</label>
            <input className="input" required value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} />
          </div>
          <div>
            <label className="label">Contrato</label>
            <input className="input" required value={form.contrato} onChange={(e) => setForm((f) => ({ ...f, contrato: e.target.value }))} placeholder="CTR-001" />
          </div>
          <div className="col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary btn-sm">{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      )}

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-gray-400 animate-pulse">Cargando...</div>
        ) : (
          <table className="w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-th">Nombre</th>
                <th className="table-th">Contrato</th>
                <th className="table-th text-center">Estado</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 && (
                <tr><td colSpan={4} className="table-td text-center text-gray-400 py-8">Sin registros.</td></tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="table-td font-semibold">{row.nombre}</td>
                  <td className="table-td font-mono text-xs">{row.contrato}</td>
                  <td className="table-td text-center">
                    {row.activo ? <span className="badge-ok">Activo</span> : <span className="badge-fault">Inactivo</span>}
                  </td>
                  <td className="table-td text-right">
                    <button onClick={() => void toggleActivo(row)} className={`text-xs font-medium underline ${row.activo ? 'text-fault' : 'text-primary'}`}>
                      {row.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/* ─── Página principal ─── */
export function Maestros() {
  const [tab, setTab] = useState<Tab>('operadores')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'operadores', label: 'Operadores' },
    { key: 'patentes', label: 'Patentes' },
    { key: 'fundos', label: 'Fundos' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Maestros</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-200 rounded-xl p-1 w-fit mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-white text-dark shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'operadores' && <OperadoresTab />}
      {tab === 'patentes' && <PatentesTab />}
      {tab === 'fundos' && <FundosTab />}
    </div>
  )
}
