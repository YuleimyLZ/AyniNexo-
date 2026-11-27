import { readOpportunity } from '../../src/services/records'
import type { CatalogRow } from '../../src/services/records'
import type { RequirementRow } from '../../src/types/database'

export const ownerId = 'ca000000-0000-4000-8000-000000000001'
export const studentId = 'ca000000-0000-4000-8000-000000000002'
export const ethId = 'ca000000-0000-4000-8000-000000000003'
export const cernId = 'ca000000-0000-4000-8000-000000000004'
export const planId = 'ca000000-0000-4000-8000-000000000005'
export const date = '2026-11-27T14:00:00Z'

const base = {
  category: 'Investigación', country: 'Suiza', modality: 'Presencial', funding: 'Completo',
  academic_levels: ['Pregrado', 'Posgrado'], benefits: [] as string[], pending_information: ['Consulta el detalle en la fuente oficial.'],
  topics: ['Inteligencia artificial', 'Machine Learning', 'Data Science'], verified_on: '2026-11-26',
  is_public: true, publication_status: 'published', call_status: 'automatic', created_at: date, updated_at: date,
} as const
function requirement(opportunity_id: string, number: number, label: string, kind: RequirementRow['kind'] = 'manual'): RequirementRow {
  return {
    id: 'ca000000-0000-4000-8000-' + (Number(opportunity_id.at(-1)) * 100 + number).toString().padStart(12, '0'),
    opportunity_id, label, mandatory: true, kind, condition: {}, source: null, unit: null, display_order: number,
    required_value: kind === 'level' ? ['Pregrado', 'Posgrado'] : null, created_at: date, updated_at: date,
  }
}
export const catalogRows: CatalogRow[] = [{
  ...base,
  id: ethId, title: 'ETH Student Summer Research Fellowship 2027', organization: 'ETH Zürich',
  deadline: '2026-12-16', source: 'https://inf.ethz.ch/studies/summer-research-fellowship/how-to-apply.html',
  description: 'Programa internacional de investigación en ciencias de la computación para estudiantes de pregrado y maestría.',
  academic_levels: [...base.academic_levels], topics: [...base.topics, 'Computer Science'], pending_information: [...base.pending_information],
  opportunity_requirements: [
    requirement(ethId, 1, 'Estudiante de pregrado o maestría', 'level'),
    requirement(ethId, 2, 'Haber completado dos años de estudios al iniciar el programa'),
    requirement(ethId, 3, 'Estudiar computación o una carrera afín'),
    requirement(ethId, 4, 'Dominio funcional del inglés'),
    requirement(ethId, 5, 'Graduación prevista en 2028 o después'),
    requirement(ethId, 6, 'CV en inglés, historial académico y carta de motivación'),
  ],
}, {
  ...base,
  id: cernId, title: 'CERN openlab Summer Student Programme 2027', organization: 'CERN openlab',
  deadline: '2027-01-21', source: 'https://openlab.cern/cern-openlab-summer-student-programme/',
  description: 'Programa internacional de investigación para estudiantes de computación, matemáticas, ingeniería y física.',
  academic_levels: [...base.academic_levels], topics: [...base.topics, 'Física'], pending_information: [...base.pending_information],
  opportunity_requirements: [
    requirement(cernId, 1, 'Estudiante de pregrado o maestría', 'level'),
    requirement(cernId, 2, 'Tres años de estudios universitarios completados para junio de 2027'),
    requirement(cernId, 3, 'Perfil sólido en computación'),
    requirement(cernId, 4, 'CV en inglés'),
    requirement(cernId, 5, 'Carta de referencia académica'),
    requirement(cernId, 6, 'Historial académico y constancia de matrícula'),
  ],
}]
export const catalog = catalogRows.map(readOpportunity)

export const kaustUrl = 'https://admissions.kaust.edu.sa/study/internships'
const kaustTitle = 'Visiting Student Research Program (VSRP)'
const kaustDescription = 'VSRP is a research internship at KAUST in Saudi Arabia.'
const kaustEligibility = 'Applicants must be in the third or fourth year of a bachelor’s degree or enrolled in a master’s degree.'
const kaustBenefits = 'KAUST covers housing and flights and provides a monthly stipend.'
export const kaustText = [kaustTitle + '.', kaustDescription, kaustEligibility, kaustBenefits, 'Application deadlines: All year round.'].join(' ')
export const kaustOutput = {
  title: { value: kaustTitle, quote: kaustTitle },
  organization: { value: 'KAUST', quote: kaustDescription },
  category: { value: 'Investigación', quote: kaustDescription },
  country: { value: 'Saudi Arabia', quote: kaustDescription },
  modality: null, funding: null, deadline: null,
  description: { value: kaustDescription, quote: kaustDescription },
  benefits: [{ value: kaustBenefits, quote: kaustBenefits }],
  topics: [], levels: [{ value: 'Pregrado', quote: kaustEligibility }, { value: 'Posgrado', quote: kaustEligibility }],
  requirements: [{ quote: kaustEligibility, mandatory: true, kind: 'cycle', value: '6' }],
  pending: [],
}
