export const categories = ['Becas', 'Intercambios', 'Investigación', 'Hackathons', 'Conferencias', 'Certificaciones', 'Liderazgo', 'Voluntariados', 'Oportunidades profesionales'] as const
export const modalities = ['Presencial', 'Virtual', 'Híbrida'] as const
export const fundingOptions = ['Completo', 'Parcial', 'Sin financiamiento', 'Por confirmar'] as const
export const academicLevels = ['Pregrado', 'Egresado', 'Posgrado'] as const
export const englishLevels = ['Sin nivel', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

export type Category = typeof categories[number]
export type Profile = {
  university: string
  program: string
  academicLevel: typeof academicLevels[number] | ''
  cycle: number | null
  english: typeof englishLevels[number] | ''
  certificate: '' | 'Sí' | 'No'
  skills: string[]
  interests: string[]
  goals: string
  projects: string
  research: string
  funding: typeof fundingOptions[number] | ''
  travel: '' | 'Sí' | 'No'
  destinations: string[]
}

export const emptyProfile: Profile = {
  university: '', program: '', academicLevel: '', cycle: null, english: '', certificate: '',
  skills: [], interests: [], goals: '', projects: '', research: '', funding: '', travel: '', destinations: [],
}

export type Requirement = { id: string; label: string; mandatory: boolean; source?: string; unit?: string } & (
  | { kind: 'cycle'; minimum: number; whenLevel?: typeof academicLevels[number] }
  | { kind: 'english'; minimum: typeof englishLevels[number] }
  | { kind: 'certificate' | 'travel' | 'manual' }
  | { kind: 'skill'; skill: string }
  | { kind: 'level'; levels: (typeof academicLevels[number])[] }
)

export type Opportunity = {
  id: string
  title: string
  organization: string
  category: Category
  country: string
  modality: typeof modalities[number]
  funding: typeof fundingOptions[number]
  levels: (typeof academicLevels[number])[]
  deadline: string | null
  verified: string | null
  source: string | null
  description: string
  benefits: string[]
  pending: string[]
  topics: string[]
  requirements: Requirement[]
  status: 'Aprobada' | 'Archivada'
  closed?: boolean
  updatedAt?: string
}

export const savedStatuses = ['Guardada', 'Me interesa', 'En preparación', 'Postulé', 'Finalizada'] as const
export type SavedStatus = typeof savedStatuses[number]
export type SubmissionStatus = 'Pendiente' | 'En revisión' | 'Aprobada' | 'Rechazada' | 'Archivada'
export type Submission = {
  id: string
  source: string
  text: string
  category: Category | ''
  comment: string
  status: SubmissionStatus
  submittedAt: string
  reviewedAt?: string
  publishedOpportunityId?: string
  moderatorNote?: string
}

export type RequirementStatus = 'Cumplido' | 'Pendiente' | 'No cumplido' | 'Por confirmar'
export type RoadmapAction = {
  id: string
  title: string
  description: string
  requirement?: string
  requirementId?: string
  priority: 'Alta' | 'Media'
  duration: string
  resources?: { label: string; url: string }[]
  completed: boolean
}
export type Roadmap = { id: string; opportunityId: string; title: string; origin: 'deterministic' | 'ai'; actions: RoadmapAction[] }
