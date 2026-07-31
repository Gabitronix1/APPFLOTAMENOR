export const PREGUNTAS = [
  {
    key: 'p1' as const, obs: 'obs1' as const, label: 'Fugas', short: 'Fugas',
    descripcion: 'Busque manchas frescas de fluidos bajo el motor o dentro de la cabina.',
  },
  {
    key: 'p2' as const, obs: 'obs2' as const, label: 'Neumáticos', short: 'Neumat.',
    descripcion: 'Revise visualmente la presión, desgaste de la huella y cortes en las 4 ruedas.',
  },
  {
    key: 'p3' as const, obs: 'obs3' as const, label: 'Luces', short: 'Luces',
    descripcion: 'Encienda las luces. Verifique que no haya ampolletas quemadas ni micas rotas.',
  },
  {
    key: 'p4' as const, obs: 'obs4' as const, label: 'Frenos y Dirección', short: 'Frenos',
    descripcion: 'Pruebe el freno de mano. En marcha corta, verifique frenado y que la dirección no tire hacia un lado.',
  },
  {
    key: 'p5' as const, obs: 'obs5' as const, label: 'Tablero', short: 'Tablero',
    descripcion: 'Encienda el motor. Confirme que no queden testigos de advertencia (luces rojas/amarillas) encendidos.',
  },
  {
    key: 'p6' as const, obs: 'obs6' as const, label: 'Neumático de Repuesto', short: 'Repuesto',
    descripcion: 'Verifique que esté en su lugar, inflado y sin daños visibles.',
  },
  {
    key: 'p7' as const, obs: 'obs7' as const, label: 'Asientos y Cinturones', short: 'Asientos',
    descripcion: 'Tire los cinturones para probar el bloqueo. Revise el anclaje firme del asiento.',
  },
  {
    key: 'p8' as const, obs: 'obs8' as const, label: 'Parabrisas y Vidrios', short: 'Parabrisas',
    descripcion: 'Busque trizaduras en los cristales y confirme que las plumillas no estén resecas o en mal estado.',
  },
  {
    key: 'p9' as const, obs: 'obs9' as const, label: 'Espejos', short: 'Espejos',
    descripcion: 'Revise que los espejos laterales y el retrovisor interior estén bien fijados y sin trizaduras.',
  },
  {
    key: 'p10' as const, obs: 'obs10' as const, label: 'Kit de Emergencia', short: 'Emergencia',
    descripcion: 'Revise la presencia y vigencia del extintor, botiquín y triángulos.',
  },
  {
    key: 'p11' as const, obs: 'obs11' as const, label: 'Puertas y Portón', short: 'Puertas',
    descripcion: 'Abra y cierre todas las puertas/portón trasero para asegurar su correcto enganche.',
  },
]

export type PKey = typeof PREGUNTAS[number]['key']
export type ObsKey = typeof PREGUNTAS[number]['obs']

// Matriz de criticidad (planilla "Personal que conduce", hoja "Criticidad"):
// severidad base de cada ítem en mal estado, y la condición que lo agrava
// de "precaución" (P) a "detención inmediata" (D).
export type Agravante = 'nocturna' | 'lluvia' | 'testigo_abs' | 'camion_combustible'

export const CRITICIDAD_ITEM: Record<PKey, { base: 'P' | 'D'; agravante?: { tipo: Agravante; comentario: string } }> = {
  p1: { base: 'P' }, // Fugas
  p2: { base: 'P' }, // Neumáticos
  p3: { base: 'P', agravante: { tipo: 'nocturna', comentario: 'Circulación nocturna' } }, // Luces
  p4: { base: 'D' }, // Frenos y Dirección
  p5: { base: 'P', agravante: { tipo: 'testigo_abs', comentario: 'Testigo ABS encendido' } }, // Tablero
  p6: { base: 'P' }, // Neumático de Repuesto
  p7: { base: 'D' }, // Asientos y Cinturones
  p8: { base: 'P', agravante: { tipo: 'lluvia', comentario: 'Con lluvia' } }, // Parabrisas y Vidrios
  p9: { base: 'D' }, // Espejos
  p10: { base: 'P', agravante: { tipo: 'camion_combustible', comentario: 'Camión combustible' } }, // Kit de Emergencia
  p11: { base: 'D' }, // Puertas y Portón
}

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

export function tiempoRelativo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHoras = Math.floor(diffMin / 60)
  const diffDias = Math.floor(diffHoras / 24)
  if (diffDias >= 1) return `hace ${diffDias} día${diffDias !== 1 ? 's' : ''}`
  if (diffHoras >= 1) return `hace ${diffHoras} hora${diffHoras !== 1 ? 's' : ''}`
  if (diffMin >= 1) return `hace ${diffMin} minuto${diffMin !== 1 ? 's' : ''}`
  return 'recién'
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
