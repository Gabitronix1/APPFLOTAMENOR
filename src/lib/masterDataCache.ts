import { supabase } from './supabase'
import { db } from './db'

export async function fetchTable<T>(table: string, orderBy: string): Promise<T[]> {
  const { data } = await supabase.from(table).select('*').eq('activo', true).order(orderBy, { ascending: true })
  return (data ?? []) as unknown as T[]
}

export async function fetchTiposPreventiva<T>(): Promise<T[]> {
  const { data } = await supabase.from('tipos_preventiva').select('*').order('nombre', { ascending: true })
  return (data ?? []) as unknown as T[]
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
  { name: 'tipos_preventiva', fetch: () => fetchTiposPreventiva() },
  { name: 'maquinarias', fetch: () => fetchTable('maquinarias', 'codigo') },
  { name: 'lineas_operacion', fetch: () => fetchTable('lineas_operacion', 'codigo') },
  { name: 'turnos', fetch: () => fetchTable('turnos', 'nombre') },
  { name: 'actividades_maquinaria', fetch: () => fetchTable('actividades_maquinaria', 'nombre') },
  { name: 'sub_equipos', fetch: () => fetchTable('sub_equipos', 'nombre') },
  { name: 'tipos_preventiva_maquinaria', fetch: () => fetchTable('tipos_preventiva_maquinaria', 'nombre') },
  { name: 'sistemas_correctivo_maquinaria', fetch: () => fetchTable('sistemas_correctivo_maquinaria', 'nombre') },
  { name: 'codigos_falla_maquinaria', fetch: () => fetchTable('codigos_falla_maquinaria', 'nombre') },
  { name: 'tareas_otra_maquinaria', fetch: () => fetchTable('tareas_otra_maquinaria', 'nombre') },
  { name: 'productos_insumo', fetch: () => fetchTable('productos_insumo', 'nombre') },
  { name: 'condiciones_equipo', fetch: () => fetchTable('condiciones_equipo', 'nombre') },
]

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
