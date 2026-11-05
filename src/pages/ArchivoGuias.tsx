import { useCallback, useEffect, useRef, useState, FormEvent, ChangeEvent } from 'react'
import JSZip from 'jszip'
import { supabase } from '../lib/supabase'
import { db, type GuiaUploadRow } from '../lib/db'
import { useOnline } from '../hooks/useOnline'

const BUCKET = 'archivo-guias'
const CONTRATOS = ['AP', 'P1', 'P2', 'P4', 'P5'] as const
type Contrato = (typeof CONTRATOS)[number]

interface Carpeta {
  id: string
  nombre: string
}

interface Archivo {
  id: string
  nombre: string
  storage_path: string
  created_at: string
  url?: string
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function nombreMesActual(): string {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')} ${MESES[hoy.getMonth()]}`
}

// Las fotos de celular pesan varios MB: se reducen a ~2600 px (JPEG 90%) antes de subir,
// suficiente para leer letra manuscrita pequeña y tablas de una guía completa.
async function comprimirImagen(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file)
    const escala = Math.min(1, 2600 / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * escala)
    canvas.height = Math.round(bmp.height * escala)
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.9))
    return blob ?? file
  } catch {
    return file
  }
}

// Sin señal (o con señal que no deja pasar datos) una subida puede quedar colgada para
// siempre: cada intento tiene un plazo y, si vence, la foto queda guardada para reintentar.
const TIMEOUT_SUBIDA_MS = 60_000

function conTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Tiempo de espera agotado')), ms)
    Promise.resolve(p).then(
      v => { clearTimeout(t); resolve(v) },
      e => { clearTimeout(t); reject(e) },
    )
  })
}

// Traduce el error técnico de un intento a algo que el usuario entienda. `red` indica que
// el problema es la conexión (conviene esperar); si no, es otro problema y se informa tal cual.
function describirError(e: unknown): { texto: string; red: boolean } {
  const msg = e instanceof Error ? e.message : String(e)
  const m = msg.toLowerCase()
  if (!navigator.onLine) return { texto: 'Sin señal: se subirá cuando vuelva la conexión', red: true }
  if (m.includes('tiempo de espera')) return { texto: 'Señal débil: la subida tardó más de 1 minuto, se reintentará', red: true }
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('load failed') || m.includes('fetch'))
    return { texto: 'Sin conexión con el servidor, se reintentará', red: true }
  if (m.includes('jwt') || m.includes('token') || m.includes('unauthorized') || m.includes('not authenticated'))
    return { texto: `Sesión vencida: cierra sesión y vuelve a entrar (${msg})`, red: false }
  if (m.includes('row-level security') || m.includes('permission') || m.includes('policy') || m.includes('403'))
    return { texto: `Sin permiso para subir guías (${msg})`, red: false }
  if (m.includes('too large') || m.includes('payload') || m.includes('413') || m.includes('maximum allowed size'))
    return { texto: `La foto es demasiado grande (${msg})`, red: false }
  return { texto: `Error del servidor: ${msg}`, red: false }
}

// Sube una guía pendiente. Es idempotente: la ruta y el id están fijados desde que se
// guardó en el celular, así un reintento (por ejemplo si la respuesta se perdió) no duplica.
async function subirPendiente(g: GuiaUploadRow): Promise<void> {
  const up = await conTimeout(
    supabase.storage.from(BUCKET).upload(g.path, g.blob, {
      contentType: g.blob.type || 'image/jpeg',
      upsert: true,
    }),
    TIMEOUT_SUBIDA_MS,
  )
  if (up.error) throw new Error(up.error.message)
  const ins = await conTimeout(
    supabase.from('archivo_guias_archivos').insert({
      id: g.id,
      contrato: g.contrato,
      carpeta_id: g.carpetaId,
      nombre: g.nombre,
      storage_path: g.path,
    }),
    TIMEOUT_SUBIDA_MS,
  )
  // 23505: ya se había insertado en un intento anterior.
  if (ins.error && ins.error.code !== '23505') throw new Error(ins.error.message)
}

function limpiarNombre(n: string): string {
  return n.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'sin-nombre'
}

function extensionDe(path: string): string {
  return path.split('.').pop() ?? 'jpg'
}

function guardarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

