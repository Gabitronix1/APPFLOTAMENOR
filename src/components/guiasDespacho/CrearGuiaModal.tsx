import { useState } from 'react'
import { SearchSelect } from '../SearchSelect'
import { CrearFundoModal, type NuevoFundoInput } from './CrearFundoModal'
import { CrearProductoModal } from './CrearProductoModal'
import { useCatalog } from '../../hooks/useCatalog'
import { useOfflineQueue } from '../../hooks/useOfflineQueue'
import { fetchTable, fetchCatalog, appendToCatalogCache } from '../../lib/masterDataCache'
import type { Fundo, Patente, Operador, ProductoInsumo, Maquinaria, LineaOperacion } from '../../types'

interface ItemForm {
  key: string
  productoId: string
  cantidad: string
  equipoId: string
}

function nuevoItem(): ItemForm {
  return { key: crypto.randomUUID(), productoId: '', cantidad: '', equipoId: '' }
}

interface Props {
  onClose: () => void
  onCreated: () => void
}

export function CrearGuiaModal({ onClose, onCreated }: Props) {
  const { data: fundos } = useCatalog<Fundo>('fundos', () => fetchTable('fundos', 'nombre'))
  const { data: patentes } = useCatalog<Patente>('patentes', () => fetchTable('patentes', 'patente'))
  const { data: operadores } = useCatalog<Operador>('operadores', () => fetchTable('operadores', 'apellido'))
  const { data: productos } = useCatalog<ProductoInsumo>('productos_insumo', () => fetchCatalog('productos_insumo'))
  const { data: maquinarias } = useCatalog<Maquinaria>('maquinarias', () => fetchTable('maquinarias', 'codigo'))
  const { data: lineas } = useCatalog<LineaOperacion>('lineas_operacion', () => fetchCatalog('lineas_operacion'))
  const { enqueue } = useOfflineQueue()

  const [fundosLocales, setFundosLocales] = useState<Fundo[]>([])
  const [productosLocales, setProductosLocales] = useState<ProductoInsumo[]>([])
  const [lineasLocales, setLineasLocales] = useState<LineaOperacion[]>([])

  const allFundos = [...fundos, ...fundosLocales]
  const allProductos = [...productos, ...productosLocales]
  const allLineas = [...lineas, ...lineasLocales]

  const [fundoId, setFundoId] = useState('')
  const [patenteId, setPatenteId] = useState('')
  const [conductorId, setConductorId] = useState('')
  const [comentarios, setComentarios] = useState('')
  const [items, setItems] = useState<ItemForm[]>([nuevoItem()])

  const [crearFundoQuery, setCrearFundoQuery] = useState<string | null>(null)
  const [crearProductoQuery, setCrearProductoQuery] = useState<{ itemKey: string; query: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const fundoOptions = allFundos.map(f => ({ value: f.id, label: f.nombre }))
  const patenteOptions = patentes.map(p => ({ value: p.id, label: p.patente }))
  const operadorOptions = operadores.map(o => ({ value: o.id, label: `${o.apellido}, ${o.nombre}` }))
  const productoOptions = allProductos.map(p => ({ value: p.id, label: p.nombre }))
  const maquinariaOptions = maquinarias.map(m => ({ value: m.id, label: `${m.codigo} — ${m.nombre}` }))

  const itemsValidos = items.filter(i => i.productoId && Number(i.cantidad) > 0)
  const canSave = !!fundoId && !!conductorId && itemsValidos.length > 0 && !saving

  function actualizarItem(key: string, patch: Partial<ItemForm>) {
    setItems(prev => prev.map(i => (i.key === key ? { ...i, ...patch } : i)))
  }

  function agregarItem() {
    setItems(prev => [...prev, nuevoItem()])
  }

  function quitarItem(key: string) {
    setItems(prev => (prev.length > 1 ? prev.filter(i => i.key !== key) : prev))
  }

  async function handleCrearLinea(codigo: string) {
    if (allLineas.some(l => l.codigo === codigo)) return
    const linea: LineaOperacion = { id: crypto.randomUUID(), codigo, nombre: codigo, activo: true }
    setLineasLocales(prev => [...prev, linea])
    await appendToCatalogCache('lineas_operacion', linea)
    await enqueue({ type: 'crear_linea', linea: { codigo, nombre: codigo } })
  }

  async function handleFundoCreado(input: NuevoFundoInput) {
    const id = crypto.randomUUID()
    const fundo: Fundo = { id, nombre: input.nombre, contrato: input.contrato, activo: true }
    setFundosLocales(prev => [...prev, fundo])
    await appendToCatalogCache('fundos', fundo)
    await enqueue({ type: 'crear_fundo', fundo: { id, nombre: input.nombre, contrato: input.contrato } })
    setFundoId(id)
    setCrearFundoQuery(null)
  }

  async function handleProductoCreado(producto: ProductoInsumo) {
    setProductosLocales(prev => [...prev, producto])
    await appendToCatalogCache('productos_insumo', producto)
    if (crearProductoQuery) actualizarItem(crearProductoQuery.itemKey, { productoId: producto.id })
    setCrearProductoQuery(null)
  }

  async function handleSubmit() {
    if (!canSave) return
    setSaving(true)
    await enqueue({
      type: 'guia_despacho_crear',
      guia: {
        fundo_id: fundoId,
        contrato: allFundos.find(f => f.id === fundoId)?.contrato ?? null,
        patente_id: patenteId || null,
        conductor_id: conductorId,
        comentarios: comentarios.trim() || null,
      },
      items: itemsValidos.map(i => ({
        producto_id: i.productoId,
        equipo_id: i.equipoId || null,
        cantidad_planificada: Number(i.cantidad),
      })),
    })
    setSaving(false)
    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 my-8">
        <h2 className="text-lg font-bold text-dark mb-1">Nueva guía de despacho</h2>
        <p className="text-xs text-gray-400 mb-4">
          Se guarda en el celular y se sincroniza automáticamente cuando haya conexión. El folio se asigna al sincronizar.
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fundo</label>
              <SearchSelect
                options={fundoOptions}
                value={fundoId}
                onChange={setFundoId}
                placeholder="Seleccionar fundo..."
                onCreate={q => setCrearFundoQuery(q)}
                createLabel={q => `Crear fundo "${q.trim().toUpperCase()}"`}
              />
            </div>
            <div>
              <label className="label">Conductor</label>
              <SearchSelect options={operadorOptions} value={conductorId} onChange={setConductorId} placeholder="Seleccionar conductor..." />
            </div>
            <div>
              <label className="label">Vehículo (opcional)</label>
              <SearchSelect options={patenteOptions} value={patenteId} onChange={setPatenteId} placeholder="Seleccionar vehículo..." />
            </div>
            <div>
              <label className="label">Comentarios (opcional)</label>
              <input className="input" value={comentarios} onChange={e => setComentarios(e.target.value)} placeholder="Ej: Stock crítico" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Productos a despachar</label>
              <button type="button" onClick={agregarItem} className="text-xs font-semibold text-primary underline">
                + Agregar producto
              </button>
            </div>
            <div className="space-y-3">
              {items.map(item => (
                <div key={item.key} className="grid grid-cols-[1fr_90px_1fr_auto] gap-2 items-start">
                  <SearchSelect
                    options={productoOptions}
                    value={item.productoId}
                    onChange={v => actualizarItem(item.key, { productoId: v })}
                    placeholder="Producto..."
                    onCreate={q => setCrearProductoQuery({ itemKey: item.key, query: q })}
                    createLabel={q => `Crear producto "${q}"`}
                  />
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step="any"
                    value={item.cantidad}
                    onChange={e => actualizarItem(item.key, { cantidad: e.target.value })}
                    placeholder="Cant."
                  />
                  <SearchSelect
                    options={maquinariaOptions}
                    value={item.equipoId}
                    onChange={v => actualizarItem(item.key, { equipoId: v })}
                    placeholder="Equipo (opcional)..."
                  />
                  <button
                    type="button"
                    onClick={() => quitarItem(item.key)}
                    disabled={items.length === 1}
                    className="text-fault text-xs font-medium underline disabled:opacity-30 disabled:cursor-not-allowed h-[48px]"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary btn-sm">
              Cancelar
            </button>
            <button type="button" onClick={() => void handleSubmit()} disabled={!canSave} className="btn-primary btn-sm">
              {saving ? 'Guardando...' : 'Crear guía'}
            </button>
          </div>
        </div>
      </div>

      {crearFundoQuery !== null && (
        <CrearFundoModal
          query={crearFundoQuery}
          lineas={allLineas}
          onClose={() => setCrearFundoQuery(null)}
          onCreated={f => void handleFundoCreado(f)}
          onCrearLinea={c => void handleCrearLinea(c)}
        />
      )}
      {crearProductoQuery !== null && (
        <CrearProductoModal
          query={crearProductoQuery.query}
          onClose={() => setCrearProductoQuery(null)}
          onCreated={p => void handleProductoCreado(p)}
        />
      )}
    </div>
  )
}
