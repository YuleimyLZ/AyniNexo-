import { academicLevels, categories, englishLevels, fundingOptions, modalities } from '../types/domain'
import type { Opportunity, Requirement } from '../types/domain'
import { fallbackReasons, guidanceOrigins, intents, tips } from '../features/conversation'
import type { Reply } from '../features/conversation'

export const messageLimit = 800
export const sourceLimit = 12000
export const horizons = [3, 6, 12] as const
export type Horizon = typeof horizons[number]
export const uuid = (value: unknown): value is string => typeof value === 'string' && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value)
export const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value))
export const oneOf = <T>(value: unknown, allowed: readonly T[]): value is T => allowed.some((item) => item === value)
export const bounded = (value: unknown, max: number, min = 1): value is string => typeof value === 'string' && value.trim().length >= min && value.length <= max
export const list = <T>(value: unknown, max: number, check: (item: unknown) => item is T): value is T[] => Array.isArray(value) && value.length <= max && value.every(check)
export const shape = (value: unknown, keys: readonly string[]): value is Record<string, unknown> =>
  record(value) && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
export function isoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T00:00:00Z')
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export const extractedFields = ['title', 'organization', 'category', 'country', 'modality', 'funding', 'deadline', 'description', 'benefits', 'topics', 'levels'] as const
export type ExtractedField = typeof extractedFields[number]
export const requirementKinds = ['cycle', 'english', 'certificate', 'travel', 'manual', 'skill', 'level'] as const
export type Evidence = { field: ExtractedField | 'requirements'; quote: string }
export type Extraction = {
  source: string
  title: string | null
  organization: string | null
  category: Opportunity['category'] | null
  country: string | null
  modality: Opportunity['modality'] | null
  funding: Opportunity['funding'] | null
  deadline: string | null
  description: string | null
  benefits: string[]
  topics: string[]
  levels: Opportunity['levels']
  requirements: Requirement[]
  pending: string[]
  evidence: Evidence[]
}
export type MatchResult = Pick<Reply, 'intent' | 'text' | 'tip' | 'origin' | 'fallback' | 'horizon'> & {
  items: { opportunityId: string; affinity: Reply['items'][number]['affinity']; reason: string; statuses: { id: string; result: string }[] }[]
}
export type PlanResult = { roadmapId: string; origin: 'ai' | 'deterministic'; fallback?: Reply['fallback'] }

const statusValues = ['Cumplido', 'Pendiente', 'No cumplido', 'Por confirmar'] as const
export function isMatchResult(value: unknown): value is MatchResult {
  return record(value) && bounded(value.text, 900) && oneOf(value.intent, intents) && oneOf(value.tip, tips)
    && (value.horizon === undefined || oneOf(value.horizon, horizons)) && oneOf(value.origin, guidanceOrigins) && (value.fallback === undefined || oneOf(value.fallback, fallbackReasons))
    && Array.isArray(value.items) && value.items.length <= 6 && value.items.every((item) => record(item)
      && uuid(item.opportunityId) && oneOf(item.affinity, ['Alta afinidad', 'Afinidad moderada']) && bounded(item.reason, 300)
      && Array.isArray(item.statuses) && item.statuses.length <= 30
      && item.statuses.every((status) => record(status) && uuid(status.id) && oneOf(status.result, statusValues)))
}

export function isPlanResult(value: unknown): value is PlanResult {
  return record(value) && uuid(value.roadmapId) && oneOf(value.origin, ['ai', 'deterministic'])
    && (value.fallback === undefined || oneOf(value.fallback, fallbackReasons))
}

function isRequirement(value: unknown): value is Requirement {
  if (!record(value) || !uuid(value.id) || !bounded(value.label, 300) || typeof value.mandatory !== 'boolean'
    || !oneOf(value.kind, requirementKinds) || !bounded(value.source, 2048)) return false
  if (value.kind === 'cycle') return typeof value.minimum === 'number' && Number.isInteger(value.minimum) && value.minimum >= 1 && value.minimum <= 16
  if (value.kind === 'english') return oneOf(value.minimum, englishLevels)
  if (value.kind === 'skill') return bounded(value.skill, 80)
  if (value.kind === 'level') return list(value.levels, 3, (item): item is Opportunity['levels'][number] => oneOf(item, academicLevels)) && value.levels.length > 0
  return true
}

export function isExtraction(value: unknown): value is Extraction {
  const nullableString = (item: unknown, max: number) => item === null || bounded(item, max)
  const strings = (item: unknown, count: number, max: number) => list(item, count, (entry): entry is string => bounded(entry, max))
  return record(value) && bounded(value.source, 2048)
    && nullableString(value.title, 130) && nullableString(value.organization, 100) && nullableString(value.country, 60)
    && nullableString(value.description, 2500) && (value.deadline === null || isoDate(value.deadline))
    && (value.category === null || oneOf(value.category, categories)) && (value.modality === null || oneOf(value.modality, modalities))
    && (value.funding === null || oneOf(value.funding, fundingOptions))
    && strings(value.benefits, 12, 220) && strings(value.pending, 24, 220) && strings(value.topics, 10, 55)
    && list(value.levels, 3, (item): item is Opportunity['levels'][number] => oneOf(item, academicLevels))
    && list(value.requirements, 16, isRequirement)
    && Array.isArray(value.evidence) && value.evidence.length <= 60
    && value.evidence.every((entry) => record(entry) && oneOf(entry.field, [...extractedFields, 'requirements']) && bounded(entry.quote, 420))
}
