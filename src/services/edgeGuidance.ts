import { FunctionsHttpError } from '@supabase/supabase-js'
import { assessOpportunity } from '../features/eligibility'
import { conversation } from '../features/conversation'
import type { ConversationInput, Fallback, Reply } from '../features/conversation'
import { isExtraction, isMatchResult, isPlanResult, record } from './aiContracts'
import type { Horizon } from './aiContracts'
import { supabase } from './supabase'
import { officialUrl } from './validation'
import type { Opportunity, Profile } from '../types/domain'

export class GuidanceError extends Error {
  constructor(readonly code: string) { super('No pudimos completar la solicitud.') }
}

async function invoke<T>(name: string, body: object, validate: (data: unknown) => data is T, signal?: AbortSignal): Promise<T> {
  if (!supabase) throw new GuidanceError('unavailable')
  const timeout = signal ? AbortSignal.any([signal, AbortSignal.timeout(28000)]) : AbortSignal.timeout(28000)
  const { data, error } = await supabase.functions.invoke<unknown>(name, { body, signal: timeout })
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const value: unknown = await error.context.json().catch(() => null)
      if (record(value) && typeof value.code === 'string') throw new GuidanceError(value.code)
    }
    throw new GuidanceError('unavailable')
  }
  if (!validate(data)) throw new GuidanceError('invalid')
  return data
}

export async function chat(input: ConversationInput, profile: Profile, catalog: Opportunity[], online: boolean, signal: AbortSignal): Promise<Reply> {
  const local = () => conversation(input, catalog, profile).reply()
  if (!online) return local()
  try {
    const result = await invoke('match-opportunities', input, isMatchResult, signal)
    const seen = new Set<string>()
    const items = result.items.map(({ opportunityId, affinity, reason, statuses }) => {
      const opportunity = catalog.find((item) => item.id === opportunityId && item.status === 'Aprobada')
      if (!opportunity || seen.has(opportunityId)) throw new GuidanceError('invalid')
      seen.add(opportunityId)
      const known = new Map(statuses.map((status) => [status.id, status.result]))
      if (known.size !== opportunity.requirements.length || opportunity.requirements.some((requirement) => !known.has(requirement.id))) throw new GuidanceError('invalid')
      const requirements = assessOpportunity(opportunity, profile).requirements.map((requirement) => ({
        ...requirement, result: known.get(requirement.id) as typeof requirement.result,
      }))
      const mandatory = requirements.filter((item) => item.mandatory)
      const assessment = {
        requirements,
        met: mandatory.filter((item) => item.result === 'Cumplido').length,
        gaps: mandatory.filter((item) => item.result === 'Pendiente' || item.result === 'No cumplido').length,
        unknown: mandatory.filter((item) => item.result === 'Por confirmar').length,
      }
      return { opportunity, affinity, reason, assessment }
    })
    return { ...result, items }
  } catch (error) {
    if (signal.aborted) throw error
    const fallback: Fallback = error instanceof GuidanceError && error.code === 'invalid' ? 'invalid' : 'unavailable'
    return { ...local(), fallback }
  }
}

export async function extract(source: string, text: string, publicConfirmed: boolean, signal: AbortSignal) {
  const result = await invoke('extract-opportunity', { source, text, publicConfirmed }, isExtraction, signal)
  if (result.source !== officialUrl(source) || result.requirements.some((item) => item.source !== result.source)) throw new GuidanceError('invalid')
  return result
}

export function generatePlan(opportunityId: string, horizon: Horizon, useProfile: boolean) {
  return invoke('generate-roadmap', { opportunityId, horizon, useProfile }, isPlanResult)
}
