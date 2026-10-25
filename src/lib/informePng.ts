import { BRAND, barColor, complianceColor } from './constants'

export interface InformeKpi {
  label: string
  value: string
  alerta?: boolean
}

export interface InformeContrato {
  contrato: string
  checklist: number
  vehiculos: number
  conFalla: number
  fallas: number
  resueltas: number
}

export interface InformeFalla {
  fecha: string
  item: string
  obs: string
  estado: string
}

export interface InformePatente {
  patente: string
  contrato: string
  checklist: number
  conFalla: number
  fallas: InformeFalla[]
}

export interface InformeData {
  titulo: string
  subtitulo: string
  generado: string
  kpis: InformeKpi[]
  porDia: { fecha: string; sinFalla: number; conFalla: number }[]
  porItem: { name: string; fallas: number; revisiones: number; tasa: number }[]
  porContrato: InformeContrato[]
  /** Patentes con al menos una falla, con el detalle de cada una. */
  porPatente: InformePatente[]
  /** Patentes que reportaron checklist sin ninguna falla. */
  sinFallas: string[]
}

const W = 1600
const PAD = 48
const ESCALA = 2
const FUENTE = '"Helvetica Neue", Arial, sans-serif'
const MAX_DIAS = 30
const MAX_CONTRATOS = 12
const MAX_FILAS_DETALLE = 60
const KPI_COLS = 6
const KPI_H = 96
const KPI_GAP = 16
const FILA_CONTRATO_H = 38
const GRUPO_H = 40
const FILA_FALLA_H = 32

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

function recorta(ctx: Ctx, s: string, maxAncho: number, size = 16, weight = 400): string {
  ctx.font = `${weight} ${size}px ${FUENTE}`
  if (ctx.measureText(s).width <= maxAncho) return s
  let t = s
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxAncho) t = t.slice(0, -1)
  return `${t}…`
}

