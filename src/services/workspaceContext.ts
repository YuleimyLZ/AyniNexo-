import { createContext, useContext } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { Opportunity } from '../types/domain'
import type { Workspace } from './demo'

export const WorkspaceContext = createContext<{
  workspace: Workspace
  update: Dispatch<SetStateAction<Workspace>>
  catalog: Opportunity[]
  catalogState: 'loading' | 'ready' | 'error'
  reloadCatalog: () => void
  storageError: boolean
} | null>(null)

export function useWorkspace() {
  const workspace = useContext(WorkspaceContext)
  if (!workspace) throw new Error('WorkspaceProvider no disponible')
  return workspace
}
