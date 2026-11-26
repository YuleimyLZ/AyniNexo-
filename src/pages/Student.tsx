import { ArrowRight, Bookmark, Check, Clock, X } from 'lucide-react'
import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ActionLink, Button, CategoryIcon, DemoNote, EmptyState, PageIntro, Status } from '../components/ui'
import { deadlineStatus, formatDate, normalize } from '../features/eligibility'
import { useWorkspace } from '../services/workspaceContext'
import { academicLevels, englishLevels, fundingOptions, savedStatuses } from '../types/domain'
import type { Profile as AcademicProfile, SavedStatus } from '../types/domain'

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) {
  const labelId = useId()
  return <label className="field"><span id={labelId}>{label}</span><select aria-labelledby={labelId} value={value} onChange={(event) => onChange(event.target.value)}><option value="">Selecciona una opción</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>
}

function TagField({ label, values, onChange, placeholder }: { label: string; values: string[]; onChange: (values: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState('')
  const labelId = `tags-${normalize(label).replace(/ /g, '-')}`
  function add() {
    const next = new Map(values.map((value) => [normalize(value), value]))
    draft.split(',').map((item) => item.trim()).filter(Boolean).forEach((value) => next.set(normalize(value), value))
    onChange(Array.from(next.values()).slice(0, 12))
    setDraft('')
  }
  return <div className="field"><label htmlFor={labelId}>{label}</label><div className="tag-input"><input id={labelId} value={draft} placeholder={placeholder} maxLength={80} disabled={values.length >= 12} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
    if (event.key === 'Enter' && draft.trim()) { event.preventDefault(); add() }
  }} /><Button variant="outline" onClick={add} disabled={!draft.trim() || values.length >= 12}>Añadir</Button></div>
  {values.length > 0 && <div className="active-filters">{values.map((value) => <button className="chip chip--filter" type="button" key={value} onClick={() => onChange(values.filter((item) => item !== value))} aria-label={`Quitar ${value}`}>{value}<X size={13} /></button>)}</div>}</div>
}

