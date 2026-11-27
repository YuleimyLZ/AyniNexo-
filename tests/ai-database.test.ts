import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ethId, ownerId, studentId } from './fixtures/ai'

const denied = 'ca000000-0000-4000-8000-000000000099'
const db = new PGlite()
const migrate = async (path: string) => db.exec(await readFile(new URL(path, import.meta.url), 'utf8'))
async function reserve(actor: string, purpose: string, cached = false, limit = 5, global = 20, minute = 20) {
  const { rows } = await db.query<{ result: string }>('select public.ayni_reserve_ai($1, $2, $3, $4, $5, $6) as result', [actor, purpose, cached, limit, global, minute])
  return rows[0].result
}

beforeAll(async () => {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
  `)
  await migrate('../supabase/migrations/20261126000100_fase_2.sql')
  await migrate('../supabase/migrations/20261127000100_fase_3_ia.sql')
}, 30000)
afterAll(async () => db.close())

describe('Migración, políticas y cuotas PostgreSQL', () => {
  it('conserva las políticas de Fase 2 en una base desechable', async () => {
    const script = await readFile(new URL('../supabase/tests/rls.sql', import.meta.url), 'utf8')
    await db.exec("set ayni.disposable_test = 'on';")
    await expect(db.exec(script.replace(/^\\(?:set|echo)[^\n]*\n/gm, ''))).resolves.toBeDefined()
  })
  it('mantiene los contadores atómicos y reserva solo para el piloto adulto', async () => {
    await db.query('insert into auth.users (id) values ($1), ($2), ($3)', [ownerId, studentId, denied])
    await db.query("update public.user_roles set role = 'owner' where user_id = $1", [ownerId])
    await db.query("insert into ayni_private.ai_pilot_members values ($1, 'PE', true, now() + interval '1 day'), ($2, 'PE', true, now() + interval '1 day'), ($3, 'PE', true, now() - interval '1 day')", [ownerId, studentId, denied])
    await db.exec('set role service_role')
    try {
      expect(await reserve(denied, 'match')).toBe('pilot')
      expect(await reserve(studentId, 'extract')).toBe('pilot')
      expect(await reserve(studentId, 'match', false, 0)).toBe('quota')
      const results = await Promise.all(Array.from({ length: 8 }, () => reserve(studentId, 'match')))
      expect(results.filter((result) => result === 'ok')).toHaveLength(5)
      expect(await reserve(studentId, 'roadmap', true)).toBe('quota')
      expect(await reserve(ownerId, 'extract', false, 10, 5, 20)).toBe('quota')
      expect(await reserve(ownerId, 'extract', false, 10, 20, 5)).toBe('quota')
      expect(await reserve(ownerId, 'extract', false, 10, 20, 20)).toBe('ok')
    } finally {
      await db.exec('reset role')
    }
    const { rows } = await db.query<{ count: number }>("select count from ayni_private.ai_usage where bucket = 'global:day'")
    expect(rows[0].count).toBe(6)
  })
  it('protege las cuotas y el origen AI aun si se invoca PostgREST directamente', async () => {
    await db.exec('set role authenticated')
    try {
      await expect(reserve(studentId, 'match')).rejects.toMatchObject({ code: '42501' })
      await expect(db.query('select * from ayni_private.ai_pilot_members')).rejects.toMatchObject({ code: '42501' })
      await expect(db.query("select public.ayni_save_ai_roadmap($1, $2, '[]')", [studentId, ethId])).rejects.toMatchObject({ code: '42501' })
    } finally {
      await db.exec('reset role')
    }
  })
  it('preserva una ruta previa por reglas y acredita origen AI para una ruta nueva', async () => {
    await db.query(`insert into public.opportunities (id,title,organization,description,category,country,modality,academic_levels,funding,source,verified_on)
      values ($1,'Prueba','Prueba','Detalle','Investigación','Perú','Presencial','{Pregrado}','Completo','https://example.invalid/fase3','2026-11-27')`, [ethId])
    const actions = JSON.stringify([{ title: 'Acción', description: 'Detalle', priority: 'Alta', duration: '2 semanas' }])
    await db.exec('set role authenticated')
    try {
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [studentId])
      await db.query('select public.ayni_save_roadmap($1, $2)', [ethId, actions])
    } finally {
      await db.exec('reset role')
    }
    await db.exec('set role service_role')
    try {
      await db.query('select public.ayni_save_ai_roadmap($1, $2, $3)', [studentId, ethId, actions])
      await db.query('select public.ayni_save_ai_roadmap($1, $2, $3)', [ownerId, ethId, actions])
    } finally {
      await db.exec('reset role')
    }
    const { rows } = await db.query('select user_id, origin from public.roadmaps order by user_id')
    expect(rows).toEqual([{ user_id: ownerId, origin: 'ai' }, { user_id: studentId, origin: 'deterministic' }])
  })
})
