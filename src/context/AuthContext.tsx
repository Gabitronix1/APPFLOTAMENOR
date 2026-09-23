import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, readStoredSession, clearStoredSession } from '../lib/supabase'
import { db } from '../lib/db'
import { prefetchAllCatalogs } from '../lib/masterDataCache'
import { flushEvents, logEvent, setEventContext } from '../lib/deviceEvents'
import type { Perfil } from '../types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  perfil: Perfil | null
  loading: boolean
  /** true mientras se trabaja con la sesión guardada en el celular sin haberla validado aún con el servidor. */
  sesionSinValidar: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const ULTIMA_VALIDACION_KEY = 'flota_ultima_validacion'

/** Última vez que el servidor confirmó la sesión de este celular (ISO), o null si nunca. */
export function getUltimaValidacion(): string | null {
  try {
    return localStorage.getItem(ULTIMA_VALIDACION_KEY)
  } catch {
    return null
  }
}

function marcarValidada() {
  try {
    localStorage.setItem(ULTIMA_VALIDACION_KEY, new Date().toISOString())
  } catch {
    // best-effort
  }
}

function pedirAlmacenamientoPersistente() {
  // Evita que Android/iOS borren la cola offline y los catálogos cuando falta espacio.
  void navigator.storage?.persist?.().catch(() => undefined)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)
  const [sesionSinValidar, setSesionSinValidar] = useState(false)
  const perfilUserId = useRef<string | null>(null)

  // Perfil: primero la copia local (instantáneo, funciona sin señal) y después el servidor
  // si hay conexión, para tomar cambios de rol hechos por un jefe.
  async function cargarPerfil(userId: string) {
    perfilUserId.current = userId
    const cached = await db.perfilCache.get(userId).catch(() => undefined)
    if (perfilUserId.current !== userId) return
    if (cached) {
      setPerfil({ id: userId, rol: cached.rol as Perfil['rol'], operador_id: cached.operadorId })
      setLoading(false)
    } else if (!navigator.onLine) {
      // Sin copia local ni señal: entra igual (el Checklist no requiere rol); el perfil se
      // completa al volver la señal.
      setPerfil(null)
      setLoading(false)
    }

    if (navigator.onLine) {
      try {
        const { data, error } = await supabase.from('perfiles').select('id, rol, operador_id').eq('id', userId).single()
        if (perfilUserId.current !== userId) return
        if (!error && data) {
          setPerfil(data)
          await db.perfilCache.put({ userId, rol: data.rol, operadorId: data.operador_id })
        } else if (!cached) {
          // Cuenta autoregistrada aún sin rol aprobado.
          setPerfil(null)
        }
      } catch {
        // Falla de red: se queda con la copia local.
      }
    }
    if (perfilUserId.current === userId) setLoading(false)

    // Precarga todos los catálogos maestros (no solo los de la página actual) para que
    // cualquier formulario funcione offline sin depender de qué página se visitó primero.
    // Se hace pase lo que pase con el perfil: el Checklist es de acceso abierto a cualquier
    // usuario logueado, incluida una cuenta autoregistrada aún sin rol/aprobación.
    void prefetchAllCatalogs()
  }

  function aplicarSesion(nueva: Session | null) {
    setSession(nueva)
    if (!nueva) {
      perfilUserId.current = null
      setPerfil(null)
      setSesionSinValidar(false)
      setLoading(false)
      return
    }
    pedirAlmacenamientoPersistente()
    if (perfilUserId.current !== nueva.user.id) void cargarPerfil(nueva.user.id)
  }

  useEffect(() => {
    // 1) Arranque inmediato con la sesión guardada en el celular. Así nadie queda en el
    //    Login por no tener señal: supabase-js, sin red, no logra renovar un token vencido y
    //    responde "sin sesión" aunque la sesión sigue vigente (el refresh token no vence).
    const guardada = readStoredSession()
    if (guardada) {
      aplicarSesion(guardada as unknown as Session)
      setSesionSinValidar(true)
    }
    void logEvent('app_abierta', { con_senal: navigator.onLine, sesion_guardada: !!guardada })

    // 2) Validación con el servidor (si hay señal renueva el token; si no, falla por red y
    //    se sigue trabajando con la sesión guardada).
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        aplicarSesion(data.session)
        setSesionSinValidar(false)
        if (navigator.onLine) marcarValidada()
      } else if (!readStoredSession()) {
        aplicarSesion(null)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, nueva) => {
      if (nueva) {
        aplicarSesion(nueva)
        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          setSesionSinValidar(false)
          marcarValidada()
        }
        return
      }
      // Solo un cierre real (logout o sesión revocada por el servidor) saca a la persona.
      // Un "sin sesión" inicial por falta de red no, mientras la sesión siga guardada.
      if (event === 'SIGNED_OUT' || !readStoredSession()) aplicarSesion(null)
    })

    // Al volver la señal: validar la sesión guardada, refrescar perfil y catálogos.
    const handleOnline = () => {
      void supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          setSesionSinValidar(false)
          marcarValidada()
          void cargarPerfil(data.session.user.id)
        }
      })
    }
    window.addEventListener('online', handleOnline)

    return () => {
      listener.subscription.unsubscribe()
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  useEffect(() => {
    setEventContext(session?.user.id ?? null, perfil?.operador_id ?? null)
  }, [session, perfil])

  async function signOut() {
    const pendientes = await db.syncQueue.count().catch(() => 0)
    await logEvent('logout', { con_senal: navigator.onLine, pendientes })

    // Sin señal supabase-js no borra la sesión: primero intenta renovar el token y avisar al
    // servidor, reintentando hasta ~30 s, y al fallar la deja intacta. Por eso, sin señal
    // (o si el servidor no responde a tiempo) se borra a mano y se recarga para que el
    // cliente arranque limpio.
    const cerrarLocal = () => {
      clearStoredSession()
      aplicarSesion(null)
      window.location.replace('/login')
    }
    if (!navigator.onLine) {
      cerrarLocal()
      return
    }
    await Promise.race([flushEvents(), new Promise(r => setTimeout(r, 3000))])
    const resultado = await Promise.race([
      // scope 'local': cierra solo este celular (no las otras sesiones de la persona).
      supabase.auth.signOut({ scope: 'local' }),
      new Promise<{ error: Error }>(r => setTimeout(() => r({ error: new Error('timeout') }), 5000)),
    ])
    if (resultado.error) cerrarLocal()
  }

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, perfil, loading, sesionSinValidar, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
