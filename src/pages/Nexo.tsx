import { ArrowDownRight, ArrowUpRight, CirclePlus, Send, ShieldCheck, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button, CategoryIcon, DemoNote, PageIntro, SaveButton, Spark, Status } from '../components/ui'
import { reportedFacts, tipText } from '../features/conversation'
import type { Fallback, Reply } from '../features/conversation'
import { formatDate, opportunityStatus } from '../features/eligibility'
import type { Horizon } from '../services/aiContracts'
import { messageLimit } from '../services/aiContracts'
import { useChatSession } from '../services/chatSession'
import { chat } from '../services/edgeGuidance'
import { sampleProfile } from '../services/guidance'
import { useWorkspace } from '../services/workspaceContext'

const examples = [
  'Quiero investigar sobre inteligencia artificial en el extranjero.',
  'Busco oportunidades con financiamiento completo.',
  'Estoy en tercer ciclo y quiero prepararme para investigar en el extranjero.',
  '¿Cómo puedo prepararme durante los próximos seis meses?',
]
const fallbackText: Record<Fallback, string> = {
  pilot: 'Gemini está disponible para las cuentas autorizadas del piloto.',
  quota: 'Se alcanzó el límite de IA. Puedes seguir consultando el catálogo con reglas.',
  unavailable: 'Gemini no está disponible en este momento. La orientación por reglas sigue activa.',
  invalid: 'No pudimos validar la respuesta de Gemini. Te mostramos los resultados por reglas.',
}

function Recommendation({ item, useSample, useProfile, horizon }: { item: Reply['items'][number]; useSample: boolean; useProfile: boolean; horizon?: Horizon }) {
  const { opportunity, assessment, affinity, reason } = item
  const path = '/oportunidades/' + opportunity.id
  const state = opportunityStatus(opportunity)
  const actionState = { useSample, useProfile, horizon }
  return <article className="chat-card surface">
    <div className="chat-card-top">
      <div className="card-category"><CategoryIcon category={opportunity.category} size={17} /><span>{opportunity.category}</span></div>
      <SaveButton compact opportunity={opportunity} />
    </div>
    <div><h3><Link to={path} state={actionState}>{opportunity.title}</Link></h3><p className="quiet">{opportunity.organization} · {opportunity.country}</p></div>
    <div className="chat-tags"><span className="chip">{affinity}</span><Status>{state}</Status></div>
    <p>{reason}</p>
    <dl className="chat-facts"><div><dt>Financiamiento</dt><dd>{opportunity.funding}</dd></div><div><dt>Fecha límite</dt><dd>{formatDate(opportunity.deadline)}</dd></div></dl>
    <details className="requirement-preview" open={assessment.gaps > 0}>
      <summary>Elegibilidad y brechas</summary>
      {assessment.unknown > 0 && <p className="chat-gap">Requisitos por verificar</p>}
      <p className="quiet">{assessment.met} cumplidos · {assessment.gaps} con brechas · {assessment.unknown} por confirmar</p>
      {assessment.gaps > 0 && <p className="chat-gap">Oportunidad para prepararte. Una futura edición depende de la institución.</p>}
      {assessment.requirements.length ? <ul>{assessment.requirements.map((requirement) => <li key={requirement.id}><span>{requirement.label}{!requirement.mandatory && <small> · Deseable</small>}</span><Status>{requirement.result}</Status></li>)}</ul> : <p className="quiet">Catálogo sin requisitos registrados.</p>}
      {opportunity.pending.length > 0 && <div className="chat-pending"><strong>Información por confirmar</strong><ul>{opportunity.pending.map((note) => <li key={note}>{note}</li>)}</ul></div>}
    </details>
    <div className="chat-card-links">
      <Link className="inline-link" to={path} state={actionState}>Ver detalles <ArrowUpRight size={14} /></Link>
      {opportunity.source && <a className="inline-link" href={opportunity.source} target="_blank" rel="noreferrer">Fuente oficial <ArrowUpRight size={14} /></a>}
    </div>
    <Link className="button button--outline chat-route" to={path + '#preparacion'} state={actionState}>Generar mi ruta</Link>
  </article>
}

