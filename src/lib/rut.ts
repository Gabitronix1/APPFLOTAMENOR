// RUT chileno: validación, formato y el correo técnico que usa Supabase para las cuentas
// que ingresan con RUT (la persona nunca lo ve ni necesita tener correo).

/** Deja solo dígitos y K: "12.345.678-k" → "12345678K". */
export function limpiarRut(valor: string): string {
  return valor.replace(/[^0-9kK]/g, '').toUpperCase()
}

function digitoVerificador(cuerpo: string): string {
  let suma = 0
  let multiplo = 2
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplo
    multiplo = multiplo === 7 ? 2 : multiplo + 1
  }
  const resto = 11 - (suma % 11)
  return resto === 11 ? '0' : resto === 10 ? 'K' : String(resto)
}

export function rutValido(valor: string): boolean {
  const limpio = limpiarRut(valor)
  if (limpio.length < 8 || limpio.length > 9) return false
  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)
  if (!/^\d+$/.test(cuerpo)) return false
  return digitoVerificador(cuerpo) === dv
}

/** Formato canónico que se guarda en la BD: "12345678-K". */
export function rutCanonico(valor: string): string {
  const limpio = limpiarRut(valor)
  return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`
}

/** Formato para mostrar mientras se escribe: "12.345.678-K". */
export function formatearRut(valor: string): string {
  const limpio = limpiarRut(valor).slice(0, 9)
  if (limpio.length < 2) return limpio
  const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${cuerpo}-${limpio.slice(-1)}`
}

// Dominio técnico solo para Supabase Auth: nunca recibe correos (no se usa recuperación
// de contraseña por correo en cuentas con RUT; la clave la resetea un jefe).
export const DOMINIO_RUT = 'rut.isidorachile.cl'

/** Correo técnico de la cuenta de una persona que ingresa con RUT. */
export function emailDeRut(valor: string): string {
  return `${limpiarRut(valor).toLowerCase()}@${DOMINIO_RUT}`
}
