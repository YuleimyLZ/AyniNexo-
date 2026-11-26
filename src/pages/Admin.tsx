import { ArrowUpRight, Check, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button, DemoNote, PageIntro, Status } from '../components/ui'
import { deadlineStatus, formatDate } from '../features/eligibility'
import { editDraft, emptyDraft, extractDemo, makeOpportunity, submissionDraft } from '../features/moderation'
import type { Draft } from '../features/moderation'
import { officialUrl } from '../services/demo'
import { useWorkspace } from '../services/workspaceContext'
import { academicLevels, categories, fundingOptions, modalities } from '../types/domain'
import type { Submission, SubmissionStatus } from '../types/domain'

type Editor = { draft: Draft; submissionId?: string }

export function Admin() {
  const { workspace, update, catalog } = useWorkspace()
  const [editor, setEditor] = useState<Editor | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const pending = workspace.submissions.filter((item) => item.status === 'Pendiente' || item.status === 'En revisión').length
  const metrics = [
    ['Publicadas', catalog.filter((item) => item.status === 'Aprobada').length],
    ['Aportes pendientes', pending],
    ['Aportes rechazados', workspace.submissions.filter((item) => item.status === 'Rechazada').length],
    ['Convocatorias vencidas', catalog.filter((item) => deadlineStatus(item.deadline) === 'Vencida').length],
  ] as const
  const related = workspace.submissions.find((item) => item.id === editor?.submissionId)

  function changeStatus(id: string, status: SubmissionStatus) {
    update((previous) => ({ ...previous, submissions: previous.submissions.map((item) => item.id === id ? { ...item, status } : item) }))
  }

  function openEditor(next: Editor) {
    setEditor(next)
    setNotice('')
    setError('')
    requestAnimationFrame(() => document.getElementById('admin-editor')?.scrollIntoView({ block: 'start' }))
  }

  function review(submission: Submission) {
    const published = catalog.find((item) => item.id === `aporte-${submission.id}`)
    const draft = published ? { ...editDraft(published), text: submission.text } : submissionDraft(submission)
    if (submission.status === 'Pendiente') changeStatus(submission.id, 'En revisión')
    openEditor({ draft, submissionId: submission.id })
  }

  function save(event: FormEvent) {
    event.preventDefault()
    if (!editor) return
    const { draft, submissionId } = editor
    const source = draft.source ? officialUrl(draft.source) : null
    if (draft.source && !source) {
      setError('El enlace oficial debe empezar por https://.')
      return
    }
    if (!draft.title.trim() || !draft.organization.trim() || !draft.country.trim() || !draft.description.trim()) {
      setError('Completa el título, la institución, el país y la descripción.')
      return
    }
    const id = draft.id || `manual-${crypto.randomUUID()}`
    const opportunity = makeOpportunity(draft, id, source, catalog.find((item) => item.id === id))
    update((previous) => ({
      ...previous,
      edits: { ...previous.edits, [id]: opportunity },
      submissions: previous.submissions.map((item) => item.id === submissionId ? { ...item, status: 'Aprobada' } : item),
    }))
    setError('')
    setNotice(draft.status === 'Archivada' ? 'Oportunidad archivada en este navegador.' : 'Oportunidad aprobada. Ya aparece en el catálogo de demostración.')
    setEditor({ ...editor, draft: { ...draft, id } })
  }

  function change<Key extends keyof Draft>(key: Key, value: Draft[Key]) {
    setNotice('')
    setEditor((previous) => previous && { ...previous, draft: { ...previous.draft, [key]: value } })
  }

  const draft = editor?.draft
  return <div className="container subpage admin-page">
    <PageIntro label="Administración" title={<>Panel de <em>revisión.</em></>}>Revisa aportes, completa la información y administra las oportunidades del catálogo local.</PageIntro>
    <DemoNote>Panel de demostración sin autenticación ni control de acceso real. Los cambios afectan solo a este navegador.</DemoNote>
    <dl className="admin-metrics">{metrics.map(([label, count]) => <div className="surface" key={label}><dt>{label}</dt><dd>{count}</dd></div>)}</dl>
    <div className="section-heading"><h2>Aportes de la comunidad</h2><Button onClick={() => openEditor({ draft: emptyDraft() })}><Plus size={17} /> Registrar oportunidad</Button></div>
    <div className="surface admin-list">
      {workspace.submissions.length ? workspace.submissions.map((item) => <article key={item.id}><div><a className="inline-link admin-url" href={item.source} target="_blank" rel="noreferrer">{new URL(item.source).hostname} <ArrowUpRight size={14} /></a><p>{formatDate(item.submittedAt.slice(0, 10))} · {item.category || 'Sin categoría'}</p></div><Status>{item.status}</Status><Button variant="outline" onClick={() => review(item)}>Revisar aporte</Button></article>) : <p className="quiet">Todavía no hay aportes en este navegador.</p>}
    </div>
    {draft && <section className="surface simple-panel admin-editor" id="admin-editor">
      <div className="section-heading"><h2>{related ? 'Revisar aporte' : draft.id ? 'Editar oportunidad' : 'Nueva oportunidad'}</h2><Button variant="text" onClick={() => setEditor(null)}>Cerrar editor</Button></div>
      {related && <div className="original-submission"><h3>Aporte original</h3><a className="inline-link admin-url" href={related.source} target="_blank" rel="noreferrer">Abrir fuente compartida <ArrowUpRight size={15} /></a><p>{related.text || 'El aporte contiene únicamente un enlace.'}</p>{related.comment && <p><strong>Comentario</strong> · {related.comment}</p>}</div>}
      <form className="stacked-form" onSubmit={save}>
        <div className="field"><label htmlFor="admin-source-text">Texto para extracción de demostración</label><textarea id="admin-source-text" value={draft.text} maxLength={7000} rows={4} placeholder="Usa una línea para cada dato, por ejemplo, Título: nombre de la convocatoria." onChange={(event) => change('text', event.target.value)} />
          <Button variant="outline" disabled={!draft.text.trim()} onClick={() => {
            setEditor((previous) => previous && { ...previous, draft: extractDemo(previous.draft) })
            setNotice('Extracción de demostración completada. Revisa los campos contra la fuente antes de aprobar.')
          }}>Procesar texto</Button></div>
        <div className="form-grid">
          <label className="field"><span>Título</span><input required value={draft.title} maxLength={130} onChange={(event) => change('title', event.target.value)} /></label>
          <label className="field"><span>Institución</span><input required value={draft.organization} maxLength={100} onChange={(event) => change('organization', event.target.value)} /></label>
          <label className="field"><span>Categoría</span><select value={draft.category} onChange={(event) => change('category', event.target.value as Draft['category'])}>{categories.map((option) => <option key={option}>{option}</option>)}</select></label>
          <label className="field"><span>País</span><input required value={draft.country} maxLength={60} onChange={(event) => change('country', event.target.value)} /></label>
          <label className="field"><span>Modalidad</span><select value={draft.modality} onChange={(event) => change('modality', event.target.value as Draft['modality'])}>{modalities.map((option) => <option key={option}>{option}</option>)}</select></label>
          <label className="field"><span>Financiamiento</span><select value={draft.funding} onChange={(event) => change('funding', event.target.value as Draft['funding'])}>{fundingOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
          <label className="field"><span>Fecha límite</span><input type="date" value={draft.deadline} onChange={(event) => change('deadline', event.target.value)} /></label>
          <label className="field"><span>Última verificación</span><input type="date" value={draft.verified} onChange={(event) => change('verified', event.target.value)} /></label>
          <label className="field field--wide"><span>Fuente oficial</span><input type="url" value={draft.source} maxLength={2048} onChange={(event) => change('source', event.target.value)} /></label>
          <label className="field field--wide"><span>Descripción</span><textarea required value={draft.description} maxLength={2500} onChange={(event) => change('description', event.target.value)} /></label>
          <label className="field"><span>Beneficios · uno por línea</span><textarea value={draft.benefits} maxLength={1500} onChange={(event) => change('benefits', event.target.value)} /></label>
          <label className="field"><span>Información por confirmar</span><textarea value={draft.pending} maxLength={1500} onChange={(event) => change('pending', event.target.value)} /></label>
          <label className="field"><span>Requisitos obligatorios · uno por línea</span><textarea value={draft.required} maxLength={1500} onChange={(event) => change('required', event.target.value)} /></label>
          <label className="field"><span>Requisitos deseables · uno por línea</span><textarea value={draft.desired} maxLength={1500} onChange={(event) => change('desired', event.target.value)} /></label>
        </div>
        <fieldset className="field admin-levels"><legend>Niveles académicos</legend><div className="action-row">{academicLevels.map((level) => <label key={level} className="check-field"><input type="checkbox" checked={draft.levels.includes(level)} onChange={(event) => change('levels', event.target.checked ? [...draft.levels, level] : draft.levels.filter((item) => item !== level))} />{level}</label>)}</div></fieldset>
        <div className="action-row"><Button type="submit"><Check size={17} />{draft.status === 'Archivada' ? 'Guardar cambios' : 'Aprobar y publicar en demo'}</Button>
          {related && related.status !== 'Aprobada' && related.status !== 'Rechazada' && <Button variant="outline" onClick={() => {
            changeStatus(related.id, 'Rechazada')
            setEditor(null)
            setNotice('Aporte rechazado.')
          }}>Rechazar aporte</Button>}
        </div>
        {error && <p className="error-text" role="alert">{error}</p>}
      </form>
    </section>}
    {notice && <p className="confirmation admin-notice" role="status"><Check size={17} />{notice}</p>}
    <div className="section-heading admin-catalog-heading"><h2>Catálogo de demostración</h2></div>
    <div className="surface admin-list">{catalog.map((item) => <article key={item.id}>
      <div><h3>{item.title}</h3><p>{item.organization}</p></div><Status>{item.status === 'Archivada' ? item.status : deadlineStatus(item.deadline)}</Status>
      <div className="action-row"><Button variant="outline" onClick={() => openEditor({ draft: editDraft(item) })}><Pencil size={15} /> Editar</Button><Button variant="text" onClick={() => {
        const status = item.status === 'Archivada' ? 'Aprobada' : 'Archivada'
        update((previous) => ({ ...previous, edits: { ...previous.edits, [item.id]: { ...item, status } } }))
        if (editor?.draft.id === item.id) change('status', status)
        setNotice(status === 'Archivada' ? 'Oportunidad archivada.' : 'Oportunidad restaurada en el catálogo.')
      }}>{item.status === 'Archivada' ? 'Restaurar' : 'Archivar'}</Button></div>
    </article>)}</div>
  </div>
}
