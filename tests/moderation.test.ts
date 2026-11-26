import { expect, it } from 'vitest'
import { editDraft, makeOpportunity, submissionDraft } from '../src/features/moderation'
import { demoCatalog } from '../src/services/catalog'
import { officialUrl } from '../src/services/validation'

it('valida enlaces HTTP y HTTPS sin credenciales incrustadas', () => {
  expect(officialUrl(' https://example.org/convocatoria ')).toBe('https://example.org/convocatoria')
  expect(officialUrl('http://example.org')).toBe('http://example.org/')
  expect(officialUrl('javascript:alert(1)')).toBeNull()
  expect(officialUrl('https://usuario:clave@example.org/')).toBeNull()
})

it('prepara el aporte para revisión humana con los campos aportados', () => {
  const draft = submissionDraft({
    id: 'submission', source: 'https://example.org/programa', text: 'Texto sin verificar', comment: '',
    category: 'Investigación', status: 'Pendiente', submittedAt: '2026-11-26T00:00:00Z',
  })
  expect(draft).toMatchObject({
    source: 'https://example.org/programa', category: 'Investigación', title: '', description: '', verified: '',
  })
})

it('preserva las reglas estructuradas al editar un registro del catálogo', () => {
  const item = demoCatalog[1]
  const draft = editDraft(item)
  const saved = makeOpportunity({ ...draft, description: 'Texto editado' }, 'https://example.org')
  expect(saved).toMatchObject({ description: 'Texto editado', requirements: item.requirements })
})
