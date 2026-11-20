// Guía del odómetro en el Checklist: a partir de los últimos registros de la patente,
// detecta kilometrajes imposibles (dígitos de más o de menos, odómetro que "retrocede")
// y sugiere el valor que probablemente se quiso escribir.

export interface LecturaKm {
  fecha: string
  km: number
  tipo: string | null
  conductor: string | null
}

/** Fila del catálogo `km_patentes` (función historial_km_patentes): id = patente_id. */
export interface HistorialKm {
  id: string
  lecturas: LecturaKm[]
}

export interface ReferenciaKm {
  km: number
  fecha: Date
  conductor: string | null
  /** Recorrido diario típico del vehículo, estimado de sus registros. */
  kmDia: number
}

export interface EvaluacionKm {
  nivel: 'ok' | 'info' | 'warn'
  texto: string
  /** Valor que probablemente se quiso escribir (p. ej. sin el dígito repetido). */
  sugerido?: number
  /** Rango razonable para hoy, para mostrar como guía. */
  rango?: { min: number; max: number }
}

const DIA = 86_400_000
const KM_DIA_DEFECTO = 300
const KM_MAXIMO_ABSOLUTO = 1_500_000

function mediana(valores: number[]): number {
  const v = [...valores].sort((a, b) => a - b)
  const m = Math.floor(v.length / 2)
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2
}

export function formatoKm(km: number): string {
  return km.toLocaleString('es-CL')
}

/**
 * Último kilometraje confiable de la patente. Descarta los 0 y los registros que son
 * 3 veces mayores o menores que la mediana (típico de un dígito de más o de menos),
 * para que un error anterior no arruine la guía.
 */
export function referenciaKm(lecturas: LecturaKm[] | undefined): ReferenciaKm | null {
  const validas = (lecturas ?? [])
    .filter(l => l.km > 0)
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
  if (validas.length === 0) return null
  const med = mediana(validas.map(l => l.km))
  const confiables = validas.filter(l => l.km <= med * 3 && l.km >= med / 3)
  if (confiables.length === 0) return null

  const primera = confiables[0]
  const ultima = confiables[confiables.length - 1]
  const dias = (new Date(ultima.fecha).getTime() - new Date(primera.fecha).getTime()) / DIA
  const recorrido = ultima.km - primera.km
  const kmDia = dias >= 1 && recorrido > 0 ? Math.min(1200, Math.max(30, recorrido / dias)) : KM_DIA_DEFECTO

  return { km: ultima.km, fecha: new Date(ultima.fecha), conductor: ultima.conductor, kmDia }
}

/** Rango razonable para hoy: no menos que el último registro, y no más de lo que se puede recorrer desde entonces. */
export function rangoEsperado(ref: ReferenciaKm, ahora = new Date()): { min: number; max: number } {
  const dias = Math.max(0, (ahora.getTime() - ref.fecha.getTime()) / DIA)
  const holgura = Math.max(800, ref.kmDia * dias * 2.5 + 400)
  return { min: ref.km, max: Math.round(ref.km + holgura) }
}

// Variantes de un número sin uno de sus dígitos: así se recupera "34099" desde "340999".
// (Con un dígito de menos hay demasiadas opciones para adivinar: ahí solo se avisa.)
function sinUnDigito(km: number): number[] {
  const s = String(km)
  const out = new Set<number>()
  for (let i = 0; i < s.length; i++) {
    const sin = s.slice(0, i) + s.slice(i + 1)
    if (sin) out.add(Number(sin))
  }
  out.delete(km)
  return [...out]
}

function sugerenciaSinDigito(km: number, ref: ReferenciaKm, rango: { min: number; max: number }, ahora: Date): number | undefined {
  const dias = Math.max(0, (ahora.getTime() - ref.fecha.getTime()) / DIA)
  const esperado = ref.km + ref.kmDia * dias
  const candidatos = sinUnDigito(km).filter(v => v >= rango.min && v <= rango.max)
  if (candidatos.length === 0) return undefined
  return candidatos.sort((a, b) => Math.abs(a - esperado) - Math.abs(b - esperado))[0]
}

export function evaluarKm(km: number, ref: ReferenciaKm | null, ahora = new Date()): EvaluacionKm | null {
  if (!ref) {
    if (km <= 0) return { nivel: 'warn', texto: 'Escribe el kilometraje que marca el tablero.' }
    if (km > KM_MAXIMO_ABSOLUTO) return { nivel: 'warn', texto: `${formatoKm(km)} km es demasiado. Revisa que no te sobre un dígito.` }
    return { nivel: 'info', texto: 'Es el primer kilometraje que se registra de este vehículo: revísalo bien en el tablero.' }
  }

  const rango = rangoEsperado(ref, ahora)
  if (km <= 0) {
    return { nivel: 'warn', texto: `Escribe el kilometraje que marca el tablero. Debería estar entre ${formatoKm(rango.min)} y ${formatoKm(rango.max)} km.`, rango }
  }
  if (km < rango.min) {
    const faltaDigito = km * 10 >= rango.min * 0.5
    return {
      nivel: 'warn',
      texto: faltaDigito && km < rango.min / 5
        ? `Es mucho menor que el último registro (${formatoKm(ref.km)} km). ¿Te faltó un dígito?`
        : `Es menor que el último registro (${formatoKm(ref.km)} km) y el odómetro no retrocede. Revisa el tablero.`,
      rango,
    }
  }
  if (km > rango.max) {
    const sugerido = sugerenciaSinDigito(km, ref, rango, ahora)
    return {
      nivel: 'warn',
      texto: sugerido
        ? `Son ${formatoKm(km - ref.km)} km más que el último registro: parece que te sobra un dígito.`
        : `Son ${formatoKm(km - ref.km)} km más que el último registro, más de lo que se alcanza a recorrer. Revisa el tablero.`,
      sugerido,
      rango,
    }
  }
  return { nivel: 'ok', texto: `${formatoKm(km - ref.km)} km recorridos desde el último registro.`, rango }
}

/** Checklist del mismo tipo hecho a esta patente hace menos de 12 horas (posible registro repetido). */
export function checklistReciente(lecturas: LecturaKm[] | undefined, tipo: string, ahora = new Date()): LecturaKm | null {
  const recientes = (lecturas ?? []).filter(
    l => l.tipo === tipo && ahora.getTime() - new Date(l.fecha).getTime() < 12 * 3_600_000,
  )
  return recientes.length ? recientes[recientes.length - 1] : null
}

export function haceCuanto(fecha: Date, ahora = new Date()): string {
  const horas = (ahora.getTime() - fecha.getTime()) / 3_600_000
  if (horas < 1) return 'hace menos de 1 hora'
  if (horas < 24) return `hace ${Math.floor(horas)} h`
  const dias = Math.floor(horas / 24)
  return dias === 1 ? 'ayer' : `hace ${dias} días`
}
