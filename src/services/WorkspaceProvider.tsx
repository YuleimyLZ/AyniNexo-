import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Role } from '../types/database'
import type { Opportunity, Profile, Roadmap, SavedStatus } from '../types/domain'
import { WorkspaceContext } from './workspaceContext'
import type { LoadState } from './workspaceContext'
import { isDemo, supabase } from './supabase'
import { createRepository, emptyStudentData } from './repository'
import type { StudentData, SubmissionInput } from './repository'

const repository = supabase ? createRepository(supabase) : null
const mode = repository ? 'live' : isDemo ? 'demo' : 'setup'
type Snapshot<Data> = { key: string; data: Data | null; state: Exclude<LoadState, 'loading'> }

function privateState<Data>(snapshot: Snapshot<Data> | null, key: string): LoadState {
  return snapshot?.key === key ? snapshot.state : 'loading'
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<{ session: Session | null; state: LoadState; recovery: boolean }>({
    session: null, state: supabase ? 'loading' : 'ready', recovery: false,
  })
  const [catalogVersion, setCatalogVersion] = useState(0)
  const [studentVersion, setStudentVersion] = useState(0)
  const [roleVersion, setRoleVersion] = useState(0)
  const [catalog, setCatalog] = useState<Snapshot<Opportunity[]> | null>(null)
  const [student, setStudent] = useState<Snapshot<StudentData> | null>(null)
  const [role, setRole] = useState<Snapshot<Role> | null>(null)
  const userId = auth.session?.user.id ?? ''
  const studentKey = `${userId}:${studentVersion}`
  const roleKey = `${userId}:${roleVersion}`
  const catalogKey = String(catalogVersion)

  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setAuth((previous) => ({
        session, state: 'ready',
        recovery: event === 'PASSWORD_RECOVERY' || Boolean(session && previous.session?.user.id === session.user.id && previous.recovery && event !== 'USER_UPDATED'),
      }))
      if (event === 'SIGNED_OUT') {
        setStudent(null)
        setRole(null)
        setStudentVersion((previous) => previous + 1)
        setRoleVersion((previous) => previous + 1)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let active = true
    const load = repository?.catalog() ?? (isDemo ? import('./catalog').then((module) => module.demoCatalog) : Promise.reject(new Error('Configuración pendiente.')))
    void load.then((data) => {
      if (active) setCatalog({ key: catalogKey, data, state: 'ready' })
    }).catch(() => {
      if (active) setCatalog({ key: catalogKey, data: null, state: 'error' })
    })
    return () => { active = false }
  }, [catalogKey])

  useEffect(() => {
    if (!userId || !repository) return
    let active = true
    void repository.student(userId).then((data) => {
      if (active) setStudent({ key: studentKey, data, state: 'ready' })
    }).catch(() => {
      if (active) setStudent({ key: studentKey, data: null, state: 'error' })
    })
    return () => { active = false }
  }, [studentKey, userId])

  useEffect(() => {
    if (!userId || !supabase) return
    let active = true
    void supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle().then(({ data, error }) => {
      if (active) setRole({ key: roleKey, data: error ? null : data?.role ?? 'student', state: error ? 'error' : 'ready' })
    }, () => {
      if (active) setRole({ key: roleKey, data: null, state: 'error' })
    })
    return () => { active = false }
  }, [roleKey, userId])

  function connection() {
    if (!repository || !userId) throw { code: 'session_not_found' }
    return repository
  }

  function updateStudent(apply: (data: StudentData) => StudentData) {
    setStudent((previous) => previous?.key === studentKey && previous.data
      ? { ...previous, data: apply(previous.data) }
      : previous)
  }

  async function saveProfile(profile: Profile) {
    const saved = await connection().saveProfile(userId, profile)
    updateStudent((previous) => ({ ...previous, profile: saved }))
  }

  async function setSaved(id: string, status: SavedStatus | null) {
    await connection().setSaved(userId, id, status)
    updateStudent((previous) => {
      const saved = { ...previous.saved }
      if (status) saved[id] = status
      else delete saved[id]
      return { ...previous, saved }
    })
  }

  async function saveRoadmap(roadmap: Roadmap) {
    const saved = await connection().saveRoadmap(roadmap)
    updateStudent((previous) => ({ ...previous, roadmaps: [...previous.roadmaps.filter((item) => item.id !== saved.id), saved] }))
    return saved
  }

  async function completeAction(roadmapId: string, id: string, completed: boolean) {
    await connection().completeAction(id, completed)
    updateStudent((previous) => ({
      ...previous, roadmaps: previous.roadmaps.map((item) => item.id === roadmapId ? {
        ...item, actions: item.actions.map((action) => action.id === id ? { ...action, completed } : action),
      } : item),
    }))
  }

  async function submitOpportunity(input: SubmissionInput) {
    const submission = await connection().submit(input)
    updateStudent((previous) => ({ ...previous, submissions: [submission, ...previous.submissions] }))
  }

  return (
    <WorkspaceContext.Provider value={{
      mode, session: auth.session, authState: auth.state, recovery: auth.recovery,
      role: userId && role?.key === roleKey ? role.data : null,
      roleState: userId ? privateState(role, roleKey) : auth.state,
      reloadRole: () => setRoleVersion((version) => version + 1),
      workspace: userId && student?.key === studentKey ? student.data ?? emptyStudentData : emptyStudentData,
      studentState: userId ? privateState(student, studentKey) : auth.state,
      reloadStudent: () => setStudentVersion((version) => version + 1),
      catalog: catalog?.data ?? [], catalogState: privateState(catalog, catalogKey),
      reloadCatalog: () => setCatalogVersion((version) => version + 1),
      saveProfile, setSaved, saveRoadmap, completeAction, submitOpportunity,
    }}>{children}</WorkspaceContext.Provider>
  )
}
