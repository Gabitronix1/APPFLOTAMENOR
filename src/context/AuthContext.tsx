import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { db } from '../lib/db'
import { prefetchAllCatalogs } from '../lib/masterDataCache'
import type { Perfil } from '../types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  perfil: Perfil | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchPerfil(userId: string) {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('id, rol')
        .eq('id', userId)
        .single()
      if (error || !data) throw error ?? new Error('Perfil no encontrado')
      setPerfil(data)
      await db.perfilCache.put({ userId, rol: data.rol })
      // Precarga todos los catálogos maestros (no solo los de la página actual) para que
      // cualquier formulario funcione offline sin depender de qué página se visitó primero.
      void prefetchAllCatalogs()
    } catch {
      // Sin conexión (o falla de red) al arrancar: usar la última copia local del perfil
      const cached = await db.perfilCache.get(userId)
      setPerfil(cached ? { id: userId, rol: cached.rol as Perfil['rol'] } : null)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session?.user) {
        fetchPerfil(data.session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) {
        setLoading(true)
        fetchPerfil(newSession.user.id).finally(() => setLoading(false))
      } else {
        setPerfil(null)
      }
    })

    // Si la sesión se abrió sin conexión (perfil vino del cache), reintenta precargar los
    // catálogos apenas vuelva la señal, sin esperar a la próxima vez que se loguee.
    const handleOnline = () => void prefetchAllCatalogs()
    window.addEventListener('online', handleOnline)

    return () => {
      listener.subscription.unsubscribe()
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, perfil, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
