import { useState, FormEvent, useEffect, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { logEvent } from '../lib/deviceEvents'
import { getDefaultRoute, ROLES_AUTOSERVICIO, ROL_LABELS } from '../lib/roles'
import { emailDeRut, formatearRut, rutValido } from '../lib/rut'
import {
  crearCuenta,
  descargarCatalogosPublicos,
  registrarSinSenal,
  tomarErrorRegistro,
} from '../lib/registroOffline'
import { useOnline } from '../hooks/useOnline'
import { agregarFuncionLocal, descargarFunciones, funcionesGuardadas, normalizarFuncion } from '../lib/funcionesPersonal'
import type { Rol } from '../types'
import { Logo } from '../components/Logo'

// Ingreso principal: RUT + clave (personal de terreno, sin correo). Las jefaturas pueden
// seguir entrando con su usuario @isidorachile.cl, y quien tenga correo de la empresa puede
// crear su cuenta con él (formulario aparte, RUT opcional).
type Modo = 'rut' | 'usuario' | 'recuperar' | 'registro' | 'registro-correo'

const DOMINIO = '@isidorachile.cl'

function emailCompleto(usuario: string): string {
  const limpio = usuario.trim().toLowerCase()
  return limpio.includes('@') ? limpio : `${limpio}${DOMINIO}`
}

const inputClass =
  'w-full bg-white/10 border border-white/20 rounded-lg px-3 py-3 text-white placeholder-gray-500 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'

function Campo({ id, label, ayuda, children }: { id: string; label: string; ayuda?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
        {label}
      </label>
      {children}
      {ayuda && <p className="text-xs text-gray-500 mt-1">{ayuda}</p>}
    </div>
  )
}

function RutInput({
  id,
  value,
  onChange,
  autoFocus,
  opcional,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
  opcional?: boolean
}) {
  return (
    <input
      id={id}
      type="text"
      required={!opcional}
      autoFocus={autoFocus}
      autoComplete={opcional ? 'off' : 'username'}
      autoCapitalize="characters"
      autoCorrect="off"
      spellCheck={false}
      value={value}
      onChange={e => onChange(formatearRut(e.target.value))}
      className={`${inputClass} font-mono tracking-wide`}
      placeholder="12.345.678-9"
    />
  )
}

function UsuarioInput({ id, value, onChange, autoFocus }: { id: string; value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <div className="flex rounded-lg border border-white/20 overflow-hidden focus-within:ring-2 focus-within:ring-primary">
      <input
        id={id}
        type="text"
        required
        autoFocus={autoFocus}
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="min-w-0 flex-1 bg-white/10 px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none"
        placeholder="inicial.apellido"
      />
      <span className="flex items-center px-3 bg-white/5 text-gray-400 text-sm border-l border-white/20 whitespace-nowrap">
        {DOMINIO}
      </span>
    </div>
  )
}

function ClaveInput({
  id,
  value,
  onChange,
  nueva,
  placeholder,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  nueva?: boolean
  placeholder?: string
}) {
  const [ver, setVer] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        type={ver ? 'text' : 'password'}
        required
        minLength={nueva ? 6 : undefined}
        autoComplete={nueva ? 'new-password' : 'current-password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`${inputClass} pr-16`}
        placeholder={placeholder ?? '••••••'}
      />
      <button
        type="button"
        onClick={() => setVer(v => !v)}
        className="absolute inset-y-0 right-0 px-3 text-xs text-gray-400 hover:text-white"
      >
        {ver ? 'Ocultar' : 'Ver'}
      </button>
    </div>
  )
}

function Aviso({ tipo, children }: { tipo: 'error' | 'info'; children: ReactNode }) {
  return (
    <p
      className={`text-sm rounded-lg px-3 py-2 border ${
        tipo === 'error' ? 'text-fault bg-fault/10 border-fault/30' : 'text-gray-200 bg-white/5 border-white/15'
      }`}
    >
      {children}
    </p>
  )
}

const botonPrincipal =
  'w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors text-base mt-2'
const enlace = 'text-sm text-gray-400 hover:text-white underline'
const botonSecundario =
  'w-full mt-4 border border-white/25 text-white font-semibold py-3 rounded-lg hover:bg-white/5 transition-colors'

export function Login() {
  const { session, perfil, loading, provisional } = useAuth()
  const navigate = useNavigate()
  const online = useOnline()
  const [modo, setModo] = useState<Modo>('rut')
  const [rut, setRut] = useState('')
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState<string | null>(() => tomarErrorRegistro())
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [recuperarEnviado, setRecuperarEnviado] = useState(false)

  // Registro
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  // Función elegida: "rol:<rol>" para las funciones base (dan permisos), "f:<nombre>" para
  // las agregadas con "+" (el jefe asigna los permisos al aprobar).
  const [funcionSel, setFuncionSel] = useState('rol:conductor_logistico')
  const [funcionesExtra, setFuncionesExtra] = useState<string[]>(() => funcionesGuardadas())
  const [agregandoFuncion, setAgregandoFuncion] = useState(false)
  const [nuevaFuncion, setNuevaFuncion] = useState('')

  useEffect(() => {
    if (!loading && session) navigate(getDefaultRoute(perfil?.rol), { replace: true })
    else if (provisional) navigate('/checklist', { replace: true })
  }, [session, perfil, loading, provisional, navigate])

  // Con señal, deja listos en el celular los catálogos del Checklist (patentes, líneas)
  // para que un registro posterior sin señal pueda trabajar.
  useEffect(() => {
    if (online) {
      void descargarCatalogosPublicos()
      void descargarFunciones().then(setFuncionesExtra)
    }
  }, [online])

  const nombresBase = ROLES_AUTOSERVICIO.map(r => ROL_LABELS[r].toLowerCase())

  function confirmarNuevaFuncion() {
    const nombre = normalizarFuncion(nuevaFuncion)
    if (nombre.length < 2) return
    // Si coincide con una función base, se elige esa (así mantiene sus permisos).
    const base = ROLES_AUTOSERVICIO.find(r => ROL_LABELS[r].toLowerCase() === nombre.toLowerCase())
    if (base) {
      setFuncionSel(`rol:${base}`)
    } else {
      const existente = funcionesExtra.find(f => f.toLowerCase() === nombre.toLowerCase())
      const final = existente ?? agregarFuncionLocal(nombre)
      if (!existente) setFuncionesExtra(funcionesGuardadas())
      setFuncionSel(`f:${final}`)
    }
    setNuevaFuncion('')
    setAgregandoFuncion(false)
  }

  function cambiarModo(nuevo: Modo) {
    setModo(nuevo)
    setError(null)
    setInfo(null)
    setRecuperarEnviado(false)
    setPassword('')
    setPassword2('')
  }

  async function entrar(email: string, clave: string, metodo: 'rut' | 'usuario'): Promise<boolean> {
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password: clave })
    if (authError) {
      setError(
        isAuthRetryableFetchError(authError)
          ? 'No hay conexión con el servidor. Intenta donde tengas señal.'
          : metodo === 'usuario'
            ? 'Usuario o contraseña incorrectos.'
            : 'RUT o clave incorrectos. Consulta a Control de Gestión en caso de pérdida de clave.',
      )
      return false
    }
    void logEvent('login', { con_senal: true, metodo })
    return true
  }

  async function handleLoginRut(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!rutValido(rut)) {
      setError('El RUT no es válido. Revisa el número y el dígito verificador.')
      return
    }
    if (!navigator.onLine) {
      setError(
        'Sin señal. La primera vez en este celular hay que entrar con señal. Si eres nuevo, toca "Crear cuenta": se puede hacer sin señal.',
      )
      return
    }
    setSubmitting(true)
    await entrar(emailDeRut(rut), password, 'rut')
    setSubmitting(false)
  }

  async function handleLoginUsuario(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!navigator.onLine) {
      setError('Sin señal. La primera vez en este celular hay que entrar con señal.')
      return
    }
    setSubmitting(true)
    await entrar(emailCompleto(usuario), password, 'usuario')
    setSubmitting(false)
  }

  async function handleRecuperar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: authError } = await supabase.auth.resetPasswordForEmail(emailCompleto(usuario), {
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
    if (!nombre.trim() || !apellido.trim()) {
      setError('Escribe tu nombre y apellido.')
      return
    }
    if (!rutValido(rut)) {
      setError('El RUT no es válido. Revisa el número y el dígito verificador.')
      return
    }
    if (password.length < 6) {
      setError('La clave debe tener al menos 6 caracteres (pueden ser solo números).')
      return
    }
    if (password !== password2) {
      setError('Las dos claves no coinciden.')
      return
    }
    setSubmitting(true)
    const datos = {
      rut,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      rolSolicitado: funcionSel.startsWith('rol:') ? (funcionSel.slice(4) as Rol) : null,
      funcion: funcionSel.startsWith('f:') ? funcionSel.slice(2) : undefined,
      password,
    }

    if (navigator.onLine) {
      const resultado = await crearCuenta(datos)
      if (resultado.ok) {
        const ok = await entrar(emailDeRut(rut), password, 'rut')
        setSubmitting(false)
        if (!ok) cambiarModo('rut')
        return
      }
      if (resultado.code === 'ya_registrado') {
        setSubmitting(false)
        cambiarModo('rut')
        setInfo('Ese RUT ya tiene una cuenta. Ingresa con tu RUT y tu clave.')
        return
      }
      if (!resultado.sinConexion) {
        setSubmitting(false)
        setError(resultado.error)
        return
      }
      // Hay "señal" pero el servidor no responde: se sigue como registro sin señal.
    }

    await registrarSinSenal(datos)
    setSubmitting(false)
    // El AuthContext detecta el registro pendiente y el efecto de arriba lleva al Checklist.
  }

  // Cuenta con correo de la empresa: requiere señal (el registro sin señal es solo por RUT).
  async function handleRegistroCorreo(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!nombre.trim() || !apellido.trim()) {
      setError('Escribe tu nombre y apellido.')
      return
    }
    const email = emailCompleto(usuario)
    if (!email.endsWith(DOMINIO)) {
      setError(`El correo debe ser de la empresa (${DOMINIO}).`)
      return
    }
    if (rut && !rutValido(rut)) {
      setError('El RUT no es válido. Revisa el número y el dígito verificador, o déjalo en blanco.')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== password2) {
      setError('Las dos contraseñas no coinciden.')
      return
    }
    if (!navigator.onLine) {
      setError('Sin señal. Para crear la cuenta con correo necesitas señal. Sin señal puedes crearla con tu RUT.')
      return
    }
    setSubmitting(true)
    const resultado = await crearCuenta({
      email,
      rut,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      rolSolicitado: funcionSel.startsWith('rol:') ? (funcionSel.slice(4) as Rol) : null,
      funcion: funcionSel.startsWith('f:') ? funcionSel.slice(2) : undefined,
      password,
    })
    if (resultado.ok) {
      const ok = await entrar(email, password, 'usuario')
      setSubmitting(false)
      if (!ok) cambiarModo('usuario')
      return
    }
    setSubmitting(false)
    if (resultado.code === 'ya_registrado') {
      cambiarModo('usuario')
      setInfo('Ese correo ya tiene una cuenta. Ingresa con tu usuario y contraseña.')
      return
    }
    setError(resultado.sinConexion ? 'No hay conexión con el servidor. Intenta donde tengas señal.' : resultado.error)
  }

  const camposNombre = (
    <div className="grid grid-cols-2 gap-3">
      <Campo id="nombre" label="Nombre">
        <input
          id="nombre"
          required
          autoComplete="given-name"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          className={inputClass}
        />
      </Campo>
      <Campo id="apellido" label="Apellido">
        <input
          id="apellido"
          required
          autoComplete="family-name"
          value={apellido}
          onChange={e => setApellido(e.target.value)}
          className={inputClass}
        />
      </Campo>
    </div>
  )

  const campoFuncion = (
    <Campo id="rol" label="Tu función" ayuda="¿No está la tuya? Toca + para agregarla. Tu cuenta queda activa al tiro con los permisos de tu función.">
      <div className="flex gap-2">
        <select
          id="rol"
          value={funcionSel}
          onChange={e => setFuncionSel(e.target.value)}
          className={`${inputClass} min-w-0 flex-1 [&>option]:text-dark`}
        >
          {ROLES_AUTOSERVICIO.map(r => (
            <option key={r} value={`rol:${r}`}>
              {ROL_LABELS[r]}
            </option>
          ))}
          {funcionesExtra
            .filter(f => !nombresBase.includes(f.toLowerCase()))
            .map(f => (
              <option key={f} value={`f:${f}`}>
                {f}
              </option>
            ))}
        </select>
        <button
          type="button"
          onClick={() => setAgregandoFuncion(v => !v)}
          aria-label="Agregar otra función"
          title="Agregar otra función"
          className="shrink-0 w-12 rounded-lg border border-white/25 text-white text-2xl leading-none hover:bg-white/10"
        >
          {agregandoFuncion ? '×' : '+'}
        </button>
      </div>
      {agregandoFuncion && (
        <div className="flex gap-2 mt-2">
          <input
            autoFocus
            value={nuevaFuncion}
            onChange={e => setNuevaFuncion(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                confirmarNuevaFuncion()
              }
            }}
            maxLength={60}
            placeholder="Ej: Operador de grúa"
            className={`${inputClass} min-w-0 flex-1`}
          />
          <button
            type="button"
            onClick={confirmarNuevaFuncion}
            disabled={normalizarFuncion(nuevaFuncion).length < 2}
            className="shrink-0 px-4 rounded-lg bg-primary text-white font-semibold disabled:opacity-50"
          >
            Agregar
          </button>
        </div>
      )}
    </Campo>
  )

  return (
    <div className="min-h-screen bg-dark flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Logo variante="negativo" className="h-16 sm:h-20" />
          <p className="text-lime text-sm font-medium tracking-wide mt-4">Sistema de Flota Menor</p>
          {!online && (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-warn/20 px-3 py-1 text-xs font-medium text-warn">
              <span className="w-1.5 h-1.5 rounded-full bg-warn" />
              Sin señal
            </span>
          )}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
          {modo === 'rut' && (
            <>
              <h2 className="text-white font-semibold text-lg mb-6">Ingresar</h2>
              <form onSubmit={e => void handleLoginRut(e)} className="space-y-4">
                <Campo id="rut" label="RUT">
                  <RutInput id="rut" value={rut} onChange={setRut} autoFocus />
                </Campo>
                <Campo id="clave" label="Clave">
                  <ClaveInput id="clave" value={password} onChange={setPassword} />
                </Campo>
                {info && <Aviso tipo="info">{info}</Aviso>}
                {error && <Aviso tipo="error">{error}</Aviso>}
                <button type="submit" disabled={submitting} className={botonPrincipal}>
                  {submitting ? 'Ingresando...' : 'Ingresar'}
                </button>
              </form>

              <button type="button" onClick={() => cambiarModo('registro')} className={botonSecundario}>
                Crear cuenta nueva
              </button>
              <div className="text-center mt-3">
                <button type="button" onClick={() => cambiarModo('registro-correo')} className={enlace}>
                  Crear cuenta con correo {DOMINIO}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-4 text-center">
                Consultar a Control de Gestión en caso de pérdida de clave.
              </p>
              <div className="text-center mt-3">
                <button type="button" onClick={() => cambiarModo('usuario')} className={enlace}>
                  Ingresar con usuario
                </button>
              </div>
            </>
          )}

          {modo === 'usuario' && (
            <>
              <h2 className="text-white font-semibold text-lg mb-6">Ingresar con usuario</h2>
              <form onSubmit={e => void handleLoginUsuario(e)} className="space-y-4">
                <Campo id="email" label="Usuario">
                  <UsuarioInput id="email" value={usuario} onChange={setUsuario} autoFocus />
                </Campo>
                <Campo id="password" label="Contraseña">
                  <ClaveInput id="password" value={password} onChange={setPassword} />
                </Campo>
                {info && <Aviso tipo="info">{info}</Aviso>}
                {error && <Aviso tipo="error">{error}</Aviso>}
                <button type="submit" disabled={submitting} className={botonPrincipal}>
                  {submitting ? 'Ingresando...' : 'Ingresar'}
                </button>
              </form>
              <button type="button" onClick={() => cambiarModo('registro-correo')} className={botonSecundario}>
                Crear cuenta con correo
              </button>
              <div className="text-center mt-3">
                <button type="button" onClick={() => cambiarModo('registro')} className={enlace}>
                  Crear cuenta con RUT (sin correo)
                </button>
              </div>
              <div className="flex items-center justify-between mt-4">
                <button type="button" onClick={() => cambiarModo('rut')} className={enlace}>
                  Ingresar con RUT
                </button>
                <button type="button" onClick={() => cambiarModo('recuperar')} className={enlace}>
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </>
          )}

          {modo === 'recuperar' && (
            <>
              <h2 className="text-white font-semibold text-lg mb-2">Recuperar contraseña</h2>
              {recuperarEnviado ? (
                <p className="text-gray-300 text-sm">
                  Si el usuario <span className="font-medium">{emailCompleto(usuario)}</span> tiene una cuenta, te
                  enviamos un enlace para definir tu contraseña. Revisa tu bandeja de entrada (y spam).
                </p>
              ) : (
                <>
                  <p className="text-gray-400 text-sm mb-6">
                    Para cuentas con usuario y correo. Si ingresas con RUT, consulta a Control de Gestión en caso de pérdida de clave.
                  </p>
                  <form onSubmit={e => void handleRecuperar(e)} className="space-y-4">
                    <Campo id="email-recuperar" label="Usuario">
                      <UsuarioInput id="email-recuperar" value={usuario} onChange={setUsuario} autoFocus />
                    </Campo>
                    {error && <Aviso tipo="error">{error}</Aviso>}
                    <button type="submit" disabled={submitting || !online} className={botonPrincipal}>
                      {submitting ? 'Enviando...' : online ? 'Enviar enlace' : 'Sin señal'}
                    </button>
                  </form>
                </>
              )}
              <button type="button" onClick={() => cambiarModo('usuario')} className={`${enlace} w-full mt-4`}>
                Volver
              </button>
            </>
          )}

          {modo === 'registro' && (
            <>
              <h2 className="text-white font-semibold text-lg mb-1">Crear cuenta</h2>
              <p className="text-gray-400 text-sm mb-6">
                Para personal de terreno. No necesitas correo: entras con tu RUT y una clave.
                {!online && ' Sin señal también se puede: tu cuenta se crea sola cuando vuelva la señal.'}
              </p>
              <form onSubmit={e => void handleRegistro(e)} className="space-y-4">
                {camposNombre}

                <Campo id="rut-registro" label="RUT">
                  <RutInput id="rut-registro" value={rut} onChange={setRut} />
                </Campo>

                {campoFuncion}

                <Campo id="clave-registro" label="Clave" ayuda="Mínimo 6 caracteres. Pueden ser solo números.">
                  <ClaveInput id="clave-registro" value={password} onChange={setPassword} nueva />
                </Campo>
                <Campo id="clave-registro-2" label="Repite la clave">
                  <ClaveInput id="clave-registro-2" value={password2} onChange={setPassword2} nueva />
                </Campo>

                {error && <Aviso tipo="error">{error}</Aviso>}

                <button type="submit" disabled={submitting} className={botonPrincipal}>
                  {submitting ? 'Creando cuenta...' : online ? 'Crear cuenta' : 'Crear cuenta sin señal'}
                </button>
              </form>
              <button type="button" onClick={() => cambiarModo('rut')} className={`${enlace} w-full mt-4`}>
                Volver a ingresar
              </button>
            </>
          )}

          {modo === 'registro-correo' && (
            <>
              <h2 className="text-white font-semibold text-lg mb-1">Crear cuenta con correo</h2>
              <p className="text-gray-400 text-sm mb-6">
                Para quienes tienen correo de la empresa ({DOMINIO}). Después ingresas con tu usuario y contraseña.
                El RUT es opcional.
              </p>
              <form onSubmit={e => void handleRegistroCorreo(e)} className="space-y-4">
                {camposNombre}

                <Campo id="email-registro" label="Correo">
                  <UsuarioInput id="email-registro" value={usuario} onChange={setUsuario} />
                </Campo>

                <Campo id="rut-registro-correo" label="RUT (opcional)" ayuda="Si lo agregas, tus registros quedan unidos a tu RUT.">
                  <RutInput id="rut-registro-correo" value={rut} onChange={setRut} opcional />
                </Campo>

                {campoFuncion}

                <Campo id="clave-registro-correo" label="Contraseña" ayuda="Mínimo 6 caracteres.">
                  <ClaveInput id="clave-registro-correo" value={password} onChange={setPassword} nueva />
                </Campo>
                <Campo id="clave-registro-correo-2" label="Repite la contraseña">
                  <ClaveInput id="clave-registro-correo-2" value={password2} onChange={setPassword2} nueva />
                </Campo>

                {error && <Aviso tipo="error">{error}</Aviso>}

                <button type="submit" disabled={submitting || !online} className={botonPrincipal}>
                  {submitting ? 'Creando cuenta...' : online ? 'Crear cuenta' : 'Sin señal'}
                </button>
              </form>
              <button type="button" onClick={() => cambiarModo('usuario')} className={`${enlace} w-full mt-4`}>
                Volver a ingresar
              </button>
            </>
          )}
        </div>

        <p className="text-gray-600 text-xs text-center mt-6">© {new Date().getFullYear()} Doña Isidora — Uso interno</p>
      </div>
    </div>
  )
}
