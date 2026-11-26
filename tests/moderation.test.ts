import { expect, it } from 'vitest'
import { editDraft, emptyDraft, extractDemo, makeOpportunity } from '../src/features/moderation'
import { demoCatalog } from '../src/services/catalog'
import { officialUrl } from '../src/services/demo'

it('valida enlaces HTTPS sin credenciales incrustadas', () => {
  expect(officialUrl(' https://example.org/convocatoria ')).toBe('https://example.org/convocatoria')
  expect(officialUrl('http://example.org')).toBeNull()
  expect(officialUrl('javascript:alert(1)')).toBeNull()
  expect(officialUrl('https://usuario:clave@example.org/')).toBeNull()
})

it('extrae únicamente datos proporcionados y descarta fechas imposibles', () => {
  const draft = extractDemo({ ...emptyDraft(), text: 'Título: Prueba de revisión\nPaís: Perú\nFecha límite: 2027-02-31' })
  expect(draft).toMatchObject({ title: 'Prueba de revisión', country: 'Perú', organization: '', deadline: '', source: '' })
})

it('preserva las reglas estructuradas al editar un registro del catálogo', () => {
  const item = demoCatalog[1]
  const draft = editDraft(item)
  const saved = makeOpportunity({ ...draft, description: 'Texto editado' }, item.id, item.source, item)
  expect(saved).toMatchObject({ description: 'Texto editado', requirements: item.requirements })
})