function sinExtension(nombre: string): string {
  return nombre.replace(/\.[a-z0-9]{2,5}$/i, '')
}

export function ArchivoGuias() {
  const [contrato, setContrato] = useState<Contrato | null>(null)
  const [ruta, setRuta] = useState<Carpeta[]>([])
  const [carpetas, setCarpetas] = useState<Carpeta[]>([])
  const [archivos, setArchivos] = useState<Archivo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nuevaCarpeta, setNuevaCarpeta] = useState<string | null>(null)
  const [subida, setSubida] = useState<{ file: File; preview: string; nombre: string } | null>(null)
  const [renombrando, setRenombrando] = useState<{ id: string; nombre: string } | null>(null)
  const [visor, setVisor] = useState<Archivo | null>(null)
  const [saving, setSaving] = useState(false)
  const [descargando, setDescargando] = useState(false)
  const online = useOnline()
  const [pendientes, setPendientes] = useState<(GuiaUploadRow & { preview: string })[]>([])
  const subiendoRef = useRef(false)
  const camaraRef = useRef<HTMLInputElement>(null)
  const galeriaRef = useRef<HTMLInputElement>(null)

  const carpetaActual = ruta.length ? ruta[ruta.length - 1].id : null

  const cargar = useCallback(async () => {
    if (!contrato) return
    setLoading(true)
    setError(null)
    let qc = supabase.from('archivo_guias_carpetas').select('id,nombre').eq('contrato', contrato)
    qc = carpetaActual ? qc.eq('parent_id', carpetaActual) : qc.is('parent_id', null)
    let qa = supabase
      .from('archivo_guias_archivos')
      .select('id,nombre,storage_path,created_at')
      .eq('contrato', contrato)
    qa = carpetaActual ? qa.eq('carpeta_id', carpetaActual) : qa.is('carpeta_id', null)
    const [rc, ra] = await Promise.all([
      qc.order('nombre', { ascending: false }),
      qa.order('created_at', { ascending: false }),
    ])
    if (rc.error || ra.error) {
      setError((rc.error ?? ra.error)!.message)
      setLoading(false)
      return
    }
    const lista = (ra.data ?? []) as Archivo[]
    if (lista.length) {
      const { data: firmadas } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(lista.map(a => a.storage_path), 3600)
      const porPath = new Map((firmadas ?? []).map(f => [f.path, f.signedUrl]))
      lista.forEach(a => {
        a.url = porPath.get(a.storage_path) ?? undefined
      })
    }
    setCarpetas((rc.data ?? []) as Carpeta[])
    setArchivos(lista)
    setLoading(false)
  }, [contrato, carpetaActual])

  useEffect(() => {
    void cargar()
  }, [cargar])

  useEffect(() => {
    return () => {
      if (subida) URL.revokeObjectURL(subida.preview)
    }
  }, [subida])

  function elegirContrato(c: Contrato | null) {
    setContrato(c)
    setRuta([])
    setCarpetas([])
    setArchivos([])
  }

  function onArchivo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const hoy = new Date().toISOString().slice(0, 10)
    setSubida({
      file,
      preview: URL.createObjectURL(file),
      nombre: file.name.startsWith('image.') ? `Guía ${hoy}` : sinExtension(file.name),
    })
  }

  const recargarPendientes = useCallback(async () => {
    const filas = await db.guiaUploads.orderBy('createdAt').toArray()
    setPendientes(prev => {
      prev.forEach(p => URL.revokeObjectURL(p.preview))
      return filas.map(f => ({ ...f, preview: URL.createObjectURL(f.blob) }))
    })
  }, [])

  const procesarPendientes = useCallback(async () => {
    if (subiendoRef.current) return
    subiendoRef.current = true
    try {
      const filas = await db.guiaUploads.orderBy('createdAt').toArray()
      let subio = false
      for (const g of filas) {
        try {
          await subirPendiente(g)
          await db.guiaUploads.delete(g.id)
          subio = true
        } catch (e) {
          const { texto, red } = describirError(e)
          await db.guiaUploads.update(g.id, { attempts: g.attempts + 1, lastError: texto })
          // Si es la conexión, las demás también fallarían: se reintenta más tarde. Si es
          // otro problema (solo de esta foto), se sigue con las siguientes.
          if (red) break
        }
      }
      await recargarPendientes()
      if (subio) void cargar()
    } finally {
      subiendoRef.current = false
    }
  }, [cargar, recargarPendientes])

  // Reintenta al abrir la pantalla, al volver la señal, al volver a la app y cada 20 s
  // mientras haya guías pendientes.
  useEffect(() => {
    void recargarPendientes().then(() => procesarPendientes())
  }, [recargarPendientes, procesarPendientes])

  useEffect(() => {
    const reintentar = () => {
      if (navigator.onLine) void procesarPendientes()
    }
    const onVis = () => {
      if (document.visibilityState === 'visible') reintentar()
    }
    window.addEventListener('online', reintentar)
    document.addEventListener('visibilitychange', onVis)
    const t = setInterval(reintentar, 20_000)
    return () => {
      window.removeEventListener('online', reintentar)
      document.removeEventListener('visibilitychange', onVis)
      clearInterval(t)
    }
  }, [procesarPendientes])

  const pendientesRef = useRef(pendientes)
  pendientesRef.current = pendientes
  useEffect(() => () => pendientesRef.current.forEach(p => URL.revokeObjectURL(p.preview)), [])

  // La foto se guarda primero en el celular y se sube en segundo plano: así nunca queda la
  // pantalla "cargando" sin señal ni se pierde la guía si se corta la subida.
  async function guardarSubida(e: FormEvent) {
    e.preventDefault()
    if (!subida || !contrato || !subida.nombre.trim()) return
    setSaving(true)
    setError(null)
    try {
      const blob = await conTimeout(comprimirImagen(subida.file), 30_000).catch(() => subida.file as Blob)
      const ext = blob.type === 'image/jpeg' ? 'jpg' : (subida.file.name.split('.').pop() ?? 'jpg')
      await db.guiaUploads.add({
        id: crypto.randomUUID(),
        contrato,
        carpetaId: carpetaActual,
        nombre: subida.nombre.trim(),
        path: `${contrato}/${crypto.randomUUID()}.${ext}`,
        blob,
        createdAt: Date.now(),
        attempts: 0,
      })
    } catch (err) {
      setSaving(false)
      setError(err instanceof Error ? err.message : 'No se pudo guardar la guía en el teléfono')
      return
    }
    setSaving(false)
    setSubida(null)
    await recargarPendientes()
    void procesarPendientes()
  }

  async function descartarPendiente(id: string) {
    if (!window.confirm('¿Descartar esta guía sin subirla?')) return
    await db.guiaUploads.delete(id)
    await recargarPendientes()
  }

  async function crearCarpeta(e: FormEvent) {
    e.preventDefault()
    if (!contrato || !nuevaCarpeta?.trim()) return
    setSaving(true)
    const { error: err } = await supabase.from('archivo_guias_carpetas').insert({
      contrato,
      parent_id: carpetaActual,
      nombre: nuevaCarpeta.trim(),
    })
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    setNuevaCarpeta(null)
    void cargar()
  }

  async function guardarNombre(e: FormEvent) {
    e.preventDefault()
    if (!renombrando?.nombre.trim()) return
    const { error: err } = await supabase
      .from('archivo_guias_archivos')
      .update({ nombre: renombrando.nombre.trim() })
      .eq('id', renombrando.id)
    if (err) {
      setError(err.message)
      return
    }
    setRenombrando(null)
    void cargar()
  }

  async function descargarArchivo(a: Archivo) {
    setDescargando(true)
    setError(null)
    const { data, error: err } = await supabase.storage.from(BUCKET).download(a.storage_path)
    setDescargando(false)
    if (err || !data) {
      setError(err?.message ?? 'No se pudo descargar la guía')
      return
    }
    guardarBlob(data, `${limpiarNombre(a.nombre)}.${extensionDe(a.storage_path)}`)
  }

  // Descarga un ZIP con todas las guías de una carpeta (o del contrato completo si
  // carpeta es null), respetando las subcarpetas.
  async function descargarZip(carpeta: Carpeta | null) {
    if (!contrato) return
    setDescargando(true)
    setError(null)
    try {
      const zip = new JSZip()
      let total = 0
      const recorrer = async (carpetaId: string | null, dir: JSZip) => {
        let qa = supabase.from('archivo_guias_archivos').select('nombre,storage_path').eq('contrato', contrato)
        qa = carpetaId ? qa.eq('carpeta_id', carpetaId) : qa.is('carpeta_id', null)
        let qc = supabase.from('archivo_guias_carpetas').select('id,nombre').eq('contrato', contrato)
        qc = carpetaId ? qc.eq('parent_id', carpetaId) : qc.is('parent_id', null)
        const [fa, fc] = await Promise.all([qa, qc])
        if (fa.error || fc.error) throw (fa.error ?? fc.error)
        const usados = new Set<string>()
        for (const f of fa.data ?? []) {
          const { data, error: err } = await supabase.storage.from(BUCKET).download(f.storage_path as string)
          if (err || !data) throw err ?? new Error('No se pudo descargar una guía')
          const base = limpiarNombre(f.nombre as string)
          const ext = extensionDe(f.storage_path as string)
          let nombre = `${base}.${ext}`
          for (let i = 2; usados.has(nombre); i++) nombre = `${base} (${i}).${ext}`
          usados.add(nombre)
          dir.file(nombre, data)
          total++
        }
        for (const c of fc.data ?? []) {
          await recorrer(c.id as string, dir.folder(limpiarNombre(c.nombre as string))!)
        }
      }
      const raiz = carpeta ? carpeta.id : carpetaActual
      const nombreRaiz = carpeta ? carpeta.nombre : ruta.length ? ruta[ruta.length - 1].nombre : contrato
      await recorrer(raiz, zip)
      if (total === 0) {
        setError('No hay guías para descargar en esta carpeta.')
        return
      }
      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' })
      guardarBlob(blob, `${limpiarNombre(`${contrato} - ${nombreRaiz}`)}.zip`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo generar la descarga')
    } finally {
      setDescargando(false)
    }
  }

  async function eliminarArchivo(a: Archivo) {
    if (!window.confirm(`¿Eliminar "${a.nombre}"?`)) return
    const { error: err } = await supabase.from('archivo_guias_archivos').delete().eq('id', a.id)
    if (err) {
      setError(err.message)
      return
    }
    await supabase.storage.from(BUCKET).remove([a.storage_path])
    setVisor(null)
    void cargar()
  }

  async function eliminarCarpeta(c: Carpeta) {
    if (!window.confirm(`¿Eliminar la carpeta "${c.nombre}" y todo su contenido?`)) return
    // Los archivos de la carpeta (y subcarpetas) se borran en cascada en la BD; antes se
    // recogen sus rutas para limpiar también el storage.
    const paths: string[] = []
    let pendientes = [c.id]
    while (pendientes.length) {
      const [fa, fc] = await Promise.all([
        supabase.from('archivo_guias_archivos').select('storage_path').in('carpeta_id', pendientes),
        supabase.from('archivo_guias_carpetas').select('id').in('parent_id', pendientes),
      ])
      paths.push(...(fa.data ?? []).map(r => r.storage_path as string))
      pendientes = (fc.data ?? []).map(r => r.id as string)
    }
    const { error: err } = await supabase.from('archivo_guias_carpetas').delete().eq('id', c.id)
    if (err) {
      setError(err.message)
      return
    }
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
    void cargar()
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Archivo de guías de despacho</h1>
      <p className="text-sm text-gray-500 mb-5">
        Sube fotos de guías por contrato y ordénalas en carpetas (por mes u otras).
      </p>

      {error && <div className="text-fault text-sm mb-4">{error}</div>}

      {pendientes.length > 0 && (
        <div className="mb-4 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm text-dark">
          <p className="font-semibold">
            {pendientes.length} guía{pendientes.length !== 1 ? 's' : ''} pendiente{pendientes.length !== 1 ? 's' : ''} de subir
          </p>
          <p className="text-xs text-gray-600 mt-0.5">
            {online && pendientes.some(p => p.lastError)
              ? 'No se pudo subir todavía: revisa el motivo abajo. Se reintenta sola cada 20 segundos.'
              : online
              ? 'Subiendo… si la señal es mala se reintenta sola. No cierres la sesión.'
              : 'Sin señal: quedan guardadas en el teléfono y se suben solas cuando vuelva la conexión.'}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {pendientes.map(p => (
              <div key={p.id} className="w-full flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1.5 pr-2">
                <img src={p.preview} alt={p.nombre} className="w-10 h-10 object-cover rounded shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{p.contrato} · {p.nombre}</p>
                  {p.lastError ? (
                    <p className="text-[11px] text-fault leading-snug" data-testid="error-pendiente">
                      ⚠️ {p.lastError}
                      {p.attempts > 1 ? ` · ${p.attempts} intentos` : ''}
                    </p>
                  ) : (
                    <p className="text-[11px] text-gray-500">En espera de subir…</p>
                  )}
                </div>
                <button
                  onClick={() => void descartarPendiente(p.id)}
                  className="text-gray-400 hover:text-fault text-sm shrink-0"
                  aria-label={`Descartar ${p.nombre}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          {online && (
            <button onClick={() => void procesarPendientes()} className="btn-secondary btn-sm mt-2">
              Reintentar ahora
            </button>
          )}
        </div>
      )}

      {!contrato ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {CONTRATOS.map(c => (
            <button
              key={c}
              onClick={() => elegirContrato(c)}
              className="bg-white border border-gray-200 hover:border-primary rounded-2xl p-6 text-center shadow-sm"
            >
              <div className="text-3xl mb-1">📁</div>
              <div className="text-lg font-bold text-dark">{c}</div>
            </button>
          ))}
        </div>
      ) : (
        <>
          <nav className="flex flex-wrap items-center gap-1 text-sm mb-4">
            <button onClick={() => elegirContrato(null)} className="text-primary font-semibold">
              Contratos
            </button>
            <span className="text-gray-400">/</span>
            <button onClick={() => setRuta([])} className="text-primary font-semibold">
              {contrato}
            </button>
            {ruta.map((r, i) => (
              <span key={r.id} className="flex items-center gap-1">
                <span className="text-gray-400">/</span>
                <button onClick={() => setRuta(ruta.slice(0, i + 1))} className="text-primary font-semibold">
                  {r.nombre}
                </button>
              </span>
            ))}
          </nav>

          <div className="flex flex-wrap gap-2 mb-5">
            <button onClick={() => camaraRef.current?.click()} className="btn-primary btn-sm">
              📷 Tomar foto
            </button>
            <button onClick={() => galeriaRef.current?.click()} className="btn-secondary btn-sm">
              🖼️ Subir imagen
            </button>
            <button
              onClick={() => setNuevaCarpeta(ruta.length === 0 ? nombreMesActual() : '')}
              className="btn-secondary btn-sm"
            >
              + Nueva carpeta
            </button>
            <button
              onClick={() => void descargarZip(null)}
              disabled={descargando}
              className="btn-secondary btn-sm disabled:opacity-60"
            >
              {descargando ? 'Preparando…' : `⬇️ Descargar ${ruta.length ? 'carpeta' : 'contrato'} (ZIP)`}
            </button>
            <input ref={camaraRef} type="file" accept="image/*" capture="environment" onChange={onArchivo} className="hidden" />
            <input ref={galeriaRef} type="file" accept="image/*" onChange={onArchivo} className="hidden" />
          </div>

          {loading && <p className="text-sm text-gray-400 animate-pulse">Cargando…</p>}

          {carpetas.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {carpetas.map(c => (
                <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-2">
                  <button
                    onClick={() => setRuta([...ruta, c])}
                    className="flex-1 min-w-0 text-left font-semibold text-dark truncate"
                  >
                    📁 {c.nombre}
                  </button>
                  <button
                    onClick={() => void descargarZip(c)}
                    disabled={descargando}
                    className="text-gray-400 hover:text-primary text-sm disabled:opacity-40"
                    aria-label={`Descargar carpeta ${c.nombre}`}
                  >
                    ⬇️
                  </button>
                  <button
                    onClick={() => void eliminarCarpeta(c)}
                    className="text-gray-400 hover:text-fault text-sm"
                    aria-label={`Eliminar carpeta ${c.nombre}`}
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )}

          {archivos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {archivos.map(a => (
                <div key={a.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <button onClick={() => setVisor(a)} className="block w-full aspect-square bg-gray-100">
                    {a.url && <img src={a.url} alt={a.nombre} className="w-full h-full object-cover" loading="lazy" />}
                  </button>
                  <div className="p-2 flex items-center gap-1">
                    <span className="flex-1 min-w-0 text-xs font-medium text-dark truncate">{a.nombre}</span>
                    <button
                      onClick={() => void descargarArchivo(a)}
                      disabled={descargando}
                      className="text-gray-400 hover:text-primary text-sm disabled:opacity-40"
                      aria-label="Descargar guía"
                    >
                      ⬇️
                    </button>
                    <button
                      onClick={() => setRenombrando({ id: a.id, nombre: a.nombre })}
                      className="text-gray-400 hover:text-primary text-sm"
                      aria-label="Editar nombre"
                    >
                      ✏️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && carpetas.length === 0 && archivos.length === 0 && (
            <p className="text-sm text-gray-400">Esta carpeta está vacía.</p>
          )}
        </>
      )}

      {nuevaCarpeta !== null && (
        <Modal titulo="Nueva carpeta" onClose={() => setNuevaCarpeta(null)}>
          <form onSubmit={e => void crearCarpeta(e)} className="space-y-4">
            <div>
              <label className="label">Nombre</label>
              <input
                autoFocus
                className="input"
                value={nuevaCarpeta}
                onChange={e => setNuevaCarpeta(e.target.value)}
                placeholder="Ej: 2026-10 Octubre"
                required
              />
            </div>
            <Botones onCancel={() => setNuevaCarpeta(null)} saving={saving} label="Crear" />
          </form>
        </Modal>
      )}

      {subida && (
        <Modal titulo="Guardar guía" onClose={() => setSubida(null)}>
          <form onSubmit={e => void guardarSubida(e)} className="space-y-4">
            <img src={subida.preview} alt="Vista previa" className="w-full max-h-64 object-contain rounded-lg bg-gray-100" />
            <div>
              <label className="label">Nombre de la guía</label>
              <input
                autoFocus
                className="input"
                value={subida.nombre}
                onChange={e => setSubida({ ...subida, nombre: e.target.value })}
                placeholder="Ej: Guía 123456"
                required
              />
            </div>
            <p className="text-xs text-gray-400">
              Se guardará en {contrato}
              {ruta.length ? ` / ${ruta.map(r => r.nombre).join(' / ')}` : ''}.
            </p>
            <Botones onCancel={() => setSubida(null)} saving={saving} label="Guardar" />
          </form>
        </Modal>
      )}

      {renombrando && (
        <Modal titulo="Editar nombre" onClose={() => setRenombrando(null)}>
          <form onSubmit={e => void guardarNombre(e)} className="space-y-4">
            <input
              autoFocus
              className="input"
              value={renombrando.nombre}
              onChange={e => setRenombrando({ ...renombrando, nombre: e.target.value })}
              required
            />
            <Botones onCancel={() => setRenombrando(null)} saving={false} label="Guardar" />
          </form>
        </Modal>
      )}

      {visor && (
        <Modal titulo={visor.nombre} onClose={() => setVisor(null)}>
          {visor.url && <img src={visor.url} alt={visor.nombre} className="w-full max-h-[70vh] object-contain" />}
          <div className="flex gap-2 justify-between pt-3">
            <button onClick={() => void eliminarArchivo(visor)} className="btn-danger btn-sm">
              Eliminar
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => void descargarArchivo(visor)}
                disabled={descargando}
                className="btn-secondary btn-sm disabled:opacity-60"
              >
                {descargando ? 'Descargando…' : '⬇️ Descargar'}
              </button>
              <button
                onClick={() => {
                  setRenombrando({ id: visor.id, nombre: visor.nombre })
                  setVisor(null)
                }}
                className="btn-secondary btn-sm"
              >
                Editar nombre
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-dark mb-4 truncate">{titulo}</h2>
        {children}
      </div>
    </div>
  )
}

function Botones({ onCancel, saving, label }: { onCancel: () => void; saving: boolean; label: string }) {
  return (
    <div className="flex gap-2 justify-end pt-2">
      <button type="button" onClick={onCancel} className="btn-secondary btn-sm">
        Cancelar
      </button>
      <button type="submit" disabled={saving} className="btn-primary btn-sm">
        {saving ? 'Guardando...' : label}
      </button>
    </div>
  )
}
