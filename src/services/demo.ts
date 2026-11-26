import { demoCatalog } from './catalog'
import { createRoadmap, recommend } from '../features/eligibility'
import { emptyProfile } from '../types/domain'
import type { Opportunity, Profile, Roadmap, SavedStatus, Submission } from '../types/domain'

export type Workspace = {
  profile: Profile
  saved: Record<string, SavedStatus>
  roadmaps: Roadmap[]
  submissions: Submission[]
  edits: Record<string, Opportunity>
  session: boolean
}

const storageKey = 'ayni-nexo.demo.v1'

export const sampleProfile: Profile = {
  ...emptyProfile, academicLevel: 'Pregrado', cycle: 3, english: 'B1', travel: 'Sí', skills: ['Python'],
}

function initialWorkspace(): Workspace {
  return { profile: emptyProfile, saved: {}, roadmaps: [], submissions: [], edits: {}, session: false }
}

export interface WorkspaceRepository {
  read(): Workspace
  write(workspace: Workspace): void
  catalog(edits: Workspace['edits']): Promise<Opportunity[]>
}

export interface GuidanceService {
  match(goal: string, profile: Profile, catalog: Opportunity[]): Promise<ReturnType<typeof recommend>>
  plan(opportunity: Opportunity, profile: Profile): Promise<Roadmap>
}

export const workspaceRepository: WorkspaceRepository = {
  read() {
    const fallback = initialWorkspace()
    try {
      const value = localStorage.getItem(storageKey)
      return value ? { ...fallback, ...JSON.parse(value) } : fallback
    } catch {
      return fallback
    }
  },
  write(workspace) {
    localStorage.setItem(storageKey, JSON.stringify(workspace))
  },
  async catalog(edits) {
    const merged = new Map(demoCatalog.map((opportunity) => [opportunity.id, opportunity]))
    Object.values(edits).forEach((opportunity) => merged.set(opportunity.id, opportunity))
    return Array.from(merged.values())
  },
}

export const guidanceService: GuidanceService = {
  async match(goal, profile, catalog) {
    return recommend(goal, profile, catalog)
  },
  async plan(opportunity, profile) {
    return createRoadmap(opportunity, profile)
  },
}

export function officialUrl(value: string) {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' && url.hostname.includes('.') && !url.username && !url.password ? url.href : null
  } catch {
    return null
  }
}
