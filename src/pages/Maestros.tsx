import { useEffect, useState, FormEvent, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type {
  Operador,
  Patente,
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload: Record<string, unknown> = { activo: true }
    for (const c of campos) {
      const raw = form[c.key]?.trim() ?? ''
      payload[c.key] = raw || null
    }
    const { error: err } = await supabase.from(table).insert(payload)
    setSaving(false)
    if (err) { setError(err.message); return }
    setForm(Object.fromEntries(campos.map((c) => [c.key, ''])))
    setShowForm(false)
    void load()
  }

  async function toggleActivo(row: T) {
    await supabase.from(table).update({ activo: !row.activo }).eq('id', row.id)
    void load()
  }

  const cols: ColumnaDef<T>[] = columnas ?? campos.map((c) => ({ key: c.key, label: c.label }))

  return (
    <div className="space-y-4">
      {error && <div className="text-fault text-sm">{error}</div>}
      <div className="flex justify-end">
        <button className="btn-primary btn-sm" onClick={() => setShowForm((v) => !v)}>
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
                  <td className="table-td text-right">
                    <button
                      onClick={() => void toggleActivo(row)}
                      className={`text-xs font-medium underline ${row.activo ? 'text-fault' : 'text-primary'}`}
                    >
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
        { key: 'categoria_id', label: 'Categoría', type: 'select', options: categoriaOptions, required: false },
        { key: 'descripcion', label: 'Descripción (opcional)', required: false },
      ]}
      columnas={[
        { key: 'codigo', label: 'Código' },
        { key: 'nombre', label: 'Nombre' },
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
