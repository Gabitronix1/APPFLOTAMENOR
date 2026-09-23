import { supabase } from './supabase'

// Funciones (cargos) que el personal elige al crear su cuenta, además de las funciones base
// (que son roles con permisos). Las que alguien agrega con "+" se guardan en el servidor al
// crearse su cuenta (tabla funciones_personal) y desde ahí les aparecen a todos.
// Se guarda una copia en el celular para poder registrarse sin señal.

const KEY_SERVIDOR = 'flota_funciones'
const KEY_LOCALES = 'flota_funciones_locales'

function leer(key: string): string[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function escribir(key: string, valor: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(valor))
  } catch {
    // best-effort
  }
}

export function normalizarFuncion(nombre: string): string {
  const limpio = nombre.trim().replace(/\s+/g, ' ').slice(0, 60)
  return limpio.charAt(0).toUpperCase() + limpio.slice(1)
}

function unicas(lista: string[]): string[] {
  const vistas = new Set<string>()
  return lista.filter(n => {
    const k = n.toLowerCase()
    if (vistas.has(k)) return false
    vistas.add(k)
    return true
  })
}

/** Funciones conocidas en este celular (del servidor + agregadas aquí), ordenadas. */
export function funcionesGuardadas(): string[] {
  return unicas([...leer(KEY_SERVIDOR), ...leer(KEY_LOCALES)]).sort((a, b) => a.localeCompare(b, 'es'))
}

/** Descarga las funciones del servidor (con señal) y las guarda en el celular. */
export async function descargarFunciones(): Promise<string[]> {
  if (navigator.onLine) {
    const { data, error } = await supabase.from('funciones_personal').select('nombre').order('nombre')
    if (!error && data) {
      const servidor = (data as { nombre: string }[]).map(f => f.nombre)
      escribir(KEY_SERVIDOR, servidor)
      // Las agregadas en este celular que ya llegaron al servidor dejan de ser "locales".
      const enServidor = new Set(servidor.map(n => n.toLowerCase()))
      escribir(KEY_LOCALES, leer(KEY_LOCALES).filter(n => !enServidor.has(n.toLowerCase())))
    }
  }
  return funcionesGuardadas()
}

/** Agrega una función en este celular (se publica para todos al crear la cuenta). */
export function agregarFuncionLocal(nombre: string): string {
  const limpio = normalizarFuncion(nombre)
  escribir(KEY_LOCALES, unicas([...leer(KEY_LOCALES), limpio]))
  return limpio
}
