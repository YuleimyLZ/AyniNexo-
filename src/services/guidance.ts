import { emptyProfile } from '../types/domain'
import type { Profile } from '../types/domain'

export const sampleProfile: Profile = {
  ...emptyProfile, academicLevel: 'Pregrado', cycle: 3, english: 'B1', travel: 'Sí', skills: ['Python'],
}
