import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Opportunity, Profile, Roadmap, SavedStatus } from '../types/domain'
import type { Role } from '../types/database'
import type { StudentData, SubmissionInput } from './repository'

export type LoadState = 'loading' | 'ready' | 'error'
export type AppMode = 'live' | 'demo' | 'setup'

export const WorkspaceContext = createContext<{
  mode: AppMode
  session: Session | null
  authState: LoadState
  role: Role | null
  roleState: LoadState
  recovery: boolean
  reloadRole: () => void
  workspace: StudentData
  studentState: LoadState
  reloadStudent: () => void
  catalog: Opportunity[]
  catalogState: LoadState
  reloadCatalog: () => void
  saveProfile: (profile: Profile) => Promise<void>
  setSaved: (id: string, status: SavedStatus | null) => Promise<void>
  saveRoadmap: (roadmap: Roadmap) => Promise<Roadmap>
  completeAction: (roadmapId: string, id: string, completed: boolean) => Promise<void>
  submitOpportunity: (input: SubmissionInput) => Promise<void>
} | null>(null)

export function useWorkspace() {
  const workspace = useContext(WorkspaceContext)
  if (!workspace) throw new Error('WorkspaceProvider no disponible')
  return workspace
}
