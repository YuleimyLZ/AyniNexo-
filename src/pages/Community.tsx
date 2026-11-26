import { ArrowRight, ArrowUpRight, CheckCircle2, HeartHandshake, Link2 } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { ActionLink, Button, DemoNote, PageIntro } from '../components/ui'
import { officialUrl } from '../services/demo'
import { useWorkspace } from '../services/workspaceContext'
import { categories } from '../types/domain'
import type { Category, Submission } from '../types/domain'

export function Share() {
  const { workspace, update } = useWorkspace()
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null)
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const fields = new FormData(form)
    const source = officialUrl(String(fields.get('source') ?? ''))
    if (fields.get('website')) return
    if (!source) {
      setNotice({ error: true, text: 'Ingresa un enlace completo que empiece por https://.' })
      return
    }
    if (workspace.submissions.some((item) => item.source === source && item.status !== 'Rechazada')) {
      setNotice({ error: true, text: 'Este enlace ya se compartió en este navegador.' })
      return
    }
    const submission: Submission = {
      id: crypto.randomUUID(), source, text: String(fields.get('text') ?? '').trim(), comment: String(fields.get('comment') ?? '').trim(),
      category: String(fields.get('category') ?? '') as Category | '', status: 'Pendiente', submittedAt: new Date().toISOString(),
    }
    update((previous) => ({ ...previous, submissions: [submission, ...previous.submissions] }))
    form.reset()
    setNotice({ error: false, text: 'Tu aporte quedó guardado en este navegador y pendiente de revisión demostrativa.' })
  }
  return <div className="container subpage narrow">
    <PageIntro label="Comunidad" icon={<HeartHandshake size={20} />} title={<>Comparte una oportunidad. <em>Multiplica posibilidades.</em></>}>La oportunidad que tú compartes hoy podría cambiar el futuro de otro estudiante.</PageIntro>
    <DemoNote>Los aportes de esta fase se guardan solo en este navegador y pasan por una revisión simulada.</DemoNote>
    <form className="surface simple-panel stacked-form" onSubmit={submit}>
      <label className="field"><span><Link2 size={17} /> Enlace oficial <small>Obligatorio</small></span><input name="source" type="url" required maxLength={2048} placeholder="https://…" /></label>
      <label className="field"><span>Texto de la convocatoria <small>Opcional</small></span><textarea name="text" maxLength={7000} rows={5} placeholder="Pega los requisitos, los beneficios o la fecha límite." /></label>
      <label className="field"><span>Categoría <small>Opcional</small></span><select name="category"><option value="">Selecciona una categoría</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
      <label className="field"><span>Comentario adicional <small>Opcional</small></span><textarea name="comment" rows={3} maxLength={700} /></label>
      <div hidden><label>Dejar en blanco <input name="website" autoComplete="off" tabIndex={-1} /></label></div>
      <div className="action-row"><Button type="submit">Enviar oportunidad <ArrowRight size={17} /></Button></div>
      {notice && <p className={notice.error ? 'error-text' : 'confirmation'} role={notice.error ? 'alert' : 'status'}>{!notice.error && <CheckCircle2 size={18} />}{notice.text}</p>}
    </form>
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
    <PageIntro label="Privacidad" title={<>Tus datos, <em>en tu navegador.</em></>} />
    <div className="surface simple-panel prose-block"><p>En esta fase de demostración, el perfil académico, los guardados, las rutas y los aportes persisten en el almacenamiento local de este navegador. Los datos se conservan al recargar la página y puedes eliminarlos al borrar los datos de este sitio.</p><p>Las recomendaciones se calculan localmente a partir de los intereses que escribes y de un catálogo ficticio. Evita introducir documentos, información de contacto o datos personales sensibles.</p></div>
  </div>
}
