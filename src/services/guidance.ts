import { createRoadmap, recommend } from '../features/eligibility'
import { emptyProfile } from '../types/domain'
import type { Opportunity, Profile, Roadmap } from '../types/domain'

export const sampleProfile: Profile = {
  ...emptyProfile, academicLevel: 'Pregrado', cycle: 3, english: 'B1', travel: 'Sí', skills: ['Python'],
}

export interface GuidanceService {
  match(goal: string, profile: Profile, catalog: Opportunity[]): Promise<ReturnType<typeof recommend>>
  plan(opportunity: Opportunity, profile: Profile): Promise<Roadmap>
}

export const guidanceService: GuidanceService = {
  async match(goal, profile, catalog) {
    return recommend(goal, profile, catalog)
  },
  async plan(opportunity, profile) {
    return createRoadmap(opportunity, profile)
  },
}
