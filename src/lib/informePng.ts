import { BRAND, barColor, complianceColor } from './constants'

export interface InformeKpi {
  label: string
  value: string
  alerta?: boolean
}

export interface InformeData {
  titulo: string
  subtitulo: string
  generado: string
  kpis: InformeKpi[]
  porDia: { fecha: string; sinFalla: number; conFalla: number }[]
  porItem: { name: string; fallas: number; revisiones: number; tasa: number }[]
  porFundo: { fundo: string; total: number; conFalla: number }[]
}

const W = 1600
const PAD = 48
const ESCALA = 2
const FUENTE = '"Helvetica Neue", Arial, sans-serif'
const MAX_DIAS = 30
const MAX_FUNDOS = 10

type Ctx = CanvasRenderingContext2D

interface EstiloTexto {
  size: number
  weight?: number
  color?: string
  align?: CanvasTextAlign
}

function texto(ctx: Ctx, s: string, x: number, y: number, e: EstiloTexto) {
  ctx.font = `${e.weight ?? 400} ${e.size}px ${FUENTE}`
  ctx.fillStyle = e.color ?? BRAND.dark
  ctx.textAlign = e.align ?? 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(s, x, y)
}

function recorta(ctx: Ctx, s: string, maxAncho: number): string {
  if (ctx.measureText(s).width <= maxAncho) return s
  let t = s
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxAncho) t = t.slice(0, -1)
  return `${t}…`
}

function caja(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, relleno: string, borde?: string) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
  ctx.fillStyle = relleno
  ctx.fill()
  if (borde) {
    ctx.strokeStyle = borde
    ctx.lineWidth = 1
    ctx.stroke()
  }
}

function titulo(ctx: Ctx, s: string, x: number, y: number) {
  texto(ctx, s, x, y, { size: 22, weight: 700, color: BRAND.dark })
}

function pct(n: number, total: number): number {
  return total ? Math.round((n / total) * 100) : 0
}

function dibujaKpis(ctx: Ctx, kpis: InformeKpi[], y: number): number {
  const cols = 5
  const gap = 16
  const w = (W - PAD * 2 - gap * (cols - 1)) / cols
  const h = 96
  kpis.forEach((k, i) => {
    const x = PAD + (i % cols) * (w + gap)
    const yy = y + Math.floor(i / cols) * (h + gap)
    caja(ctx, x, yy, w, h, 12, '#FFFFFF', '#E5E7EB')
    texto(ctx, k.label, x + 18, yy + 32, { size: 16, color: BRAND.muted })
    texto(ctx, k.value, x + 18, yy + 72, { size: 32, weight: 700, color: k.alerta ? BRAND.fault : BRAND.dark })
  })
  const filas = Math.ceil(kpis.length / cols)
  return y + filas * h + (filas - 1) * gap
}

function dibujaPorDia(ctx: Ctx, data: InformeData['porDia'], x: number, y: number, w: number, h: number) {
  caja(ctx, x, y, w, h, 12, '#FFFFFF', '#E5E7EB')
  titulo(ctx, 'Checklist por día', x + 20, y + 36)
  const dias = data.slice(-MAX_DIAS)
  if (!dias.length) {
    texto(ctx, 'Sin datos en el periodo', x + w / 2, y + h / 2, { size: 16, color: BRAND.muted, align: 'center' })
    return
  }
  const gx = x + 56
  const gy = y + 70
  const gw = w - 56 - 24
  const gh = h - 70 - 56
  const max = Math.max(1, ...dias.map(d => d.sinFalla + d.conFalla))
  for (let i = 0; i <= 4; i++) {
    const yy = gy + gh - (gh * i) / 4
    ctx.strokeStyle = '#EEF1F0'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(gx, yy)
    ctx.lineTo(gx + gw, yy)
    ctx.stroke()
    texto(ctx, String(Math.round((max * i) / 4)), gx - 10, yy + 5, { size: 13, color: BRAND.muted, align: 'right' })
  }
  const paso = gw / dias.length
  const bw = Math.max(4, paso * 0.7)
  const cadaN = Math.ceil(dias.length / 10)
  dias.forEach((d, i) => {
    const bx = gx + i * paso + (paso - bw) / 2
    const hOk = (d.sinFalla / max) * gh
    const hFalla = (d.conFalla / max) * gh
    ctx.fillStyle = BRAND.primary
    ctx.fillRect(bx, gy + gh - hOk, bw, hOk)
    ctx.fillStyle = BRAND.fault
    ctx.fillRect(bx, gy + gh - hOk - hFalla, bw, hFalla)
    if (i % cadaN === 0) {
      texto(ctx, `${d.fecha.slice(8)}/${d.fecha.slice(5, 7)}`, bx + bw / 2, gy + gh + 22, { size: 13, color: BRAND.muted, align: 'center' })
    }
  })
  ctx.fillStyle = BRAND.primary
  ctx.fillRect(gx, y + h - 22, 12, 12)
  texto(ctx, 'Sin fallas', gx + 18, y + h - 12, { size: 13, color: BRAND.muted })
  ctx.fillStyle = BRAND.fault
  ctx.fillRect(gx + 100, y + h - 22, 12, 12)
  texto(ctx, 'Con fallas', gx + 118, y + h - 12, { size: 13, color: BRAND.muted })
}

