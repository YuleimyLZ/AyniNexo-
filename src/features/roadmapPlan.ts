import { createRoadmap, opportunityStatus, todayInPeru } from './eligibility'
import type { Horizon } from '../services/aiContracts'
import type { Opportunity, Profile, RoadmapAction } from '../types/domain'

export const preparationSteps = {
  documentos: {
    title: 'Organiza tus documentos',
    description: 'Prepara una lista de documentos y busca con tiempo los formatos, traducciones o referencias que indique la fuente oficial.',
  },
  idiomas: {
    title: 'Practica inglés académico',
    description: 'Define un hábito de práctica. Usa los recursos gratuitos para practicar lectura, escritura y conversación.',
    resources: [{ label: 'British Council · LearnEnglish', url: 'https://learnenglish.britishcouncil.org/' }],
  },
  experiencia: {
    title: 'Documenta un proyecto de aprendizaje',
    description: 'Selecciona un problema de tu área, prepara un proyecto pequeño y documenta tu método, resultados y aprendizajes.',
    resources: [{ label: 'MIT OpenCourseWare', url: 'https://ocw.mit.edu/' }],
  },
  fuente: {
    title: 'Verifica la próxima postulación',
    description: 'Revisa fechas, modalidades y condiciones publicadas. Si buscas una edición futura, consulta a la institución cuando abra su convocatoria.',
  },
} satisfies Record<string, Pick<RoadmapAction, 'title' | 'description' | 'resources'>>
export type PreparationStep = keyof typeof preparationSteps
export const stepIds = Object.keys(preparationSteps) as PreparationStep[]

export function roadmapWindow(horizon: Horizon, deadline: string | null, closed?: boolean) {
  if (!deadline || opportunityStatus({ deadline, closed }) !== 'Abierta') return horizon
  const days = Math.floor((Date.parse(deadline) - Date.parse(todayInPeru())) / 86400000)
  if (days === 0) return 'hasta hoy'
  if (days < 7) return 'hasta ' + days + (days === 1 ? ' día' : ' días')
  const weeks = Math.floor(days / 7)
  if (days <= 90) return 'hasta ' + weeks + (weeks === 1 ? ' semana' : ' semanas')
  const months = Math.max(1, Math.floor(days / 30))
  return months >= horizon ? horizon : 'hasta ' + months + ' meses'
}

export function buildPreparationPlan(opportunity: Opportunity, profile: Profile, horizon: Horizon, suggestions: PreparationStep[] = []) {
  const plan = createRoadmap(opportunity, profile)
  const window = roadmapWindow(horizon, opportunity.deadline, opportunity.closed)
  const duration = typeof window === 'number' ? 'Hasta ' + window + ' meses para el plan' : window + ' hasta el cierre'
  const base = plan.actions.slice(0, 26).map((action) => ({
    ...action,
    duration: typeof window === 'number' ? action.duration : 'Prioriza en el tiempo disponible',
    resources: opportunity.source ? [{ label: 'Fuente oficial', url: opportunity.source }] : [],
  }))
  const steps = suggestions.length ? suggestions : stepIds
  return {
    ...plan,
    origin: suggestions.length ? 'ai' as const : 'deterministic' as const,
    actions: [
      ...base,
      ...steps.map((step) => ({
        ...preparationSteps[step],
        id: step,
        priority: 'Media' as const,
        duration,
        completed: false,
      })),
    ],
  }
}
