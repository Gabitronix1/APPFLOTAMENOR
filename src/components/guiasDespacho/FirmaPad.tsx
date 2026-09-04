import { forwardRef, useImperativeHandle, useRef, useState } from 'react'

export interface FirmaPadHandle {
  /** null si el usuario no ha dibujado nada todavía. */
  getBlob: () => Promise<Blob | null>
  clear: () => void
}

// Firma digital capturada en pantalla (touch/mouse) para dejar constancia de quién
// recibió la carga en terreno. Se exporta como PNG al confirmar la recepción.
export const FirmaPad = forwardRef<FirmaPadHandle>(function FirmaPad(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [hasStroke, setHasStroke] = useState(false)

  function getCtx() {
    return canvasRef.current?.getContext('2d') ?? null
  }

  function pointFromEvent(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = getCtx()
    if (!ctx) return
    drawing.current = true
    const { x, y } = pointFromEvent(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const ctx = getCtx()
    if (!ctx) return
    const { x, y } = pointFromEvent(e)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#111827'
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasStroke(true)
  }

  function handlePointerUp() {
    drawing.current = false
  }

  function clear() {
    const canvas = canvasRef.current
    const ctx = getCtx()
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasStroke(false)
  }

  useImperativeHandle(ref, () => ({
    clear,
    getBlob: () =>
      new Promise(resolve => {
        const canvas = canvasRef.current
        if (!canvas || !hasStroke) {
          resolve(null)
          return
        }
        canvas.toBlob(blob => resolve(blob), 'image/png')
      }),
  }))

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={400}
        height={160}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="w-full h-40 bg-gray-50 border border-gray-300 rounded-xl touch-none"
      />
      <div className="flex justify-end mt-1">
        <button type="button" onClick={clear} className="text-xs font-medium underline text-gray-500">
          Limpiar firma
        </button>
      </div>
    </div>
  )
})
