import { bounded, horizons, list, oneOf, record, shape, sourceLimit, messageLimit, uuid } from '../../../src/services/aiContracts'
import type { Fallback, ConversationInput, Tip } from '../../../src/features/conversation'
import { conversation, tips } from '../../../src/features/conversation'
import { buildPreparationPlan, stepIds, preparationSteps } from '../../../src/features/roadmapPlan'
import type { PreparationStep } from '../../../src/features/roadmapPlan'
import { officialUrl } from '../../../src/services/validation'
import { emptyProfile } from '../../../src/types/domain'
import { extractedOpportunity, extractionPrompt, extractionSchema, publicSourceText } from './extraction'
import { defaultModel, generate } from './gemini'
import type { GeminiRequest, GeminiResult } from './gemini'
import { createStore } from './supabase'
import type { EdgeStore, Env, Identity, Purpose } from './supabase'

const bodyLimit = 26000
const schema = (properties: Record<string, unknown>) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false })
const strings = (values: readonly string[], maxItems: number) => ({ type: 'array', items: { type: 'string', enum: values }, maxItems })
const instructions = 'Elige únicamente valores del esquema a partir de los datos públicos provistos. No devuelvas texto libre, enlaces, condiciones de elegibilidad ni nuevas convocatorias.'
type Selection = { ids: string[]; tip: Tip }

function selected(value: unknown, ids: string[]): Selection | null {
  if (!shape(value, ['ids', 'tip']) || !list(value.ids, 6, (id): id is string => oneOf(id, ids))
    || value.ids.length !== ids.length || new Set(value.ids).size !== ids.length || !oneOf(value.tip, tips)) return null
  return { ids: value.ids, tip: value.tip }
}

function planSteps(value: unknown): PreparationStep[] | null {
  if (!shape(value, ['steps']) || !list(value.steps, 4, (item): item is PreparationStep => oneOf(item, stepIds))
    || !value.steps.length || new Set(value.steps).size !== value.steps.length) return null
  return value.steps
}

function matchInput(value: unknown): ConversationInput | null {
  if (!record(value) || !Object.keys(value).every((key) => oneOf(key, ['message', 'previousIds', 'useProfile', 'reportedCycle', 'reportedNoCertificate']))
    || !bounded(value.message, messageLimit, 3) || !list(value.previousIds, 6, uuid) || typeof value.useProfile !== 'boolean') return null
  const cycle = value.reportedCycle
  if (cycle !== undefined && (typeof cycle !== 'number' || !Number.isInteger(cycle) || cycle < 1 || cycle > 16)) return null
  if (value.reportedNoCertificate !== undefined && typeof value.reportedNoCertificate !== 'boolean') return null
  return { message: value.message.trim(), previousIds: value.previousIds, useProfile: value.useProfile, reportedCycle: cycle, reportedNoCertificate: value.reportedNoCertificate }
}

async function readJson(request: Request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')
    || Number(request.headers.get('content-length')) > bodyLimit || !request.body) return null
  const reader = request.body.getReader()
  const deadline = AbortSignal.timeout(3000)
  const timedOut = () => { void reader.cancel().catch(() => {}) }
  deadline.addEventListener('abort', timedOut)
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let length = 0
  let text = ''
  try {
    for (;;) {
      const chunk = await reader.read()
      if (deadline.aborted) return null
      if (chunk.done) return JSON.parse(text + decoder.decode()) as unknown
      length += chunk.value.byteLength
      if (length > bodyLimit) {
        timedOut()
        return null
      }
      text += decoder.decode(chunk.value, { stream: true })
    }
  } catch {
    return null
  } finally {
    deadline.removeEventListener('abort', timedOut)
    reader.releaseLock()
  }
}