export function Nexo() {
  const { workspace, catalog, catalogState, reloadCatalog, reloadStudent, mode, session, studentState } = useWorkspace()
  const { turns, start, reset } = useChatSession()
  const [draft, setDraft] = useState('')
  const [useProfile, setUseProfile] = useState(false)
  const [error, setError] = useState('')
  const input = useRef<HTMLTextAreaElement>(null)
  const latest = useRef<HTMLDivElement>(null)
  const pending = turns.length > 0 && !turns.at(-1)?.reply
  const profileReady = Boolean(session && studentState === 'ready')
  const applyingProfile = useProfile && (mode === 'demo' || profileReady)
  const lastReply = turns.at(-1)?.reply
  useEffect(() => {
    if (!lastReply || !latest.current) return
    latest.current.scrollIntoView({ block: 'start' })
  }, [lastReply])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = draft.trim()
    if (message.length < 3 || pending || catalogState !== 'ready') return
    const request = start(message)
    if (!request) return
    setDraft('')
    setError('')
    const previous = [...turns].reverse().find((turn) => turn.reply?.items.length)
    const reported = Object.assign({}, ...turns.map((turn) => reportedFacts(turn.message))) as ReturnType<typeof reportedFacts>
    try {
      const reply = await chat({ message, previousIds: previous?.reply?.items.map((item) => item.opportunity.id) ?? [], useProfile: applyingProfile, ...reported },
        mode === 'demo' ? sampleProfile : workspace.profile, catalog, Boolean(session && mode === 'live'), request.signal)
      request.finish(reply)
    } catch {
      if (!request.signal.aborted) {
        request.finish()
        setDraft(message)
        setError('No pudimos completar la consulta. Inténtalo de nuevo.')
      }
    }
  }

  function clear() {
    reset()
    setDraft('')
    setError('')
    input.current?.focus()
  }

  return <section className="chat-page">
    <div className="container chat-container">
      <div className="chat-heading">
        <PageIntro label="Mi Nexo IA" icon={<Spark />} title={<>Tu próximo <em>paso.</em></>}>Explora convocatorias, compara requisitos y descubre cómo prepararte para lo que quieres alcanzar.</PageIntro>
        <Button variant="outline" onClick={clear} disabled={!turns.length && !draft}><CirclePlus size={17} /> Nueva conversación</Button>
      </div>
      <div className="chat-layout">
        <div className="chat-main">
          {turns.length === 0 ? <div className="surface chat-welcome">
            <span className="icon-tile tone-rose"><Sparkles size={22} strokeWidth={1.6} aria-hidden /></span>
            <h2>¿Qué te gustaría explorar?</h2>
            <div className="chat-examples">{examples.map((example) => <button type="button" className="example-choice" key={example} onClick={() => { setDraft(example); input.current?.focus() }}><ArrowDownRight size={17} />{example}</button>)}</div>
          </div> : <section className="chat-thread" aria-label="Conversación">
            {turns.map((turn) => <div className="chat-turn" key={turn.id}>
              <div className="chat-question"><strong>Tú</strong><p>{turn.message}</p></div>
              {turn.reply && <div className="chat-answer" ref={turn.reply === lastReply ? latest : undefined}>
                <div className="chat-answer-heading"><Sparkles size={18} /><strong>Mi Nexo IA</strong><span className="chip">{turn.reply.origin === 'gemini' ? 'Asistencia de Gemini' : 'Orientación por reglas'}</span></div>
                <p>{turn.reply.text}</p>
                {turn.reply.fallback && <p className="chat-notice">{fallbackText[turn.reply.fallback]}</p>}
                {turn.reply.items.length > 0 && <div className="chat-cards">{turn.reply.items.map((item) => <Recommendation key={item.opportunity.id} item={item} useSample={mode === 'demo' && applyingProfile} useProfile={applyingProfile} horizon={turn.reply?.horizon} />)}</div>}
                <p className="chat-tip">{tipText[turn.reply.tip]}</p>
              </div>}
            </div>)}
            {pending && <p className="chat-thinking" role="status"><span aria-hidden /> Consultando el catálogo…</p>}
          </section>}
          <div className="surface chat-composer">
            <form onSubmit={submit} aria-label="Enviar mensaje">
              <label className="sr-only" htmlFor="chat-message">Tu mensaje</label>
              <textarea id="chat-message" ref={input} value={draft} rows={2} maxLength={messageLimit} required minLength={3}
                placeholder={turns.length ? 'Haz una pregunta sobre lo que encontramos…' : 'Escribe lo que te gustaría alcanzar…'}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault()
                    event.currentTarget.form?.requestSubmit()
                  }
                }} />
              <Button type="submit" disabled={pending || catalogState !== 'ready' || draft.trim().length < 3}>Enviar <Send size={16} /></Button>
            </form>
            <p className="quiet">Omite nombres, correos y documentos personales.</p>
            {error && <p className="error-text" role="alert">{error}</p>}
          </div>
          {catalogState === 'loading' && <p role="status" className="quiet">Cargando catálogo…</p>}
          {catalogState === 'error' && <p role="alert">{mode === 'setup' ? 'La conexión con Supabase está pendiente.' : <>No pudimos cargar el catálogo. <button className="filter-clear" onClick={reloadCatalog}>Reintentar</button></>}</p>}
        </div>
        <aside className="chat-side">
          <div className="surface chat-profile">
            <span className="icon-tile tone-rose"><ShieldCheck size={20} strokeWidth={1.65} aria-hidden /></span>
            <h2>Tu perfil académico</h2>
            <p>Úsalo para comparar requisitos con tu situación. El perfil se evalúa dentro de AyniNexo.</p>
            {(session || mode === 'demo') ? <label className="check-field"><input type="checkbox" checked={applyingProfile} disabled={pending || (mode === 'live' && !profileReady)} onChange={(event) => setUseProfile(event.target.checked)} /> {mode === 'demo' ? 'Usar perfil de ejemplo' : 'Usar mi perfil guardado'}</label>
              : <Link className="inline-link" to="/sesion" state={{ returnTo: '/mi-nexo' }}>Iniciar sesión <ArrowUpRight size={14} /></Link>}
            {session && studentState === 'error' && <button type="button" className="filter-clear" onClick={reloadStudent}>Reintentar cargar el perfil</button>}
          </div>
          {mode === 'demo' && <DemoNote>Demostración con datos ficticios y orientación por reglas.</DemoNote>}
          {mode === 'live' && <p className="chat-side-note">Tu conversación se conserva durante la navegación. Se borra al recargar o cambiar de cuenta.</p>}
        </aside>
      </div>
    </div>
  </section>
}
