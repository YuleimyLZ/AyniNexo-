import { ArrowDownRight, ArrowRight, Compass, Shield, ListChecks, NotebookPen } from 'lucide-react'
import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ActionLink, Button, CategoryIcon, DemoNote, EmptyState, Eyebrow, PageIntro, Spark, Status } from '../components/ui'
import type { recommend } from '../features/eligibility'
import { guidanceService, sampleProfile } from '../services/demo'
import { useWorkspace } from '../services/workspaceContext'

const examples = [
  'Quiero estudiar inteligencia artificial en el extranjero.',
  'Busco becas con financiamiento completo.',
  'Estoy en tercer ciclo y quiero prepararme para un intercambio.',
  'Me interesa participar en investigaciones internacionales.',
]

const groups = [
  { id: 'now', title: 'Oportunidades que puedes explorar ahora' },
  { id: 'prepare', title: 'Oportunidades para las que puedes prepararte' },
  { id: 'confirm', title: 'Oportunidades cuya elegibilidad está por confirmar' },
]

export function Nexo() {
  const { workspace, catalog, catalogState, reloadCatalog } = useWorkspace()
  const [goal, setGoal] = useState('')
  const [sample, setSample] = useState(false)
  const [results, setResults] = useState<{ items: ReturnType<typeof recommend>; usedSample: boolean } | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)
  const output = useRef<HTMLElement>(null)
  const goalInput = useRef<HTMLTextAreaElement>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (goal.trim().length < 8 || pending || catalogState !== 'ready') return
    setPending(true)
    setError(false)
    try {
      const profile = sample ? sampleProfile : workspace.profile
      const items = await guidanceService.match(goal.trim(), profile, catalog)
      setResults({ items, usedSample: sample })
      requestAnimationFrame(() => {
        output.current?.focus({ preventScroll: true })
        output.current?.scrollIntoView({ block: 'start' })
      })
    } catch {
      setError(true)
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <section className="nexo-hero">
        <div className="container nexo-container">
          <PageIntro label="Mi Nexo IA" icon={<Spark />} title={<>¿Qué te gustaría <em>alcanzar?</em></>}>Cada camino es diferente. Descubre qué oportunidades se adaptan a ti y cómo puedes prepararte para alcanzarlas.</PageIntro>
          <div className="goal-panel">
            <form onSubmit={submit}>
              <div className="goal-label"><label htmlFor="goal">Cuéntanos tu objetivo</label><span className="chip chip--demo">Modo demo</span></div>
              <textarea id="goal" ref={goalInput} value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Por ejemplo, quiero estudiar inteligencia artificial en el extranjero…" required minLength={8} maxLength={400} aria-describedby="goal-hint" onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) event.currentTarget.form?.requestSubmit()
              }} />
              <p id="goal-hint" className="goal-hint"><Shield size={15} />Describe tus intereses sin incluir datos personales.</p>
              <div className="goal-actions"><label className="check-field"><input type="checkbox" checked={sample} onChange={(event) => setSample(event.target.checked)} /> Usar perfil de ejemplo</label><Button type="submit" disabled={pending || catalogState !== 'ready'}>{pending ? 'Buscando…' : 'Encontrar oportunidades'} <ArrowRight size={17} /></Button></div>
              {sample && <p className="quiet sample-info">Pregrado, tercer ciclo, inglés B1, Python y disponibilidad para viajar.</p>}
            </form>
            <div className="goal-examples">
              <h2>Inspírate con un ejemplo</h2>
              <div>{examples.map((example) => <button type="button" className="example-choice" key={example} onClick={() => { setGoal(example); goalInput.current?.focus() }}><ArrowDownRight size={15} />{example}</button>)}</div>
            </div>
          </div>
          <div className="nexo-notes">
            <DemoNote>Simulación con reglas y un catálogo ficticio.</DemoNote>
          </div>
          {catalogState === 'loading' && <p role="status" className="quiet">Cargando catálogo…</p>}
          {catalogState === 'error' && <p role="alert" className="quiet">No pudimos cargar el catálogo. <button type="button" className="filter-clear" onClick={reloadCatalog}>Reintentar</button></p>}
          {error && <p role="alert">No pudimos completar la búsqueda. Inténtalo de nuevo.</p>}
        </div>
      </section>
      {results ? <section ref={output} tabIndex={-1} className="container section-space results-output" aria-label="Tus recomendaciones">
        <div className="section-heading"><div><Eyebrow>Afinidad y elegibilidad</Eyebrow><h2>Tus recomendaciones</h2></div><ActionLink to="/perfil" variant="text" arrow>Actualizar mi perfil</ActionLink></div>
        {results.items.length ? groups.map((group) => {
          const matches = results.items.filter((result) => result.group === group.id)
          return <section className="recommendation-group" key={group.id}>
            <h3>{group.title}</h3>
            {matches.length ? <div className="recommendation-grid">{matches.map(({ opportunity, assessment, matches: affinity }) => <article key={opportunity.id} className="recommendation-card">
              <CategoryIcon category={opportunity.category} />
              <h4><Link to={`/oportunidades/${opportunity.id}`} state={{ useSample: results.usedSample }}>{opportunity.title}</Link></h4>
              <p>La convocatoria de ejemplo comparte estos temas con tu objetivo o perfil.</p>
              <div className="active-filters">{affinity.map((topic) => <span className="chip" key={topic}>{topic}</span>)}</div>
              <p className="assessment-summary"><strong>{assessment.met}</strong> cumplidos · <strong>{assessment.gaps}</strong> con brechas · <strong>{assessment.unknown}</strong> por confirmar</p>
              {assessment.requirements.length > 0 && <details className="requirement-preview"><summary>Ver requisitos y brechas</summary><ul>{assessment.requirements.map((requirement) => <li key={requirement.id}><span>{requirement.label}</span><Status>{requirement.result}</Status></li>)}</ul></details>}
              <Link className="card-link" to={`/oportunidades/${opportunity.id}`} state={{ useSample: results.usedSample }}>Ver oportunidad <ArrowRight size={16} /></Link>
            </article>)}</div> : <p className="quiet">Sin coincidencias en este grupo.</p>}
          </section>
        }) : <EmptyState title="No encontramos oportunidades afines" action={<ActionLink to="/explorar" variant="outline">Abrir el explorador</ActionLink>}>Prueba con otros intereses, como investigación, becas o tecnología.</EmptyState>}
      </section> : <section className="nexo-next"><div className="container nexo-steps">
        <article><Compass size={26} strokeWidth={1.5} /><div><h2>Descubre afinidades</h2><p>Explora oportunidades según tus intereses.</p></div></article>
        <article><ListChecks size={26} strokeWidth={1.5} /><div><h2>Identifica tus brechas</h2><p>Revisa qué cumples y qué te falta.</p></div></article>
        <article><NotebookPen size={26} strokeWidth={1.5} /><div><h2>Construye tu camino</h2><p>Convierte requisitos en próximos pasos.</p></div></article>
      </div></section>}
    </>
  )
}
