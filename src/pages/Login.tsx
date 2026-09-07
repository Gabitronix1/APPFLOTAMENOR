import { useState, FormEvent, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getDefaultRoute } from '../lib/roles'

export function Login() {
  const { session, perfil, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [modoRecuperar, setModoRecuperar] = useState(false)
  const [recuperarEnviado, setRecuperarEnviado] = useState(false)

  useEffect(() => {
    if (!loading && session) {
      navigate(getDefaultRoute(perfil?.rol), { replace: true })
    }
  }, [session, perfil, loading, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (authError) {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.')
    }
  }

  async function handleRecuperar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    setSubmitting(false)
    // No revelamos si el correo existe o no (evita enumerar usuarios): siempre mostramos éxito.
    if (authError && authError.status && authError.status >= 500) {
      setError('No se pudo enviar el correo. Intenta nuevamente en unos minutos.')
      return
    }
    setRecuperarEnviado(true)
  }

  return (
    <div className="min-h-screen bg-dark flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-white rounded-2xl px-6 py-4 shadow-lg">
            <img src="/DI1color.png" alt="Doña Isidora" className="h-12 w-auto" />
          </div>
          <p className="text-gray-400 text-sm mt-4">Sistema de Flota Menor</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          {modoRecuperar ? (
            <>
              <h2 className="text-white font-semibold text-lg mb-2">Recuperar contraseña</h2>
              {recuperarEnviado ? (
                <p className="text-gray-300 text-sm">
                  Si el correo <span className="font-medium">{email}</span> tiene una cuenta, te enviamos un enlace para definir tu contraseña. Revisa tu bandeja de entrada (y spam).
                </p>
              ) : (
                <>
                  <p className="text-gray-400 text-sm mb-6">Ingresa tu correo y te enviaremos un enlace para definir una contraseña nueva.</p>
                  <form onSubmit={(e) => void handleRecuperar(e)} className="space-y-4">
                    <div>
                      <label htmlFor="email-recuperar" className="block text-sm font-medium text-gray-300 mb-1">
                        Correo electrónico
                      </label>
                      <input
                        id="email-recuperar"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="usuario@empresa.cl"
                      />
                    </div>

                    {error && (
                      <p className="text-fault text-sm bg-fault/10 border border-fault/30 rounded-lg px-3 py-2">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm mt-2"
                    >
                      {submitting ? 'Enviando...' : 'Enviar enlace'}
                    </button>
                  </form>
                </>
              )}
              <button
                type="button"
                onClick={() => { setModoRecuperar(false); setRecuperarEnviado(false); setError(null) }}
                className="w-full text-center text-xs text-gray-400 hover:text-white mt-4 underline"
              >
                Volver a iniciar sesión
              </button>
            </>
          ) : (
            <>
              <h2 className="text-white font-semibold text-lg mb-6">Iniciar sesión</h2>

              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                    Correo electrónico
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="usuario@empresa.cl"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                    Contraseña
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <p className="text-fault text-sm bg-fault/10 border border-fault/30 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm mt-2"
                >
                  {submitting ? 'Ingresando...' : 'Ingresar'}
                </button>
              </form>

              <button
                type="button"
                onClick={() => { setModoRecuperar(true); setError(null) }}
                className="w-full text-center text-xs text-gray-400 hover:text-white mt-4 underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </>
          )}
        </div>

        <p className="text-gray-600 text-xs text-center mt-6">
          © {new Date().getFullYear()} Doña Isidora — Uso interno
        </p>
      </div>
    </div>
  )
}
