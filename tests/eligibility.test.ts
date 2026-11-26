import { describe, expect, it } from 'vitest'
import { assessOpportunity, assessRequirement, createRoadmap, deadlineStatus, recommend, todayInPeru } from '../src/features/eligibility'
import { demoCatalog } from '../src/services/catalog'
import { emptyProfile } from '../src/types/domain'
import type { Opportunity, Profile } from '../src/types/domain'

const student: Profile = { ...emptyProfile, academicLevel: 'Pregrado', cycle: 3, english: 'B1', travel: 'Sí', skills: ['python'] }
const exchange = demoCatalog.find((item) => item.id === 'intercambio-ingenieria')!

describe('elegibilidad académica', () => {
  it('separa requisitos cumplidos, pendientes y por confirmar', () => {
    const assessment = assessOpportunity(exchange, student)
    expect(assessment).toMatchObject({ met: 2, gaps: 2, unknown: 0 })
    expect(assessOpportunity(exchange, emptyProfile)).toMatchObject({ met: 0, gaps: 0, unknown: 4 })
  })

  it('identifica criterios incompatibles y no cuenta los deseables como brechas formales', () => {
    expect(assessRequirement({ id: 'viaje', kind: 'travel', label: 'Viajar', mandatory: true }, { ...student, travel: 'No' })).toBe('No cumplido')
    const scholarship = demoCatalog[0]
    expect(assessOpportunity(scholarship, student)).toMatchObject({ met: 2, gaps: 0, unknown: 0 })
  })

  it('aplica el ciclo condicional solo al nivel indicado', () => {
    const internship = demoCatalog.find((item) => item.id === 'practicas-innovacion')!
    const requirement = internship.requirements[0]
    expect(assessRequirement(requirement, { ...student, academicLevel: 'Egresado', cycle: null })).toBe('Cumplido')
    expect(assessRequirement(requirement, student)).toBe('Pendiente')
    expect(assessRequirement(requirement, emptyProfile)).toBe('Por confirmar')
  })

  it('ordena los niveles de inglés según el MCER', () => {
    const requirement = exchange.requirements.find((item) => item.kind === 'english')!
    expect(assessRequirement(requirement, { ...student, english: 'B2' })).toBe('Cumplido')
    expect(assessRequirement(requirement, { ...student, english: 'C1' })).toBe('Cumplido')
    expect(assessRequirement(requirement, { ...student, english: '' })).toBe('Por confirmar')
  })

  it('mantiene abiertas las convocatorias durante el día de cierre en Perú', () => {
    const date = todayInPeru(new Date('2027-04-23T03:00:00Z'))
    expect(date).toBe('2027-04-22')
    expect(deadlineStatus('2027-04-22', date)).toBe('Abierta')
    expect(deadlineStatus('2027-04-21', date)).toBe('Vencida')
    expect(deadlineStatus(null, date)).toBe('Por confirmar')
  })

  it('recomienda solo ejemplos afines, aprobados y vigentes', () => {
    const futureExchange: Opportunity = { ...exchange, deadline: '2999-01-01' }
    const items: Opportunity[] = [futureExchange, { ...exchange, id: 'expired', deadline: '2000-01-01' }, { ...futureExchange, id: 'archived', status: 'Archivada' }]
    expect(recommend('Busco un intercambio internacional', student, items)).toMatchObject([{ opportunity: { id: exchange.id }, group: 'prepare' }])
    expect(recommend('Geología marina', student, items)).toEqual([])
  })

  it('reconoce objetivos de ejemplo escritos en plural', () => {
    const catalog = demoCatalog.map((item) => ({ ...item, deadline: '2999-01-01' }))
    expect(recommend('Me interesa participar en investigaciones internacionales', emptyProfile, catalog)[0].opportunity.category).toBe('Investigación')
  })

  it('crea acciones para las brechas y conserva el requisito que motivó cada acción', () => {
    const roadmap = createRoadmap(exchange, student)
    expect(roadmap.actions).toMatchObject([
      { id: 'ciclo', requirement: 'Estar al menos en sexto ciclo', completed: false },
      { id: 'ingles', requirement: 'Tener inglés B2 o superior', completed: false },
    ])
  })
})
