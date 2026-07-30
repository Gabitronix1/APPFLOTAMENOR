import { supabase } from './supabase'
import { db } from './db'

// Catálogos con columna `activo` real: operadores, patentes, fundos, maquinarias.
export async function fetchTable<T>(table: string, orderBy: string): Promise<T[]> {
  const { data } = await supabase.from(table).select('*').eq('activo', true).order(orderBy, { ascending: true })
  return (data ?? []) as unknown as T[]
}

// Catálogos "mini" (turnos, líneas, actividades, etc.) — no tienen columna `activo`,
// se ordenan por su columna `orden`.
export async function fetchCatalog<T>(table: string): Promise<T[]> {
  const { data } = await supabase.from(table).select('*').order('orden', { ascending: true })
  return (data ?? []) as unknown as T[]
}

export async function fetchTiposPreventiva<T>(): Promise<T[]> {
  const { data } = await supabase.from('tipos_preventiva').select('*').order('nombre', { ascending: true })
  return (data ?? []) as unknown as T[]
}

interface CodigoFallaRow {
  id: string
  nombre: string
  sistema_id: string | null
  // codigos_falla_maquinaria no tiene columna `activo` real; se deja en true para encajar
  // con el shape que usan los demás catálogos (ver CodigoFallaMaquinaria en types/index.ts).
  activo: true
}

// codigos_falla_maquinaria no tiene columna `nombre` (tiene `codigo` + `descripcion`) —
// se arma un nombre para mostrar en los selects.
export async function fetchCodigosFalla(): Promise<CodigoFallaRow[]> {
  const { data } = await supabase
    .from('codigos_falla_maquinaria')
    .select('id, codigo, descripcion, sistema_id')
    .order('orden', { ascending: true })
  return ((data ?? []) as unknown as { id: string; codigo: string; descripcion: string | null; sistema_id: string | null }[]).map(
    r => ({ id: r.id, sistema_id: r.sistema_id, nombre: r.descripcion ? `${r.codigo} — ${r.descripcion}` : r.codigo, activo: true }),
  )
}

interface CatalogSpec {
  name: string
  fetch: () => Promise<unknown[]>
}

// Todos los catálogos usados por los formularios de Checklist, Intervención (vehículo)
// e Intervención de Maquinaria — se precargan juntos para que cualquiera de esos
// formularios funcione offline sin importar cuál haya visitado el usuario primero.
const ALL_CATALOGS: CatalogSpec[] = [
  { name: 'operadores', fetch: () => fetchTable('operadores', 'apellido') },
  { name: 'patentes', fetch: () => fetchTable('patentes', 'patente') },
  { name: 'fundos', fetch: () => fetchTable('fundos', 'nombre') },
  { name: 'categorias_vehiculo', fetch: () => fetchCatalog('categorias_vehiculo') },
  { name: 'tipos_preventiva', fetch: () => fetchTiposPreventiva() },
  { name: 'maquinarias', fetch: () => fetchTable('maquinarias', 'codigo') },
  { name: 'lineas_operacion', fetch: () => fetchCatalog('lineas_operacion') },
  { name: 'turnos', fetch: () => fetchCatalog('turnos') },
  { name: 'actividades_maquinaria', fetch: () => fetchCatalog('actividades_maquinaria') },
  { name: 'sub_equipos', fetch: () => fetchCatalog('sub_equipos') },
  { name: 'tipos_preventiva_maquinaria', fetch: () => fetchCatalog('tipos_preventiva_maquinaria') },
  { name: 'sistemas_correctivo_maquinaria', fetch: () => fetchCatalog('sistemas_correctivo_maquinaria') },
  { name: 'codigos_falla_maquinaria', fetch: () => fetchCodigosFalla() },
  { name: 'tareas_otra_maquinaria', fetch: () => fetchCatalog('tareas_otra_maquinaria') },
  { name: 'productos_insumo', fetch: () => fetchCatalog('productos_insumo') },
  { name: 'condiciones_equipo', fetch: () => fetchCatalog('condiciones_equipo') },
]

// Guarda de inmediato en IndexedDB una fila creada offline (conductor o vehículo nuevo)
// para que aparezca en los selects de inmediato y sobreviva un reinicio de la app antes
// de que la sincronización real la reemplace por la copia del servidor.
export async function appendToCatalogCache<T extends { id: string }>(name: string, row: T): Promise<void> {
  const existing = await db.catalogCache.get(name)
  const data = ((existing?.data as T[] | undefined) ?? []).filter(r => r.id !== row.id)
  data.push(row)
  await db.catalogCache.put({ name, data, updatedAt: Date.now() })
}

let prefetching = false

export async function prefetchAllCatalogs(): Promise<void> {
  if (prefetching || !navigator.onLine) return
  prefetching = true
  try {
    await Promise.all(
      ALL_CATALOGS.map(async catalog => {
        try {
          const data = await catalog.fetch()
          await db.catalogCache.put({ name: catalog.name, data, updatedAt: Date.now() })
        } catch {
          // Best-effort: si falla uno, se deja el cache previo (si existe) sin tocar.
        }
      }),
    )
  } finally {
    prefetching = false
  }
}
