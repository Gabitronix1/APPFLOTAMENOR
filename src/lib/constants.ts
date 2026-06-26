export const PREGUNTAS = [
  { key: 'p1' as const, obs: 'obs1' as const, label: 'Fugas', short: 'Fugas' },
  { key: 'p2' as const, obs: 'obs2' as const, label: 'Neumáticos', short: 'Neumat.' },
  { key: 'p3' as const, obs: 'obs3' as const, label: 'Luces', short: 'Luces' },
  { key: 'p4' as const, obs: 'obs4' as const, label: 'Frenos/Dir.', short: 'Frenos' },
  { key: 'p5' as const, obs: 'obs5' as const, label: 'Ruidos/Alarmas', short: 'Ruidos' },
  { key: 'p6' as const, obs: 'obs6' as const, label: 'Repuesto', short: 'Repuesto' },
]

export type PKey = typeof PREGUNTAS[number]['key']
export type ObsKey = typeof PREGUNTAS[number]['obs']

export const BRAND = {
  dark: '#0A2826',
  primary: '#18885F',
  lime: '#70B838',
  fault: '#C0402A',
  warn: '#C98300',
  surface: '#F4FAF7',
  muted: '#667A74',
} as const

export const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export function fmtNum(n: number): string {
  return n.toLocaleString('es-CL')
}

export function severityLabel(score: number): 'alta' | 'media' | 'baja' {
  if (score >= 35) return 'alta'
  if (score >= 18) return 'media'
  return 'baja'
}

export function severityColor(label: 'alta' | 'media' | 'baja'): string {
  if (label === 'alta') return BRAND.fault
  if (label === 'media') return BRAND.warn
  return BRAND.primary
}

export function complianceColor(pct: number): string {
  if (pct >= 85) return BRAND.primary
  if (pct >= 50) return BRAND.warn
  return BRAND.fault
}

export function barColor(rate: number): string {
  if (rate >= 0.3) return BRAND.fault
  if (rate >= 0.12) return BRAND.warn
  return BRAND.primary
}