function dibujaPorItem(ctx: Ctx, data: InformeData['porItem'], x: number, y: number, w: number, h: number) {
  caja(ctx, x, y, w, h, 12, '#FFFFFF', '#E5E7EB')
  titulo(ctx, 'Fallas por ítem', x + 20, y + 36)
  const etiquetaW = 190
  const valorW = 110
  const bx = x + 20 + etiquetaW
  const bwMax = w - 40 - etiquetaW - valorW
  const maxFallas = Math.max(1, ...data.map(d => d.fallas))
  const filaH = (h - 64) / Math.max(1, data.length)
  data.forEach((d, i) => {
    const yy = y + 56 + i * filaH
    const medio = yy + filaH / 2
    ctx.font = `400 15px ${FUENTE}`
    texto(ctx, recorta(ctx, d.name, etiquetaW - 12), x + 20, medio + 5, { size: 15, color: '#374151' })
    const largo = (d.fallas / maxFallas) * bwMax
    ctx.fillStyle = '#F1F5F3'
    ctx.fillRect(bx, medio - 8, bwMax, 16)
    ctx.fillStyle = barColor(d.tasa)
    ctx.fillRect(bx, medio - 8, largo, 16)
    texto(ctx, `${d.fallas} (${pct(d.fallas, d.revisiones)}%)`, bx + bwMax + 12, medio + 5, { size: 14, weight: 600, color: BRAND.dark })
  })
}

function dibujaPorFundo(ctx: Ctx, data: InformeData['porFundo'], y: number): number {
  const filas = data.slice(0, MAX_FUNDOS)
  const filaH = 38
  const h = 64 + filaH * (filas.length + 1)
  caja(ctx, PAD, y, W - PAD * 2, h, 12, '#FFFFFF', '#E5E7EB')
  titulo(ctx, 'Por fundo', PAD + 20, y + 36)
  const cols = [PAD + 20, PAD + 760, PAD + 1000, PAD + 1240]
  const cab = ['FUNDO', 'CHECKLIST', 'CON FALLAS', '% CON FALLAS']
  const yh = y + 64
  cab.forEach((c, i) => texto(ctx, c, cols[i], yh + 24, { size: 13, weight: 700, color: BRAND.muted }))
  if (!filas.length) {
    texto(ctx, 'Sin datos en el periodo', PAD + 20, yh + filaH + 24, { size: 16, color: BRAND.muted })
  }
  filas.forEach((f, i) => {
    const yy = yh + filaH * (i + 1)
    ctx.strokeStyle = '#EEF1F0'
    ctx.beginPath()
    ctx.moveTo(PAD + 20, yy)
    ctx.lineTo(W - PAD - 20, yy)
    ctx.stroke()
    const p = pct(f.conFalla, f.total)
    ctx.font = `400 16px ${FUENTE}`
    texto(ctx, recorta(ctx, f.fundo, 680), cols[0], yy + 25, { size: 16, color: '#374151' })
    texto(ctx, String(f.total), cols[1], yy + 25, { size: 16, color: '#374151' })
    texto(ctx, String(f.conFalla), cols[2], yy + 25, { size: 16, color: '#374151' })
    texto(ctx, `${p}%`, cols[3], yy + 25, { size: 16, weight: 700, color: complianceColor(100 - p) })
  })
  if (data.length > MAX_FUNDOS) {
    texto(ctx, `+ ${data.length - MAX_FUNDOS} fundos más (ver tablero)`, PAD + 20, y + h - 14, { size: 13, color: BRAND.muted })
  }
  return y + h
}

export async function descargarInformePng(d: InformeData, nombreArchivo: string): Promise<void> {
  const filasKpi = Math.ceil(d.kpis.length / 5)
  const altoKpis = filasKpi * 96 + (filasKpi - 1) * 16
  const altoGraficos = 400
  const filasFundo = Math.min(d.porFundo.length, MAX_FUNDOS)
  const altoFundo = 64 + 38 * (filasFundo + 1)
  const alto = 150 + 28 + altoKpis + 28 + altoGraficos + 28 + altoFundo + 28 + 40

  const canvas = document.createElement('canvas')
  canvas.width = W * ESCALA
  canvas.height = alto * ESCALA
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo generar la imagen en este dispositivo.')
  ctx.scale(ESCALA, ESCALA)

  ctx.fillStyle = BRAND.surface
  ctx.fillRect(0, 0, W, alto)

  ctx.fillStyle = BRAND.dark
  ctx.fillRect(0, 0, W, 150)
  ctx.fillStyle = BRAND.lime
  ctx.fillRect(0, 150, W, 5)
  texto(ctx, 'DOÑA ISIDORA · FLOTA MENOR', PAD, 46, { size: 16, weight: 700, color: BRAND.lime })
  texto(ctx, d.titulo, PAD, 94, { size: 40, weight: 700, color: '#FFFFFF' })
  ctx.font = `400 18px ${FUENTE}`
  texto(ctx, recorta(ctx, d.subtitulo, W - PAD * 2), PAD, 128, { size: 18, color: '#C9D6D1' })

  let y = 150 + 28
  y = dibujaKpis(ctx, d.kpis, y) + 28

  const gap = 20
  const colW = (W - PAD * 2 - gap) / 2
  dibujaPorDia(ctx, d.porDia, PAD, y, colW, altoGraficos)
  dibujaPorItem(ctx, d.porItem, PAD + colW + gap, y, colW, altoGraficos)
  y += altoGraficos + 28

  y = dibujaPorFundo(ctx, d.porFundo, y) + 28
  texto(ctx, `Generado el ${d.generado}`, PAD, y + 8, { size: 14, color: BRAND.muted })

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('No se pudo generar la imagen.')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
