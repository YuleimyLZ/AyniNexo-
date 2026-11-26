import { academicLevels } from '../types/domain'
import type { Opportunity, Requirement, Submission } from '../types/domain'
import { normalize } from './eligibility'

export type Draft = Omit<Opportunity, 'benefits' | 'pending' | 'requirements' | 'source' | 'deadline' | 'verified'> & {
  benefits: string; pending: string; required: string; desired: string; source: string; deadline: string; verified: string; text: string
}

export function emptyDraft(): Draft {
  return {
    id: '', title: '', organization: '', category: 'Becas', country: '', modality: 'Virtual', funding: 'Por confirmar',
    levels: ['Pregrado'], deadline: '', verified: '', source: '', description: '', benefits: '', pending: '',
    topics: [], required: '', desired: '', text: '', status: 'Aprobada',
  }
}

export function editDraft(item: Opportunity): Draft {
  return {
    ...item, text: '', source: item.source ?? '', deadline: item.deadline ?? '', verified: item.verified ?? '',
    benefits: item.benefits.join('\n'), pending: item.pending.join('\n'),
    required: item.requirements.filter((entry) => entry.mandatory).map((entry) => entry.label).join('\n'),
    desired: item.requirements.filter((entry) => !entry.mandatory).map((entry) => entry.label).join('\n'),
  }
}

export function submissionDraft(submission: Submission): Draft {
  return { ...emptyDraft(), id: `aporte-${submission.id}`, source: submission.source, category: submission.category || 'Becas', text: submission.text }
}

export function extractDemo(draft: Draft): Draft {
  const fields = new Map<string, string>()
  for (const line of draft.text.split('\n')) {
    const separator = line.indexOf(':')
    if (separator > 0) fields.set(normalize(line.slice(0, separator)), line.slice(separator + 1).trim())
  }
  const date = fields.get('fecha limite') ?? ''
  return {
    ...draft,
    title: (fields.get('titulo') || draft.title).slice(0, 130),
    organization: (fields.get('institucion') || draft.organization).slice(0, 100),
    country: (fields.get('pais') || draft.country).slice(0, 60),
    deadline: /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().startsWith(date) ? date : draft.deadline,
    description: (fields.get('descripcion') || draft.description || draft.text).slice(0, 2500),
  }
}

export function makeOpportunity(draft: Draft, id: string, source: string | null, previous?: Opportunity): Opportunity {
  const lines = (value: string) => Array.from(new Set(value.split('\n').map((line) => line.trim()).filter(Boolean)))
  const required = lines(draft.required)
  const desired = lines(draft.desired).filter((label) => !required.includes(label))
  const requirements: Requirement[] = [true, false].flatMap((mandatory) => (mandatory ? required : desired).map((label, index) => {
    const existing = previous?.requirements.find((entry) => entry.label === label)
    return existing ? { ...existing, mandatory } : { id: `manual-${mandatory}-${index}`, kind: 'manual', label, mandatory }
  }))
  return {
    id, title: draft.title.trim(), organization: draft.organization.trim(), country: draft.country.trim(), category: draft.category,
    modality: draft.modality, funding: draft.funding, levels: draft.levels.length ? draft.levels : [...academicLevels],
    source, deadline: draft.deadline || null, verified: draft.verified || null, description: draft.description.trim(),
    benefits: lines(draft.benefits), pending: lines(draft.pending), topics: draft.topics, status: draft.status, requirements,
  }
}
