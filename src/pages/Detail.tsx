import { ArrowLeft, ArrowUpRight, CalendarDays, MapPin, Monitor, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ActionLink, Button, CategoryIcon, DemoNote, EmptyState, Eyebrow, SaveButton, Spark, Status } from '../components/ui'
import { assessOpportunity, formatDate, opportunityStatus } from '../features/eligibility'
import { guidanceService, sampleProfile } from '../services/guidance'
import { officialUrl, userMessage } from '../services/validation'
import { useWorkspace } from '../services/workspaceContext'
import type { Opportunity } from '../types/domain'

export function Detail() {
  const { id } = useParams()
  const { catalog, catalogState, reloadCatalog } = useWorkspace()
  const opportunity = catalog.find((item) => item.id === id && item.status === 'Aprobada')
  if (catalogState === 'loading') return <p role="status" className="container state-message">Cargando oportunidad…</p>
  if (catalogState === 'error') return <div className="container section-space"><EmptyState title="No pudimos cargar la oportunidad" action={<Button onClick={reloadCatalog}>Reintentar</Button>}>Intenta cargar el catálogo de nuevo.</EmptyState></div>
  if (!opportunity) return <div className="container section-space"><EmptyState title="Oportunidad no disponible" action={<ActionLink to="/explorar">Volver al explorador</ActionLink>}>Consulta las oportunidades disponibles en el catálogo.</EmptyState></div>
  return <OpportunityDetail key={opportunity.id} opportunity={opportunity} />
}

function OpportunityDetail({ opportunity }: { opportunity: Opportunity }) {
  const { workspace, session, mode, saveRoadmap, studentState, authState } = useWorkspace()
  const navigate = useNavigate()
  const location = useLocation()
  const usingSample = mode === 'demo' && location.state?.useSample === true
  const profile = usingSample ? sampleProfile : workspace.profile
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [planError, setPlanError] = useState('')
  const assessment = assessOpportunity(opportunity, profile)
  const state = opportunityStatus(opportunity)

  async function generate() {
    if (!session) {
      navigate('/sesion', { state: { returnTo: location.pathname } })
      return
    }
    const existing = workspace.roadmaps.find((item) => item.opportunityId === opportunity.id)
    if (existing) {
      navigate(`/mi-ruta?oportunidad=${opportunity.id}`)
      return
    }
    setGenerating(true)
    setPlanError('')
    try {
      const roadmap = await guidanceService.plan(opportunity, profile)
      await saveRoadmap(roadmap)
      navigate(`/mi-ruta?oportunidad=${opportunity.id}`)
    } catch (cause) {
      setPlanError(userMessage(cause, 'No pudimos guardar la ruta. Inténtalo de nuevo.'))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="container detail-wrap">
      <Link to="/explorar" className="back-link"><ArrowLeft size={17} /> Volver al explorador</Link>
      <div className="detail-heading">
        <div className="detail-kicker"><CategoryIcon category={opportunity.category} /><Eyebrow>{opportunity.category}</Eyebrow><Status>{state}</Status></div>
        <h1>{opportunity.title}</h1><p>{opportunity.organization}</p>
      </div>
      {mode === 'demo' && <DemoNote>Convocatoria de demostración. Úsala para conocer el funcionamiento de AyniNexo.</DemoNote>}
      <div className="detail-grid">
        <div className="detail-main">
          <section><h2>Sobre la oportunidad</h2><p>{opportunity.description}</p></section>
          <section><h2>Beneficios</h2>{opportunity.benefits.length ? <ul>{opportunity.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul> : <p>Por confirmar.</p>}</section>
          {[true, false].map((mandatory) => {
            const requirements = opportunity.requirements.filter((item) => item.mandatory === mandatory)
            return <section key={String(mandatory)}><h2>Requisitos {mandatory ? 'obligatorios' : 'deseables'}</h2>{requirements.length ? <ul>{requirements.map((item) => <li key={item.id}>{item.label}</li>)}</ul> : <p>Sin requisitos registrados.</p>}</section>
          })}
          <section><h2>Información por confirmar</h2>{opportunity.pending.map((item) => <p key={item}>{item}</p>)}{opportunity.pending.length === 0 && <p>Sin observaciones registradas.</p>}</section>
        </div>
        <aside>
          <div className="surface detail-facts"><h2>Datos de la convocatoria</h2>
            <dl>
              <div><dt><MapPin size={16} /> País</dt><dd>{opportunity.country}</dd></div>
              <div><dt><Monitor size={16} /> Modalidad</dt><dd>{opportunity.modality}</dd></div>
              <div><dt><Wallet size={16} /> Financiamiento</dt><dd>{opportunity.funding}</dd></div>
              <div><dt><CalendarDays size={16} /> Fecha límite</dt><dd>{formatDate(opportunity.deadline)}</dd></div>
              <div><dt>Última verificación</dt><dd>{formatDate(opportunity.verified)}</dd></div>
            </dl>
            {opportunity.source ? <a className="button button--primary" href={opportunity.source} target="_blank" rel="noreferrer">Ir a convocatoria oficial <ArrowUpRight size={17} /></a> : <p className="quiet">Fuente oficial no disponible para este ejemplo.</p>}
            <SaveButton opportunity={opportunity} />
          </div>
        </aside>
      </div>
      <section className="analysis-panel">
        <Eyebrow icon={<Spark />}>Mi Nexo IA · Análisis por reglas</Eyebrow>
        <h2>¿Cómo te preparas para esta oportunidad?</h2>
        <p>{['Vencida', 'Cerrada'].includes(state) ? 'Usa estos requisitos para prepararte para futuras convocatorias.' : 'Compara los requisitos con tu perfil y convierte tus brechas en próximos pasos.'}</p>
        <div className="action-row">
          <Button variant="outline" aria-expanded={analysisOpen} aria-controls="eligibility-results" onClick={() => setAnalysisOpen(!analysisOpen)}>Analizar mi perfil</Button>
          <Button onClick={generate} disabled={generating || authState === 'loading' || Boolean(session && studentState !== 'ready')}>{generating ? 'Generando…' : 'Generar mi ruta'}</Button>
        </div>
        {planError && <p role="alert">{planError}</p>}
        <div id="eligibility-results" className="analysis-results" hidden={!analysisOpen}>
          <h3>Elegibilidad formal</h3>
          {usingSample && <p>Evaluación con el perfil de ejemplo de Mi Nexo IA.</p>}
          <p>{assessment.met} requisitos obligatorios cumplidos · {assessment.gaps} con brechas · {assessment.unknown} por confirmar</p>
          {assessment.requirements.length > 0 && <ul>{assessment.requirements.map((item) => <li key={item.id}><span>{item.label} <small>· {item.mandatory ? 'Obligatorio' : 'Deseable'}</small>
            {item.source && officialUrl(item.source) && <a href={officialUrl(item.source)!} className="inline-link" target="_blank" rel="noreferrer">Fuente del requisito <ArrowUpRight size={14} /></a>}</span><Status>{item.result}</Status></li>)}</ul>}
          <div className="action-row"><Button onClick={generate} disabled={generating || authState === 'loading' || Boolean(session && studentState !== 'ready')}>Construye tu camino</Button><ActionLink to="/perfil" variant="text" arrow>Completar mi perfil</ActionLink></div>
        </div>
      </section>
    </div>
  )
}
