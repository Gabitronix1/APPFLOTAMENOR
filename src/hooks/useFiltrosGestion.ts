import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Condicion } from '../lib/gestionFlota'

// Filtros del Centro de gestión Flota Menor. Viven en la URL (?contrato=CP1&periodo=7…) para que
// un link compartido abra el tablero con los mismos filtros, y sobreviven a recargar la página.
export type Periodo = '7' | '30' | '90' | '365' | 'todo' | 'rango'

export interface FiltrosGestion {
  periodo: Periodo
  desde: string
  hasta: string
  contrato: string
  categoria: string
  propiedad: string // Interno / Arriendo
  estado: string // estado operativo (patentes.estado_actual)
  patente: string
  conductor: string
  tipo: '' | 'completo' | 'diario'
  indicadores: boolean // solo vehículos que afectan indicadores
  situacion: '' | Condicion
  umbral: number // días sin checklist para alertar
}

export const UMBRALES = [1, 2, 3, 7, 14]
const DEFAULTS: FiltrosGestion = {
  periodo: '30',
  desde: '',
  hasta: '',
  contrato: '',
  categoria: '',
  propiedad: '',
  estado: '',
  patente: '',
  conductor: '',
  tipo: '',
  indicadores: false,
  situacion: '',
  umbral: 3,
}

// Claves que cuentan como "filtro activo" (el período y el umbral son ajustes, no filtros).
const CLAVES_FILTRO: (keyof FiltrosGestion)[] = [
  'contrato', 'categoria', 'propiedad', 'estado', 'patente', 'conductor', 'tipo', 'indicadores', 'situacion',
]

const PERIODOS: Periodo[] = ['7', '30', '90', '365', 'todo', 'rango']

export function useFiltrosGestion() {
  const [params, setParams] = useSearchParams()

  const filtros = useMemo<FiltrosGestion>(() => {
    const periodo = params.get('periodo') as Periodo | null
    const umbral = Number(params.get('umbral'))
    const tipo = params.get('tipo')
    const situacion = params.get('situacion')
    return {
      periodo: periodo && PERIODOS.includes(periodo) ? periodo : DEFAULTS.periodo,
      desde: params.get('desde') ?? '',
      hasta: params.get('hasta') ?? '',
      contrato: params.get('contrato') ?? '',
      categoria: params.get('categoria') ?? '',
      propiedad: params.get('propiedad') ?? '',
      estado: params.get('estado') ?? '',
      patente: params.get('patente') ?? '',
      conductor: params.get('conductor') ?? '',
      tipo: tipo === 'completo' || tipo === 'diario' ? tipo : '',
      indicadores: params.get('indicadores') === '1',
      situacion: (['detencion', 'restriccion', 'apta', 'sin_datos'] as const).find(s => s === situacion) ?? '',
      umbral: UMBRALES.includes(umbral) ? umbral : DEFAULTS.umbral,
    }
  }, [params])

  const setFiltros = useCallback((cambios: Partial<FiltrosGestion>) => {
    setParams(prev => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(cambios)) {
        const def = DEFAULTS[k as keyof FiltrosGestion]
        if (v === def || v === '' || v === false) next.delete(k)
        else next.set(k, v === true ? '1' : String(v))
      }
      return next
    }, { replace: true })
  }, [setParams])

  const limpiar = useCallback(() => {
    setParams(prev => {
      const next = new URLSearchParams(prev)
      CLAVES_FILTRO.forEach(k => next.delete(k))
      return next
    }, { replace: true })
  }, [setParams])

  const activos = CLAVES_FILTRO.filter(k => filtros[k] !== DEFAULTS[k]).length

  return { filtros, setFiltros, limpiar, activos }
}
