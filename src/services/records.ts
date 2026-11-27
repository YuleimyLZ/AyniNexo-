import type { ActionRow, Json, ModerationStatus, OpportunityRow, ProfileInsert, ProfileRow, RequirementRow, RoadmapRow, SubmissionRow } from '../types/database'
import type { Opportunity, Profile, Requirement, Roadmap, RoadmapAction, Submission, SubmissionStatus } from '../types/domain'
import { academicLevels, englishLevels } from '../types/domain'
import { officialUrl } from './validation'

function yesNo(value: boolean | null): '' | 'Sí' | 'No' {
  return value === null ? '' : value ? 'Sí' : 'No'
}

export function readProfile(row: ProfileRow): Profile {
  return {
    university: row.university, program: row.program, academicLevel: row.academic_level ?? '', cycle: row.cycle,
    english: row.english ?? '', certificate: yesNo(row.certificate), skills: row.skills, interests: row.interests,
    goals: row.goals, projects: row.projects, research: row.research, funding: row.funding ?? '',
    travel: yesNo(row.travel), destinations: row.destinations,
  }
}

export function writeProfile(profile: Profile, userId: string): ProfileInsert {
  return {
    user_id: userId, university: profile.university.trim(), program: profile.program.trim(), academic_level: profile.academicLevel || null,
    cycle: profile.cycle, english: profile.english || null, certificate: profile.certificate ? profile.certificate === 'Sí' : null,
    skills: profile.skills, interests: profile.interests, goals: profile.goals.trim(), projects: profile.projects.trim(),
    research: profile.research.trim(), funding: profile.funding || null, travel: profile.travel ? profile.travel === 'Sí' : null,
    destinations: profile.destinations,
  }
}

const isAcademicLevel = (value: unknown): value is Opportunity['levels'][number] => academicLevels.some((level) => level === value)

export function readRequirement(row: RequirementRow): Requirement {
  const base = { id: row.id, label: row.label, mandatory: row.mandatory, unit: row.unit ?? undefined, source: row.source ?? undefined }
  const value = row.required_value
  switch (row.kind) {
    case 'cycle': {
      const condition = row.condition
      const whenLevel = condition && typeof condition === 'object' && !Array.isArray(condition) ? condition.whenLevel : undefined
      if (typeof value === 'number') return { ...base, kind: 'cycle', minimum: value, whenLevel: isAcademicLevel(whenLevel) ? whenLevel : undefined }
      break
    }
    case 'english': {
      const minimum = englishLevels.find((level) => level === value)
      if (minimum) return { ...base, kind: 'english', minimum }
      break
    }
    case 'skill':
      if (typeof value === 'string') return { ...base, kind: 'skill', skill: value }
      break
    case 'level':
      if (Array.isArray(value) && value.length > 0 && value.every(isAcademicLevel)) return { ...base, kind: 'level', levels: value }
      break
    default:
      return { ...base, kind: row.kind }
  }
  throw new Error('Requisito estructurado inválido en el catálogo.')
}

export function writeRequirement(requirement: Requirement): Json {
  let value: Json = null
  switch (requirement.kind) {
    case 'cycle':
    case 'english': value = requirement.minimum; break
    case 'level': value = requirement.levels; break
    case 'skill': value = requirement.skill; break
  }
  return {
    id: requirement.id, kind: requirement.kind, label: requirement.label, mandatory: requirement.mandatory,
    condition: requirement.kind === 'cycle' && requirement.whenLevel ? { whenLevel: requirement.whenLevel } : {},
    required_value: value, unit: requirement.unit ?? null, source: requirement.source ?? null,
  }
}

export const catalogColumns = 'id,title,organization,description,category,country,modality,academic_levels,funding,benefits,pending_information,topics,deadline,source,verified_on,publication_status,is_public,call_status,created_at,updated_at,opportunity_requirements(*)'

export type CatalogRow = Omit<OpportunityRow, 'published_by' | 'source_key'> & { opportunity_requirements: RequirementRow[] }

export function readOpportunity(row: CatalogRow): Opportunity {
  return {
    id: row.id, title: row.title, organization: row.organization, category: row.category, country: row.country,
    modality: row.modality, funding: row.funding, levels: row.academic_levels, deadline: row.deadline,
    verified: row.verified_on, source: officialUrl(row.source), description: row.description, benefits: row.benefits,
    pending: row.pending_information, topics: row.topics, status: row.publication_status === 'published' ? 'Aprobada' : 'Archivada',
    closed: row.call_status === 'closed', updatedAt: row.updated_at,
    requirements: [...row.opportunity_requirements].sort((a, b) => a.display_order - b.display_order).map(readRequirement),
  }
}

export function writeOpportunity(opportunity: Opportunity): Json {
  return {
    title: opportunity.title, organization: opportunity.organization, description: opportunity.description,
    category: opportunity.category, country: opportunity.country, modality: opportunity.modality,
    academic_levels: opportunity.levels, funding: opportunity.funding, benefits: opportunity.benefits,
    pending_information: opportunity.pending, topics: opportunity.topics, deadline: opportunity.deadline,
    source: opportunity.source, verified_on: opportunity.verified, call_status: opportunity.closed ? 'closed' : 'automatic',
  }
}

export const submissionLabels: Record<ModerationStatus, SubmissionStatus> = {
  pending: 'Pendiente', reviewing: 'En revisión', approved: 'Aprobada', rejected: 'Rechazada', archived: 'Archivada',
}

type StudentSubmission = Pick<SubmissionRow, 'id' | 'source' | 'body' | 'suggested_category' | 'comment' | 'status' | 'submitted_at' | 'reviewed_at' | 'published_opportunity_id'>

export function readSubmission(row: StudentSubmission & { moderator_note?: string }): Submission {
  return {
    id: row.id, source: row.source, text: row.body, category: row.suggested_category ?? '', comment: row.comment,
    status: submissionLabels[row.status], submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at ?? undefined, publishedOpportunityId: row.published_opportunity_id ?? undefined,
    moderatorNote: row.moderator_note,
  }
}

function readAction(row: ActionRow): RoadmapAction {
  const resources = Array.isArray(row.resources) ? row.resources.flatMap((resource) => {
    if (!resource || typeof resource !== 'object' || Array.isArray(resource) || typeof resource.label !== 'string' || typeof resource.url !== 'string') return []
    const url = officialUrl(resource.url)
    return url ? [{ label: resource.label, url }] : []
  }) : []
  return {
    id: row.id, title: row.title, description: row.description, priority: row.priority, duration: row.duration,
    requirement: row.requirement_label ?? undefined, requirementId: row.requirement_id ?? undefined, completed: row.completed, resources,
  }
}

export function readRoadmap(row: RoadmapRow & { roadmap_actions: ActionRow[] }): Roadmap {
  return {
    id: row.id, opportunityId: row.opportunity_id, title: row.title, origin: row.origin,
    actions: [...row.roadmap_actions].sort((a, b) => a.position - b.position).map(readAction),
  }
}

export function writeAction(action: RoadmapAction): Json {
  return {
    requirement_id: action.requirementId ?? null, requirement_label: action.requirement ?? null,
    title: action.title, description: action.description, priority: action.priority,
    duration: action.duration, resources: action.resources ?? [],
  }
}
