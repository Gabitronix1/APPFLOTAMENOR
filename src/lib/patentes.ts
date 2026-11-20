// Patentes: formato estándar y detección de patentes "casi iguales" (errores de tipeo),
// para no crear como vehículo nuevo uno que ya existe.

/** Formato estándar que se guarda en la BD: solo letras y números, en mayúsculas ("TG-BR-99" → "TGBR99"). */
export function normalizarPatente(valor: string): string {
  return valor.replace(/[^0-9a-zA-Z]/g, '').toUpperCase()
}

// Formatos de placa chilena: autos nuevos (BBBB12), antiguos (AB1234) y motos (BBB12 / AB123).
const FORMATOS = [/^[A-Z]{4}\d{2}$/, /^[A-Z]{2}\d{4}$/, /^[A-Z]{3}\d{2}$/, /^[A-Z]{2}\d{3}$/]

export function formatoPatenteValido(valor: string): boolean {
  const p = normalizarPatente(valor)
  return FORMATOS.some(f => f.test(p))
}

// Caracteres que se confunden al tipear una placa (las placas no usan O, Q ni I): se comparan como iguales.
const CONFUNDIBLES: Record<string, string> = { O: '0', Q: '0', I: '1' }

function canonica(valor: string): string {
  return normalizarPatente(valor)
    .split('')
    .map(c => CONFUNDIBLES[c] ?? c)
    .join('')
}

// Distancia de edición con transposición de vecinos (Damerau-Levenshtein restringida):
// "TZJW76" vs "TZYW76" = 1 (una letra distinta); "TGRB99" vs "TGBR99" = 1 (dos letras invertidas).
function distancia(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 0; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + costo)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }
  return d[a.length][b.length]
}

/**
 * Patentes registradas que podrían ser la que se está escribiendo con un error de tipeo:
 * a lo más un carácter distinto, de más, de menos o dos caracteres invertidos.
 * No incluye la idéntica (esa ya se encuentra en el buscador).
 */
export function patentesParecidas<T extends { patente: string }>(texto: string, patentes: T[], max = 3): T[] {
  const q = canonica(texto)
  if (q.length < 4) return []
  const n = normalizarPatente(texto)
  return patentes
    .filter(p => normalizarPatente(p.patente) !== n)
    .map(p => ({ p, d: distancia(q, canonica(p.patente)) }))
    .filter(x => x.d <= 1)
    .sort((a, b) => a.d - b.d)
    .slice(0, max)
    .map(x => x.p)
}
