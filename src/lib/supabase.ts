import { createClient } from '@supabase/supabase-js'

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
