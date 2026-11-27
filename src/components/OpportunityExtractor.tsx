import { Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from './ui'
import { sourceLimit } from '../services/aiContracts'
import type { Extraction } from '../services/aiContracts'
import { extract, GuidanceError } from '../services/edgeGuidance'
import { officialUrl } from '../services/validation'

const messages: Record<string, string> = {
  pilot: 'La extracción requiere que tu cuenta Owner esté autorizada para el piloto.',
  owner: 'La extracción está disponible para la cuenta Owner.',
  auth: 'Vuelve a iniciar sesión para usar el extractor.',
  quota: 'Se alcanzó el límite de extracciones. Puedes completar el formulario a mano.',
  invalid: 'No pudimos validar la extracción. Puedes recortar el texto a un fragmento más específico o completar los campos a mano.',
  private_text: 'Revisa el texto y retira correos, teléfonos, identificadores o datos personales antes de volver a intentar.',
  input: 'Revisa el enlace oficial y el texto público antes de continuar.',
}
const evidenceLabels = {
  title: 'Título', organization: 'Institución', category: 'Categoría', country: 'País', modality: 'Modalidad',
  funding: 'Financiamiento', deadline: 'Fecha límite', description: 'Descripción', benefits: 'Beneficios',
  topics: 'Temas', levels: 'Nivel académico', requirements: 'Requisito',
}

export function OpportunityExtractor({ source, onSource, onApply, onPending }: {
  source: string; onSource: (value: string) => void; onApply: (result: Extraction) => void; onPending: (value: boolean) => void
}) {
  const [text, setText] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Extraction | null>(null)
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (request.current) return
    const link = officialUrl(source)
    if (!link || text.trim().length < 40 || !confirmed) {
      setError(messages.input)
      return
    }
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    onPending(true)
    setError('')
    setResult(null)
    try {
      const response = await extract(link, text.trim(), confirmed, controller.signal)
      if (controller.signal.aborted) return
      setResult(response)
      onApply(response)
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof GuidanceError && messages[cause.code] || 'La extracción no está disponible. Puedes completar el formulario a mano.')
    } finally {
      if (!controller.signal.aborted) {
        request.current = null
        setBusy(false)
        onPending(false)
      }
    }
  }

  return <section className="extractor-panel" aria-labelledby="extractor-title">
    <div className="extractor-heading"><span className="icon-tile tone-rose"><Sparkles size={20} aria-hidden /></span><div>
      <h3 id="extractor-title">Completar con IA</h3>
      <p>Pega el texto público de la convocatoria oficial. Revisa la evidencia y edita el borrador antes de publicar.</p>
    </div></div>
    <form onSubmit={submit} className="extractor-form">
      <label className="field"><span>Enlace oficial para la extracción</span><input type="url" value={source} onChange={(event) => { onSource(event.target.value); setConfirmed(false) }} maxLength={2048} required disabled={busy} /></label>
      <label className="field"><span>Texto público de la convocatoria</span><textarea value={text} rows={4} maxLength={sourceLimit} minLength={40} required disabled={busy}
        onChange={(event) => { setText(event.target.value); setConfirmed(false) }} placeholder="Pega un fragmento de la fuente con los beneficios y requisitos." /></label>
      <label className="check-field"><input type="checkbox" required checked={confirmed} disabled={busy} onChange={(event) => setConfirmed(event.target.checked)} /> Confirmo que el fragmento es público y no contiene datos personales.</label>
      <div className="action-row"><Button type="submit" disabled={busy || !confirmed}><Sparkles size={16} />{busy ? 'Extrayendo información…' : 'Extraer información con IA'}</Button>
        {busy && <p className="quiet" role="status">Comparando los campos con el texto proporcionado.</p>}
      </div>
    </form>
    {error && <p className="error-text" role="alert">{error}</p>}
    {result && <div className="extractor-result">
      <p className="confirmation" role="status">Borrador completado. Revisa la información por confirmar.</p>
      {result.pending.length > 0 && <details open><summary>Campos y requisitos por verificar</summary><ul>{result.pending.map((item) => <li key={item}>{item}</li>)}</ul></details>}
      {result.evidence.length > 0 && <details><summary>Ver fragmentos de la fuente</summary><ul>{result.evidence.map(({ field, quote }, index) => <li key={field + index}><strong>{evidenceLabels[field]}</strong> · {quote}</li>)}</ul></details>}
    </div>}
  </section>
}
