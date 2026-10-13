import { useRegisterSW } from 'virtual:pwa-register/react'

const REVISAR_CADA_MS = 15 * 60 * 1000

export function ActualizacionBanner() {
  const {
    needRefresh: [hayVersionNueva, setHayVersionNueva],
    updateServiceWorker,
  } = useRegisterSW({
    // El celular solo busca versión nueva al arrancar la app; como la PWA casi nunca arranca
    // de cero, se revisa cada cierto rato y al volver a primer plano.
    onRegisteredSW(_url, registro) {
      if (!registro) return
      const revisar = () => {
        if (navigator.onLine) void registro.update().catch(() => {})
      }
      setInterval(revisar, REVISAR_CADA_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') revisar()
      })
    },
  })

  if (!hayVersionNueva) return null
  return (
    <div className="fixed bottom-4 inset-x-0 z-50 px-4">
      <div className="max-w-lg mx-auto rounded-xl border border-warn/40 bg-white shadow-lg p-4">
        <p className="text-sm font-semibold text-gray-900">Hay una versión nueva de la app</p>
        <p className="text-xs text-gray-600 mt-0.5">
          Actualiza para ver los últimos cambios. Si tienes algo a medio llenar, termina antes de actualizar.
        </p>
        <div className="flex gap-2 mt-3">
          <button type="button" onClick={() => void updateServiceWorker(true)} className="btn-primary btn-sm">
            Actualizar
          </button>
          <button type="button" onClick={() => setHayVersionNueva(false)} className="btn-secondary btn-sm">
            Después
          </button>
        </div>
      </div>
    </div>
  )
}
