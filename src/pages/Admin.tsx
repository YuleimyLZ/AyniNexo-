import { ArrowUpRight, Check, Pencil, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { OpportunityExtractor } from '../components/OpportunityExtractor'
import { RequirementsEditor } from '../components/RequirementsEditor'
import { Button, EmptyState, PageIntro, Status } from '../components/ui'
import { formatDate, opportunityStatus, todayInPeru } from '../features/eligibility'
import { editDraft, emptyDraft, makeOpportunity, submissionDraft } from '../features/moderation'
import type { Draft } from '../features/moderation'
import type { Extraction } from '../services/aiContracts'
import { submissionLabels } from '../services/records'
import { createRepository } from '../services/repository'
import type { AdminData } from '../services/repository'
import { supabase } from '../services/supabase'
import { officialUrl, userMessage } from '../services/validation'
import { useWorkspace } from '../services/workspaceContext'
import type { ModerationStatus } from '../types/database'
import { academicLevels, categories, fundingOptions, modalities } from '../types/domain'
import type { Opportunity, Submission } from '../types/domain'

const repository = supabase ? createRepository(supabase) : null
type Editor = { draft: Draft; submission?: Submission }
type Snapshot = { query: string; data: AdminData | null }

export function Admin() {
  const { reloadCatalog } = useWorkspace()
  const [filter, setFilter] = useState<ModerationStatus | ''>('')
  const [version, setVersion] = useState(0)
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const query = `${filter}:${version}`
  const current = snapshot?.query === query ? snapshot : null
  const data = current?.data

  useEffect(() => {
    if (!repository) return
    let active = true
    void repository.admin(filter || undefined).then((loaded) => {
      if (active) setSnapshot({ query, data: loaded })
    }, () => {
      if (active) setSnapshot({ query, data: null })
    })
    return () => { active = false }
  }, [filter, query])

  function refresh(catalogChanged = false) {
    setVersion((previous) => previous + 1)
    if (catalogChanged) reloadCatalog()
  }

  function open(next: Editor) {
    setNotice('')
    setError('')
    setEditor(next)
    requestAnimationFrame(() => document.getElementById('admin-editor')?.scrollIntoView({ block: 'start' }))
  }

  function openSubmission(submission: Submission) {
    const published = data?.catalog.find((item) => item.id === submission.publishedOpportunityId)
    open({ draft: published ? editDraft(published) : submissionDraft(submission), submission })
  }

  async function archive(opportunity: Opportunity) {
    if (busy || !repository) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const archived = opportunity.status !== 'Archivada'
      await repository.archiveOpportunity(opportunity.id, archived)
      if (editor?.draft.id === opportunity.id) setEditor(null)
      setNotice(archived ? 'Oportunidad archivada.' : 'Oportunidad restaurada en el catálogo.')
      refresh(true)
    } catch (cause) {
      setError(userMessage(cause, 'No pudimos actualizar el estado de la convocatoria.'))
    } finally {
      setBusy(false)
    }
  }

  function completed(message: string, catalogChanged: boolean, next?: Editor) {
    setEditor(next ?? null)
    setNotice(message)
    refresh(catalogChanged)
  }

  const counts = data?.counts
  const metrics = counts ? [
    ['Publicadas', counts.published], ['Aportes pendientes', counts.pending],
    ['Aportes rechazados', counts.rejected], ['Convocatorias vencidas o cerradas', counts.expired],
  ] as const : []

  return <div className="container subpage admin-page">
    <PageIntro label="Administración" title={<>Panel de <em>revisión.</em></>}>Revisa aportes, verifica sus fuentes y administra las convocatorias del catálogo.</PageIntro>
    {!current && <p className="state-message" role="status">Cargando administración…</p>}
    {current && !data && <EmptyState title="No pudimos cargar la administración" action={<Button onClick={() => refresh()}>Reintentar</Button>}>Comprueba la conexión y tu rol en Supabase.</EmptyState>}
    {counts && <dl className="admin-metrics">{metrics.map(([label, count]) => <div className="surface" key={label}><dt>{label}</dt><dd>{count}</dd></div>)}</dl>}
    {error && <p className="error-text admin-notice" role="alert">{error}</p>}
    {notice && <p className="confirmation admin-notice" role="status"><Check size={17} />{notice}</p>}
    <div className="section-heading">
      <h2>Aportes de la comunidad</h2>
      <Button onClick={() => open({ draft: emptyDraft() })}><Plus size={17} /> Registrar oportunidad</Button>
    </div>
    <div className="admin-filters action-row">
      <label className="field"><span>Estado del aporte</span><select aria-label="Estado del aporte" value={filter} onChange={(event) => setFilter(event.target.value as ModerationStatus | '')}>
        <option value="">Todos los estados</option>{Object.entries(submissionLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select></label>
      <Button variant="outline" onClick={() => refresh()}>Actualizar bandeja</Button>
    </div>
    {data && <div className="surface admin-list">
      {data.submissions.length ? data.submissions.map((item) => <article key={item.id}>
        <div><OfficialSource source={item.source} /><p>{formatDate(todayInPeru(new Date(item.submittedAt)))} · {item.category || 'Sin categoría'}</p></div>
        <Status>{item.status}</Status>
        <Button variant="outline" onClick={() => openSubmission(item)}>Revisar aporte</Button>
      </article>) : <p className="quiet">No hay aportes con este estado.</p>}
    </div>}
    {editor && <AdminEditor key={editor.submission?.id ?? editor.draft.id} editor={editor} onClose={() => setEditor(null)} completed={completed} />}
    {data && <>
      <div className="section-heading admin-catalog-heading"><h2>Catálogo administrado</h2></div>
      <div className="surface admin-list">{data.catalog.length ? data.catalog.map((item) => <article key={item.id}>
        <div><h3>{item.title}</h3><p>{item.organization}</p></div>
        <Status>{item.status === 'Archivada' ? 'Archivada' : opportunityStatus(item)}</Status>
        <div className="action-row">
          <Button variant="outline" onClick={() => open({ draft: editDraft(item) })}><Pencil size={15} /> Editar</Button>
          <Button variant="text" disabled={busy} onClick={() => void archive(item)}>{item.status === 'Archivada' ? 'Restaurar' : 'Archivar'}</Button>
        </div>
      </article>) : <p className="quiet">Todavía no hay convocatorias registradas.</p>}</div>
    </>}
  </div>
}

function OfficialSource({ source }: { source: string }) {
  const url = officialUrl(source)
  return url ? <a className="inline-link admin-url" href={url} target="_blank" rel="noreferrer">{new URL(url).hostname} <ArrowUpRight size={15} /></a> : <span>Fuente por confirmar</span>
}

function AdminEditor({ editor, onClose, completed }: { editor: Editor; onClose: () => void; completed: (message: string, catalogChanged: boolean, next?: Editor) => void }) {
  const [draft, setDraft] = useState(editor.draft)
  const [topics, setTopics] = useState(draft.topics.join(', '))
  const [note, setNote] = useState(editor.submission?.moderatorNote ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const { submission } = editor
  const awaitingReview = submission?.status === 'Pendiente' || submission?.status === 'En revisión'
  const editable = !submission || awaitingReview || Boolean(draft.id)

  function change<Key extends keyof Draft>(key: Key, value: Draft[Key]) {
    setDraft((previous) => ({ ...previous, [key]: value }))
  }

  function applyExtraction(result: Extraction) {
    setDraft((previous) => ({
      ...previous,
      source: result.source, verified: '', title: result.title ?? previous.title, organization: result.organization ?? previous.organization,
      category: result.category ?? previous.category, country: result.country ?? previous.country, modality: result.modality ?? previous.modality,
      funding: result.funding ?? previous.funding, deadline: result.deadline ?? previous.deadline, description: result.description ?? previous.description,
      benefits: result.benefits.length ? result.benefits.join('\n') : previous.benefits,
      levels: result.levels.length ? result.levels : previous.levels,
      pending: result.pending.join('\n').slice(0, 1500),
      requirements: [...previous.requirements, ...result.requirements.filter((item) => !previous.requirements.some((current) => current.label === item.label))].slice(0, 30),
    }))
    if (result.topics.length) setTopics(result.topics.join(', ').slice(0, 400))
  }

  async function review(status: 'reviewing' | 'rejected' | 'archived') {
    if (!submission || !repository || busy || extracting) return
    setBusy(true)
    setError('')
    try {
      await repository.reviewSubmission(submission.id, status, note)
      const label = submissionLabels[status]
      const next = status === 'reviewing' ? { draft, submission: { ...submission, status: label, moderatorNote: note } } : undefined
      const messages = { reviewing: 'El aporte está en revisión.', rejected: 'Aporte rechazado.', archived: 'Aporte archivado.' }
      completed(messages[status], false, next)
    } catch (cause) {
      setError(userMessage(cause, 'No pudimos actualizar el aporte.'))
    } finally {
      setBusy(false)
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy || extracting || !repository || !editable) return
    const source = officialUrl(draft.source)
    if (!source) { setError('Ingresa un enlace oficial que empiece por http:// o https://.'); return }
    const topicList = [...new Set(topics.split(',').map((topic) => topic.trim()).filter(Boolean))]
    if (!draft.title.trim() || !draft.organization.trim() || !draft.country.trim() || !draft.description.trim() || !draft.category || !draft.modality || !draft.levels.length || !draft.verified || topicList.length > 20) {
      setError('Completa el título, la institución, el país, la descripción, la categoría, la modalidad, el nivel académico y la verificación. Usa hasta 20 temas.')
      return
    }
    const requirements = draft.requirements.map((item) => ({ ...item, source: item.source ? officialUrl(item.source) ?? '' : undefined }))
    if (requirements.some((item) => !item.label.trim() || item.source === '' || (item.kind === 'level' && !item.levels.length))) {
      setError('Revisa la descripción, el nivel requerido y el enlace de cada requisito.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const opportunity = makeOpportunity({ ...draft, requirements, topics: topicList }, source)
      await repository.saveOpportunity(opportunity, awaitingReview ? submission?.id : undefined, note)
      completed(draft.id ? 'Convocatoria actualizada.' : 'Convocatoria publicada.', true)
    } catch (cause) {
      setError(userMessage(cause, 'No pudimos guardar la convocatoria. El formulario conserva tus cambios.'))
    } finally {
      setBusy(false)
    }
  }

  return <section className="surface simple-panel admin-editor" id="admin-editor">
    <div className="section-heading"><h2>{submission ? 'Revisar aporte' : draft.id ? 'Editar oportunidad' : 'Nueva oportunidad'}</h2><Button variant="text" onClick={onClose} disabled={busy || extracting}>Cerrar editor</Button></div>
    {submission && <div className="original-submission"><h3>Aporte original</h3><OfficialSource source={submission.source} />
      <p>{submission.text || 'El aporte contiene únicamente un enlace.'}</p>{submission.comment && <p><strong>Comentario</strong> · {submission.comment}</p>}
      <Status>{submission.status}</Status>
    </div>}
    {editable && !draft.id && <OpportunityExtractor source={draft.source} onSource={(value) => change('source', value)} onApply={applyExtraction} onPending={setExtracting} />}
    <form className="stacked-form admin-form" onSubmit={save}>
      {submission && <label className="field"><span>Observaciones privadas de moderación</span><textarea aria-label="Observaciones privadas de moderación" maxLength={2000} rows={3} value={note} onChange={(event) => setNote(event.target.value)} /></label>}
      {editable && <>
        <div className="form-grid">
          <label className="field"><span>Título</span><input required value={draft.title} maxLength={130} onChange={(event) => change('title', event.target.value)} /></label>
          <label className="field"><span>Institución</span><input required value={draft.organization} maxLength={100} onChange={(event) => change('organization', event.target.value)} /></label>
          <label className="field"><span>Categoría</span><select required aria-label="Categoría" value={draft.category} onChange={(event) => change('category', event.target.value as Draft['category'])}><option value="">Por confirmar</option>{categories.map((option) => <option key={option}>{option}</option>)}</select></label>
          <label className="field"><span>País</span><input required value={draft.country} maxLength={60} onChange={(event) => change('country', event.target.value)} /></label>
          <label className="field"><span>Modalidad</span><select required aria-label="Modalidad" value={draft.modality} onChange={(event) => change('modality', event.target.value as Draft['modality'])}><option value="">Por confirmar</option>{modalities.map((option) => <option key={option}>{option}</option>)}</select></label>
          <label className="field"><span>Financiamiento</span><select aria-label="Financiamiento" value={draft.funding} onChange={(event) => change('funding', event.target.value as Draft['funding'])}>{fundingOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
          <label className="field"><span>Fecha límite</span><input type="date" value={draft.deadline} onChange={(event) => change('deadline', event.target.value)} /></label>
          <label className="field"><span>Última verificación</span><input type="date" required max={todayInPeru()} value={draft.verified} onChange={(event) => change('verified', event.target.value)} /></label>
          <label className="field field--wide"><span>Fuente oficial</span><input type="url" required value={draft.source} maxLength={2048} onChange={(event) => change('source', event.target.value)} /></label>
          <label className="field field--wide"><span>Descripción</span><textarea aria-label="Descripción" required value={draft.description} maxLength={2500} onChange={(event) => change('description', event.target.value)} /></label>
          <label className="field"><span>Beneficios · uno por línea</span><textarea aria-label="Beneficios · uno por línea" value={draft.benefits} maxLength={1500} onChange={(event) => change('benefits', event.target.value)} /></label>
          <label className="field"><span>Información por confirmar</span><textarea aria-label="Información por confirmar" value={draft.pending} maxLength={1500} onChange={(event) => change('pending', event.target.value)} /></label>
          <label className="field"><span>Temas · separados por comas</span><input value={topics} maxLength={400} onChange={(event) => setTopics(event.target.value)} /></label>
          <label className="check-field"><input type="checkbox" checked={Boolean(draft.closed)} onChange={(event) => change('closed', event.target.checked)} /> Convocatoria cerrada</label>
        </div>
        <fieldset className="field admin-levels"><legend>Niveles académicos</legend><div className="action-row">{academicLevels.map((level) => <label key={level} className="check-field">
          <input type="checkbox" checked={draft.levels.includes(level)} onChange={(event) => change('levels', event.target.checked ? [...draft.levels, level] : draft.levels.filter((item) => item !== level))} />{level}
        </label>)}</div></fieldset>
        <RequirementsEditor requirements={draft.requirements} onChange={(value) => change('requirements', value)} />
      </>}
      <div className="action-row">
        {editable && <Button type="submit" disabled={busy || extracting}><Check size={17} />{draft.id ? 'Guardar cambios' : awaitingReview ? 'Aprobar y publicar' : 'Publicar oportunidad'}</Button>}
        {submission?.status === 'Pendiente' && <Button variant="outline" disabled={busy || extracting} onClick={() => void review('reviewing')}>Pasar a revisión</Button>}
        {awaitingReview && <Button variant="outline" disabled={busy || extracting} onClick={() => void review('rejected')}>Rechazar aporte</Button>}
        {submission && submission.status !== 'Archivada' && <Button variant="text" disabled={busy || extracting} onClick={() => void review('archived')}>Archivar aporte</Button>}
      </div>
      {error && <p className="error-text" role="alert">{error}</p>}
    </form>
  </section>
}
