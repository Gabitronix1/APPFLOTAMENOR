import { ESTADO_DOCUMENTO_INFO } from '../../lib/documentos'
import type { EstadoDocumento } from '../../types'

interface Props {
  estado: EstadoDocumento
  className?: string
}

export function EstadoDocumentoBadge({ estado, className = '' }: Props) {
  const info = ESTADO_DOCUMENTO_INFO[estado]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${info.badgeClass} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${info.dotClass}`} />
      {info.label}
    </span>
  )
}
