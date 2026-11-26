import { ArrowRight, Award, BookOpen, Bookmark, BriefcaseBusiness, CalendarDays, CodeXml, Compass, FlaskConical, GraduationCap, HeartHandshake, MapPin, Mic, Monitor, Sparkles, UsersRound, Wallet } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { deadlineStatus, formatDate } from '../features/eligibility'
import { useWorkspace } from '../services/workspaceContext'
import type { Category, Opportunity } from '../types/domain'

export const categoryInfo = {
  Becas: { icon: GraduationCap, tone: 'rose', label: 'Beca' },
  Intercambios: { icon: Compass, tone: 'sage', label: 'Intercambio' },
  Investigación: { icon: FlaskConical, tone: 'sand', label: 'Investigación' },
  Hackathons: { icon: CodeXml, tone: 'sage', label: 'Hackathon' },
  Conferencias: { icon: Mic, tone: 'sand', label: 'Conferencia' },
  Certificaciones: { icon: Award, tone: 'rose', label: 'Certificación' },
  Liderazgo: { icon: UsersRound, tone: 'sand', label: 'Liderazgo' },
  Voluntariados: { icon: HeartHandshake, tone: 'rose', label: 'Voluntariado' },
  'Oportunidades profesionales': { icon: BriefcaseBusiness, tone: 'sage', label: 'Profesional' },
} as const

export function ActionLink({ to, children, variant = 'primary', arrow = false }: { to: string; children: ReactNode; variant?: 'primary' | 'outline' | 'text'; arrow?: boolean }) {
  return <Link className={`button button--${variant}`} to={to}>{children}{arrow && <ArrowRight size={17} />}</Link>
}

export function Button({ children, variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'text' }) {
  return <button type="button" className={`button button--${variant} ${className}`} {...props}>{children}</button>
}

export function Eyebrow({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return <p className="eyebrow">{icon ?? <span className="eyebrow-line" aria-hidden="true" />}{children}</p>
}

export function DemoNote({ children = 'Catálogo de demostración. Incluye convocatorias y fechas ficticias.' }: { children?: ReactNode }) {
  return <p className="demo-note" role="note"><BookOpen size={15} aria-hidden="true" />{children}</p>
}

export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <div className="empty-state"><span className="icon-tile tone-rose"><Compass size={22} /></span><h2>{title}</h2><p>{children}</p>{action}</div>
}

export function PageIntro({ label, title, children, icon }: { label: string; title: ReactNode; children?: ReactNode; icon?: ReactNode }) {
  return <div className="page-intro"><Eyebrow icon={icon}>{label}</Eyebrow><h1>{title}</h1>{children && <p className="intro-copy">{children}</p>}</div>
}

export function Status({ children }: { children: string }) {
  const tone = ['Cumplido', 'Abierta', 'Aprobada', 'Finalizada'].includes(children) ? 'sage' : ['Vencida', 'No cumplido', 'Rechazada', 'Archivada'].includes(children) ? 'rose' : 'sand'
  return <span className={`status tone-${tone}`}><span aria-hidden="true" />{children}</span>
}

export function CategoryIcon({ category, size = 22 }: { category: Category; size?: number }) {
  const { icon: Icon, tone } = categoryInfo[category]
  return <span className={`icon-tile tone-${tone}`}><Icon size={size} strokeWidth={1.65} aria-hidden="true" /></span>
}

export function SaveButton({ opportunity, compact = false }: { opportunity: Opportunity; compact?: boolean }) {
  const { workspace, update } = useWorkspace()
  const saved = Boolean(workspace.saved[opportunity.id])
  function toggle() {
    update((previous) => {
      const next = { ...previous.saved }
      if (next[opportunity.id]) delete next[opportunity.id]
      else next[opportunity.id] = 'Guardada'
      return { ...previous, saved: next }
    })
  }
  return (
    <button className={compact ? 'bookmark-button' : 'button button--outline'} type="button" aria-label={`Guardar ${opportunity.title}`} aria-pressed={saved} onClick={toggle}>
      <Bookmark size={19} fill={saved ? 'currentColor' : 'none'} strokeWidth={1.7} />
      {!compact && (saved ? 'Guardada' : 'Guardar oportunidad')}
    </button>
  )
}

export function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  return (
    <article className="opportunity-card">
      <div className="card-top">
        <div className="card-category"><CategoryIcon category={opportunity.category} size={20} /><span>{categoryInfo[opportunity.category].label}</span></div>
        <SaveButton opportunity={opportunity} compact />
      </div>
      <div>
        <h3><Link to={`/oportunidades/${opportunity.id}`}>{opportunity.title}</Link></h3>
        <p className="card-organization">{opportunity.organization}</p>
      </div>
      <div className="card-meta">
        <span><MapPin size={15} />{opportunity.country}</span>
        <span><Monitor size={15} />{opportunity.modality}</span>
        <span><Wallet size={15} />{opportunity.funding}</span>
      </div>
      <div className="card-date"><span><CalendarDays size={15} />{formatDate(opportunity.deadline)}</span><Status>{opportunity.status === 'Archivada' ? 'Archivada' : deadlineStatus(opportunity.deadline)}</Status></div>
      <Link className="card-link" to={`/oportunidades/${opportunity.id}`}>Ver oportunidad <ArrowRight size={16} aria-hidden="true" /></Link>
    </article>
  )
}

export const Spark = () => <Sparkles size={18} strokeWidth={1.7} aria-hidden="true" />
