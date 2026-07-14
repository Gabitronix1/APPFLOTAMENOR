import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEstadoFlotaMaquinaria } from '../../hooks/useEstadoFlotaMaquinaria'
import { EstadoBadge } from '../vehiculos/EstadoBadge'
import type { CategoriaMaquinaria, Maquinaria } from '../../types'

interface SecMaquinasAtencionProps {
  maquinarias: Maquinaria[]
  categorias: CategoriaMaquinaria[]
}

const SIN_CATEGORIA = 'Sin categoría'

export function SecMaquinasAtencion({ maquinarias, categorias }: SecMaquinasAtencionProps) {
  const navigate = useNavigate()
  const { maquinarias: estados, loading, error } = useEstadoFlotaMaquinaria(true)

  const categoriaPorMaquinariaId = useMemo(() => {
    const nombrePorId = new Map(categorias.map(c => [c.id, c.nombre]))
    return new Map(maquinarias.map(m => [m.id, (m.categoria_id && nombrePorId.get(m.categoria_id)) || SIN_CATEGORIA]))
  }, [maquinarias, categorias])

  const lista = useMemo(() => {
    const ahora = Date.now()
    return estados
      .filter(m => m.estado !== 'operativo')
      .map(m => ({
        ...m,
        categoria: categoriaPorMaquinariaId.get(m.id) ?? SIN_CATEGORIA,
        dias: m.fecha ? Math.floor((ahora - new Date(m.fecha).getTime()) / 86400000) : null,
      }))
      .sort((a, b) => (b.dias ?? -1) - (a.dias ?? -1))
  }, [estados, categoriaPorMaquinariaId])

  if (loading) {
    return <div className="text-sm text-gray-400 animate-pulse py-8 text-center">Cargando estado de maquinarias...</div>
  }
  if (error) {
    return <div className="text-fault text-sm">{error}</div>
  }
  if (!lista.length) {
    return (
      <div className="rounded-xl bg-primary/5 border border-primary/20 p-6 text-center text-gray-500 text-sm">
        Todas las maquinarias están operativas. 👍
      </div>
    )
  }

  return (
    <div className="card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="table-th">Máquina</th>
              <th className="table-th">Estado</th>
              <th className="table-th">Motivo del cambio</th>
              <th className="table-th text-center">Días en ese estado</th>
              <th className="table-th">Categoría</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lista.map(m => (
              <tr
                key={m.id}
                onClick={() => navigate(`/maquinarias/${m.id}`)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="table-td">
                  <span className="font-mono font-bold text-dark">{m.codigo}</span>
                  <span className="text-sm text-gray-500 ml-2">{m.nombre}</span>
                </td>
                <td className="table-td"><EstadoBadge estado={m.estado} /></td>
                <td className="table-td text-sm text-gray-600">{m.motivo ?? <span className="text-gray-400 italic">sin motivo registrado</span>}</td>
                <td className="table-td text-center">
                  {m.dias == null ? <span className="text-xs text-gray-400">—</span> : <span className={m.dias > 7 ? 'badge-fault' : 'badge-warn'}>{m.dias}d</span>}
                </td>
                <td className="table-td text-sm text-gray-500">{m.categoria}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
