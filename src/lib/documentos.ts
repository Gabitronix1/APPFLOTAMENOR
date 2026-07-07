import type { DocumentoVencimiento, EstadoDocumento, Patente, TipoDocumento, VDocumentoVencimiento } from '../types'

export const ESTADO_DOCUMENTO_INFO: Record<
  EstadoDocumento,
  { label: string; badgeClass: string; dotClass: string }
> = {
  vencido: { label: 'Vencido', badgeClass: 'bg-fault/20 text-fault', dotClass: 'bg-fault' },
  por_vencer: { label: 'Por vencer', badgeClass: 'bg-warn/20 text-warn', dotClass: 'bg-warn' },
  vigente: { label: 'Vigente', badgeClass: 'bg-lime/20 text-primary', dotClass: 'bg-primary' },
  sin_registro: { label: 'Sin registro', badgeClass: 'bg-gray-200 text-gray-500', dotClass: 'bg-gray-400' },
}

export const ESTADOS_DOCUMENTO_FILTRO: { value: EstadoDocumento | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'vencido', label: 'Vencidos' },
  { value: 'por_vencer', label: 'Por vencer' },
  { value: 'vigente', label: 'Vigentes' },
  { value: 'sin_registro', label: 'Sin registro' },
]

export const ORDEN_ESTADO_DOCUMENTO: Record<EstadoDocumento, number> = {
  vencido: 0,
  sin_registro: 1,
  por_vencer: 2,
  vigente: 3,
}

export function diasRestantesLabel(dias: number): string {
  if (dias === 0) return 'Vence hoy'
  if (dias > 0) return `${dias} día${dias !== 1 ? 's' : ''} restante${dias !== 1 ? 's' : ''}`
  const abs = Math.abs(dias)
  return `Vencido hace ${abs} día${abs !== 1 ? 's' : ''}`
}

export function combinarDocumentos(
  patentes: Pick<Patente, 'id' | 'patente'>[],
  tipos: TipoDocumento[],
  vencimientos: VDocumentoVencimiento[],
): DocumentoVencimiento[] {
  const porClave = new Map<string, VDocumentoVencimiento>()
  for (const v of vencimientos) porClave.set(`${v.patente_id}:${v.tipo_documento_id}`, v)

  const result: DocumentoVencimiento[] = []
  for (const p of patentes) {
    for (const t of tipos) {
      const row = porClave.get(`${p.id}:${t.id}`)
      result.push(
        row
          ? {
              patenteId: p.id,
              patente: p.patente,
              tipoDocumentoId: t.id,
              tipoDocumento: t.nombre,
              estado: row.estado,
              fechaVencimiento: row.fecha_vencimiento,
              diasRestantes: row.dias_restantes,
              documentoId: row.id,
              numeroDocumento: row.numero_documento,
              archivoPath: row.archivo_path,
            }
          : {
              patenteId: p.id,
              patente: p.patente,
              tipoDocumentoId: t.id,
              tipoDocumento: t.nombre,
              estado: 'sin_registro',
              fechaVencimiento: null,
              diasRestantes: null,
              documentoId: null,
              numeroDocumento: null,
              archivoPath: null,
            },
      )
    }
  }
  return result
}
