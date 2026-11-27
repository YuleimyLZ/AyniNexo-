import { record, uuid } from '../../../src/services/aiContracts'
import { catalogColumns, readOpportunity, readProfile, writeAction } from '../../../src/services/records'
import type { CatalogRow } from '../../../src/services/records'
import { todayInPeru } from '../../../src/features/eligibility'
import { emptyProfile } from '../../../src/types/domain'
import type { Opportunity, Profile, Roadmap } from '../../../src/types/domain'
import type { ProfileRow } from '../../../src/types/database'

export type Purpose = 'match' | 'extract' | 'roadmap'
export type Access = 'ok' | 'pilot' | 'quota'
export type Identity = { id: string; token: string }
export type Env = (name: string) => string | undefined
export type EdgeStore = {
  identify: (token: string) => Promise<Identity | null>
  isOwner: (identity: Identity) => Promise<boolean>
  catalog: (identity: Identity, includePast: boolean, focusId?: string) => Promise<Opportunity[]>
  profile: (identity: Identity) => Promise<Profile>
  reserve: (identity: Identity, purpose: Purpose, cached: boolean) => Promise<Access>
  existingPlan: (identity: Identity, opportunityId: string) => Promise<{ roadmapId: string; origin: Roadmap['origin'] } | null>
  savePlan: (identity: Identity, plan: Roadmap) => Promise<string>
}

export function integerSetting(value: string | undefined, fallback: number, limit: number) {
  return value && /^\d{1,6}$/.test(value) ? Math.min(Number(value), limit) : fallback
}

export function createStore(env: Env, fetcher: typeof fetch = fetch): EdgeStore {
  const origin = env('SUPABASE_URL')?.replace(/\/$/, '')
  const anon = defaultKey(env('SUPABASE_PUBLISHABLE_KEYS'), 'sb_publishable_') ?? env('SUPABASE_ANON_KEY')
  const secret = defaultKey(env('SUPABASE_SECRET_KEYS'), 'sb_secret_')
  const legacyService = env('SUPABASE_SERVICE_ROLE_KEY')
  const service = secret ?? legacyService
  async function call(path: string, jwt: string | undefined, privileged = false, body?: unknown) {
    const key = privileged ? service : anon
    if (!origin || !key) throw new Error('Supabase unavailable')
    return fetcher(origin + path, {
      method: body === undefined ? 'GET' : 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
      headers: { apikey: key, ...(jwt ? { authorization: 'Bearer ' + jwt } : {}), ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  }
  async function query(path: string, token: string | undefined, privileged = false, body?: unknown) {
    const response = await call(path, token, privileged, body)
    if (!response.ok) throw new Error('Supabase request failed')
    return response.json()
  }
  return {
    async identify(token) {
      const response = await call('/auth/v1/user', token)
      if (response.status === 401 || response.status === 403) return null
      if (!response.ok) throw new Error('Supabase Auth unavailable')
      const user: unknown = await response.json()
      return record(user) && uuid(user.id) && isConfirmedAccount(user) ? { id: user.id, token } : null
    },
    async isOwner(identity) {
      const rows = await query('/rest/v1/user_roles?select=role&user_id=eq.' + identity.id, identity.token)
      return Array.isArray(rows) && rows[0]?.role === 'owner'
    },
    async catalog(identity, includePast, focusId) {
      const base = new URLSearchParams({
        select: catalogColumns, publication_status: 'eq.published', is_public: 'eq.true',
        order: 'updated_at.desc,id', limit: '100',
      })
      if (!includePast) {
        base.set('call_status', 'eq.automatic')
        base.set('or', '(deadline.is.null,deadline.gte.' + todayInPeru() + ')')
      }
      if (focusId) base.set('id', 'eq.' + focusId)
      const result: Opportunity[] = []
      for (let offset = 0; ; offset += 100) {
        base.set('offset', String(offset))
        const rows: CatalogRow[] = await query('/rest/v1/opportunities?' + base, identity.token)
        result.push(...rows.map(readOpportunity))
        if (focusId || rows.length < 100) return result
      }
    },
    async profile(identity) {
      const rows: ProfileRow[] = await query('/rest/v1/profiles?select=*&user_id=eq.' + identity.id, identity.token)
      return rows[0] ? readProfile(rows[0]) : emptyProfile
    },
    async reserve(identity, purpose, cached) {
      if (!service) throw new Error('Quota unavailable')
      const access: unknown = await query('/rest/v1/rpc/ayni_reserve_ai', secret ? undefined : legacyService, true, {
        p_actor: identity.id, p_purpose: purpose, p_cached: cached,
        p_user_limit: purpose === 'extract' ? integerSetting(env('AYNI_AI_OWNER_DAILY'), 10, 100) : integerSetting(env('AYNI_AI_STUDENT_DAILY'), 5, 100),
        p_daily_limit: integerSetting(env('AYNI_AI_GLOBAL_DAILY'), 20, 10000),
        p_minute_limit: integerSetting(env('AYNI_AI_GLOBAL_MINUTE'), 3, 1000),
      })
      if (access !== 'ok' && access !== 'pilot' && access !== 'quota') throw new Error('Quota unavailable')
      return access
    },
    async existingPlan(identity, opportunityId) {
      const rows: { id: string; origin: Roadmap['origin'] }[] = await query(
        '/rest/v1/roadmaps?select=id,origin&user_id=eq.' + identity.id + '&opportunity_id=eq.' + opportunityId, identity.token,
      )
      return rows[0] ? { roadmapId: rows[0].id, origin: rows[0].origin } : null
    },
    async savePlan(identity, plan) {
      const actions = plan.actions.map(writeAction)
      if (plan.origin === 'ai') {
        if (!service) throw new Error('Roadmap service unavailable')
        return query('/rest/v1/rpc/ayni_save_ai_roadmap', secret ? undefined : legacyService, true, {
          p_actor: identity.id, p_opportunity_id: plan.opportunityId, p_actions: actions,
        })
      }
      return query('/rest/v1/rpc/ayni_save_roadmap', identity.token, false, { p_opportunity_id: plan.opportunityId, p_actions: actions })
    },
  }
}

function isConfirmedAccount(user: Record<string, unknown>) {
  return Boolean(typeof user.email_confirmed_at === 'string' && user.email_confirmed_at && !user.is_anonymous)
}

function defaultKey(raw: string | undefined, prefix: string) {
  if (!raw) return undefined
  try {
    const keys: unknown = JSON.parse(raw)
    return record(keys) && typeof keys.default === 'string' && keys.default.startsWith(prefix) ? keys.default : undefined
  } catch {
    return undefined
  }
}