function envuelve(ctx: Ctx, s: string, maxAncho: number, size: number): string[] {
  ctx.font = `400 ${size}px ${FUENTE}`
  const lineas: string[] = []
  let actual = ''
  s.split(' ').forEach(palabra => {
    const prueba = actual ? `${actual} ${palabra}` : palabra
    if (actual && ctx.measureText(prueba).width > maxAncho) {
      lineas.push(actual)
      actual = palabra
    } else {
      actual = prueba
    }
  })
  if (actual) lineas.push(actual)
  return lineas
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

function titulo(ctx: Ctx, s: string, x: number, y: number, sub?: string) {
  texto(ctx, s, x, y, { size: 22, weight: 700, color: BRAND.dark })
  if (sub) {
    ctx.font = `700 22px ${FUENTE}`
    const w = ctx.measureText(s).width
    texto(ctx, sub, x + w + 14, y, { size: 14, color: BRAND.muted })
  }
}

function pct(n: number, total: number): number {
  return total ? Math.round((n / total) * 100) : 0
}

function colorEstado(estado: string): string {
  if (estado === 'Resuelta') return BRAND.primary
  if (estado === 'Pendiente') return BRAND.fault
  if (estado === 'Asignada' || estado === 'En progreso') return BRAND.warn
  return BRAND.muted
}

function dibujaKpis(ctx: Ctx, kpis: InformeKpi[], y: number): number {
  const w = (W - PAD * 2 - KPI_GAP * (KPI_COLS - 1)) / KPI_COLS
  kpis.forEach((k, i) => {
    const x = PAD + (i % KPI_COLS) * (w + KPI_GAP)
    const yy = y + Math.floor(i / KPI_COLS) * (KPI_H + KPI_GAP)
    caja(ctx, x, yy, w, KPI_H, 12, '#FFFFFF', '#E5E7EB')
    texto(ctx, recorta(ctx, k.label, w - 30, 15), x + 18, yy + 32, { size: 15, color: BRAND.muted })
    texto(ctx, k.value, x + 18, yy + 72, { size: 30, weight: 700, color: k.alerta ? BRAND.fault : BRAND.dark })
  })
  const filas = Math.ceil(kpis.length / KPI_COLS)
  return y + filas * KPI_H + (filas - 1) * KPI_GAP
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
  const maxReal = Math.max(1, ...dias.map(d => d.sinFalla + d.conFalla))
  const paso4 = Math.ceil(maxReal / 4)
  const max = paso4 * 4
  for (let i = 0; i <= 4; i++) {
    const yy = gy + gh - (gh * i) / 4
    ctx.strokeStyle = '#EEF1F0'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(gx, yy)
    ctx.lineTo(gx + gw, yy)
    ctx.stroke()
    texto(ctx, String(paso4 * i), gx - 10, yy + 5, { size: 13, color: BRAND.muted, align: 'right' })
  }
  const paso = gw / dias.length
  const bw = Math.min(70, Math.max(4, paso * 0.7))
  const cadaN = Math.ceil(dias.length / 10)
  dias.forEach((d, i) => {
    const bx = gx + i * paso + (paso - bw) / 2
    const hOk = (d.sinFalla / max) * gh
    const hFalla = (d.conFalla / max) * gh
    ctx.fillStyle = BRAND.primary
    ctx.fillRect(bx, gy + gh - hOk, bw, hOk)
    ctx.fillStyle = BRAND.fault
    ctx.fillRect(bx, gy + gh - hOk - hFalla, bw, hFalla)
    if (d.sinFalla + d.conFalla > 0) {
      texto(ctx, String(d.sinFalla + d.conFalla), bx + bw / 2, gy + gh - hOk - hFalla - 6, { size: 13, weight: 700, color: BRAND.dark, align: 'center' })
    }
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
  titulo(ctx, 'Fallas por ítem', x + 20, y + 36, '% sobre las veces que se revisó el ítem')
  const etiquetaW = 190
  const valorW = 110
  const bx = x + 20 + etiquetaW
  const bwMax = w - 40 - etiquetaW - valorW
  const maxFallas = Math.max(1, ...data.map(d => d.fallas))
  const filaH = (h - 64) / Math.max(1, data.length)
  data.forEach((d, i) => {
    const yy = y + 56 + i * filaH
    const medio = yy + filaH / 2
    texto(ctx, recorta(ctx, d.name, etiquetaW - 12, 15), x + 20, medio + 5, { size: 15, color: '#374151' })
    const largo = (d.fallas / maxFallas) * bwMax
    ctx.fillStyle = '#F1F5F3'
    ctx.fillRect(bx, medio - 8, bwMax, 16)
    ctx.fillStyle = barColor(d.tasa)
    ctx.fillRect(bx, medio - 8, largo, 16)
    texto(ctx, `${d.fallas} (${pct(d.fallas, d.revisiones)}%)`, bx + bwMax + 12, medio + 5, { size: 14, weight: 600, color: BRAND.dark })
  })
}

function dibujaPorContrato(ctx: Ctx, data: InformeContrato[], y: number): number {
  const filas = data.slice(0, MAX_CONTRATOS)
  const extra = data.length > MAX_CONTRATOS ? 26 : 0
  const h = 64 + FILA_CONTRATO_H * (filas.length + 1) + extra
  caja(ctx, PAD, y, W - PAD * 2, h, 12, '#FFFFFF', '#E5E7EB')
  titulo(ctx, 'Por contrato', PAD + 20, y + 36, 'Línea de operación del vehículo · % = checklist con al menos una falla')
  const x0 = PAD + 20
  const cols = [x0, x0 + 480, x0 + 620, x0 + 770, x0 + 910, x0 + 1150, x0 + 1260, x0 + 1370]
  const cab = ['CONTRATO', 'CHECKLIST', 'VEHÍCULOS', 'CON FALLA', '% CON FALLA', 'FALLAS', 'RESUELTAS', 'PENDIENTES']
  const yh = y + 64
  cab.forEach((c, i) => texto(ctx, c, cols[i], yh + 24, { size: 13, weight: 700, color: BRAND.muted }))
  if (!filas.length) {
    texto(ctx, 'Sin datos en el periodo', x0, yh + FILA_CONTRATO_H + 24, { size: 16, color: BRAND.muted })
  }
  filas.forEach((f, i) => {
    const yy = yh + FILA_CONTRATO_H * (i + 1)
    ctx.strokeStyle = '#EEF1F0'
    ctx.beginPath()
    ctx.moveTo(x0, yy)
    ctx.lineTo(W - PAD - 20, yy)
    ctx.stroke()
    const p = pct(f.conFalla, f.checklist)
    const pendientes = f.fallas - f.resueltas
    const t = (s: string, c: number, weight = 400, color = '#374151') => texto(ctx, s, cols[c], yy + 25, { size: 16, weight, color })
    t(recorta(ctx, f.contrato, 450), 0, 600, BRAND.dark)
    t(String(f.checklist), 1)
    t(String(f.vehiculos), 2)
    t(String(f.conFalla), 3)
    ctx.fillStyle = '#F1F5F3'
    ctx.fillRect(cols[4], yy + 12, 120, 12)
    ctx.fillStyle = complianceColor(100 - p)
    ctx.fillRect(cols[4], yy + 12, (120 * p) / 100, 12)
    texto(ctx, `${p}%`, cols[4] + 132, yy + 25, { size: 16, weight: 700, color: complianceColor(100 - p) })
    t(String(f.fallas), 5)
    t(String(f.resueltas), 6, 400, BRAND.primary)
    t(String(pendientes), 7, pendientes > 0 ? 700 : 400, pendientes > 0 ? BRAND.fault : '#374151')
  })
  if (data.length > MAX_CONTRATOS) {
    texto(ctx, `+ ${data.length - MAX_CONTRATOS} contratos más (ver tablero)`, x0, y + h - 12, { size: 13, color: BRAND.muted })
  }
  return y + h
}

interface GrupoVisible {
  p: InformePatente
  fallas: InformeFalla[]
}

function recortaDetalle(porPatente: InformePatente[]): { grupos: GrupoVisible[]; ocultas: number } {
  const grupos: GrupoVisible[] = []
  let usadas = 0
  let ocultas = 0
  porPatente.forEach(p => {
    const disponibles = Math.max(0, MAX_FILAS_DETALLE - usadas)
    const visibles = p.fallas.slice(0, disponibles)
    ocultas += p.fallas.length - visibles.length
    if (visibles.length) grupos.push({ p, fallas: visibles })
    usadas += visibles.length
  })
  return { grupos, ocultas }
}

function alturaDetalle(grupos: GrupoVisible[], ocultas: number, lineasSinFallas: number): number {
  const filas = grupos.reduce((s, g) => s + g.fallas.length, 0)
  const sinFallas = lineasSinFallas ? 24 + lineasSinFallas * 22 + 12 : 0
  return 64 + 30 + grupos.length * GRUPO_H + filas * FILA_FALLA_H + (ocultas ? 30 : 0) + (grupos.length ? 0 : 40) + sinFallas + 14
}

function dibujaDetalle(
  ctx: Ctx,
  grupos: GrupoVisible[],
  ocultas: number,
  lineasSinFallas: string[],
  totalSinFallas: number,
  y: number,
  h: number,
): number {
  caja(ctx, PAD, y, W - PAD * 2, h, 12, '#FFFFFF', '#E5E7EB')
  titulo(ctx, 'Detalle por patente', PAD + 20, y + 36, 'Fecha del reporte y falla detectada · estado de la orden de trabajo')
  const x0 = PAD + 20
  const cFecha = x0 + 150
  const cFalla = x0 + 330
  const cObs = x0 + 590
  const cEstado = x0 + 1300
  let yy = y + 64
  ;[['PATENTE', x0], ['FECHA REPORTE', cFecha], ['FALLA', cFalla], ['OBSERVACIÓN DEL CONDUCTOR', cObs], ['ESTADO OT', cEstado]].forEach(([c, x]) =>
    texto(ctx, String(c), Number(x), yy + 16, { size: 13, weight: 700, color: BRAND.muted }),
  )
  yy += 30

  if (!grupos.length) {
    texto(ctx, 'Ninguna patente reportó fallas en el periodo.', x0, yy + 24, { size: 16, color: BRAND.muted })
    yy += 40
  }

  grupos.forEach(g => {
    ctx.fillStyle = '#EEF5F1'
    ctx.fillRect(x0 - 8, yy, W - PAD * 2 - 24, GRUPO_H - 4)
    texto(ctx, g.p.patente, x0, yy + 24, { size: 18, weight: 700, color: BRAND.dark })
    texto(ctx, recorta(ctx, g.p.contrato, 130, 14), cFecha, yy + 24, { size: 14, weight: 600, color: BRAND.primary })
    const p = pct(g.p.conFalla, g.p.checklist)
    texto(
      ctx,
      `${g.p.checklist} checklist · ${g.p.conFalla} con falla (${p}%) · ${g.p.fallas.length} falla${g.p.fallas.length !== 1 ? 's' : ''}`,
      cFalla, yy + 24, { size: 14, color: '#374151' },
    )
    yy += GRUPO_H
    g.fallas.forEach(f => {
      texto(ctx, f.fecha, cFecha, yy + 21, { size: 15, color: '#374151' })
      texto(ctx, recorta(ctx, f.item, 245, 15, 600), cFalla, yy + 21, { size: 15, weight: 600, color: BRAND.dark })
      texto(ctx, recorta(ctx, f.obs || '—', 690, 14), cObs, yy + 21, { size: 14, color: f.obs ? '#4B5563' : BRAND.muted })
      texto(ctx, f.estado, cEstado, yy + 21, { size: 15, weight: 700, color: colorEstado(f.estado) })
      yy += FILA_FALLA_H
    })
  })

  if (ocultas) {
    texto(ctx, `+ ${ocultas} falla${ocultas !== 1 ? 's' : ''} más (ver tablero o exportar CSV)`, x0, yy + 20, { size: 13, color: BRAND.muted })
    yy += 30
  }

  if (lineasSinFallas.length) {
    yy += 8
    texto(ctx, `Sin fallas en el periodo (${totalSinFallas} patente${totalSinFallas !== 1 ? 's' : ''}):`, x0, yy + 16, { size: 14, weight: 700, color: BRAND.primary })
    lineasSinFallas.forEach((l, i) => texto(ctx, l, x0, yy + 38 + i * 22, { size: 14, color: '#4B5563' }))
  }
  return y + h
}

export async function descargarInformePng(d: InformeData, nombreArchivo: string): Promise<void> {
  const medida = document.createElement('canvas').getContext('2d')
  if (!medida) throw new Error('No se pudo generar la imagen en este dispositivo.')

  const { grupos, ocultas } = recortaDetalle(d.porPatente)
  const textoSinFallas = [...d.sinFallas].sort().join(' · ')
  const lineasSinFallas = textoSinFallas ? envuelve(medida, textoSinFallas, W - PAD * 2 - 40, 14).slice(0, 4) : []

  const filasKpi = Math.ceil(d.kpis.length / KPI_COLS)
  const altoKpis = filasKpi * KPI_H + (filasKpi - 1) * KPI_GAP
  const altoGraficos = 400
  const altoContrato = 64 + FILA_CONTRATO_H * (Math.min(d.porContrato.length, MAX_CONTRATOS) + 1) + (d.porContrato.length > MAX_CONTRATOS ? 26 : 0)
  const altoDetalle = alturaDetalle(grupos, ocultas, lineasSinFallas.length)
  const alto = 150 + 28 + altoKpis + 28 + altoGraficos + 28 + altoContrato + 28 + altoDetalle + 28 + 40

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
  texto(ctx, recorta(ctx, d.subtitulo, W - PAD * 2, 18), PAD, 128, { size: 18, color: '#C9D6D1' })

  let y = 150 + 28
  y = dibujaKpis(ctx, d.kpis, y) + 28

  const gap = 20
  const colW = (W - PAD * 2 - gap) / 2
  dibujaPorDia(ctx, d.porDia, PAD, y, colW, altoGraficos)
  dibujaPorItem(ctx, d.porItem, PAD + colW + gap, y, colW, altoGraficos)
  y += altoGraficos + 28

  y = dibujaPorContrato(ctx, d.porContrato, y) + 28
  y = dibujaDetalle(ctx, grupos, ocultas, lineasSinFallas, d.sinFallas.length, y, altoDetalle) + 28
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
