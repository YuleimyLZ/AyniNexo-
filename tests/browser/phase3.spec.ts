import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { createHandler } from '../../supabase/functions/_shared/handler'
import type { EdgeStore } from '../../supabase/functions/_shared/supabase'
import { emptyProfile } from '../../src/types/domain'
import { catalog, catalogRows, cernId, date, ethId, kaustOutput, kaustText, kaustUrl, ownerId, planId, studentId } from '../fixtures/ai'

const testOrigin = 'http://127.0.0.1:4174'
const fixtureOrigin = 'https://ayni-browser.example.test'
const actionId = 'ca000000-0000-4000-8000-000000000020'
const token = 'test.header-and-signature-0000'
const profile = { ...emptyProfile, academicLevel: 'Pregrado' as const, cycle: 3, interests: ['IA'] }
const submission = {
  id: 'ca000000-0000-4000-8000-000000000042', source: kaustUrl, body: 'Aporte aún por contrastar con la fuente.',
  suggested_category: 'Investigación', status: 'pending', submitted_at: date, contributor_id: studentId,
}
const actions = [{
  id: actionId, roadmap_id: planId, title: 'Organiza tus documentos', description: 'Confirma los formatos en la fuente oficial.',
  duration: '1 semana', priority: 'Alta', resources: [], completed: false, position: 1, requirement_id: null, requirement_label: null,
}]

async function setup(page: Page, role: 'student' | 'owner') {
  let stored = false
  let saved = false
  let completed = false
  let publishCalls = 0
  const matchBodies: object[] = []
  const userId = role === 'student' ? studentId : ownerId
  await page.clock.setFixedTime(new Date(date))
  await page.addInitScript(({ id, key }) => {
    localStorage.setItem('sb-ayni-browser-auth-token', JSON.stringify({
      access_token: key, refresh_token: 'browser-fixture-refresh', token_type: 'bearer',
      expires_at: 4102444800, expires_in: 3600,
      user: { id, email: 'pilot@example.invalid', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-11-27T14:00:00Z' },
    }))
  }, { id: userId, key: token })
  const store: EdgeStore = {
    identify: async () => ({ id: userId, token }),
    isOwner: async () => role === 'owner',
    catalog: async (_identity, _includePast, focus) => catalog.filter((item) => !focus || item.id === focus),
    profile: async () => profile,
    reserve: async () => 'ok',
    existingPlan: async () => stored ? { roadmapId: planId, origin: 'ai' } : null,
    savePlan: async () => { stored = true; return planId },
  }
  const vars: Record<string, string> = { AYNI_AI_ORIGINS: testOrigin, AYNI_AI_ENABLED: 'true', GEMINI_API_KEY: 'fixture' }
  const env = (name: string) => vars[name]
  const match = createHandler('match', env, store, async () => ({ kind: 'quota' }))
  const extract = createHandler('extract', env, store, async () => ({ kind: 'ok', output: kaustOutput }))
  const roadmap = createHandler('roadmap', env, store, async () => ({ kind: 'ok', output: { steps: ['documentos', 'experiencia'] } }))
  await page.route(fixtureOrigin + '/**', async (route) => {
    const incoming = route.request()
    const url = new URL(incoming.url())
    const method = incoming.method()
    const headers = {
      'access-control-allow-origin': testOrigin, 'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    }
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const json = async (data: unknown) => route.fulfill({ json: data, headers })
    let handler: typeof match | undefined
    if (url.pathname.endsWith('/match-opportunities')) {
      matchBodies.push(incoming.postDataJSON())
      handler = match
    }
    if (url.pathname.endsWith('/extract-opportunity')) handler = extract
    if (url.pathname.endsWith('/generate-roadmap')) handler = roadmap
    if (handler) {
      const result = await handler(new Request(incoming.url(), {
        method, headers: { ...await incoming.allHeaders(), origin: testOrigin }, body: incoming.postData() ?? '',
      }))
      return route.fulfill({ status: result.status, body: await result.text(), headers: Object.fromEntries(result.headers) })
    }
    if (url.pathname.endsWith('/user_roles')) return json([{ role }])
    if (url.pathname.endsWith('/opportunities')) return json(catalogRows)
    if (url.pathname.endsWith('/profiles')) return json([{
      user_id: userId, university: 'Ejemplo', program: 'Computación', academic_level: 'Pregrado', cycle: 3, english: 'B1',
      certificate: false, funding: null, travel: true, skills: [], interests: ['IA'], goals: '', projects: '', research: '', destinations: [],
    }])
    if (url.pathname.endsWith('/ayni_admin_counts')) return json({ published: 2, pending: 1, rejected: 0, expired: 0 })
    if (url.pathname.endsWith('/ayni_admin_submissions')) return json([submission])
    if (url.pathname.endsWith('/ayni_save_opportunity')) { publishCalls++; return json(ethId) }
    if (url.pathname.endsWith('/saved_opportunities')) {
      if (method === 'POST') { saved = true; return json(null) }
      return json(saved ? [{ opportunity_id: ethId, status: 'Guardada' }] : [])
    }
    if (url.pathname.endsWith('/roadmaps')) return json(stored ? [{
      id: planId, user_id: userId, opportunity_id: ethId, origin: 'ai', title: catalog[0].title,
      roadmap_actions: actions.map((item) => ({ ...item, completed })),
    }] : [])
    if (url.pathname.endsWith('/roadmap_actions')) { completed = true; return json([{ id: actionId }]) }
    return json([])
  })
  return { matchBodies, publishCalls: () => publishCalls }
}

async function screenshot(page: Page, name: string) {
  const folder = process.env.AYNI_CAPTURES_DIR
  if (!folder) return
  await mkdir(folder, { recursive: true })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: resolve(folder, name + '.png'), fullPage: true })
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
}