export function Profile() {
  const { workspace, update } = useWorkspace()
  const [profile, setProfile] = useState(workspace.profile)
  const [saved, setSaved] = useState(false)
  const complete = Object.values(profile).filter((value) => Array.isArray(value) ? value.length > 0 : typeof value === 'string' ? value.trim() : value !== null).length
  const total = Object.keys(profile).length
  const percentage = Math.round(complete / total * 100)

  function setField<Key extends keyof AcademicProfile>(key: Key, value: AcademicProfile[Key]) {
    setSaved(false)
    setProfile((previous) => ({ ...previous, [key]: value }))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    update((previous) => ({ ...previous, profile }))
    setSaved(true)
  }

  return <div className="container subpage narrow">
    <PageIntro label="Mi perfil" title={<>Comparte lo que <em>te mueve.</em></>}>Tu perfil académico ayuda a identificar oportunidades y próximos pasos. Puedes completar solo lo que quieras compartir en este navegador.</PageIntro>
    <div className="surface profile-progress"><div><strong>Perfil completado</strong><span>{complete} de {total} campos</span></div><progress value={complete} max={total} aria-label="Perfil completado" /><strong>{percentage}%</strong></div>
    <form className="stacked-form" onSubmit={submit}>
      <fieldset className="surface"><legend>Formación académica</legend><div className="form-grid">
        <label className="field"><span>Universidad</span><input value={profile.university} onChange={(event) => setField('university', event.target.value)} maxLength={120} /></label>
        <label className="field"><span>Carrera</span><input value={profile.program} onChange={(event) => setField('program', event.target.value)} maxLength={120} /></label>
        <SelectField label="Nivel académico" value={profile.academicLevel} options={academicLevels} onChange={(value) => setField('academicLevel', value as AcademicProfile['academicLevel'])} />
        <label className="field"><span>Ciclo académico</span><input type="number" min={1} max={16} value={profile.cycle ?? ''} onChange={(event) => setField('cycle', event.target.value ? Number(event.target.value) : null)} /></label>
        <SelectField label="Nivel de inglés" value={profile.english} options={englishLevels} onChange={(value) => setField('english', value as AcademicProfile['english'])} />
        <SelectField label="¿Tienes certificación de inglés?" value={profile.certificate} options={['Sí', 'No']} onChange={(value) => setField('certificate', value as AcademicProfile['certificate'])} />
      </div></fieldset>
      <fieldset className="surface"><legend>Intereses y experiencia</legend><div className="form-grid">
        <TagField label="Habilidades técnicas" values={profile.skills} onChange={(value) => setField('skills', value)} placeholder="Ej. Python" />
        <TagField label="Intereses" values={profile.interests} onChange={(value) => setField('interests', value)} placeholder="Ej. Ciencia de datos" />
        <label className="field field--wide"><span>Objetivos profesionales</span><textarea value={profile.goals} maxLength={500} onChange={(event) => setField('goals', event.target.value)} /></label>
        <label className="field"><span>Experiencia en proyectos</span><textarea value={profile.projects} maxLength={500} onChange={(event) => setField('projects', event.target.value)} /></label>
        <label className="field"><span>Experiencia en investigación</span><textarea value={profile.research} maxLength={500} onChange={(event) => setField('research', event.target.value)} /></label>
      </div></fieldset>
      <fieldset className="surface"><legend>Preferencias</legend><div className="form-grid">
        <SelectField label="Financiamiento" value={profile.funding} options={fundingOptions} onChange={(value) => setField('funding', value as AcademicProfile['funding'])} />
        <SelectField label="Disponibilidad para viajar" value={profile.travel} options={['Sí', 'No']} onChange={(value) => setField('travel', value as AcademicProfile['travel'])} />
        <div className="field--wide"><TagField label="Destinos de interés" values={profile.destinations} onChange={(value) => setField('destinations', value)} placeholder="Ej. Perú" /></div>
      </div></fieldset>
      <div className="action-row"><Button type="submit">Guardar mi perfil <ArrowRight size={17} /></Button>{saved && <span className="confirmation" role="status"><Check size={17} /> Perfil guardado en este navegador</span>}</div>
    </form>
    {workspace.session && <div className="profile-session"><ActionLink to="/sesion" variant="text">Gestionar sesión de demostración</ActionLink></div>}
  </div>
}

export function Saved() {
  const { catalog, workspace, update } = useWorkspace()
  const items = catalog.filter((item) => workspace.saved[item.id])
  return <div className="container subpage">
    <PageIntro label="Mis oportunidades" title={<>Todo lo que quieres <em>intentar.</em></>}>Organiza tus oportunidades guardadas y sigue el estado de cada una.</PageIntro>
    {items.length ? <div className="saved-list">{items.map((item) => <article className="surface saved-row" key={item.id}>
      <CategoryIcon category={item.category} />
      <div><h2>{item.status === 'Archivada' ? item.title : <Link to={`/oportunidades/${item.id}`}>{item.title}</Link>}</h2><p>{item.organization} · {formatDate(item.deadline)}</p></div>
      <Status>{item.status === 'Archivada' ? item.status : deadlineStatus(item.deadline)}</Status>
      <select aria-label={`Progreso de ${item.title}`} value={workspace.saved[item.id]} onChange={(event) => {
        const status = event.target.value as SavedStatus
        update((previous) => ({ ...previous, saved: { ...previous.saved, [item.id]: status } }))
      }}>{savedStatuses.map((status) => <option key={status}>{status}</option>)}</select>
      <Button variant="text" aria-label={`Quitar ${item.title} de guardadas`} onClick={() => update((previous) => {
        const saved = { ...previous.saved }
        delete saved[item.id]
        return { ...previous, saved }
      })}><Bookmark size={18} fill="currentColor" /></Button>
    </article>)}</div> : <EmptyState title="Todavía no tienes oportunidades guardadas" action={<ActionLink to="/explorar" arrow>Explorar oportunidades</ActionLink>}>Guarda una convocatoria en el explorador para encontrarla aquí.</EmptyState>}
  </div>
}

