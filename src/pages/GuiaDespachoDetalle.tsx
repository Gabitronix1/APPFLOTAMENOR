import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useGuiaDespachoDetalle } from '../hooks/useGuiaDespachoDetalle'
import { ESTADO_GUIA_INFO, formatFolio, puedeDespacharGuia, puedeRecibirGuia, puedeCerrarGuia } from '../lib/guiasDespacho'
import { fmtDate, EMPRESA } from '../lib/constants'
import { DespacharGuiaModal } from '../components/guiasDespacho/DespacharGuiaModal'
import { RecibirGuiaModal } from '../components/guiasDespacho/RecibirGuiaModal'
import { CerrarGuiaModal } from '../components/guiasDespacho/CerrarGuiaModal'

type ModalAbierto = 'despachar' | 'recibir' | 'cerrar' | null

export function GuiaDespachoDetalle() {
  const { id } = useParams<{ id: string }>()
  const { perfil } = useAuth()
  const { guia, items, loading, error, notFound, refetch } = useGuiaDespachoDetalle(id)
  const [modal, setModal] = useState<ModalAbierto>(null)

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-8 text-sm text-gray-400 animate-pulse">Cargando...</div>
  if (notFound) return <div className="max-w-4xl mx-auto px-4 py-8 text-sm text-fault">Guía no encontrada.</div>
  if (error || !guia) return <div className="max-w-4xl mx-auto px-4 py-8 text-sm text-fault">{error ?? 'Error desconocido'}</div>

  const estadoInfo = ESTADO_GUIA_INFO[guia.estado]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="print:hidden mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to="/guias-despacho" className="text-xs text-gray-500 hover:text-dark underline">
            ← Volver a guías de despacho
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{formatFolio(guia.folio)}</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => window.print()} className="btn-secondary btn-sm">
            Imprimir
          </button>
          {puedeDespacharGuia(guia, perfil?.rol, perfil?.operador_id ?? null) && (
            <button onClick={() => setModal('despachar')} className="btn-primary btn-sm">
              Despachar
            </button>
          )}
          {puedeRecibirGuia(guia, perfil?.rol, perfil?.operador_id ?? null) && (
            <button onClick={() => setModal('recibir')} className="btn-primary btn-sm">
              Marcar recepción
            </button>
          )}
          {puedeCerrarGuia(guia, perfil?.rol) && (
            <button onClick={() => setModal('cerrar')} className="btn-primary btn-sm">
              Cerrar guía
            </button>
          )}
        </div>
      </div>

      <div className="card space-y-6">
        <div className="text-center border-b border-gray-100 pb-4">
          <p className="font-bold text-dark">{EMPRESA.nombre}</p>
          <p className="text-xs text-gray-500">RUT {EMPRESA.rut} · {EMPRESA.direccion} · {EMPRESA.giro}</p>
          <p className="text-lg font-bold text-dark mt-2">TRASLADO DE MERCANCÍAS</p>
          <p className="text-sm text-gray-500">{formatFolio(guia.folio)}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400">Estado</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${estadoInfo.badgeClass}`}>
              {estadoInfo.label}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-400">Fecha</p>
            <p className="font-medium">{fmtDate(guia.created_at)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">De almacén</p>
            <p className="font-medium">{guia.almacen_origen}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Fundo</p>
            <p className="font-medium">{guia.fundo}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Contrato</p>
            <p className="font-medium font-mono">{guia.contrato || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Vehículo</p>
            <p className="font-medium">{guia.patente || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Conductor</p>
            <p className="font-medium">{guia.conductor || '—'}</p>
          </div>
        </div>

        {guia.comentarios && (
          <div>
            <p className="text-xs text-gray-400">Comentarios</p>
            <p className="text-sm">{guia.comentarios}</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr>
                <th className="table-th">Producto</th>
                <th className="table-th">Equipo</th>
                <th className="table-th text-right">Planificado</th>
                <th className="table-th text-right">Enviado</th>
                <th className="table-th text-right">Recibido</th>
                <th className="table-th text-right">Devuelto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => (
                <tr key={item.id}>
                  <td className="table-td">
                    {item.producto}
                    {item.observacion && <p className="text-xs text-gray-400">{item.observacion}</p>}
                  </td>
                  <td className="table-td">{item.equipo || '—'}</td>
                  <td className="table-td text-right">{item.cantidad_planificada}</td>
                  <td className="table-td text-right">{item.cantidad_enviada ?? '—'}</td>
                  <td className="table-td text-right">{item.cantidad_recibida ?? '—'}</td>
                  <td className="table-td text-right">{item.cantidad_devuelta ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-1">Enviado</p>
            {guia.fecha_despacho ? (
              <>
                <p>{fmtDate(guia.fecha_despacho)}</p>
                <p className="text-xs text-gray-400">{guia.foto_despacho_path ? 'Con foto adjunta' : 'Sin foto adjunta'}</p>
              </>
            ) : (
              <p className="text-gray-400">Pendiente</p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Recibido</p>
            {guia.fecha_recepcion ? (
              <>
                <p>{guia.recibido_por_nombre} · {fmtDate(guia.fecha_recepcion)}</p>
                <p className="text-xs text-gray-400">
                  {guia.foto_recepcion_path ? 'Con foto adjunta' : 'Sin foto'} · {guia.firma_recepcion_path ? 'Con firma' : 'Sin firma'}
                </p>
              </>
            ) : (
              <p className="text-gray-400">Pendiente</p>
            )}
          </div>
        </div>
      </div>

      {modal === 'despachar' && (
        <DespacharGuiaModal guia={guia} items={items} onClose={() => setModal(null)} onSaved={() => { setModal(null); refetch() }} />
      )}
      {modal === 'recibir' && (
        <RecibirGuiaModal guia={guia} items={items} onClose={() => setModal(null)} onSaved={() => { setModal(null); refetch() }} />
      )}
      {modal === 'cerrar' && (
        <CerrarGuiaModal guia={guia} onClose={() => setModal(null)} onSaved={() => { setModal(null); refetch() }} />
      )}
    </div>
  )
}
