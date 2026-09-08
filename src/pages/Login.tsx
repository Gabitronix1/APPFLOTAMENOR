import { useState, FormEvent, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getDefaultRoute, ROLES_AUTOSERVICIO, ROL_LABELS } from '../lib/roles'
import type { Rol } from '../types'

type Modo = 'login' | 'recuperar' | 'registro'

export function Login() {
  const { session, perfil, loading } = useAuth()
  const navigate = useNavigate()
  const [modo, setModo] = useState<Modo>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [recuperarEnviado, setRecuperarEnviado] = useState(false)

  // Registro
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [rut, setRut] = useState('')
  const [rolSolicitado, setRolSolicitado] = useState<Rol>('conductor_logistico')

  useEffect(() => {
    if (!loading && session) {
      navigate(getDefaultRoute(perfil?.rol), { replace: true })
    }
  }, [session, perfil, loading, navigate])

  function cambiarModo(nuevo: Modo) {
    setModo(nuevo)
    setError(null)
    setRecuperarEnviado(false)
  }

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

  async function handleRegistro(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { data, error: fnError } = await supabase.functions.invoke('solicitar-acceso', {
      body: {
        email: email.trim(),
        password,
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        rut: rut.trim(),
        rol_solicitado: rolSolicitado,
      },
    })

    const apiError = (data as { error?: string } | null)?.error
    if (fnError || apiError) {
      setSubmitting(false)
      setError(apiError || fnError?.message || 'No se pudo crear la cuenta.')
      return
    }

    // Cuenta creada: entra directo. Sin rol asignado aún puede usar el Checklist mientras
    // un jefe aprueba su rol final en Maestros > Usuarios.
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setSubmitting(false)
    if (authError) {
      setError('Cuenta creada, pero no se pudo iniciar sesión automáticamente. Intenta ingresar manualmente.')
      cambiarModo('login')
    }
  }

  return (
    <div className="min-h-screen bg-dark flex flex-col items-center justify-center px-4 py-10">
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
          {modo === 'recuperar' && (
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
                onClick={() => cambiarModo('login')}
                className="w-full text-center text-xs text-gray-400 hover:text-white mt-4 underline"
              >
                Volver a iniciar sesión
              </button>
            </>
          )}

          {modo === 'registro' && (
            <>
              <h2 className="text-white font-semibold text-lg mb-1">Crear cuenta</h2>
              <p className="text-gray-400 text-sm mb-6">
                Para personal nuevo de terreno (conductores y mecánicos).
              </p>
              <form onSubmit={(e) => void handleRegistro(e)} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="nombre" className="block text-sm font-medium text-gray-300 mb-1">Nombre</label>
                    <input
                      id="nombre"
                      required
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="apellido" className="block text-sm font-medium text-gray-300 mb-1">Apellido</label>
                    <input
                      id="apellido"
                      required
                      value={apellido}
                      onChange={(e) => setApellido(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="rut" className="block text-sm font-medium text-gray-300 mb-1">RUT</label>
                  <input
                    id="rut"
                    required
                    value={rut}
                    onChange={(e) => setRut(e.target.value)}
                    placeholder="12.345.678-9"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="rol" className="block text-sm font-medium text-gray-300 mb-1">Tu función</label>
                  <select
                    id="rol"
                    value={rolSolicitado}
                    onChange={(e) => setRolSolicitado(e.target.value as Rol)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent [&>option]:text-dark"
                  >
                    {ROLES_AUTOSERVICIO.map((r) => (
                      <option key={r} value={r}>{ROL_LABELS[r]}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Un jefe confirma tu rol final al aprobar la cuenta.</p>
                </div>

                <div>
                  <label htmlFor="email-registro" className="block text-sm font-medium text-gray-300 mb-1">Correo electrónico</label>
                  <input
                    id="email-registro"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@empresa.cl"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="password-registro" className="block text-sm font-medium text-gray-300 mb-1">Contraseña</label>
                  <input
                    id="password-registro"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
                  {submitting ? 'Creando cuenta...' : 'Crear cuenta'}
                </button>
              </form>
              <button
                type="button"
                onClick={() => cambiarModo('login')}
                className="w-full text-center text-xs text-gray-400 hover:text-white mt-4 underline"
              >
                Volver a iniciar sesión
              </button>
            </>
          )}

          {modo === 'login' && (
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

              <div className="flex items-center justify-between mt-4">
                <button
                  type="button"
                  onClick={() => cambiarModo('registro')}
                  className="text-xs text-gray-400 hover:text-white underline"
                >
                  Crear cuenta
                </button>
                <button
                  type="button"
                  onClick={() => cambiarModo('recuperar')}
                  className="text-xs text-gray-400 hover:text-white underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
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
