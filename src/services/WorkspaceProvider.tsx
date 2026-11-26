import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Opportunity } from '../types/domain'
import { WorkspaceContext } from './workspaceContext'
import { workspaceRepository } from './demo'

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, update] = useState(workspaceRepository.read)
  const [catalog, setCatalog] = useState<Opportunity[]>([])
  const [catalogState, setCatalogState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [storageError, setStorageError] = useState(false)

  const reloadCatalog = useCallback(() => {
    let active = true
    void workspaceRepository.catalog(workspace.edits).then((data) => {
      if (!active) return
      setCatalog(data)
      setCatalogState('ready')
    }).catch(() => {
      if (active) setCatalogState('error')
    })
    return () => { active = false }
  }, [workspace.edits])

  useEffect(reloadCatalog, [reloadCatalog])

  useEffect(() => {
    try {
      workspaceRepository.write(workspace)
      queueMicrotask(() => setStorageError(false))
    } catch {
      queueMicrotask(() => setStorageError(true))
    }
  }, [workspace])

  return (
    <WorkspaceContext.Provider value={{ workspace, update, catalog, catalogState, reloadCatalog, storageError }}>
      {children}
    </WorkspaceContext.Provider>
  )
}