export function createHandler(purpose: Purpose, env: Env, store: EdgeStore = createStore(env), generator = generate) {
  const origins = new Set((env('AYNI_AI_ORIGINS') ?? '').split(',').map((value) => value.trim()).filter(Boolean))
  const apiKey = env('GEMINI_API_KEY')
  const model = env('GEMINI_MODEL')?.trim() || defaultModel
  const configured = env('AYNI_AI_ENABLED') === 'true' && Boolean(apiKey)
  const cache = new Map<string, { selection: Selection; expiration: number }>()

  async function access(identity: Identity, cached = false): Promise<'ok' | Fallback> {
    if (!configured) return 'pilot'
    try {
      return await store.reserve(identity, purpose, cached)
    } catch {
      return 'unavailable'
    }
  }
  async function run(request: GeminiRequest): Promise<GeminiResult> {
    if (!apiKey) return { kind: 'unavailable' }
    return generator(apiKey, model, request)
  }

  return async (request: Request) => {
    const requestOrigin = request.headers.get('origin')
    const headers = new Headers({
      'cache-control': 'no-store', 'content-type': 'application/json; charset=utf-8',
      'vary': 'Origin', 'x-content-type-options': 'nosniff',
    })
    function send(value: unknown, status = 200) {
      return new Response(JSON.stringify(value), { status, headers })
    }
    if (requestOrigin && !origins.has(requestOrigin)) return send({ code: 'origin' }, 403)
    if (requestOrigin) headers.set('access-control-allow-origin', requestOrigin)
    if (request.method === 'OPTIONS') {
      headers.set('access-control-allow-methods', 'POST, OPTIONS')
      headers.set('access-control-allow-headers', 'authorization, apikey, x-client-info, content-type, x-supabase-api-version')
      headers.set('access-control-max-age', '600')
      return new Response(null, { status: 204, headers })
    }
    if (request.method !== 'POST') return send({ code: 'method' }, 405)
    const authorization = request.headers.get('authorization')
    const token = authorization?.match(/^Bearer ([\w.-]{20,4096})$/i)?.[1]
    if (!token) return send({ code: 'auth' }, 401)
    try {
      const identity = await store.identify(token)
      if (!identity) return send({ code: 'auth' }, 401)
      if (purpose === 'extract' && !await store.isOwner(identity)) return send({ code: 'owner' }, 403)
      const body = await readJson(request)

      if (purpose === 'extract') {
        if (!shape(body, ['source', 'text', 'publicConfirmed']) || !bounded(body.source, 2048)
          || !bounded(body.text, sourceLimit, 40) || body.publicConfirmed !== true) return send({ code: 'input' }, 400)
        const source = officialUrl(body.source)
        if (!source) return send({ code: 'input' }, 400)
        const text = publicSourceText(body.text)
        if (!text || text.length < 40) return send({ code: 'private_text' }, 422)
        const grant = await access(identity)
        if (grant !== 'ok') return send({ code: grant }, grant === 'quota' ? 429 : grant === 'pilot' ? 403 : 503)
        const response = await run({ prompt: extractionPrompt, data: { texto: text }, schema: extractionSchema, tokens: 4600 })
        if (response.kind !== 'ok') return send({ code: response.kind }, response.kind === 'quota' ? 429 : 502)
        const result = extractedOpportunity(response.output, text, source)
        return result ? send(result) : send({ code: 'invalid' }, 502)
      }

      if (purpose === 'roadmap') {
        if (!shape(body, ['opportunityId', 'useProfile', 'horizon']) || !uuid(body.opportunityId)
          || typeof body.useProfile !== 'boolean' || !oneOf(body.horizon, horizons)) return send({ code: 'input' }, 400)
        const [opportunity] = await store.catalog(identity, true, body.opportunityId)
        if (!opportunity) return send({ code: 'catalog' }, 404)
        const existing = await store.existingPlan(identity, opportunity.id)
        if (existing) return send(existing)
        const profile = body.useProfile ? await store.profile(identity) : emptyProfile
        let fallback: Fallback | undefined
        let steps: PreparationStep[] = []
        const grant = await access(identity)
        if (grant === 'ok') {
          const response = await run({
            prompt: instructions + ' Elige actividades generales en el orden sugerido para preparar una oportunidad de esta categoría y plazo. Incluye preparación de documentos y experiencia cuando sean pertinentes.',
            data: { categoria: opportunity.category, meses: body.horizon, actividades: stepIds.map((id) => ({ id, titulo: preparationSteps[id].title })) },
            schema: schema({ steps: strings(stepIds, 4) }), tokens: 300,
          })
          if (response.kind === 'ok') {
            const parsed = planSteps(response.output)
            if (parsed) steps = parsed
            else fallback = 'invalid'
          } else fallback = response.kind
        } else fallback = grant
        const roadmap = buildPreparationPlan(opportunity, profile, body.horizon, steps)
        await store.savePlan(identity, roadmap)
        const persisted = await store.existingPlan(identity, opportunity.id)
        if (!persisted) return send({ code: 'unavailable' }, 503)
        return send({ ...persisted, ...(persisted.origin === 'deterministic' && fallback ? { fallback } : {}) })
      }

      const input = matchInput(body)
      if (!input) return send({ code: 'input' }, 400)
      const [catalog, profile] = await Promise.all([
        store.catalog(identity, /requisitos|postular|\beth\b|\bcern\b|\bkaust\b/i.test(input.message)),
        input.useProfile ? store.profile(identity) : emptyProfile,
      ])
      const analysis = conversation(input, catalog, profile)
      const local = analysis.ranked
      let reply = analysis.reply()
      let fallback: Fallback | undefined
      if (local.length && analysis.publicCandidates.length) {
        const candidates = analysis.publicCandidates.map(({ opportunity, catalogThemes }) => ({ id: opportunity.id, category: opportunity.category, themes: catalogThemes }))
          .sort((a, b) => a.id.localeCompare(b.id))
        const data = { goal: analysis.publicSignals, catalog: candidates }
        const key = JSON.stringify(data)
        const saved = cache.get(key)
        let selection = saved && saved.expiration > Date.now() ? saved.selection : null
        const grant = await access(identity, Boolean(selection))
        if (grant !== 'ok') fallback = grant
        else {
          if (!selection) {
            const ids = candidates.map((item) => item.id)
            const response = await run({
              prompt: instructions + ' Ordena todos los identificadores por relación temática con el objetivo. Elige un consejo general acorde a la intención.',
              data, schema: schema({ ids: strings(ids, 6), tip: { type: 'string', enum: tips } }), tokens: 420,
            })
            if (response.kind === 'ok') {
              selection = selected(response.output, ids)
              if (selection) {
                if (cache.size >= 100) cache.delete(cache.keys().next().value!)
                cache.set(key, { selection, expiration: Date.now() + 15 * 60 * 1000 })
              } else fallback = 'invalid'
            } else fallback = response.kind
          }
          if (selection) {
            const ranked = [...local]
            const { ids } = selection
            const rank = (id: string) => ids.includes(id) ? ids.indexOf(id) : ids.length
            if (analysis.publicSignals.intent !== 'comparar') ranked.sort((a, b) =>
              b.points - a.points || b.profilePoints - a.profilePoints || rank(a.opportunity.id) - rank(b.opportunity.id))
            reply = analysis.reply(ranked, 'gemini', selection.tip)
          }
        }
      }
      return send({
        ...reply, ...(fallback ? { fallback } : {}),
        items: reply.items.map(({ opportunity, affinity, reason, assessment }) => ({
          opportunityId: opportunity.id, affinity, reason,
          statuses: assessment.requirements.map(({ id, result }) => ({ id, result })),
        })),
      })
    } catch {
      return send({ code: 'unavailable' }, 503)
    }
  }
}
