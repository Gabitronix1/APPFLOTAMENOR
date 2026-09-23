import { createClient, type Session } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Misma clave que usa supabase-js por defecto (`sb-<ref>-auth-token`): no se cambia para no
// cerrar la sesión de quienes ya están logueados.
export const AUTH_STORAGE_KEY = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`

export interface StoredSession {
  access_token: string
  refresh_token: string
  expires_at?: number
  user: Session['user']
}

// Sesión tal como quedó guardada en el celular, aunque el token de acceso esté vencido.
// supabase-js solo la borra cuando el servidor rechaza de verdad el refresh token (cuenta
// eliminada, sesión revocada); un fallo de red la deja intacta. Por eso, si está aquí, la
// persona sigue siendo válida y se le puede dejar trabajar sin señal.
export function readStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredSession>
    if (!parsed.access_token || !parsed.refresh_token || !parsed.user?.id) return null
    return parsed as StoredSession
  } catch {
    return null
  }
}

export function clearStoredSession() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    localStorage.removeItem(`${AUTH_STORAGE_KEY}-code-verifier`)
  } catch {
    // Sin acceso a localStorage no hay nada que borrar.
  }
}

// En una PWA de celular el navegador pausa los timers internos del SDK cuando la app
// queda en segundo plano (pantalla bloqueada, días sin abrirla). Al volver a primer
// plano forzamos que reprograme el refresh del token para que la sesión no quede
// vencida sin que nadie se entere; al pasar a segundo plano lo detenemos para no
// gastar batería en vano.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void supabase.auth.startAutoRefresh()
    } else {
      void supabase.auth.stopAutoRefresh()
    }
  })
}
