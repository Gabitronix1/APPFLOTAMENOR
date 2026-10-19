import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

// Evita la pantalla en blanco: si algo falla al pintar, se muestra el error y dos salidas.
// "Limpiar caché" borra el service worker y los archivos guardados, pero no IndexedDB
// (los checklists pendientes y los borradores se conservan).
async function limpiarCacheYRecargar() {
  try {
    const regs = await navigator.serviceWorker?.getRegistrations()
    await Promise.all((regs ?? []).map(r => r.unregister()))
    const claves = (await window.caches?.keys()) ?? []
    await Promise.all(claves.map(k => caches.delete(k)))
  } catch {
    // Si no se pudo limpiar, igual se recarga.
  }
  location.reload()
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error de la app:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="card max-w-sm w-full space-y-3">
          <h1 className="text-lg font-bold text-dark">La app tuvo un problema</h1>
          <p className="text-sm text-gray-600">
            Prueba con "Reintentar". Si sigue igual, usa "Limpiar caché y reintentar". No se pierde nada de lo que está pendiente de enviar.
          </p>
          <pre className="text-[11px] text-fault bg-fault/5 rounded-lg p-2 whitespace-pre-wrap break-words max-h-40 overflow-auto">
            {error.message}
          </pre>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => location.reload()} className="btn-primary">Reintentar</button>
            <button type="button" onClick={() => void limpiarCacheYRecargar()} className="btn-secondary">
              Limpiar caché y reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }
}
