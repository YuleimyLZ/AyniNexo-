import { ArrowRight, ArrowUpRight, CheckCircle2, HeartHandshake, Link2 } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ActionLink, Button, PageIntro, Status } from '../components/ui'
import { formatDate, todayInPeru } from '../features/eligibility'
import { officialUrl, userMessage } from '../services/validation'
import { useWorkspace } from '../services/workspaceContext'
import { categories } from '../types/domain'
import type { Category } from '../types/domain'

export function Share() {
  const { workspace, submitOpportunity, reloadStudent } = useWorkspace()
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = event.currentTarget
    const fields = new FormData(form)
    const source = officialUrl(String(fields.get('source') ?? ''))
    if (fields.get('website')) return
    if (!source) {
      setNotice({ error: true, text: 'Ingresa un enlace oficial completo que empiece por http:// o https://.' })
      return
    }
    setBusy(true)
    setNotice(null)
    try {
      await submitOpportunity({
        source, text: String(fields.get('text') ?? '').trim(), comment: String(fields.get('comment') ?? '').trim(),
        category: String(fields.get('category') ?? '') as Category | '',
      })
      form.reset()
      setNotice({ error: false, text: 'Tu aporte se envió y quedó pendiente de revisión.' })
    } catch (cause) {
      setNotice({ error: true, text: userMessage(cause, 'No pudimos enviar tu aporte. El formulario conserva tus datos.') })
    } finally {
      setBusy(false)
    }
  }

  return <div className="container subpage narrow">
    <PageIntro label="Comunidad" icon={<HeartHandshake size={20} />} title={<>Comparte una oportunidad. <em>Multiplica posibilidades.</em></>}>La oportunidad que tú compartes hoy podría cambiar el futuro de otro estudiante.</PageIntro>
    <p className="quiet">Cada aporte pasa por revisión antes de aparecer en el catálogo.</p>
    <form className="surface simple-panel stacked-form" onSubmit={submit}>
      <label className="field"><span><Link2 size={17} /> Enlace oficial <small>Obligatorio</small></span><input name="source" type="url" required maxLength={2048} placeholder="https://…" /></label>
      <label className="field"><span>Texto de la convocatoria <small>Opcional</small></span><textarea name="text" maxLength={7000} rows={5} placeholder="Pega los requisitos, los beneficios o la fecha límite." /></label>
      <label className="field"><span>Categoría <small>Opcional</small></span><select name="category"><option value="">Selecciona una categoría</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
      <label className="field"><span>Comentario adicional <small>Opcional</small></span><textarea name="comment" rows={3} maxLength={700} /></label>
      <div hidden><label>Dejar en blanco <input name="website" autoComplete="off" tabIndex={-1} /></label></div>
      <div className="action-row"><Button type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Enviar oportunidad'} <ArrowRight size={17} /></Button></div>
      {notice && <p className={notice.error ? 'error-text' : 'confirmation'} role={notice.error ? 'alert' : 'status'}>{!notice.error && <CheckCircle2 size={18} />}{notice.text}</p>}
    </form>
    <section className="submissions-history" aria-labelledby="your-submissions">
      <div className="section-heading"><h2 id="your-submissions">Mis aportes</h2><Button variant="outline" onClick={reloadStudent}>Actualizar estado</Button></div>
      {workspace.submissions.length ? <div className="surface admin-list">{workspace.submissions.map((item) => <article key={item.id}>
        <div><a className="inline-link admin-url" href={officialUrl(item.source) ?? undefined} target="_blank" rel="noreferrer">{item.source} <ArrowUpRight size={15} /></a>
          <p>{formatDate(todayInPeru(new Date(item.submittedAt)))} · {item.category || 'Sin categoría'}</p></div>
        <Status>{item.status}</Status>
        {item.publishedOpportunityId && <Link className="inline-link" to={`/oportunidades/${item.publishedOpportunityId}`}>Ver convocatoria</Link>}
      </article>)}</div> : <p className="quiet">Todavía no has compartido oportunidades.</p>}
    </section>
  </div>
}

export function Contact() {
  return <div className="container subpage narrow">
    <PageIntro label="Contacto" title={<>Hablemos de <em>AyniNexo.</em></>}>AyniNexo es un proyecto independiente nacido de una experiencia universitaria en Perú.</PageIntro>
    <div className="surface simple-panel"><p>Para compartir una convocatoria, usa el formulario de aportes. Para enviar comentarios sobre el proyecto, puedes abrir una incidencia en GitHub.</p><div className="action-row"><ActionLink to="/compartir" arrow>Compartir una oportunidad</ActionLink><a href="https://github.com/YuleimyLZ/AyniNexo-/issues" className="button button--outline" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={16} /></a></div></div>
  </div>
}

export function Privacy() {
  return <div className="container subpage narrow">
    <PageIntro label="Privacidad" title={<>Cómo cuidamos <em>tus datos.</em></>} />
    <div className="surface simple-panel prose-block"><p>El perfil académico, las oportunidades guardadas y las rutas se almacenan en Supabase y se asocian a tu cuenta. La persona administradora puede revisar los aportes que envíes. Tu navegador conserva la sesión necesaria para acceder a estos datos.</p><p>Mi Nexo conserva el historial en memoria durante la navegación. Si eliges usar el perfil académico, AyniNexo lo consulta para evaluar requisitos. En el piloto privado, Gemini recibe señales generales de búsqueda y datos públicos de las convocatorias. Evita incluir documentos o datos personales en tus mensajes.</p></div>
  </div>
}
