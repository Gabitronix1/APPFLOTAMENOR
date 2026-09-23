import { useCallback, useEffect, useState } from 'react'
import { useAuth, getUltimaValidacion } from '../context/AuthContext'
import { useOnline } from '../hooks/useOnline'
import { db, type QueueItem } from '../lib/db'
import { CATALOG_NAMES, prefetchAllCatalogs } from '../lib/masterDataCache'
import { QUEUE_CHANGED_EVENT, listQueue, syncAll } from '../lib/offlineQueue'
import { readStoredSession, supabase } from '../lib/supabase'
import { getOfflineSince } from '../lib/deviceEvents'
import { ROL_LABELS } from '../lib/roles'

type Nivel = 'ok' | 'warn' | 'fault'

interface Chequeo {
  titulo: string
  nivel: Nivel
  detalle: string
  accion?: { label: string; onClick: () => void }
}

// Catálogos sin los cuales el Checklist no se puede llenar sin señal.
const CATALOGOS_CLAVE = ['operadores', 'patentes']

function haceCuanto(iso: string | null | undefined): string {
  if (!iso) return 'nunca'
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 48) return `hace ${h} h`
  return `hace ${Math.round(h / 24)} días`
}

function esAppInstalada(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function esIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

const ICONO: Record<Nivel, string> = { ok: '✓', warn: '!', fault: '✕' }
const COLOR: Record<Nivel, string> = {
  ok: 'bg-lime/20 text-primary',
  warn: 'bg-warn/20 text-warn',
  fault: 'bg-fault/20 text-fault',
}

export function ListoFaena() {
  const { user, perfil } = useAuth()
  const online = useOnline()
  const [chequeos, setChequeos] = useState<Chequeo[] | null>(null)
  const [pendientes, setPendientes] = useState<QueueItem[]>([])
  const [actualizando, setActualizando] = useState(false)

  const evaluar = useCallback(async () => {
    const lista: Chequeo[] = []

    const instalada = esAppInstalada()
    lista.push({
      titulo: 'App instalada en el celular',
      nivel: instalada ? 'ok' : esIOS() ? 'fault' : 'warn',
      detalle: instalada
        ? 'Se abre desde el ícono de la pantalla de inicio.'
        : esIOS()
          ? 'En iPhone es obligatorio: en Safari toca Compartir → "Agregar a inicio". Si se usa desde Safari, iOS borra los datos a los 7 días sin uso.'
          : 'Desde el menú del navegador elige "Instalar app" o "Agregar a pantalla de inicio" y ábrela siempre desde ese ícono.',
    })

    const guardada = readStoredSession()
    const validada = getUltimaValidacion()
    lista.push({
      titulo: 'Sesión guardada en el celular',
      nivel: guardada ? 'ok' : 'fault',
      detalle: guardada
        ? `No te pedirá la contraseña sin señal. Última validación con el servidor: ${haceCuanto(validada)}.`
        : 'No hay sesión guardada: vuelve a ingresar con señal.',
    })

    const perfilLocal = user ? await db.perfilCache.get(user.id) : undefined
    lista.push({
      titulo: 'Perfil y permisos descargados',
      nivel: perfilLocal ? 'ok' : perfil ? 'warn' : 'fault',
      detalle: perfilLocal
        ? `Rol: ${ROL_LABELS[perfilLocal.rol as keyof typeof ROL_LABELS] ?? perfilLocal.rol}.`
        : perfil
          ? 'Falta guardar el perfil en el celular: toca "Actualizar ahora" con señal.'
          : navigator.onLine
            ? 'Tu cuenta aún no tiene rol aprobado: por ahora solo puedes usar el Checklist.'
            : 'Tus permisos no están descargados en este celular: ábrela con señal para descargarlos. Mientras, solo el Checklist.',
    })

    const catalogos = await db.catalogCache.bulkGet(CATALOG_NAMES)
    const presentes = catalogos.filter(Boolean)
    const faltanClave = CATALOGOS_CLAVE.filter(n => {
      const c = catalogos[CATALOG_NAMES.indexOf(n)]
      return !c || c.data.length === 0
    })
    const masAntiguo = presentes.reduce<number | null>(
      (min, c) => (min === null || c!.updatedAt < min ? c!.updatedAt : min),
      null,
    )
    const diasAntiguedad = masAntiguo ? (Date.now() - masAntiguo) / 86400000 : null
    lista.push({
      titulo: 'Listas descargadas (conductores, patentes, fundos, equipos…)',
      nivel:
        faltanClave.length > 0 ? 'fault' : presentes.length < CATALOG_NAMES.length || (diasAntiguedad ?? 0) > 7 ? 'warn' : 'ok',
      detalle:
        faltanClave.length > 0
          ? `Faltan: ${faltanClave.join(', ')}. Sin esto no se puede llenar el Checklist sin señal.`
          : `${presentes.length} de ${CATALOG_NAMES.length} listas guardadas, actualizadas ${haceCuanto(
              masAntiguo ? new Date(masAntiguo).toISOString() : null,
            )}.`,
    })

    let persistente: boolean | null = null
    try {
      persistente = (await navigator.storage?.persisted?.()) ?? null
    } catch {
      persistente = null
    }
    lista.push({
      titulo: 'Almacenamiento protegido',
      nivel: persistente ? 'ok' : 'warn',
      detalle: persistente
        ? 'El celular no borrará los registros guardados aunque le falte espacio.'
        : 'El celular podría borrar registros sin subir si se queda sin espacio. Instalar la app suele activarlo.',
      accion: persistente
        ? undefined
        : {
            label: 'Activar',
            onClick: () => void navigator.storage?.persist?.().then(() => void evaluar()),
          },
    })

    const cola = await listQueue()
    setPendientes(cola)
    lista.push({
      titulo: 'Registros sin subir',
      nivel: cola.length === 0 ? 'ok' : cola.some(i => i.lastError && i.attempts > 0) ? 'fault' : 'warn',
      detalle:
        cola.length === 0
          ? 'Todo lo registrado ya está en el servidor.'
          : `${cola.length} pendiente${cola.length !== 1 ? 's' : ''}. Se suben solos al volver la señal.`,
    })

    setChequeos(lista)
  }, [user, perfil])

  useEffect(() => {
    void evaluar()
    window.addEventListener(QUEUE_CHANGED_EVENT, evaluar)
    return () => window.removeEventListener(QUEUE_CHANGED_EVENT, evaluar)
  }, [evaluar])

  async function actualizarAhora() {
    setActualizando(true)
    try {
      const { data } = await supabase.auth.getSession()
      const uid = data.session?.user.id
      if (uid) {
        const { data: p } = await supabase.from('perfiles').select('rol, operador_id').eq('id', uid).maybeSingle()
        if (p) await db.perfilCache.put({ userId: uid, rol: p.rol, operadorId: p.operador_id })
      }
      await Promise.all([prefetchAllCatalogs(), syncAll()])
    } finally {
      setActualizando(false)
      void evaluar()
    }
  }

  const listo = chequeos?.every(c => c.nivel === 'ok' || (c.titulo === 'Registros sin subir' && c.nivel === 'warn'))
  const sinSenalDesde = getOfflineSince()

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Listo para faena</h1>
      <p className="text-sm text-gray-500 mt-0.5 mb-6">
        Revisa esto con señal antes de subir: si todo está en verde, la app funciona sin señal y no te pedirá la
        contraseña.
      </p>

      <div
        className={`rounded-xl p-4 mb-6 ${
          chequeos === null ? 'bg-gray-200 text-gray-600' : listo ? 'bg-primary text-white' : 'bg-warn/15 text-warn'
        }`}
      >
        <p className="font-semibold">
          {chequeos === null ? 'Revisando…' : listo ? 'Listo para trabajar sin señal' : 'Falta preparar el celular'}
        </p>
        <p className={`text-sm mt-0.5 ${listo ? 'text-white/80' : ''}`}>
          {online
            ? 'Con señal.'
            : `Sin señal${sinSenalDesde ? ` desde ${haceCuanto(sinSenalDesde)}` : ''}. Lo que registres se guarda en el celular.`}
        </p>
      </div>

      <ul className="space-y-3">
        {chequeos?.map(c => (
          <li key={c.titulo} className="card flex gap-3 items-start">
            <span
              className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${COLOR[c.nivel]}`}
            >
              {ICONO[c.nivel]}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm">{c.titulo}</p>
              <p className="text-sm text-gray-500 mt-0.5">{c.detalle}</p>
            </div>
            {c.accion && (
              <button type="button" onClick={c.accion.onClick} className="btn-secondary btn-sm shrink-0">
                {c.accion.label}
              </button>
            )}
          </li>
        ))}
      </ul>

      {pendientes.some(p => p.lastError) && (
        <div className="card mt-4">
          <p className="font-medium text-sm text-gray-900 mb-2">Detalle de pendientes con error</p>
          <ul className="space-y-1.5">
            {pendientes
              .filter(p => p.lastError)
              .map(p => (
                <li key={p.id} className="text-xs text-gray-600">
                  <span className="text-gray-400">{new Date(p.timestamp).toLocaleString('es-CL')}</span> —{' '}
                  {p.lastError}
                </li>
              ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => void actualizarAhora()}
        disabled={!online || actualizando}
        className="btn-primary w-full mt-6"
      >
        {actualizando ? 'Actualizando…' : online ? 'Actualizar ahora' : 'Sin señal: se actualizará al volver'}
      </button>
    </div>
  )
}
