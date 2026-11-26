import type { Opportunity, Requirement } from '../types/domain'

const undergraduate: Requirement = { id: 'pregrado', label: 'Estar cursando un programa de pregrado', kind: 'level', levels: ['Pregrado'], mandatory: true }

const examples = [
  {
    id: 'beca-tecnologia-andina', category: 'Becas', title: 'Beca Talento Digital Andino', organization: 'Fundación Horizonte Andino',
    country: 'Perú', modality: 'Híbrida', funding: 'Completo', levels: ['Pregrado'], deadline: '2027-04-22',
    description: 'Un programa de formación en tecnología para estudiantes que quieren aplicar ciencia de datos e inteligencia artificial a desafíos de sus comunidades.',
    benefits: ['Cobertura del programa formativo', 'Acompañamiento para un proyecto aplicado', 'Talleres de desarrollo profesional'],
    topics: ['inteligencia artificial', 'ciencia de datos', 'tecnología', 'python', 'innovación'],
    requirements: [undergraduate, { id: 'python', label: 'Fundamentos de Python', kind: 'skill', skill: 'Python', mandatory: true }, { id: 'project', label: 'Haber participado en un proyecto técnico', kind: 'manual', mandatory: false }],
  },
  {
    id: 'intercambio-ingenieria', category: 'Intercambios', title: 'Intercambio de Ingeniería Aplicada', organization: 'Red Universitaria del Pacífico',
    country: 'Chile', modality: 'Presencial', funding: 'Parcial', levels: ['Pregrado'], deadline: '2027-05-14',
    description: 'Un semestre académico orientado a la ingeniería aplicada, con proyectos en equipo, asignaturas electivas y actividades de intercambio cultural.',
    benefits: ['Exoneración de matrícula en la universidad anfitriona', 'Tutoría académica durante el semestre'],
    topics: ['ingeniería', 'estudiar en el extranjero', 'movilidad', 'intercambio', 'internacional'],
    requirements: [undergraduate, { id: 'ciclo', label: 'Estar al menos en sexto ciclo', kind: 'cycle', minimum: 6, mandatory: true }, { id: 'ingles', label: 'Tener inglés B2 o superior', kind: 'english', minimum: 'B2', mandatory: true }, { id: 'viajar', label: 'Contar con disponibilidad para viajar', kind: 'travel', mandatory: true }],
  },
  {
    id: 'investigacion-datos', category: 'Investigación', title: 'Semillero de Investigación en IA', organization: 'Laboratorio Abierto Latinoamericano',
    country: 'México', modality: 'Virtual', funding: 'Completo', levels: ['Pregrado', 'Egresado'], deadline: '2027-06-03',
    description: 'Participa de forma remota en un proyecto de investigación en inteligencia artificial y aprende a documentar métodos y resultados con un equipo internacional.',
    benefits: ['Acceso a mentoría metodológica', 'Talleres de investigación reproducible'],
    topics: ['inteligencia artificial', 'investigación', 'aprendizaje automático', 'python', 'internacional'],
    requirements: [{ id: 'python', label: 'Conocer Python', kind: 'skill', skill: 'Python', mandatory: true }, { id: 'motivation', label: 'Preparar una carta de motivación', kind: 'manual', mandatory: true }],
  },
  {
    id: 'hackathon-ciudad', category: 'Hackathons', title: 'Hackathon Ciudades Vivas', organization: 'Colectivo Territorio Abierto',
    country: 'Perú', modality: 'Presencial', funding: 'Sin financiamiento', levels: ['Pregrado', 'Egresado'], deadline: '2027-06-21',
    description: 'Un fin de semana para prototipar soluciones a problemas de movilidad y sostenibilidad urbana.',
    benefits: ['Acompañamiento durante el prototipado'], topics: ['sostenibilidad', 'innovación', 'tecnología'],
    requirements: [{ id: 'team', label: 'Integrar un equipo de tres a cinco personas', kind: 'manual', mandatory: true }],
  },
  {
    id: 'congreso-tecnologia', category: 'Conferencias', title: 'Encuentro de Tecnología para el Bien Común', organization: 'Red Campus Abierto',
    country: 'Colombia', modality: 'Virtual', funding: 'Sin financiamiento', levels: ['Pregrado', 'Egresado', 'Posgrado'], deadline: '2027-07-02',
    description: 'Charlas abiertas y mesas de trabajo sobre el impacto social de la tecnología en América Latina.',
    benefits: ['Acceso a sesiones virtuales abiertas'], topics: ['tecnología', 'impacto social', 'investigación'],
    requirements: [],
  },
  {
    id: 'certificacion-datos', category: 'Certificaciones', title: 'Certificación en Análisis de Datos', organization: 'Instituto Datos para Todos',
    country: 'Perú', modality: 'Virtual', funding: 'Parcial', levels: ['Pregrado', 'Egresado'], deadline: '2027-07-20',
    description: 'Formación práctica en análisis de datos, visualización y comunicación de hallazgos.',
    benefits: ['Materiales y ejercicios prácticos'], topics: ['ciencia de datos', 'tecnología', 'sql'],
    requirements: [{ id: 'excel', label: 'Conocer hojas de cálculo', kind: 'skill', skill: 'Excel', mandatory: false }],
  },
  {
    id: 'liderazgo-campus', category: 'Liderazgo', title: 'Escuela de Liderazgo Universitario', organization: 'Comunidad Puentes',
    country: 'Perú', modality: 'Híbrida', funding: 'Completo', levels: ['Pregrado'], deadline: null,
    description: 'Un espacio para desarrollar habilidades de liderazgo y diseñar una iniciativa para tu campus.',
    benefits: ['Talleres de liderazgo colaborativo'], topics: ['liderazgo', 'impacto social'], requirements: [undergraduate],
  },
  {
    id: 'voluntariado-educacion', category: 'Voluntariados', title: 'Voluntariado de Educación Digital', organization: 'Aula Compartida',
    country: 'Perú', modality: 'Virtual', funding: 'Sin financiamiento', levels: ['Pregrado', 'Egresado'], deadline: '2026-08-04',
    description: 'Apoyo educativo para que escolares desarrollen sus primeras habilidades digitales.',
    benefits: ['Formación previa para voluntarios'], topics: ['educación', 'impacto social', 'tecnología'],
    requirements: [{ id: 'time', label: 'Disponer de dos horas semanales', kind: 'manual', mandatory: true }],
  },
  {
    id: 'practicas-innovacion', category: 'Oportunidades profesionales', title: 'Prácticas en Innovación Pública', organization: 'Observatorio de Servicios Públicos',
    country: 'Perú', modality: 'Híbrida', funding: 'Por confirmar', levels: ['Pregrado', 'Egresado'], deadline: '2027-08-19',
    description: 'Participación en un equipo multidisciplinario que investiga y prototipa mejoras en servicios públicos.',
    benefits: ['Experiencia guiada en investigación y diseño'], topics: ['innovación', 'diseño', 'impacto social'],
    requirements: [{ id: 'ciclo', label: 'Estar al menos en octavo ciclo si cursas pregrado', kind: 'cycle', minimum: 8, whenLevel: 'Pregrado', mandatory: true }],
  },
] satisfies Omit<Opportunity, 'verified' | 'source' | 'pending' | 'status'>[]

export const demoCatalog: Opportunity[] = examples.map((opportunity) => ({
  ...opportunity,
  verified: null,
  source: null,
  pending: ['Ejemplo ficticio sin fuente oficial ni verificación.'],
  status: 'Aprobada',
}))
