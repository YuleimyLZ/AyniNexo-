import { englishLevels } from '../types/domain'
import type { Opportunity, Profile, Requirement, RequirementStatus, Roadmap } from '../types/domain'

export const normalize = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

export function todayInPeru(date = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Lima' }).format(date)
}

export function deadlineStatus(deadline: string | null, today = todayInPeru()) {
  if (!deadline) return 'Por confirmar'
  return deadline < today ? 'Vencida' : 'Abierta'
}

export function opportunityStatus(opportunity: Pick<Opportunity, 'closed' | 'deadline'>) {
  return opportunity.closed ? 'Cerrada' : deadlineStatus(opportunity.deadline)
}

export function assessRequirement(requirement: Requirement, profile: Profile): RequirementStatus {
  switch (requirement.kind) {
    case 'cycle':
      if (requirement.whenLevel) {
        if (!profile.academicLevel) return 'Por confirmar'
        if (profile.academicLevel !== requirement.whenLevel) return 'Cumplido'
      }
      if (profile.cycle === null) return 'Por confirmar'
      return profile.cycle >= requirement.minimum ? 'Cumplido' : 'Pendiente'
    case 'english':
      if (!profile.english) return 'Por confirmar'
      return englishLevels.indexOf(profile.english) >= englishLevels.indexOf(requirement.minimum) ? 'Cumplido' : 'Pendiente'
    case 'certificate':
      return profile.certificate === '' ? 'Por confirmar' : profile.certificate === 'Sí' ? 'Cumplido' : 'Pendiente'
    case 'travel':
      return profile.travel === '' ? 'Por confirmar' : profile.travel === 'Sí' ? 'Cumplido' : 'No cumplido'
    case 'level':
      if (profile.academicLevel === '') return 'Por confirmar'
      return requirement.levels.includes(profile.academicLevel) ? 'Cumplido' : 'No cumplido'
    case 'skill':
      if (!profile.skills.length) return 'Por confirmar'
      return profile.skills.some((skill) => normalize(skill) === normalize(requirement.skill)) ? 'Cumplido' : 'Pendiente'
    case 'manual':
      return 'Por confirmar'
  }
}

export function assessOpportunity(opportunity: Opportunity, profile: Profile) {
  const requirements = opportunity.requirements.map((requirement) => ({ ...requirement, result: assessRequirement(requirement, profile) }))
  const mandatory = requirements.filter((requirement) => requirement.mandatory)
  return {
    requirements,
    met: mandatory.filter((item) => item.result === 'Cumplido').length,
    gaps: mandatory.filter((item) => item.result === 'Pendiente' || item.result === 'No cumplido').length,
    unknown: mandatory.filter((item) => item.result === 'Por confirmar').length,
  }
}

const commonWords = new Set('para quiero quisiera estoy una este esta que del los las con mis por como busco donde cuando tercer ciclo poder hay interes interesa ocupo participar tengo sobre financiamiento'.split(' '))

function objectiveTerms(goal: string) {
  const text = normalize(goal).replace(/\bia\b/g, 'inteligencia artificial')
  return [...new Set(text.split(/[^a-z0-9]+/).filter((term) => term.length >= 3 && !commonWords.has(term)))]
}

export function recommend(goal: string, profile: Profile, catalog: Opportunity[]) {
  const terms = objectiveTerms(`${goal} ${profile.interests.join(' ')}`)
  return catalog.filter((opportunity) => opportunity.status === 'Aprobada' && deadlineStatus(opportunity.deadline) !== 'Vencida')
    .filter((opportunity) => !opportunity.closed)
    .map((opportunity) => {
      const attributes = normalize([opportunity.title, opportunity.category, opportunity.country, opportunity.funding, ...opportunity.topics].join(' '))
      const words = new Set(attributes.split(/[^a-z0-9]+/))
      const matches = terms.filter((term) => {
        const variants = [term, `${term}s`, `${term}es`, term.replace(/es$/, ''), term.replace(/s$/, '')]
        return variants.some((variant) => words.has(variant))
      })
      const assessment = assessOpportunity(opportunity, profile)
      const group = assessment.gaps ? 'prepare' : assessment.unknown || !opportunity.deadline ? 'confirm' : 'now'
      return { opportunity, matches, assessment, group }
    })
    .filter((item) => item.matches.length > 0)
    .sort((first, second) => second.matches.length - first.matches.length)
    .slice(0, 6)
}

const preparation = {
  cycle: ['Planifica tus próximos ciclos', 'Revisa tu plan de estudios y ubica en qué semestre alcanzarás el ciclo requerido.'],
  english: ['Fortalece tu inglés', 'Haz un diagnóstico de tu nivel y reserva tiempo semanal para comprensión, escritura y conversación.'],
  certificate: ['Prepara una certificación', 'Confirma qué certificados acepta la convocatoria y revisa los plazos de examen y resultados.'],
  travel: ['Evalúa tu disponibilidad para viajar', 'Revisa el calendario, los costes previstos y tus compromisos antes de elegir una fecha.'],
  level: ['Verifica el nivel académico', 'Confirma el nivel exigido con la institución cuando tengas una convocatoria oficial.'],
  skill: ['Practica la habilidad requerida', 'Elige un proyecto pequeño en el que puedas aplicar la habilidad y documentar lo que aprendiste.'],
  manual: ['Prepara el requisito indicado', 'Revisa la documentación solicitada y organiza evidencias o materiales para comprobar este requisito.'],
} as const

export function createRoadmap(opportunity: Opportunity, profile: Profile): Roadmap {
  const actions = assessOpportunity(opportunity, profile).requirements
    .filter((requirement) => requirement.result !== 'Cumplido')
    .map((requirement) => ({
      id: requirement.id,
      title: preparation[requirement.kind][0],
      description: preparation[requirement.kind][1],
      requirement: requirement.label,
      requirementId: requirement.id,
      priority: requirement.mandatory ? 'Alta' as const : 'Media' as const,
      duration: requirement.kind === 'english' ? '4–12 semanas' : '1–2 semanas',
      completed: false,
    }))
  return {
    id: opportunity.id,
    opportunityId: opportunity.id,
    origin: 'deterministic',
    title: opportunity.title,
    actions: actions.length ? actions : [{ id: 'review', title: 'Prepara tu postulación', description: 'Organiza tus evidencias y contrasta los requisitos con una fuente oficial cuando esté disponible.', priority: 'Media', duration: '1 semana', completed: false }],
  }
}

export function formatDate(date: string | null) {
  if (!date) return 'Por confirmar'
  return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))
}