export function Roadmap() {
  const { catalog, workspace, update } = useWorkspace()
  const [query, setQuery] = useSearchParams()
  const current = workspace.roadmaps.find((item) => item.id === query.get('oportunidad')) ?? workspace.roadmaps[0]
  const completed = current?.actions.filter((item) => item.completed).length ?? 0
  const opportunity = catalog.find((item) => item.id === current?.id)
  return <div className="container subpage narrow">
    <PageIntro label="Mi ruta" title={<>Construye tu camino <em>paso a paso.</em></>}>Una ruta de preparación para organizar tus próximos pasos y registrar tu avance.</PageIntro>
    {current ? <>
      <DemoNote>Ruta de demostración generada mediante reglas.</DemoNote>
      <div className="surface roadmap-summary"><label className="field"><span>Tu oportunidad</span><select value={current.id} onChange={(event) => setQuery({ oportunidad: event.target.value })}>{workspace.roadmaps.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <div><Status>{opportunity?.status === 'Archivada' ? 'Archivada' : deadlineStatus(opportunity?.deadline ?? null)}</Status><p>{completed} de {current.actions.length} acciones completadas</p></div><progress aria-label="Acciones completadas" value={completed} max={current.actions.length} /></div>
      {opportunity && (opportunity.status === 'Archivada' || deadlineStatus(opportunity.deadline) === 'Vencida') && <p className="quiet">Esta ruta sirve para prepararte para futuras convocatorias similares.</p>}
      <ol className="timeline">{current.actions.map((action) => <li className={`surface timeline-action ${action.completed ? 'timeline-action--done' : ''}`} key={action.id}>
        <div className="timeline-meta"><span className="chip">Prioridad {action.priority.toLowerCase()}</span><span><Clock size={15} /> {action.duration}</span></div>
        <h2>{action.title}</h2><p>{action.description}</p>{action.requirement && <p className="quiet"><strong>Requisito</strong> · {action.requirement}</p>}
        {action.resources?.map((resource) => <a key={resource.url} className="inline-link" href={resource.url} target="_blank" rel="noreferrer">{resource.label}</a>)}
        <label className="check-field"><input type="checkbox" checked={action.completed} onChange={(event) => {
          const checked = event.currentTarget.checked
          update((previous) => ({ ...previous, roadmaps: previous.roadmaps.map((item) => item.id === current.id ? { ...item, actions: item.actions.map((entry) => entry.id === action.id ? { ...entry, completed: checked } : entry) } : item) }))
        }} />{action.completed ? 'Completada' : 'Marcar como completada'}</label>
      </li>)}</ol>
    </> : <EmptyState title="Todavía no tienes una ruta" action={<ActionLink to="/explorar" arrow>Elegir una oportunidad</ActionLink>}>Abre el detalle de una oportunidad y elige Generar mi ruta con IA para comenzar.</EmptyState>}
  </div>
}

export function Session() {
  const { workspace, update } = useWorkspace()
  const navigate = useNavigate()
  return <div className="container subpage narrow"><PageIntro label="Mi cuenta" title={<>Crea tu espacio <em>en AyniNexo.</em></>}>Prueba el perfil académico y las herramientas de preparación en este navegador.</PageIntro>
    <div className="surface simple-panel"><DemoNote>La sesión de demostración funciona sin correo ni contraseña.</DemoNote>
    <div className="action-row"><Button onClick={() => {
      update((previous) => ({ ...previous, session: !previous.session }))
      navigate(workspace.session ? '/' : '/perfil')
    }}>{workspace.session ? 'Cerrar sesión de demostración' : 'Iniciar sesión de demostración'} <ArrowRight size={17} /></Button></div></div>
  </div>
}
