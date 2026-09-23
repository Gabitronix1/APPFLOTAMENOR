import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { KpiCard } from '../components/vehiculos/KpiCard'

interface Evento {
  id: string
  user_id: string
  operador_id: string | null
  device_id: string
  tipo: string
  ocurrido_en: string
  recibido_en: string
  detalle: Record<string, unknown>
}

interface Fila {
  userId: string
  nombre: string
  ultimaActividad: string
  ultimoContacto: string
  aperturas: number
  aperturasSinSenal: number
  logins: number
  periodosSinSenal: number
  maxSinSenalMin: number
  totalSinSenalMin: number
  pendientes: number | null
  dispositivos: number
}

const DIAS = 30
const PAGE = 1000
const MAX_FILAS = 20000
// Sin contacto con el servidor por más de esto se marca en rojo: puede tener registros
// sin subir o haber perdido la sesión.
const DIAS_ALERTA_SIN_CONTACTO = 3

const TIPO_LABEL: Record<string, string> = {
  app_abierta: 'Abrió la app',
  login: 'Inició sesión',
  logout: 'Cerró sesión',
  sin_senal_inicio: 'Quedó sin señal',
  sin_senal_fin: 'Recuperó señal',
  sincronizacion: 'Sincronizó',
}

function fmtFechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function fmtDuracion(min: number): string {
  if (min < 60) return `${min} min`
  const h = min / 60
  if (h < 48) return `${h.toFixed(h < 10 ? 1 : 0)} h`
  return `${(h / 24).toFixed(1)} días`
}

function diasDesde(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86400000
}

function detalleEvento(e: Evento): string {
  const d = e.detalle
  if (e.tipo === 'app_abierta') return d.con_senal ? 'con señal' : 'sin señal'
  if (e.tipo === 'sin_senal_fin' && typeof d.duracion_min === 'number') return `tras ${fmtDuracion(d.duracion_min)}`
  if (e.tipo === 'sincronizacion') return `${d.subidos ?? 0} subidos · ${d.con_error ?? 0} con error · ${d.pendientes ?? 0} pendientes`
  if (e.tipo === 'logout') return `${d.con_senal ? 'con' : 'sin'} señal · ${d.pendientes ?? 0} pendientes`
  return ''
}

