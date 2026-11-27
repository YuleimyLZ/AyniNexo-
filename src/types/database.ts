import type { Opportunity, Profile, Requirement, Roadmap, RoadmapAction, SavedStatus } from './domain'

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Publication = 'published' | 'archived'
export type CallStatus = 'automatic' | 'closed'
export type ModerationStatus = 'pending' | 'reviewing' | 'approved' | 'rejected' | 'archived'
export type Role = 'student' | 'owner'

type Timestamps = { created_at: string; updated_at: string }
export type ProfileInsert = {
  user_id: string
  university: string
  program: string
  academic_level: Exclude<Profile['academicLevel'], ''> | null
  cycle: number | null
  english: Exclude<Profile['english'], ''> | null
  certificate: boolean | null
  skills: string[]
  interests: string[]
  goals: string
  projects: string
  research: string
  funding: Exclude<Profile['funding'], ''> | null
  travel: boolean | null
  destinations: string[]
}
export type ProfileRow = ProfileInsert & Timestamps

export type OpportunityRow = Timestamps & {
  id: string
  title: string
  organization: string
  description: string
  category: Opportunity['category']
  country: string
  modality: Opportunity['modality']
  academic_levels: Opportunity['levels']
  funding: Opportunity['funding']
  benefits: string[]
  pending_information: string[]
  topics: string[]
  deadline: string | null
  source: string
  verified_on: string
  publication_status: Publication
  is_public: boolean
  call_status: CallStatus
  published_by: string | null
  source_key: string
}

export type RequirementRow = Timestamps & {
  id: string
  opportunity_id: string
  kind: Requirement['kind']
  label: string
  condition: Json
  required_value: Json
  unit: string | null
  mandatory: boolean
  source: string | null
  display_order: number
}

export type SubmissionRow = {
  id: string
  contributor_id: string | null
  source: string
  source_key: string
  body: string
  suggested_category: Opportunity['category'] | null
  comment: string
  status: ModerationStatus
  moderator_note: string
  submitted_at: string
  reviewed_at: string | null
  reviewer_id: string | null
  published_opportunity_id: string | null
  updated_at: string
}

type SavedInsert = { user_id: string; opportunity_id: string; status: SavedStatus }
export type RoadmapRow = Timestamps & { id: string; user_id: string; opportunity_id: string; title: string; origin: Roadmap['origin'] }
export type ActionRow = Timestamps & {
  id: string; roadmap_id: string; requirement_id: string | null; requirement_label: string | null
  title: string; description: string; priority: RoadmapAction['priority']; duration: string
  resources: Json; position: number; completed: boolean
}

export type AdminCounts = { published: number; pending: number; rejected: number; expired: number }

type Relation = {
  foreignKeyName: string
  columns: string[]
  referencedRelation: string
  referencedColumns: string[]
}
type Table<Row, Insert = never, Update = never, Relations extends Relation[] = []> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: Relations
}

export type Database = {
  public: {
    Tables: {
      user_roles: Table<{ user_id: string; role: Role; created_at: string }>
      profiles: Table<ProfileRow, ProfileInsert, Partial<ProfileInsert>>
      opportunities: Table<OpportunityRow>
      opportunity_requirements: Table<RequirementRow, never, never, [{
        foreignKeyName: 'opportunity_requirements_opportunity_id_fkey'
        columns: ['opportunity_id']
        referencedRelation: 'opportunities'
        referencedColumns: ['id']
      }]>
      submissions: Table<SubmissionRow>
      saved_opportunities: Table<SavedInsert & Timestamps, SavedInsert, Partial<SavedInsert>>
      roadmaps: Table<RoadmapRow>
      roadmap_actions: Table<ActionRow, never, { completed: boolean }, [{
        foreignKeyName: 'roadmap_actions_roadmap_id_fkey'
        columns: ['roadmap_id']
        referencedRelation: 'roadmaps'
        referencedColumns: ['id']
      }]>
    }
    Views: Record<never, never>
    Functions: {
      ayni_submit_opportunity: {
        Args: { p_source: string; p_body: string; p_category: Opportunity['category'] | null; p_comment: string }
        Returns: string
      }
      ayni_admin_submissions: { Args: { p_status?: ModerationStatus }; Returns: SubmissionRow[] }
      ayni_admin_counts: { Args: Record<never, never>; Returns: AdminCounts[] }
      ayni_review_submission: {
        Args: { p_id: string; p_status: ModerationStatus; p_note: string }
        Returns: undefined
      }
      ayni_save_opportunity: {
        Args: {
          p_data: Json; p_requirements: Json; p_id?: string; p_submission_id?: string
          p_expected_updated_at?: string; p_note?: string
        }
        Returns: string
      }
      ayni_archive_opportunity: { Args: { p_id: string; p_archived: boolean }; Returns: undefined }
      ayni_save_roadmap: { Args: { p_opportunity_id: string; p_actions: Json }; Returns: string }
    }
    Enums: {
      ayni_role: Role
      ayni_publication: Publication
      ayni_call_status: CallStatus
      ayni_submission_status: ModerationStatus
    }
    CompositeTypes: Record<never, never>
  }
}
