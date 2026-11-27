import { describe, expect, it } from 'vitest'
import { validateConnection } from '../src/services/config'
import { readProfile, readRequirement, writeProfile, writeRequirement } from '../src/services/records'
import { officialUrl, userMessage, validReturnPath } from '../src/services/validation'
import type { Json, RequirementRow } from '../src/types/database'
import { emptyProfile } from '../src/types/domain'
import type { Requirement } from '../src/types/domain'

describe('configuración y autenticación', () => {
  it('distingue una conexión ausente de una conexión incompleta', () => {
    expect(validateConnection(undefined, undefined)).toBeNull()
    expect(() => validateConnection('https://example.supabase.co', '')).toThrow('Publishable Key')
    expect(() => validateConnection('', 'sb_publishable_example')).toThrow('VITE_SUPABASE_URL')
  })

  it('acepta una clave publicable y rechaza una privada o una URL insegura', () => {
    expect(validateConnection('https://example.supabase.co/', 'sb_publishable_example')).toEqual({
      url: 'https://example.supabase.co', key: 'sb_publishable_example',
    })
    expect(() => validateConnection('https://example.supabase.co', 'sb_secret_example')).toThrow('Publishable Key')
    expect(() => validateConnection('http://example.supabase.co', 'sb_publishable_example')).toThrow('origen HTTPS')
    const serviceJwt = ['header', btoa(JSON.stringify({ role: 'service_role' })), 'signature'].join('.')
    expect(() => validateConnection('https://example.supabase.co', serviceJwt)).toThrow('Publishable Key')
  })

  it('devuelve solo rutas internas después de iniciar sesión', () => {
    expect(validReturnPath('/guardadas?filtro=1')).toBe('/guardadas?filtro=1')
    expect(validReturnPath('//example.org')).toBe('/perfil')
    expect(validReturnPath('/\\example.org')).toBe('/perfil')
    expect(validReturnPath('/\n/example.org')).toBe('/perfil')
  })

  it('distingue credenciales incorrectas, correo pendiente y errores de conexión', () => {
    expect(userMessage({ code: 'invalid_credentials' })).toContain('incorrectos')
    expect(userMessage({ code: 'email_not_confirmed' })).toContain('Confirma')
    expect(userMessage(new Error('Invalid login credentials'))).toContain('incorrectos')
    expect(userMessage(new TypeError('fetch failed'), 'Error de conexión')).toBe('Error de conexión')
  })
})

describe('registros de Supabase', () => {
  it('conserva el valor «No» y distingue los campos académicos no informados', () => {
    const profile = { ...emptyProfile, cycle: 3, certificate: 'No' as const, university: 'Institución' }
    const write = writeProfile(profile, 'student')
    expect(write).toMatchObject({ certificate: false, academic_level: null, travel: null })
    expect(readProfile({ ...write, created_at: '', updated_at: '' })).toEqual(profile)
  })

  it('conserva el tipo, el valor y la condición de un requisito estructurado', () => {
    const requirement: Requirement = {
      id: 'fa200000-0000-4000-8000-000000000011', kind: 'cycle', minimum: 6,
      whenLevel: 'Pregrado', mandatory: true, label: 'Ciclo mínimo', unit: 'Ciclo', source: 'https://example.org/',
    }
    const payload = writeRequirement(requirement) as Record<string, Json>
    const row: RequirementRow = {
      id: requirement.id, opportunity_id: '', kind: requirement.kind, label: requirement.label, mandatory: true,
      source: requirement.source!, unit: requirement.unit!, created_at: '', updated_at: '', display_order: 0,
      condition: payload.condition, required_value: payload.required_value,
    }
    expect(readRequirement(row)).toEqual(requirement)
    expect(() => readRequirement({ ...row, required_value: 'six' })).toThrow('inválido')
  })

  it('rechaza enlaces con escapes, credenciales y esquemas ajenos a HTTP', () => {
    expect(officialUrl('https://example.org/a#b')).toBe('https://example.org/a#b')
    expect(officialUrl('https://example.org\\@example.net/')).toBeNull()
    expect(officialUrl('https://user@example.net/')).toBeNull()
    expect(officialUrl('data:text/html,section')).toBeNull()
  })
})
