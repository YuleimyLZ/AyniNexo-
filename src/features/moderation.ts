import type { Opportunity, Submission } from '../types/domain'

export type Draft = Omit<Opportunity, 'benefits' | 'pending' | 'source' | 'deadline' | 'verified'> & {
  benefits: string; pending: string; source: string; deadline: string; verified: string
}

export function emptyDraft(): Draft {
  return {
    id: '', title: '', organization: '', category: 'Becas', country: '', modality: 'Virtual', funding: 'Por confirmar',
    levels: ['Pregrado'], deadline: '', verified: '', source: '', description: '', benefits: '', pending: '',
    topics: [], requirements: [], status: 'Aprobada',
  }
}

export function editDraft(item: Opportunity): Draft {
  return {
    ...item, source: item.source ?? '', deadline: item.deadline ?? '', verified: item.verified ?? '',
    benefits: item.benefits.join('\n'), pending: item.pending.join('\n'),
    requirements: [...item.requirements],
  }
}

export function submissionDraft(submission: Submission): Draft {
  return { ...emptyDraft(), source: submission.source, category: submission.category || 'Becas' }
}

export function makeOpportunity(draft: Draft, source: string): Opportunity {
  const lines = (value: string) => Array.from(new Set(value.split('\n').map((line) => line.trim()).filter(Boolean)))
  return {
    id: draft.id, title: draft.title.trim(), organization: draft.organization.trim(), country: draft.country.trim(), category: draft.category,
    modality: draft.modality, funding: draft.funding, levels: draft.levels, closed: draft.closed, updatedAt: draft.updatedAt,
    source, deadline: draft.deadline || null, verified: draft.verified || null, description: draft.description.trim(),
    benefits: lines(draft.benefits), pending: lines(draft.pending), topics: draft.topics, status: draft.status,
    requirements: draft.requirements.map((requirement) => ({ ...requirement, label: requirement.label.trim() })),
  }
}