export function UsoSinSenal() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [nombres, setNombres] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    async function cargar() {
      const desde = new Date(Date.now() - DIAS * 86400000).toISOString()
      const filas: Evento[] = []
      for (let from = 0; from < MAX_FILAS; from += PAGE) {
        const { data, error: err } = await supabase
          .from('eventos_dispositivo')
          .select('id, user_id, operador_id, device_id, tipo, ocurrido_en, recibido_en, detalle')
          .gte('ocurrido_en', desde)
          .order('ocurrido_en', { ascending: false })
          .range(from, from + PAGE - 1)
        if (err) {
          if (!cancelado) setError('No se pudo cargar el registro de uso. Revisa tu conexión.')
          break
        }
        filas.push(...((data ?? []) as Evento[]))
        if (!data || data.length < PAGE) break
      }

      const operadorIds = [...new Set(filas.map(f => f.operador_id).filter((x): x is string => !!x))]
      const mapa: Record<string, string> = {}
      for (let i = 0; i < operadorIds.length; i += 200) {
        const { data } = await supabase
          .from('operadores')
          .select('id, nombre, apellido')
          .in('id', operadorIds.slice(i, i + 200))
        for (const o of (data ?? []) as { id: string; nombre: string; apellido: string }[]) {
          mapa[o.id] = `${o.apellido}, ${o.nombre}`
        }
      }

      if (!cancelado) {
        setEventos(filas)
        setNombres(mapa)
        setLoading(false)
      }
    }
    void cargar()
    return () => {
      cancelado = true
    }
  }, [])

  const filas = useMemo<Fila[]>(() => {
    const porUsuario = new Map<string, Evento[]>()
    for (const e of eventos) {
      const lista = porUsuario.get(e.user_id) ?? []
      lista.push(e)
      porUsuario.set(e.user_id, lista)
    }
    return [...porUsuario.entries()]
      .map(([userId, evs]) => {
        // evs viene ordenado del más reciente al más antiguo.
        const operadorId = evs.find(e => e.operador_id)?.operador_id
        const duraciones = evs
          .filter(e => e.tipo === 'sin_senal_fin' && typeof e.detalle.duracion_min === 'number')
          .map(e => e.detalle.duracion_min as number)
        const conPendientes = evs.find(e => typeof e.detalle.pendientes === 'number')
        return {
          userId,
          nombre: (operadorId && nombres[operadorId]) || 'Sin nombre vinculado',
          ultimaActividad: evs[0].ocurrido_en,
          ultimoContacto: evs.reduce((max, e) => (e.recibido_en > max ? e.recibido_en : max), evs[0].recibido_en),
          aperturas: evs.filter(e => e.tipo === 'app_abierta').length,
          aperturasSinSenal: evs.filter(e => e.tipo === 'app_abierta' && e.detalle.con_senal === false).length,
          logins: evs.filter(e => e.tipo === 'login').length,
          periodosSinSenal: duraciones.length,
          maxSinSenalMin: duraciones.length ? Math.max(...duraciones) : 0,
          totalSinSenalMin: duraciones.reduce((a, b) => a + b, 0),
          pendientes: conPendientes ? (conPendientes.detalle.pendientes as number) : null,
          dispositivos: new Set(evs.map(e => e.device_id)).size,
        }
      })
      .sort((a, b) => a.ultimoContacto.localeCompare(b.ultimoContacto))
  }, [eventos, nombres])

  const kpis = useMemo(() => {
    const activos7 = filas.filter(f => diasDesde(f.ultimaActividad) <= 7).length
    const aperturasSinSenal = filas.reduce((a, f) => a + f.aperturasSinSenal, 0)
    const maxSinSenal = filas.reduce((a, f) => Math.max(a, f.maxSinSenalMin), 0)
    const sinContacto = filas.filter(f => diasDesde(f.ultimoContacto) > DIAS_ALERTA_SIN_CONTACTO).length
    const conPendientes = filas.filter(f => (f.pendientes ?? 0) > 0).length
    return { activos7, aperturasSinSenal, maxSinSenal, sinContacto, conPendientes }
  }, [filas])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Uso sin señal</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Últimos {DIAS} días. Cada celular registra sus eventos aunque esté sin señal y los envía al recuperarla: lo
          ocurrido en faena aparece cuando la persona vuelve a tener conexión.
        </p>
      </div>

      {error && <div className="text-fault text-sm mb-4">{error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <KpiCard label="Usuarios activos (7 días)" value={kpis.activos7} />
        <KpiCard label="Aperturas sin señal" value={kpis.aperturasSinSenal} />
        <KpiCard label="Periodo más largo sin señal" value={kpis.maxSinSenal ? fmtDuracion(kpis.maxSinSenal) : '—'} />
        <KpiCard
          label={`Sin contacto > ${DIAS_ALERTA_SIN_CONTACTO} días`}
          value={kpis.sinContacto}
          accent={kpis.sinContacto > 0}
        />
        <KpiCard label="Con registros pendientes" value={kpis.conPendientes} accent={kpis.conPendientes > 0} />
      </div>

      <div className="card p-0 overflow-x-auto mb-6">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="table-th">Persona</th>
              <th className="table-th">Último contacto</th>
              <th className="table-th">Última actividad</th>
              <th className="table-th">Aperturas (sin señal)</th>
              <th className="table-th">Inicios de sesión</th>
              <th className="table-th">Periodos sin señal</th>
              <th className="table-th">Máx. sin señal</th>
              <th className="table-th">Total sin señal</th>
              <th className="table-th">Pendientes</th>
              <th className="table-th">Celulares</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td className="table-td text-gray-400" colSpan={10}>
                  Cargando…
                </td>
              </tr>
            )}
            {!loading && filas.length === 0 && (
              <tr>
                <td className="table-td text-gray-400" colSpan={10}>
                  Aún no hay registros. Aparecen a medida que las personas usan la versión nueva de la app.
                </td>
              </tr>
            )}
            {filas.map(f => {
              const alerta = diasDesde(f.ultimoContacto) > DIAS_ALERTA_SIN_CONTACTO
              return (
                <tr key={f.userId}>
                  <td className="table-td font-medium text-gray-900 whitespace-nowrap">{f.nombre}</td>
                  <td className={`table-td whitespace-nowrap ${alerta ? 'text-fault font-medium' : ''}`}>
                    {fmtFechaHora(f.ultimoContacto)}
                  </td>
                  <td className="table-td whitespace-nowrap">{fmtFechaHora(f.ultimaActividad)}</td>
                  <td className="table-td">
                    {f.aperturas} ({f.aperturasSinSenal})
                  </td>
                  <td className="table-td">{f.logins}</td>
                  <td className="table-td">{f.periodosSinSenal}</td>
                  <td className="table-td whitespace-nowrap">{f.maxSinSenalMin ? fmtDuracion(f.maxSinSenalMin) : '—'}</td>
                  <td className="table-td whitespace-nowrap">
                    {f.totalSinSenalMin ? fmtDuracion(f.totalSinSenalMin) : '—'}
                  </td>
                  <td className={`table-td ${(f.pendientes ?? 0) > 0 ? 'text-warn font-medium' : ''}`}>
                    {f.pendientes ?? '—'}
                  </td>
                  <td className="table-td">{f.dispositivos}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-3">Últimos eventos</h2>
      <div className="card p-0 overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="table-th">Cuándo ocurrió</th>
              <th className="table-th">Persona</th>
              <th className="table-th">Evento</th>
              <th className="table-th">Detalle</th>
              <th className="table-th">Recibido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {eventos.slice(0, 100).map(e => (
              <tr key={e.id}>
                <td className="table-td whitespace-nowrap">{fmtFechaHora(e.ocurrido_en)}</td>
                <td className="table-td whitespace-nowrap">
                  {(e.operador_id && nombres[e.operador_id]) || 'Sin nombre vinculado'}
                </td>
                <td className="table-td whitespace-nowrap">{TIPO_LABEL[e.tipo] ?? e.tipo}</td>
                <td className="table-td">{detalleEvento(e)}</td>
                <td className="table-td whitespace-nowrap text-gray-400">{fmtFechaHora(e.recibido_en)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
