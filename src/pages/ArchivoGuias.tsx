import { useCallback, useEffect, useRef, useState, FormEvent, ChangeEvent } from 'react'
import { supabase } from '../lib/supabase'

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

// Las fotos de celular pesan varios MB: se reducen a ~1800 px (JPEG) antes de subir.
async function comprimirImagen(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file)
    const escala = Math.min(1, 1800 / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * escala)
    canvas.height = Math.round(bmp.height * escala)
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.85))
    return blob ?? file
  } catch {
    return file
  }
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

  async function guardarSubida(e: FormEvent) {
    e.preventDefault()
    if (!subida || !contrato || !subida.nombre.trim()) return
    setSaving(true)
    setError(null)
    const blob = await comprimirImagen(subida.file)
    const ext = blob.type === 'image/jpeg' ? 'jpg' : (subida.file.name.split('.').pop() ?? 'jpg')
    const path = `${contrato}/${crypto.randomUUID()}.${ext}`
    const up = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: blob.type || 'image/jpeg',
      upsert: false,
    })
    if (up.error) {
      setSaving(false)
      setError(up.error.message)
      return
    }
    const ins = await supabase.from('archivo_guias_archivos').insert({
      contrato,
      carpeta_id: carpetaActual,
      nombre: subida.nombre.trim(),
      storage_path: path,
    })
    setSaving(false)
    if (ins.error) {
      await supabase.storage.from(BUCKET).remove([path])
      setError(ins.error.message)
      return
    }
    setSubida(null)
    void cargar()
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
            <Botones onCancel={() => setSubida(null)} saving={saving} label="Subir" />
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
              {visor.url && (
                <a href={visor.url} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">
                  Abrir
                </a>
              )}
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
