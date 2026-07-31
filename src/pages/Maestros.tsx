import { useEffect, useState, FormEvent, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type {
  Operador,
  Patente,
  CategoriaPatente,
  Fundo,
  Maquinaria,
  CategoriaMaquinaria,
  LineaOperacion,
  Turno,
  ActividadMaquinaria,
  SubEquipo,
  TipoPreventivaMaquinaria,
  SistemaCorrectivoMaquinaria,
  CodigoFallaMaquinaria,
  TareaOtraMaquinaria,
  ProductoInsumo,
  CondicionEquipo,
} from '../types'

type Grupo = 'flota_menor' | 'flota_mayor'
type TabMenor = 'operadores' | 'patentes' | 'fundos'
type TabMayor =
  | 'maquinarias'
  | 'categorias'
  | 'lineas'
  | 'turnos'
  | 'actividades'
  | 'sub_equipos'
  | 'tipos_preventiva'
  | 'sistemas_correctivo'
  | 'codigos_falla'
  | 'tareas'
  | 'productos'
  | 'condiciones'

/* ─── Operadores ─── */
function OperadoresTab() {
  const [rows, setRows] = useState<Operador[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
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

  function abrirNuevo() {
    setForm({ nombre: '', apellido: '', rut: '', email: '' })
    setEditingId(null)
    setShowForm(true)
  }

  function abrirEditar(op: Operador) {
    setForm({ nombre: op.nombre, apellido: op.apellido, rut: op.rut ?? '', email: op.email ?? '' })
    setEditingId(op.id)
    setShowForm(true)
  }

  function cerrarForm() {
    setShowForm(false)
    setEditingId(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = { nombre: form.nombre, apellido: form.apellido, rut: form.rut || null, email: form.email || null }
    const { error: err } = editingId
      ? await supabase.from('operadores').update(payload).eq('id', editingId)
      : await supabase.from('operadores').insert({ ...payload, activo: true })
    setSaving(false)
    if (err) { setError(err.message); return }
    setForm({ nombre: '', apellido: '', rut: '', email: '' })
    setShowForm(false)
    setEditingId(null)
    void load()
  }

  async function toggleActivo(op: Operador) {
    await supabase.from('operadores').update({ activo: !op.activo }).eq('id', op.id)
    void load()
  }

  async function handleDelete(op: Operador) {
    if (!window.confirm(`¿Eliminar a ${op.apellido}, ${op.nombre}? Esta acción no se puede deshacer.`)) return
    const { error: err } = await supabase.from('operadores').delete().eq('id', op.id)
    if (err) {
      if (err.code === '23503') {
        alert('No se puede eliminar: tiene inspecciones, intervenciones u otros registros asociados. Puedes desactivarlo en su lugar.')
      } else {
        alert(err.message)
      }
      return
    }
    void load()
  }

  return (
    <div className="space-y-4">
      {error && <div className="text-fault text-sm">{error}</div>}
      <div className="flex justify-end">
        <button className="btn-primary btn-sm" onClick={() => (showForm ? cerrarForm() : abrirNuevo())}>
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
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Guardar'}
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
                  <td className="table-td text-right whitespace-nowrap space-x-3">
                    <button onClick={() => abrirEditar(op)} className="text-xs font-medium underline text-gray-600">
                      Editar
                    </button>
                    <button
                      onClick={() => void toggleActivo(op)}
                      className={`text-xs font-medium underline ${op.activo ? 'text-fault' : 'text-primary'}`}
                    >
                      {op.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button onClick={() => void handleDelete(op)} className="text-xs font-medium underline text-fault">
                      Eliminar
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
  const [categorias, setCategorias] = useState<CategoriaPatente[]>([])

  useEffect(() => {
    void supabase
      .from('categorias_vehiculo')
      .select('*')
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => setCategorias((data ?? []) as unknown as CategoriaPatente[]))
  }, [])

  const categoriaOptions = categorias.map((c) => ({ value: c.id, label: c.nombre }))
  const nombrePorCategoria = new Map(categorias.map((c) => [c.id, c.nombre]))

  return (
    <CatalogCrudTab<Patente>
      table="patentes"
      nombreSingular="patente"
      orderBy="patente"
      campos={[
        { key: 'patente', label: 'Patente', uppercase: true, placeholder: 'AB-1234' },
        { key: 'descripcion', label: 'Descripción', placeholder: 'Camioneta Toyota Hilux' },
        { key: 'marca', label: 'Marca (opcional)', required: false },
        { key: 'modelo', label: 'Modelo (opcional)', required: false },
        { key: 'categoria_id', label: 'Categoría (opcional)', type: 'select', options: categoriaOptions, required: false },
      ]}
      columnas={[
        { key: 'patente', label: 'Patente' },
        { key: 'descripcion', label: 'Descripción' },
        { key: 'marca', label: 'Marca', render: (row) => row.marca || '—' },
        { key: 'modelo', label: 'Modelo', render: (row) => row.modelo || '—' },
        {
          key: 'categoria_id',
          label: 'Categoría',
          render: (row) => (row.categoria_id && nombrePorCategoria.get(row.categoria_id)) || '—',
        },
      ]}
    />
  )
}

/* ─── Fundos ─── */
function FundosTab() {
  const [rows, setRows] = useState<Fundo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
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

  function abrirNuevo() {
    setForm({ nombre: '', contrato: '' })
    setEditingId(null)
    setShowForm(true)
  }

  function abrirEditar(row: Fundo) {
    setForm({ nombre: row.nombre, contrato: row.contrato ?? '' })
    setEditingId(row.id)
    setShowForm(true)
  }

  function cerrarForm() {
    setShowForm(false)
    setEditingId(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error: err } = editingId
      ? await supabase.from('fundos').update(form).eq('id', editingId)
      : await supabase.from('fundos').insert({ ...form, activo: true })
    setSaving(false)
    if (err) { setError(err.message); return }
    setForm({ nombre: '', contrato: '' })
    setShowForm(false)
    setEditingId(null)
    void load()
  }

  async function toggleActivo(row: Fundo) {
    await supabase.from('fundos').update({ activo: !row.activo }).eq('id', row.id)
    void load()
  }

  async function handleDelete(row: Fundo) {
    if (!window.confirm(`¿Eliminar el fundo "${row.nombre}"? Esta acción no se puede deshacer.`)) return
    const { error: err } = await supabase.from('fundos').delete().eq('id', row.id)
    if (err) {
      if (err.code === '23503') {
        alert('No se puede eliminar: tiene inspecciones asociadas. Puedes desactivarlo en su lugar.')
      } else {
        alert(err.message)
      }
      return
    }
    void load()
  }

  return (
    <div className="space-y-4">
      {error && <div className="text-fault text-sm">{error}</div>}
      <div className="flex justify-end">
        <button className="btn-primary btn-sm" onClick={() => (showForm ? cerrarForm() : abrirNuevo())}>
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
            <button type="submit" disabled={saving} className="btn-primary btn-sm">
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Guardar'}
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
                  <td className="table-td text-right whitespace-nowrap space-x-3">
                    <button onClick={() => abrirEditar(row)} className="text-xs font-medium underline text-gray-600">
                      Editar
                    </button>
                    <button onClick={() => void toggleActivo(row)} className={`text-xs font-medium underline ${row.activo ? 'text-fault' : 'text-primary'}`}>
                      {row.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button onClick={() => void handleDelete(row)} className="text-xs font-medium underline text-fault">
                      Eliminar
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

/* ─── Flota Mayor: CRUD de catálogo genérico ─── */

interface CampoDef<T> {
  key: keyof T & string
  label: string
  placeholder?: string
  uppercase?: boolean
  required?: boolean
  type?: 'text' | 'select'
  options?: { value: string; label: string }[]
}

interface ColumnaDef<T> {
  key: string
  label: string
  render?: (row: T) => ReactNode
}

interface CatalogCrudTabProps<T extends { id: string; activo: boolean }> {
  table: string
  nombreSingular: string
  campos: CampoDef<T>[]
  orderBy: string
  columnas?: ColumnaDef<T>[]
}

function CatalogCrudTab<T extends { id: string; activo: boolean }>({
  table,
  nombreSingular,
  campos,
  orderBy,
  columnas,
}: CatalogCrudTabProps<T>) {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>(() => Object.fromEntries(campos.map((c) => [c.key, ''])))
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error: err } = await supabase.from(table).select('*').order(orderBy)
    if (err) setError(err.message)
    else setRows((data ?? []) as unknown as T[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [table])

  function abrirNuevo() {
    setForm(Object.fromEntries(campos.map((c) => [c.key, ''])))
    setEditingId(null)
    setShowForm(true)
  }

  function abrirEditar(row: T) {
    const r = row as unknown as Record<string, unknown>
    setForm(Object.fromEntries(campos.map((c) => [c.key, r[c.key] != null ? String(r[c.key]) : ''])))
    setEditingId(row.id)
    setShowForm(true)
  }

  function cerrarForm() {
    setShowForm(false)
    setEditingId(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload: Record<string, unknown> = {}
    for (const c of campos) {
      const raw = form[c.key]?.trim() ?? ''
      payload[c.key] = raw || null
    }
    const { error: err } = editingId
      ? await supabase.from(table).update(payload).eq('id', editingId)
      : await supabase.from(table).insert({ ...payload, activo: true })
    setSaving(false)
    if (err) { setError(err.message); return }
    setForm(Object.fromEntries(campos.map((c) => [c.key, ''])))
    setShowForm(false)
    setEditingId(null)
    void load()
  }

  async function toggleActivo(row: T) {
    await supabase.from(table).update({ activo: !row.activo }).eq('id', row.id)
    void load()
  }

  async function handleDelete(row: T) {
    const r = row as unknown as Record<string, unknown>
    const nombre = campos[0] ? String(r[campos[0].key] ?? '') : ''
    if (!window.confirm(`¿Eliminar ${nombreSingular} "${nombre}"? Esta acción no se puede deshacer.`)) return
    const { error: err } = await supabase.from(table).delete().eq('id', row.id)
    if (err) {
      if (err.code === '23503') {
        alert(`No se puede eliminar: está en uso en otros registros. Puedes desactivarlo en su lugar.`)
      } else {
        alert(err.message)
      }
      return
    }
    void load()
  }

  const cols: ColumnaDef<T>[] = columnas ?? campos.map((c) => ({ key: c.key, label: c.label }))

  return (
    <div className="space-y-4">
      {error && <div className="text-fault text-sm">{error}</div>}
      <div className="flex justify-end">
        <button className="btn-primary btn-sm" onClick={() => (showForm ? cerrarForm() : abrirNuevo())}>
          {showForm ? 'Cancelar' : `+ Nuevo ${nombreSingular}`}
        </button>
      </div>

      {showForm && (
        <form onSubmit={(e) => void handleSubmit(e)} className="card grid grid-cols-2 gap-4">
          {campos.map((c) => (
            <div key={c.key}>
              <label className="label">{c.label}</label>
              {c.type === 'select' ? (
                <select
                  className="input"
                  required={c.required !== false}
                  value={form[c.key] ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.value }))}
                >
                  <option value="">Seleccionar...</option>
                  {c.options?.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  className={`input ${c.uppercase ? 'uppercase' : ''}`}
                  required={c.required !== false}
                  value={form[c.key] ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [c.key]: c.uppercase ? e.target.value.toUpperCase() : e.target.value }))
                  }
                  placeholder={c.placeholder}
                />
              )}
            </div>
          ))}
          <div className="col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary btn-sm">
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Guardar'}
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
                {cols.map((c) => (
                  <th key={c.key} className="table-th">{c.label}</th>
                ))}
                <th className="table-th text-center">Estado</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 && (
                <tr><td colSpan={cols.length + 2} className="table-td text-center text-gray-400 py-8">Sin registros.</td></tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {cols.map((c) => (
                    <td key={c.key} className="table-td">
                      {c.render ? c.render(row) : String((row as unknown as Record<string, unknown>)[c.key] ?? '—')}
                    </td>
                  ))}
                  <td className="table-td text-center">
                    {row.activo ? <span className="badge-ok">Activo</span> : <span className="badge-fault">Inactivo</span>}
                  </td>
                  <td className="table-td text-right whitespace-nowrap space-x-3">
                    <button onClick={() => abrirEditar(row)} className="text-xs font-medium underline text-gray-600">
                      Editar
                    </button>
                    <button
                      onClick={() => void toggleActivo(row)}
                      className={`text-xs font-medium underline ${row.activo ? 'text-fault' : 'text-primary'}`}
                    >
                      {row.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button onClick={() => void handleDelete(row)} className="text-xs font-medium underline text-fault">
                      Eliminar
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

function MaquinariasTab() {
  const [categorias, setCategorias] = useState<CategoriaMaquinaria[]>([])

  useEffect(() => {
    void supabase
      .from('categorias_maquinaria')
      .select('*')
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => setCategorias((data ?? []) as unknown as CategoriaMaquinaria[]))
  }, [])

  const categoriaOptions = categorias.map((c) => ({ value: c.id, label: c.nombre }))
  const nombrePorCategoria = new Map(categorias.map((c) => [c.id, c.nombre]))

  return (
    <CatalogCrudTab<Maquinaria>
      table="maquinarias"
      nombreSingular="maquinaria"
      orderBy="codigo"
      campos={[
        { key: 'codigo', label: 'Código', uppercase: true, placeholder: 'Ej: EXC-01' },
        { key: 'nombre', label: 'Nombre', placeholder: 'Ej: Excavadora CAT 320' },
        { key: 'marca', label: 'Marca (opcional)', required: false },
        { key: 'modelo', label: 'Modelo (opcional)', required: false },
        { key: 'categoria_id', label: 'Categoría', type: 'select', options: categoriaOptions, required: false },
        { key: 'descripcion', label: 'Descripción (opcional)', required: false },
      ]}
      columnas={[
        { key: 'codigo', label: 'Código' },
        { key: 'nombre', label: 'Nombre' },
        { key: 'marca', label: 'Marca', render: (row) => row.marca || '—' },
        { key: 'modelo', label: 'Modelo', render: (row) => row.modelo || '—' },
        {
          key: 'categoria_id',
          label: 'Categoría',
          render: (row) => (row.categoria_id && nombrePorCategoria.get(row.categoria_id)) || '—',
        },
      ]}
    />
  )
}

function CodigosFallaTab() {
  const [sistemas, setSistemas] = useState<SistemaCorrectivoMaquinaria[]>([])

  useEffect(() => {
    void supabase
      .from('sistemas_correctivo_maquinaria')
      .select('*')
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => setSistemas((data ?? []) as unknown as SistemaCorrectivoMaquinaria[]))
  }, [])

  const sistemaOptions = sistemas.map((s) => ({ value: s.id, label: s.nombre }))
  const nombrePorSistema = new Map(sistemas.map((s) => [s.id, s.nombre]))

  return (
    <CatalogCrudTab<CodigoFallaMaquinaria>
      table="codigos_falla_maquinaria"
      nombreSingular="código de falla"
      orderBy="nombre"
      campos={[
        { key: 'nombre', label: 'Nombre / código' },
        { key: 'sistema_id', label: 'Sistema (opcional)', type: 'select', options: sistemaOptions, required: false },
      ]}
      columnas={[
        { key: 'nombre', label: 'Nombre / código' },
        {
          key: 'sistema_id',
          label: 'Sistema',
          render: (row) => (row.sistema_id && nombrePorSistema.get(row.sistema_id)) || '—',
        },
      ]}
    />
  )
}

/* ─── Página principal ─── */
export function Maestros() {
  const [grupo, setGrupo] = useState<Grupo>('flota_menor')
  const [tabMenor, setTabMenor] = useState<TabMenor>('operadores')
  const [tabMayor, setTabMayor] = useState<TabMayor>('maquinarias')

  const gruposTabs: { key: Grupo; label: string }[] = [
    { key: 'flota_menor', label: 'Flota Menor' },
    { key: 'flota_mayor', label: 'Flota Mayor' },
  ]

  const tabsMenor: { key: TabMenor; label: string }[] = [
    { key: 'operadores', label: 'Operadores' },
    { key: 'patentes', label: 'Patentes' },
    { key: 'fundos', label: 'Fundos' },
  ]

  const tabsMayor: { key: TabMayor; label: string }[] = [
    { key: 'maquinarias', label: 'Maquinarias' },
    { key: 'categorias', label: 'Categorías' },
    { key: 'lineas', label: 'Líneas' },
    { key: 'turnos', label: 'Turnos' },
    { key: 'actividades', label: 'Actividades' },
    { key: 'sub_equipos', label: 'Sub Equipos' },
    { key: 'tipos_preventiva', label: 'Tipos Preventiva' },
    { key: 'sistemas_correctivo', label: 'Sistemas Correctivo' },
    { key: 'codigos_falla', label: 'Códigos Falla' },
    { key: 'tareas', label: 'Tareas' },
    { key: 'productos', label: 'Productos/Insumos' },
    { key: 'condiciones', label: 'Condiciones Equipo' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Maestros</h1>

      <div className="flex gap-1 bg-gray-200 rounded-xl p-1 w-fit mb-4">
        {gruposTabs.map((g) => (
          <button
            key={g.key}
            onClick={() => setGrupo(g.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              grupo === g.key ? 'bg-white text-dark shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {grupo === 'flota_menor' ? (
        <>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6 flex-wrap">
            {tabsMenor.map((t) => (
              <button
                key={t.key}
                onClick={() => setTabMenor(t.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tabMenor === t.key ? 'bg-white text-dark shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tabMenor === 'operadores' && <OperadoresTab />}
          {tabMenor === 'patentes' && <PatentesTab />}
          {tabMenor === 'fundos' && <FundosTab />}
        </>
      ) : (
        <>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 flex-wrap w-fit">
            {tabsMayor.map((t) => (
              <button
                key={t.key}
                onClick={() => setTabMayor(t.key)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  tabMayor === t.key ? 'bg-white text-dark shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tabMayor === 'maquinarias' && <MaquinariasTab />}
          {tabMayor === 'categorias' && (
            <CatalogCrudTab<CategoriaMaquinaria>
              table="categorias_maquinaria"
              nombreSingular="categoría"
              orderBy="nombre"
              campos={[{ key: 'nombre', label: 'Nombre' }]}
            />
          )}
          {tabMayor === 'lineas' && (
            <CatalogCrudTab<LineaOperacion>
              table="lineas_operacion"
              nombreSingular="línea"
              orderBy="codigo"
              campos={[
                { key: 'codigo', label: 'Código', uppercase: true, placeholder: 'Ej: P1' },
                { key: 'nombre', label: 'Nombre (opcional)', required: false },
              ]}
            />
          )}
          {tabMayor === 'turnos' && (
            <CatalogCrudTab<Turno> table="turnos" nombreSingular="turno" orderBy="nombre" campos={[{ key: 'nombre', label: 'Nombre' }]} />
          )}
          {tabMayor === 'actividades' && (
            <CatalogCrudTab<ActividadMaquinaria>
              table="actividades_maquinaria"
              nombreSingular="actividad"
              orderBy="nombre"
              campos={[{ key: 'nombre', label: 'Nombre' }]}
            />
          )}
          {tabMayor === 'sub_equipos' && (
            <CatalogCrudTab<SubEquipo>
              table="sub_equipos"
              nombreSingular="sub equipo"
              orderBy="nombre"
              campos={[{ key: 'nombre', label: 'Nombre' }]}
            />
          )}
          {tabMayor === 'tipos_preventiva' && (
            <CatalogCrudTab<TipoPreventivaMaquinaria>
              table="tipos_preventiva_maquinaria"
              nombreSingular="tipo preventiva"
              orderBy="nombre"
              campos={[{ key: 'nombre', label: 'Nombre' }]}
            />
          )}
          {tabMayor === 'sistemas_correctivo' && (
            <CatalogCrudTab<SistemaCorrectivoMaquinaria>
              table="sistemas_correctivo_maquinaria"
              nombreSingular="sistema"
              orderBy="nombre"
              campos={[{ key: 'nombre', label: 'Nombre' }]}
            />
          )}
          {tabMayor === 'codigos_falla' && <CodigosFallaTab />}
          {tabMayor === 'tareas' && (
            <CatalogCrudTab<TareaOtraMaquinaria>
              table="tareas_otra_maquinaria"
              nombreSingular="tarea"
              orderBy="nombre"
              campos={[{ key: 'nombre', label: 'Nombre' }]}
            />
          )}
          {tabMayor === 'productos' && (
            <CatalogCrudTab<ProductoInsumo>
              table="productos_insumo"
              nombreSingular="producto"
              orderBy="nombre"
              campos={[
                { key: 'nombre', label: 'Nombre' },
                { key: 'codigo_barras', label: 'Código de barras (opcional)', required: false },
              ]}
            />
          )}
          {tabMayor === 'condiciones' && (
            <CatalogCrudTab<CondicionEquipo>
              table="condiciones_equipo"
              nombreSingular="condición"
              orderBy="nombre"
              campos={[{ key: 'nombre', label: 'Nombre' }]}
            />
          )}
        </>
      )}
    </div>
  )
}
