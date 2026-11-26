import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, DemoNote, EmptyState, OpportunityCard, PageIntro } from '../components/ui'
import { deadlineStatus, normalize } from '../features/eligibility'
import { useWorkspace } from '../services/workspaceContext'
import { academicLevels, categories, fundingOptions, modalities } from '../types/domain'

type Filter = { key: string; label: string; placeholder: string; options: readonly string[] }

export function Explore() {
  const [params, setParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)
  const { catalog, catalogState, reloadCatalog } = useWorkspace()
  const approved = catalog.filter((item) => item.status === 'Aprobada')
  const countries = Array.from(new Set(approved.map((item) => item.country))).sort((a, b) => a.localeCompare(b, 'es'))
  const filters: Filter[] = [
    { key: 'categoria', label: 'Categoría', placeholder: 'Todas las categorías', options: categories },
    { key: 'pais', label: 'País', placeholder: 'Todos los países', options: countries },
    { key: 'modalidad', label: 'Modalidad', placeholder: 'Todas las modalidades', options: modalities },
    { key: 'financiamiento', label: 'Financiamiento', placeholder: 'Cualquier financiamiento', options: fundingOptions },
    { key: 'nivel', label: 'Nivel académico', placeholder: 'Todos los niveles', options: academicLevels },
    { key: 'plazo', label: 'Fecha límite', placeholder: 'Todos los plazos', options: ['Abierta', 'Vencida', 'Por confirmar'] },
  ]
  const search = params.get('q') ?? ''
  const sort = params.get('orden') ?? 'relevancia'
  const activeFilters = filters.filter(({ key }) => params.has(key))
  const tokens = normalize(search).split(/\s+/).filter(Boolean)
  const results = approved.filter((item) => {
    const values = [item.category, item.country, item.modality, item.funding, item.levels, deadlineStatus(item.deadline)]
    const text = normalize([item.title, item.organization, item.description, ...item.topics, ...values.flat()].join(' '))
    return tokens.every((term) => text.includes(term)) && filters.every(({ key }, index) => {
      const value = params.get(key)
      return !value || [values[index]].flat().includes(value)
    })
  }).sort((first, second) => {
    if (sort === 'cierre') return (first.deadline ?? '9999').localeCompare(second.deadline ?? '9999')
    if (tokens.length) {
      const titleScore = (title: string) => tokens.filter((term) => normalize(title).includes(term)).length
      const relevance = titleScore(second.title) - titleScore(first.title)
      if (relevance) return relevance
    }
    return Number(deadlineStatus(first.deadline) === 'Vencida') - Number(deadlineStatus(second.deadline) === 'Vencida')
  })

  function setFilter(key: string, value: string, replace = false) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace, preventScrollReset: true })
  }

  function clearFilters() {
    const next = new URLSearchParams(params)
    filters.forEach(({ key }) => next.delete(key))
    setParams(next, { preventScrollReset: true })
  }

  return (
    <>
      <section className="explore-hero">
        <div className="container">
          <PageIntro label="El explorador" title={<>Encuentra tu <em>próxima oportunidad.</em></>}>Becas, intercambios, investigación y más. Explora las posibilidades y encuentra las que se acercan a tus metas.</PageIntro>
          <div className="search-field">
            <Search size={21} strokeWidth={1.65} aria-hidden="true" />
            <label className="sr-only" htmlFor="catalog-search">Buscar oportunidades</label>
            <input id="catalog-search" type="search" placeholder="Busca por nombre, institución o tema" value={search} onChange={(event) => setFilter('q', event.target.value, true)} />
            {search && <button type="button" className="icon-button search-clear" aria-label="Borrar búsqueda" onClick={() => setFilter('q', '', true)}><X size={18} /></button>}
          </div>
        </div>
      </section>
      <div className="container explorer">
        <DemoNote />
        <div className="catalog-layout">
          <aside className={`filter-panel ${showFilters ? 'filters-visible' : ''}`} aria-label="Filtros de oportunidades">
            <button className="filter-toggle button button--outline" type="button" aria-expanded={showFilters} aria-controls="filter-controls" onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={17} />Filtros{activeFilters.length > 0 ? ` (${activeFilters.length})` : ''}</button>
            <div id="filter-controls" className="filter-controls">
              <div className="filter-header"><h2><SlidersHorizontal size={17} />Filtros</h2>{activeFilters.length > 0 && <button className="filter-clear" type="button" onClick={clearFilters}>Limpiar</button>}</div>
              {filters.map(({ key, label, placeholder, options }) => <label className="field filter-field" key={key}><span id={`filter-${key}`}>{label}</span><select aria-labelledby={`filter-${key}`} value={params.get(key) ?? ''} onChange={(event) => setFilter(key, event.target.value)}><option value="">{placeholder}</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>)}
            </div>
          </aside>
          <section className="catalog-main" aria-label="Resultados">
            <div className="catalog-toolbar">
              <p role="status"><strong>{catalogState === 'ready' ? results.length : '·'}</strong> {results.length === 1 ? 'oportunidad' : 'oportunidades'}</p>
              <label className="sort-control"><span>Ordenar por</span><select aria-label="Ordenar por" value={sort} onChange={(event) => setFilter('orden', event.target.value)}><option value="relevancia">Relevancia</option><option value="cierre">Fecha de cierre</option></select></label>
            </div>
            {activeFilters.length > 0 && <div className="active-filters">{activeFilters.map(({ key, label }) => <button className="chip chip--filter" key={key} type="button" onClick={() => setFilter(key, '')} aria-label={`Quitar filtro ${label}: ${params.get(key)}`}>{params.get(key)} <X size={14} /></button>)}</div>}
            {catalogState === 'loading' && <p role="status" className="state-message">Cargando oportunidades…</p>}
            {catalogState === 'error' && <EmptyState title="No pudimos cargar el catálogo" action={<Button onClick={reloadCatalog}>Reintentar</Button>}>Intenta cargar las oportunidades de nuevo.</EmptyState>}
            {catalogState === 'ready' && (results.length ? <div className="card-grid">{results.map((item) => <OpportunityCard key={item.id} opportunity={item} />)}</div> : <EmptyState title="No encontramos coincidencias" action={<Button variant="outline" onClick={() => setParams({})}>Restablecer búsqueda</Button>}>Prueba otra palabra o quita un filtro para ampliar la búsqueda.</EmptyState>)}
          </section>
        </div>
      </div>
    </>
  )
}
