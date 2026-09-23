import { useAuth } from '../context/AuthContext'
import { useOnline } from '../hooks/useOnline'

// Aviso para quien se registró sin señal: aún no tiene cuenta en el servidor.
export function ProvisionalBanner() {
  const { provisional } = useAuth()
  const online = useOnline()
  if (!provisional) return null
  return (
    <div className="bg-warn/15 border-b border-warn/30 px-4 py-3 print:hidden">
      <div className="max-w-lg mx-auto text-sm text-gray-800">
        <p className="font-semibold">
          {provisional.nombre}, tu cuenta está esperando señal
        </p>
        <p className="text-xs text-gray-600 mt-0.5">
          {online
            ? 'Creando tu cuenta…'
            : 'Te registraste sin señal. Puedes hacer Checklist: todo queda guardado en el celular y tu cuenta se crea sola apenas haya señal.'}
        </p>
      </div>
    </div>
  )
}
