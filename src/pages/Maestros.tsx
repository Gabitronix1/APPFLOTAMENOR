import { useEffect, useState, FormEvent, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { SearchSelect } from '../components/SearchSelect'
import { ROL_LABELS, ROLES_AUTOSERVICIO } from '../lib/roles'
import { invocarFuncion } from '../lib/funciones'
import { DOMINIO_RUT, formatearRut, rutCanonico, rutValido } from '../lib/rut'
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
  Rol,
} from '../types'

type Grupo = 'flota_menor' | 'flota_mayor' | 'usuarios'
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
    // RUT en formato canónico ("12345678-9"): es con lo que se vincula el ingreso con RUT.
    const rut = form.rut.trim() ? (rutValido(form.rut) ? rutCanonico(form.rut) : form.rut.trim()) : null
    const payload = { nombre: form.nombre, apellido: form.apellido, rut, email: form.email || null }
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
  const [lineas, setLineas] = useState<LineaOperacion[]>([])
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

  async function loadLineas() {
    const { data } = await supabase.from('lineas_operacion').select('*').order('codigo')
    setLineas((data ?? []) as unknown as LineaOperacion[])
  }

  useEffect(() => { void load(); void loadLineas() }, [])

  const lineaOptions = lineas.map(l => ({
    value: l.codigo,
    label: l.nombre && l.nombre !== l.codigo ? `${l.codigo} — ${l.nombre}` : l.codigo,
  }))

  async function handleCrearLinea(query: string) {
    const codigo = query.trim().toUpperCase()
    const { error: err } = await supabase.from('lineas_operacion').insert({ codigo })
    if (err && err.code !== '23505') { setError(err.message); return }
    await loadLineas()
    setForm(f => ({ ...f, contrato: codigo }))
  }

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
            <label className="label">Contrato / línea de negocio</label>
            <SearchSelect
              options={lineaOptions}
              value={form.contrato}
              onChange={(v) => setForm((f) => ({ ...f, contrato: v }))}
              placeholder="Seleccionar contrato..."
              onCreate={(q) => void handleCrearLinea(q)}
              createLabel={(q) => `Crear contrato "${q.trim().toUpperCase()}"`}
            />
          </div>
          <div className="col-span-2 flex justify-end">
            <button type="submit" disabled={saving || !form.contrato} className="btn-primary btn-sm">
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
                  <td className="table-td font-mono text-xs">{row.contrato || '—'}</td>
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

/* ─── Usuarios ─── */
const ROLES_OPCIONES = Object.keys(ROL_LABELS) as Rol[]

interface PerfilConOperador {
  id: string
  rol: Rol
  operador_id: string | null
  operadores: { nombre: string; apellido: string; rut: string | null } | null
}

function NuevoUsuarioModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [operadores, setOperadores] = useState<Operador[]>([])
  const [operadorId, setOperadorId] = useState('')
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [rut, setRut] = useState('')
  const [email, setEmail] = useState('')
  const [metodo, setMetodo] = useState<'rut' | 'correo'>('rut')
  const [clave, setClave] = useState('')
  const [rol, setRol] = useState<Rol>('conductor_logistico')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void supabase
      .from('operadores')
      .select('id, nombre, apellido, rut, email, activo')
      .eq('activo', true)
      .order('apellido')
      .then(({ data }) => setOperadores((data ?? []) as Operador[]))
  }, [])

  const usaOperadorExistente = operadorId !== ''
  const tienePersona = usaOperadorExistente || (!!nombre.trim() && !!apellido.trim())
  const canSave =
    tienePersona && (metodo === 'rut' ? rutValido(rut) && clave.length >= 6 : !!email.trim())

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    setError(null)

        const persona = usaOperadorExistente
      ? { operador_id: operadorId }
      : { nombre: nombre.trim(), apellido: apellido.trim() }
    const { error: fnError } = await invocarFuncion(
      'gestionar-usuario',
      metodo === 'rut'
        ? { action: 'crear', rol, rut: rutCanonico(rut), password: clave, ...persona }
        : { action: 'crear', rol, email: email.trim(), rut: rut.trim() || undefined, ...persona },
    )

    setSaving(false)
    if (fnError) {
      setError(fnError)
      return
    }
    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-lg font-bold text-dark mb-1">Nuevo usuario</h2>
        <p className="text-xs text-gray-400 mb-4">
          {metodo === 'rut'
            ? 'Entrará con su RUT y la clave que le asignes (no necesita correo).'
            : 'Se le envía un correo de invitación para que defina su propia contraseña.'}
        </p>
        <form onSubmit={e => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="label">Vincular a operador existente (opcional)</label>
            <SearchSelect
              options={operadores.map(o => ({ value: o.id, label: `${o.apellido}, ${o.nombre}` }))}
              value={operadorId}
              onChange={setOperadorId}
              placeholder="Buscar operador..."
            />
          </div>

          {!usaOperadorExistente && (
            <>
              <div>
                <label className="label">Nombre</label>
                <input className="input" value={nombre} onChange={e => setNombre(e.target.value)} required={!usaOperadorExistente} />
              </div>
              <div>
                <label className="label">Apellido</label>
                <input className="input" value={apellido} onChange={e => setApellido(e.target.value)} required={!usaOperadorExistente} />
              </div>
            </>
          )}

          <div>
            <label className="label">Ingresa con</label>
            <div className="grid grid-cols-2 gap-2">
              {(['rut', 'correo'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetodo(m)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                    metodo === m ? 'border-primary bg-primary/10 text-primary' : 'border-gray-300 text-gray-600'
                  }`}
                >
                  {m === 'rut' ? 'RUT y clave' : 'Correo (jefaturas)'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">RUT{metodo === 'correo' ? ' (opcional)' : ''}</label>
            <input
              className="input font-mono"
              value={rut}
              onChange={e => setRut(formatearRut(e.target.value))}
              placeholder="12.345.678-9"
            />
            {metodo === 'rut' && rut && !rutValido(rut) && (
              <p className="text-xs text-fault mt-1">RUT no válido (revisa el dígito verificador).</p>
            )}
          </div>

          {metodo === 'rut' ? (
            <div>
              <label className="label">Clave inicial</label>
              <input
                className="input"
                value={clave}
                onChange={e => setClave(e.target.value)}
                placeholder="Mínimo 6 caracteres, pueden ser números"
              />
              <p className="text-xs text-gray-400 mt-1">Entrégasela a la persona; si la olvida, le asignas otra desde aquí.</p>
            </div>
          ) : (
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nombre@empresa.cl"
                required
              />
            </div>
          )}

          <div>
            <label className="label">Rol</label>
            <select className="input" value={rol} onChange={e => setRol(e.target.value as Rol)} required>
              {ROLES_OPCIONES.map(r => (
                <option key={r} value={r}>{ROL_LABELS[r]}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-fault text-xs">{error}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary btn-sm">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !canSave} className="btn-primary btn-sm">
              {saving ? 'Creando...' : metodo === 'rut' ? 'Crear usuario' : 'Crear e invitar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface SolicitudConOperador {
  id: string
  email: string
  vinculo_existente: boolean
  funcion: string | null
  rol_solicitado: Rol | null
  created_at: string
  operadores: { nombre: string; apellido: string; rut: string | null } | null
}

function SolicitudesPendientesPanel({ onResuelta }: { onResuelta: () => void }) {
  const [rows, setRows] = useState<SolicitudConOperador[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rolPorSolicitud, setRolPorSolicitud] = useState<Record<string, Rol>>({})
  const [resolviendoId, setResolviendoId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('solicitudes_acceso')
      .select('id, email, vinculo_existente, funcion, rol_solicitado, created_at, operadores(nombre, apellido, rut)')
      .eq('estado', 'pendiente')
      .order('created_at')
    if (err) setError(err.message)
    else {
      const solicitudes = (data ?? []) as unknown as SolicitudConOperador[]
      setRows(solicitudes)
      setRolPorSolicitud(prev => {
        const next = { ...prev }
        for (const s of solicitudes) {
          if (!next[s.id]) next[s.id] = s.rol_solicitado ?? 'conductor_logistico'
        }
        return next
      })
    }
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function aprobar(id: string) {
    setResolviendoId(id)
    setError(null)
    const { error: fnError } = await invocarFuncion('gestionar-usuario', {
      action: 'aprobar_solicitud',
      solicitud_id: id,
      rol: rolPorSolicitud[id],
    })
    setResolviendoId(null)
    if (fnError) {
      setError(fnError)
      return
    }
    void load()
    onResuelta()
  }

  async function rechazar(id: string) {
    if (!window.confirm('¿Rechazar esta solicitud? La cuenta creada quedará eliminada.')) return
    setResolviendoId(id)
    setError(null)
    const { error: fnError } = await invocarFuncion('gestionar-usuario', { action: 'rechazar_solicitud', solicitud_id: id })
    setResolviendoId(null)
    if (fnError) {
      setError(fnError)
      return
    }
    void load()
  }

  if (!loading && rows.length === 0) return null

  return (
    <div className="card p-0 overflow-hidden border-warn/40">
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <h3 className="font-semibold text-dark text-sm">Solicitudes de acceso pendientes</h3>
        {rows.length > 0 && <span className="badge-warn">{rows.length}</span>}
      </div>
      <p className="text-xs text-gray-400 px-4 pb-3">Cuentas autoregistradas desde el Login, esperando que les asignes su rol final.</p>
      {error && <div className="text-fault text-sm px-4 pb-3">{error}</div>}
      {loading ? (
        <div className="p-6 text-sm text-gray-400 animate-pulse">Cargando...</div>
      ) : (
        <table className="w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="table-th">Nombre</th>
              <th className="table-th">RUT</th>
              <th className="table-th">Ingreso</th>
              <th className="table-th">Permisos (rol) a asignar</th>
              <th className="table-th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(row => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="table-td">
                  {row.operadores ? `${row.operadores.apellido}, ${row.operadores.nombre}` : '—'}
                  {row.vinculo_existente && (
                    <span className="block text-[11px] text-warn mt-0.5">
                      Vinculado a un operador que ya existía (mismo RUT o nombre): verifica que sea la misma persona.
                    </span>
                  )}
                </td>
                <td className="table-td font-mono text-xs">{row.operadores?.rut ?? '—'}</td>
                <td className="table-td text-xs">{row.email.endsWith(`@${DOMINIO_RUT}`) ? 'RUT y clave' : row.email}</td>
                <td className="table-td">
                  {row.funcion && (
                    <p className="text-xs text-gray-600 mb-1">
                      Función indicada: <span className="font-medium">{row.funcion}</span>
                    </p>
                  )}
                  <select
                    className="input"
                    value={rolPorSolicitud[row.id] ?? 'conductor_logistico'}
                    onChange={e => setRolPorSolicitud(prev => ({ ...prev, [row.id]: e.target.value as Rol }))}
                  >
                    {ROLES_OPCIONES.map(r => (
                      <option key={r} value={r}>{ROL_LABELS[r]}</option>
                    ))}
                  </select>
                </td>
                <td className="table-td text-right whitespace-nowrap space-x-3">
                  <button
                    onClick={() => void rechazar(row.id)}
                    disabled={resolviendoId === row.id}
                    className="text-xs font-medium underline text-fault"
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() => void aprobar(row.id)}
                    disabled={resolviendoId === row.id}
                    className="text-xs font-medium underline text-primary"
                  >
                    {resolviendoId === row.id ? 'Guardando...' : 'Aprobar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function AccesoModal({ usuario, onClose, onSaved }: { usuario: PerfilConOperador; onClose: () => void; onSaved: () => void }) {
  const [rut, setRut] = useState(usuario.operadores?.rut ? formatearRut(usuario.operadores.rut) : '')
  const [clave, setClave] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rutOk = !rut || rutValido(rut)
  const canSave = rutOk && clave.length >= 6 && (!!usuario.operador_id || !rut)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    setError(null)
    const { error: fnError } = await invocarFuncion('gestionar-usuario', {
      action: 'asignar_acceso',
      perfil_id: usuario.id,
      password: clave,
      rut: rut ? rutCanonico(rut) : undefined,
    })
    setSaving(false)
    if (fnError) {
      setError(fnError)
      return
    }
    onSaved()
  }

  const nombre = usuario.operadores ? `${usuario.operadores.nombre} ${usuario.operadores.apellido}` : 'este usuario'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-lg font-bold text-dark mb-1">Acceso de {nombre}</h2>
        <p className="text-xs text-gray-400 mb-4">
          Con RUT: la persona entra con su RUT y esta clave (deja de usar usuario/correo). Sin RUT: solo se cambia la
          clave.
        </p>
        <form onSubmit={e => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="label">RUT</label>
            <input
              className="input font-mono"
              value={rut}
              onChange={e => setRut(formatearRut(e.target.value))}
              placeholder="12.345.678-9"
            />
            {!rutOk && <p className="text-xs text-fault mt-1">RUT no válido (revisa el dígito verificador).</p>}
            {rut && !usuario.operador_id && (
              <p className="text-xs text-fault mt-1">Este usuario no tiene nombre (operador) vinculado.</p>
            )}
          </div>
          <div>
            <label className="label">Clave nueva</label>
            <input
              className="input"
              value={clave}
              onChange={e => setClave(e.target.value)}
              placeholder="Mínimo 6 caracteres, pueden ser números"
            />
            <p className="text-xs text-gray-400 mt-1">Entrégasela a la persona. Reemplaza la clave anterior.</p>
          </div>
          {error && <p className="text-fault text-xs">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary btn-sm">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !canSave} className="btn-primary btn-sm">
              {saving ? 'Guardando...' : 'Guardar acceso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FuncionesPersonalPanel() {
  const [rows, setRows] = useState<{ id: string; nombre: string; rol: Rol }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [abierto, setAbierto] = useState(false)

  async function load() {
    const { data, error: err } = await supabase.from('funciones_personal').select('id, nombre, rol').order('nombre')
    if (err) setError(err.message)
    else setRows((data ?? []) as { id: string; nombre: string; rol: Rol }[])
  }

  async function cambiarRol(id: string, rol: Rol) {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, rol } : r)))
    const { error: err } = await supabase.from('funciones_personal').update({ rol }).eq('id', id)
    if (err) {
      setError(err.message)
      void load()
    }
  }

  useEffect(() => { void load() }, [])

  async function eliminar(row: { id: string; nombre: string }) {
    if (!window.confirm(`¿Quitar la función "${row.nombre}" de las opciones del registro? Las cuentas que ya la indicaron no cambian.`)) return
    const { error: err } = await supabase.from('funciones_personal').delete().eq('id', row.id)
    if (err) setError(err.message)
    else void load()
  }

  return (
    <div className="card p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setAbierto(a => !a)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="font-semibold text-dark text-sm">
          Funciones agregadas en el registro <span className="text-gray-400 font-normal">({rows.length})</span>
        </span>
        <span className="text-xs text-gray-500 underline">{abierto ? 'Ocultar' : 'Ver'}</span>
      </button>
      {abierto && (
        <div className="px-4 pb-4">
          <p className="text-xs text-gray-400 mb-3">
            Cargos que el personal agregó con "+" al crear su cuenta. Les aparecen a todos como opción. Quien se
            registra con una de ellas queda de inmediato con los permisos indicados aquí; quita las mal escritas o
            repetidas.
          </p>
          {error && <p className="text-fault text-xs mb-2">{error}</p>}
          {rows.length === 0 ? (
            <p className="text-sm text-gray-400">Aún no hay funciones agregadas.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {rows.map(row => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span className="font-medium">{row.nombre}</span>
                  <span className="flex items-center gap-3">
                    <select
                      className="input w-auto py-1.5 text-xs"
                      value={row.rol}
                      onChange={e => void cambiarRol(row.id, e.target.value as Rol)}
                      title="Permisos con que queda quien se registra con esta función"
                    >
                      {ROLES_AUTOSERVICIO.map(r => (
                        <option key={r} value={r}>
                          Permisos: {ROL_LABELS[r]}
                        </option>
                      ))}
                    </select>
                    <button onClick={() => void eliminar(row)} className="text-xs font-medium underline text-fault">
                      Quitar
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function UsuariosTab() {
  const [rows, setRows] = useState<PerfilConOperador[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRol, setEditRol] = useState<Rol>('conductor_logistico')
  const [saving, setSaving] = useState(false)
  const [accesoDe, setAccesoDe] = useState<PerfilConOperador | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('perfiles')
      .select('id, rol, operador_id, operadores(nombre, apellido, rut)')
      .order('rol')
    if (err) setError(err.message)
    else setRows((data ?? []) as unknown as PerfilConOperador[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  function abrirEditar(row: PerfilConOperador) {
    setEditingId(row.id)
    setEditRol(row.rol)
  }

  async function guardarRol(perfilId: string) {
    setSaving(true)
    setError(null)
    const { error: fnError } = await invocarFuncion('gestionar-usuario', {
      action: 'actualizar_rol',
      perfil_id: perfilId,
      rol: editRol,
    })
    setSaving(false)
    if (fnError) {
      setError(fnError)
      return
    }
    setEditingId(null)
    void load()
  }

  return (
    <div className="space-y-4">
      <SolicitudesPendientesPanel onResuelta={() => void load()} />
      <FuncionesPersonalPanel />

      {error && <div className="text-fault text-sm">{error}</div>}
      {mensaje && <div className="text-primary text-sm">{mensaje}</div>}
      <div className="flex justify-end">
        <button className="btn-primary btn-sm" onClick={() => setShowModal(true)}>
          + Nuevo usuario
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-gray-400 animate-pulse">Cargando...</div>
        ) : (
          <table className="w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-th">Nombre</th>
                <th className="table-th">RUT</th>
                <th className="table-th">Rol</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 && (
                <tr><td colSpan={4} className="table-td text-center text-gray-400 py-8">Sin registros.</td></tr>
              )}
              {rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="table-td">
                    {row.operadores ? `${row.operadores.apellido}, ${row.operadores.nombre}` : '—'}
                  </td>
                  <td className="table-td font-mono text-xs">{row.operadores?.rut ?? '—'}</td>
                  <td className="table-td">
                    {editingId === row.id ? (
                      <select className="input" value={editRol} onChange={e => setEditRol(e.target.value as Rol)}>
                        {ROLES_OPCIONES.map(r => (
                          <option key={r} value={r}>{ROL_LABELS[r]}</option>
                        ))}
                      </select>
                    ) : (
                      ROL_LABELS[row.rol]
                    )}
                  </td>
                  <td className="table-td text-right whitespace-nowrap space-x-3">
                    {editingId === row.id ? (
                      <>
                        <button onClick={() => setEditingId(null)} className="text-xs font-medium underline text-gray-600">
                          Cancelar
                        </button>
                        <button
                          onClick={() => void guardarRol(row.id)}
                          disabled={saving}
                          className="text-xs font-medium underline text-primary"
                        >
                          {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setAccesoDe(row)} className="text-xs font-medium underline text-gray-600">
                          RUT y clave
                        </button>
                        <button onClick={() => abrirEditar(row)} className="text-xs font-medium underline text-gray-600">
                          Cambiar rol
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {accesoDe && (
        <AccesoModal
          usuario={accesoDe}
          onClose={() => setAccesoDe(null)}
          onSaved={() => {
            setMensaje('Acceso actualizado. Entrégale a la persona su clave nueva.')
            setAccesoDe(null)
            void load()
          }}
        />
      )}

      {showModal && (
        <NuevoUsuarioModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); void load() }}
        />
      )}
    </div>
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
    { key: 'usuarios', label: 'Usuarios' },
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
      ) : grupo === 'usuarios' ? (
        <UsuariosTab />
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
