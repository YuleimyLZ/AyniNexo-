import type { SupabaseClient } from '@supabase/supabase-js'
import type { AdminCounts, Database, ModerationStatus } from '../types/database'
import { emptyProfile } from '../types/domain'
import type { Opportunity, Profile, Roadmap, SavedStatus, Submission } from '../types/domain'
import { readOpportunity, readProfile, readRoadmap, readSubmission, writeAction, writeOpportunity, writeProfile, writeRequirement } from './records'

export type StudentData = { profile: Profile; saved: Record<string, SavedStatus>; roadmaps: Roadmap[]; submissions: Submission[] }
export type SubmissionInput = Pick<Submission, 'source' | 'text' | 'category' | 'comment'>
export type AdminData = { catalog: Opportunity[]; counts: AdminCounts; submissions: Submission[] }

export const emptyStudentData: StudentData = { profile: emptyProfile, saved: {}, roadmaps: [], submissions: [] }

const catalogColumns = 'id,title,organization,description,category,country,modality,academic_levels,funding,benefits,pending_information,topics,deadline,source,verified_on,publication_status,is_public,call_status,created_at,updated_at,opportunity_requirements(*)'
const submissionColumns = 'id,source,body,suggested_category,comment,status,submitted_at,reviewed_at,published_opportunity_id'

function unpack<Result extends { data: unknown; error: unknown }>(result: Result): Result['data'] {
  if (result.error) throw result.error
  return result.data
}

function required<T>(value: T): NonNullable<T> {
  if (value == null) throw new Error('Respuesta incompleta de Supabase.')
  return value
}

async function collectRows<Row>(page: (from: number, to: number) => PromiseLike<{ data: Row[] | null; error: unknown }>) {
  const rows: Row[] = []
  const size = 200
  for (let from = 0; ; from += size) {
    const batch = required(unpack(await page(from, from + size - 1)))
    rows.push(...batch)
    if (batch.length < size) return rows
  }
}

export function createRepository(client: SupabaseClient<Database>) {
  function catalog(includeArchived = false) {
    return collectRows((from, to) => {
      const query = client.from('opportunities').select(catalogColumns).order('updated_at', { ascending: false }).order('id').range(from, to)
      return includeArchived ? query : query.eq('publication_status', 'published').eq('is_public', true)
    }).then((rows) => rows.map(readOpportunity))
  }

  return {
    catalog: () => catalog(),

    async student(userId: string): Promise<StudentData> {
      const [profile, saved, roadmaps, submissions] = await Promise.all([
        client.from('profiles').select('*').eq('user_id', userId).maybeSingle().then(unpack),
        collectRows((from, to) => client.from('saved_opportunities').select('opportunity_id,status').eq('user_id', userId).order('opportunity_id').range(from, to)),
        collectRows((from, to) => client.from('roadmaps').select('*,roadmap_actions(*)').eq('user_id', userId).order('created_at').order('id').range(from, to)),
        collectRows((from, to) => client.from('submissions').select(submissionColumns).eq('contributor_id', userId).order('submitted_at', { ascending: false }).order('id').range(from, to)),
      ])
      return {
        profile: profile ? readProfile(profile) : emptyProfile,
        saved: Object.fromEntries(saved.map((item) => [item.opportunity_id, item.status])),
        roadmaps: roadmaps.map(readRoadmap),
        submissions: submissions.map(readSubmission),
      }
    },

    async saveProfile(userId: string, profile: Profile) {
      const row = required(unpack(await client.from('profiles').upsert(writeProfile(profile, userId)).select('*').single()))
      return readProfile(row)
    },

    async setSaved(userId: string, opportunityId: string, status: SavedStatus | null) {
      if (!status) {
        unpack(await client.from('saved_opportunities').delete().eq('user_id', userId).eq('opportunity_id', opportunityId))
        return
      }
      unpack(await client.from('saved_opportunities')
        .upsert({ user_id: userId, opportunity_id: opportunityId, status }, { onConflict: 'user_id,opportunity_id' }))
    },

    async saveRoadmap(roadmap: Roadmap) {
      const id = required(unpack(await client.rpc('ayni_save_roadmap', {
        p_opportunity_id: roadmap.opportunityId, p_actions: roadmap.actions.map(writeAction),
      })))
      const row = required(unpack(await client.from('roadmaps').select('*,roadmap_actions(*)').eq('id', id).single()))
      return readRoadmap(row)
    },

    async completeAction(id: string, completed: boolean) {
      required(unpack(await client.from('roadmap_actions').update({ completed }).eq('id', id).select('id').single()))
    },

    async submit(input: SubmissionInput) {
      const id = required(unpack(await client.rpc('ayni_submit_opportunity', {
        p_source: input.source, p_body: input.text, p_category: input.category || null, p_comment: input.comment,
      })))
      const row = required(unpack(await client.from('submissions').select(submissionColumns).eq('id', id).single()))
      return readSubmission(row)
    },

    async admin(status?: ModerationStatus): Promise<AdminData> {
      const [opportunities, counts, submissions] = await Promise.all([
        catalog(true),
        client.rpc('ayni_admin_counts').single().then(unpack),
        collectRows((from, to) => client.rpc('ayni_admin_submissions', status ? { p_status: status } : {}).range(from, to)),
      ])
      return { catalog: opportunities, counts: required(counts), submissions: submissions.map(readSubmission) }
    },

    async reviewSubmission(id: string, status: 'reviewing' | 'rejected' | 'archived', note: string) {
      unpack(await client.rpc('ayni_review_submission', { p_id: id, p_status: status, p_note: note }))
    },

    async saveOpportunity(opportunity: Opportunity, submissionId?: string, note?: string) {
      return required(unpack(await client.rpc('ayni_save_opportunity', {
        p_data: writeOpportunity(opportunity), p_requirements: opportunity.requirements.map(writeRequirement),
        ...(opportunity.id && { p_id: opportunity.id, p_expected_updated_at: opportunity.updatedAt }),
        ...(submissionId && { p_submission_id: submissionId }), ...(note && { p_note: note }),
      })))
    },

    async archiveOpportunity(id: string, archived: boolean) {
      unpack(await client.rpc('ayni_archive_opportunity', { p_id: id, p_archived: archived }))
    },
  }
}
