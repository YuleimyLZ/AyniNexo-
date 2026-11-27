import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import type { Category, Opportunity, Profile, Requirement, RoadmapAction } from '../types/domain'

type AcademicContext = Pick<Profile, 'academicLevel' | 'cycle' | 'english' | 'certificate' | 'funding' | 'travel'>
type WithoutId<Item> = Item extends { id: string } ? Omit<Item, 'id'> : never
type ExtractedOpportunity = {
  title: string | null
  organization: string | null
  description: string | null
  category: Category | null
  country: string | null
  modality: Opportunity['modality'] | null
  funding: Opportunity['funding'] | null
  levels: Opportunity['levels'] | null
  benefits: string[]
  deadline: string | null
  requirements: WithoutId<Requirement>[]
  pending: string[]
}
type Requests = {
  'extract-opportunity': { source: string; text: string }
  'match-opportunities': { criterion: string; profile: AcademicContext; opportunityIds: string[] }
  'generate-roadmap': { opportunityId: string; profile: AcademicContext; requirementIds: string[] }
}
type Responses = {
  'extract-opportunity': ExtractedOpportunity
  'match-opportunities': { opportunityId: string; explanation: string }[]
  'generate-roadmap': Omit<RoadmapAction, 'id' | 'completed'>[]
}

// The Phase 3 caller supplies runtime schema validation before accepting AI output.
export function createEdgeGuidance(client: SupabaseClient<Database>) {
  return async function invoke<Name extends keyof Requests>(
    name: Name, input: Requests[Name], validate: (value: unknown) => Responses[Name],
  ) {
    const { data, error } = await client.functions.invoke<unknown>(name, { body: input })
    if (error) throw error
    return validate(data)
  }
}