test('Mi Nexo conserva el contexto, evalúa con perfil, guarda, genera y registra el progreso', async ({ page }, info) => {
  const { matchBodies } = await setup(page, 'student')
  const variant = info.project.name === 'mobile' ? 'movil' : 'escritorio'
  await page.goto('/mi-nexo')
  await expect(page.getByRole('heading', { name: '¿Qué te gustaría explorar?' })).toBeVisible()
  await page.getByLabel('Usar mi perfil guardado').check()
  await noOverflow(page)
  await screenshot(page, 'fase-3-mi-nexo-inicio-' + variant)
  await page.getByRole('button', { name: 'Quiero investigar sobre inteligencia artificial en el extranjero.' }).click()
  await page.getByRole('button', { name: 'Enviar' }).click()
  const thread = page.getByRole('region', { name: 'Conversación' })
  await expect(thread.getByText('Orientación por reglas')).toBeVisible()
  await expect(thread.getByText(/Se alcanzó el límite de IA/)).toBeVisible()
  const eth = thread.getByRole('article').filter({ hasText: catalog[0].title }).first()
  await expect(eth.getByText('Alta afinidad')).toBeVisible()
  await eth.getByText('Elegibilidad y brechas').click()
  await expect(eth.getByText('Haber completado dos años de estudios al iniciar el programa')).toBeVisible()
  await eth.getByRole('button', { name: 'Guardar ' + catalog[0].title }).click()
  await expect(eth.getByRole('button', { name: 'Guardar ' + catalog[0].title })).toHaveAttribute('aria-pressed', 'true')
  await noOverflow(page)
  await screenshot(page, 'fase-3-mi-nexo-conversacion-' + variant)
  await page.getByLabel('Tu mensaje').fill('¿Cuál de las dos se adapta mejor a mí?')
  await page.getByRole('button', { name: 'Enviar' }).click()
  await expect(thread.getByText('Estas son las opciones para comparar.', { exact: false })).toBeVisible()
  expect(matchBodies[1]).toMatchObject({ previousIds: [ethId, cernId], useProfile: true })
  await eth.getByRole('link', { name: 'Generar mi ruta' }).click()
  await page.getByLabel('Horizonte aproximado').selectOption('3')
  await page.getByRole('button', { name: 'Generar mi ruta' }).click()
  await expect(page.getByText('Ruta de preparación generada con asistencia de IA.')).toBeVisible()
  await page.getByLabel('Marcar como completada').click()
  await expect(page.getByText('1 de 1 acciones completadas')).toBeVisible()
  await page.goBack()
  await page.goBack()
  await expect(page.getByText('¿Cuál de las dos se adapta mejor a mí?')).toBeVisible()
  await page.getByRole('button', { name: 'Nueva conversación' }).click()
  await expect(page.getByRole('heading', { name: '¿Qué te gustaría explorar?' })).toBeVisible()
  await expect(page.getByText('¿Cuál de las dos se adapta mejor a mí?')).toHaveCount(0)
})

test('Owner extrae KAUST en registro y revisión de aportes sin publicar', async ({ page }, info) => {
  const { publishCalls } = await setup(page, 'owner')
  await page.goto('/administracion')
  await page.getByRole('button', { name: 'Registrar oportunidad' }).click()
  const extractor = page.getByRole('region', { name: 'Completar con IA' })
  await extractor.getByLabel('Enlace oficial para la extracción').fill(kaustUrl)
  await extractor.getByLabel('Texto público de la convocatoria').fill(kaustText)
  await extractor.getByLabel(/Confirmo que el fragmento/).check()
  await extractor.getByRole('button', { name: 'Extraer información con IA' }).click()
  await expect(extractor.getByText('Borrador completado.', { exact: false })).toBeVisible()
  await expect(page.getByLabel('Título', { exact: true })).toHaveValue('Visiting Student Research Program (VSRP)')
  await expect(page.getByLabel('Fecha límite', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('Última verificación', { exact: true })).toHaveValue('')
  await extractor.getByText('Ver fragmentos de la fuente').click()
  await page.getByLabel('Título', { exact: true }).fill('Visiting Student Research Program (KAUST)')
  await expect(page.getByLabel('Título', { exact: true })).toHaveValue('Visiting Student Research Program (KAUST)')
  await noOverflow(page)
  await screenshot(page, 'fase-3-extractor-' + (info.project.name === 'mobile' ? 'movil' : 'escritorio'))
  await page.getByRole('button', { name: 'Cerrar editor' }).click()
  await page.getByRole('button', { name: 'Revisar aporte' }).click()
  await expect(extractor.getByLabel('Enlace oficial para la extracción')).toHaveValue(kaustUrl)
  await expect(extractor.getByLabel('Texto público de la convocatoria')).toHaveValue('')
  expect(publishCalls()).toBe(0)
})

test('Student no accede a administración', async ({ page }) => {
  await setup(page, 'student')
  await page.goto('/administracion')
  await expect(page.getByRole('heading', { name: 'Acceso restringido' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Registrar oportunidad' })).toHaveCount(0)
})
