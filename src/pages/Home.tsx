import { ArrowRight, ArrowUpRight, Globe2, HeartHandshake, Network } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ActionLink, CategoryIcon, DemoNote, Eyebrow, OpportunityCard, Spark } from '../components/ui'
import { deadlineStatus } from '../features/eligibility'
import { useWorkspace } from '../services/workspaceContext'
import { categories } from '../types/domain'

const pillars = [
  { number: '01', name: 'Descubre', detail: 'Encuentra becas, intercambios y programas que se alinean con tus intereses.', icon: Globe2 },
  { number: '02', name: 'Prepárate', detail: 'Entiende los requisitos de cada oportunidad y planifica cómo acercarte a ellos.', icon: Network },
  { number: '03', name: 'Conecta', detail: 'Comparte lo que descubres para que más estudiantes puedan dar el siguiente paso.', icon: HeartHandshake },
]

export function Home() {
  const { catalog } = useWorkspace()
  const featured = catalog.filter((opportunity) => opportunity.status === 'Aprobada' && deadlineStatus(opportunity.deadline) === 'Abierta').slice(0, 3)

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-content">
            <Eyebrow>De estudiantes, para estudiantes</Eyebrow>
            <h1><span className="hero-title-opening">El talento no</span> debería depender <span className="hero-last-line">de <em>tus contactos.</em></span></h1>
            <p>Encuentra oportunidades que quizás aún no conoces. Prepárate para alcanzarlas y crece junto a una comunidad que cree en ti.</p>
            <div className="hero-actions">
              <ActionLink to="/explorar" arrow>Encuentra tu oportunidad</ActionLink>
              <ActionLink to="/mi-nexo" variant="outline"><Spark />Descubre mi potencial con IA</ActionLink>
            </div>
          </div>
          <figure className="hero-figure">
            <div className="hero-image">
              <img src="/estudiantes.webp" alt="Escena ilustrativa de tres estudiantes colaborando alrededor de una mesa en una biblioteca" width="1320" height="880" fetchPriority="high" />
              <div className="photo-note"><img src="/ayni.svg" width="35" height="35" alt="" /><span>Discover. Prepare. Connect.</span></div>
            </div>
            <figcaption>Imagen ilustrativa</figcaption>
          </figure>
        </div>
      </section>

      <section className="container section-space categories-section" aria-labelledby="category-heading">
        <div className="section-heading">
          <div><Eyebrow>Explora por categoría</Eyebrow><h2 id="category-heading">¿Qué te mueve?</h2></div>
          <ActionLink to="/explorar" variant="text" arrow>Ver todas las oportunidades</ActionLink>
        </div>
        <div className="category-grid">
          {categories.map((category) => <Link key={category} className="category-link" to={`/explorar?categoria=${encodeURIComponent(category)}`}><CategoryIcon category={category} /><span>{category === 'Oportunidades profesionales' ? 'Profesionales' : category}</span></Link>)}
        </div>
      </section>

      <section className="how-section section-space" aria-labelledby="how-heading">
        <div className="container">
          <Eyebrow>Cómo funciona</Eyebrow><h2 id="how-heading">Un camino que <em>construimos juntos.</em></h2>
          <div className="pillar-grid">{pillars.map(({ number, name, detail, icon: Icon }) => <article className="pillar" key={name}>
            <span className="pillar-number">{number} <span>/</span></span><Icon size={25} strokeWidth={1.5} /><h3>{name}.</h3><p>{detail}</p>
          </article>)}</div>
        </div>
      </section>

      <section className="section-space container" aria-labelledby="featured-heading">
        <div className="section-heading">
          <div><Eyebrow>El explorador</Eyebrow><h2 id="featured-heading">Oportunidades destacadas</h2></div>
          <ActionLink to="/explorar" variant="text" arrow>Abrir el explorador</ActionLink>
        </div>
        <DemoNote />
        {featured.length > 0 ? <div className="card-grid featured-grid">{featured.map((item) => <OpportunityCard key={item.id} opportunity={item} />)}</div> : <p className="quiet">Consulta el catálogo para ver las oportunidades disponibles.</p>}
      </section>

      <section className="story-section" aria-labelledby="story-heading">
        <div className="container story-grid">
          <div><Eyebrow>Nuestra historia</Eyebrow><h2 id="story-heading">Lo que nos hubiera gustado <em>encontrar antes.</em></h2></div>
          <div><p>AyniNexo nace de una experiencia universitaria real: descubrir demasiado tarde las oportunidades que podrían haber transformado nuestros primeros años de carrera.</p><p>Queremos que ningún estudiante tenga que esperar hasta sus últimos ciclos para descubrir todo lo que puede alcanzar.</p><Link className="inline-link" to="/contacto">Conoce el proyecto <ArrowUpRight size={16} /></Link></div>
        </div>
      </section>

      <section className="container community-wrap">
        <div className="community">
          <HeartHandshake size={32} strokeWidth={1.45} aria-hidden="true" />
          <div><h2>Las oportunidades se multiplican al compartirlas.</h2><p>La oportunidad que tú compartes hoy podría cambiar el futuro de otro estudiante.</p></div>
          <Link className="button community-button" to="/compartir">Compartir una oportunidad <ArrowRight size={17} /></Link>
        </div>
      </section>
    </>
  )
}
