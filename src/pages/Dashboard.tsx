import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEstadoFlotaMaquinaria } from '../hooks/useEstadoFlotaMaquinaria'
import { useDisponibilidadMaquinaria } from '../hooks/useDisponibilidadMaquinaria'
import { PanelSection } from '../components/dashboard/PanelSection'
import { SemaforoFlota } from '../components/dashboard/SemaforoFlota'
import { MaquinariasAtencion } from '../components/dashboard/MaquinariasAtencion'
import { DisponibilidadWidget } from '../components/dashboard/DisponibilidadWidget'
import { GestionFlotaMenor } from '../components/gestion/GestionFlotaMenor'
import { ESTADOS_MAQUINARIA } from '../lib/vehiculos'
import { esRolAdministrativo, puedeVerDashboardFlotaMenor } from '../lib/roles'
import type { EstadoMaquinaria } from '../types'

function FlotaMayor() {
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<EstadoMaquinaria | null>(null)
  const estadoFlota = useEstadoFlotaMaquinaria(true)
  const disponibilidad = useDisponibilidadMaquinaria(true)

  return (
    <div>
      <h2 className="text-xl font-bold text-dark mb-1">Flota Mayor</h2>
      <p className="text-sm text-gray-500 mb-5">Maquinaria — estado operativo ahora mismo.</p>

      <PanelSection title="Semáforo de maquinarias" hint="Click en un chip filtra la lista de abajo">
        <SemaforoFlota
          counts={estadoFlota.counts}
          loading={estadoFlota.loading}
          selected={estadoSeleccionado}
          onSelect={setEstadoSeleccionado}
          estados={ESTADOS_MAQUINARIA}
        />
      </PanelSection>

      <PanelSection title="Maquinarias que requieren atención">
        <MaquinariasAtencion
          maquinarias={estadoFlota.maquinarias}
          filtroEstado={estadoSeleccionado}
          loading={estadoFlota.loading}
          error={estadoFlota.error}
        />
      </PanelSection>

      <PanelSection title="Disponibilidad de maquinarias" hint="Últimos 30 días">
        <div className="card">
          <DisponibilidadWidget
            data={disponibilidad.disponibilidad}
            loading={disponibilidad.loading}
            error={disponibilidad.error}
          />
        </div>
      </PanelSection>
    </div>
  )
}

export function Dashboard() {
  const { perfil } = useAuth()
  const [params, setParams] = useSearchParams()

  // Flota Menor la ven además Bodega y el Coordinador de Flota Menor; Flota Mayor (maquinaria)
  // queda solo para los roles administrativos.
  const puedeVerFlotaMenor = puedeVerDashboardFlotaMenor(perfil?.rol)
  const puedeVerFlotaMayor = esRolAdministrativo(perfil?.rol)
  const vista = puedeVerFlotaMayor && (params.get('vista') === 'mayor' || !puedeVerFlotaMenor) ? 'mayor' : 'menor'

  function cambiarVista(v: 'menor' | 'mayor') {
    // Cada vista tiene sus propios filtros: al cambiar se parte limpio.
    setParams(v === 'mayor' ? { vista: 'mayor' } : {}, { replace: true })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-dark mb-1">Gestión de flota</h1>
          <p className="text-sm text-gray-500">Estado, atención requerida y cumplimiento según lo reportado en terreno.</p>
        </div>
        {puedeVerFlotaMenor && puedeVerFlotaMayor && (
          <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm bg-white" role="tablist">
            {([['menor', 'Flota Menor'], ['mayor', 'Flota Mayor']] as const).map(([v, l]) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={vista === v}
                onClick={() => cambiarVista(v)}
                className={`px-4 py-2 font-medium transition-colors ${vista === v ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      {vista === 'menor' && puedeVerFlotaMenor && <GestionFlotaMenor />}
      {vista === 'mayor' && puedeVerFlotaMayor && <FlotaMayor />}
    </div>
  )
}
