import { ArrowRight, Mail } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ActionLink, Button, EmptyState, PageIntro } from '../components/ui'
import { supabase } from '../services/supabase'
import { userMessage, validReturnPath } from '../services/validation'
import { useWorkspace } from '../services/workspaceContext'

type Mode = 'entrar' | 'registro' | 'recuperar' | 'actualizar'
const presentation = {
  entrar: { title: 'Inicia sesión.', detail: 'Accede a tus oportunidades guardadas, tu perfil y tu ruta.', button: 'Iniciar sesión' },
  registro: { title: 'Crea tu cuenta.', detail: 'Organiza tus oportunidades y guarda tu avance con una cuenta de AyniNexo.', button: 'Crear cuenta' },
  recuperar: { title: 'Recupera tu contraseña.', detail: 'Te enviaremos un enlace para elegir una contraseña nueva.', button: 'Enviar enlace de recuperación' },
  actualizar: { title: 'Elige una contraseña nueva.', detail: 'Usa una contraseña de al menos ocho caracteres.', button: 'Actualizar contraseña' },
}

export function Session() {
  const [params] = useSearchParams()
  const { authState, mode, recovery } = useWorkspace()
  const selected = params.get('modo')
  const formMode: Mode = recovery || selected === 'actualizar' ? 'actualizar' : selected === 'registro' || selected === 'recuperar' ? selected : 'entrar'
  if (authState === 'loading') return <p className="container state-message" role="status">Verificando tu sesión…</p>
  if (mode !== 'live') return <div className="container subpage narrow"><EmptyState title="La conexión con Supabase está pendiente" action={<ActionLink to="/explorar" variant="outline">Explorar oportunidades</ActionLink>}>Las cuentas se habilitan al configurar el proyecto de Supabase.</EmptyState></div>
  if (formMode === 'actualizar' && !recovery) return <div className="container subpage narrow"><EmptyState title="El enlace de recuperación no está disponible" action={<ActionLink to="/sesion?modo=recuperar">Solicitar otro enlace</ActionLink>}>Usa el mismo navegador desde el que solicitaste el enlace y comprueba que siga vigente.</EmptyState></div>
  return <SessionForm key={formMode} formMode={formMode} />
}

function SessionForm({ formMode }: { formMode: Mode }) {
  const { session, role } = useWorkspace()
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const redirect = validReturnPath(location.state?.returnTo)
  const { title, detail, button } = presentation[formMode]
  const updating = formMode === 'actualizar'
  const needsPassword = formMode !== 'recuperar'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !supabase) return
    const values = new FormData(event.currentTarget)
    const email = String(values.get('email') ?? '').trim()
    const password = String(values.get('password') ?? '')
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const sessionUrl = new URL('/sesion', window.location.origin)
      if (formMode === 'registro') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: sessionUrl.href } })
        if (error) throw error
        if (data.session) navigate(redirect, { replace: true })
        else setNotice('Revisa tu correo y confirma tu cuenta con el enlace recibido. Abre el enlace en este mismo navegador.')
      } else if (formMode === 'recuperar') {
        sessionUrl.searchParams.set('modo', 'actualizar')
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: sessionUrl.href })
        if (error) throw error
        setNotice('Si el correo está asociado a una cuenta, recibirás un enlace. Ábrelo en este mismo navegador.')
      } else if (updating) {
        if (!session) throw { code: 'otp_expired' }
        if (password !== values.get('confirmPassword')) {
          setError('Las contraseñas deben coincidir.')
          return
        }
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        navigate('/sesion', { replace: true, state: { passwordUpdated: true } })
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate(redirect, { replace: true })
      }
    } catch (cause) {
      setError(userMessage(cause, 'No pudimos completar la solicitud. Comprueba tu conexión e inténtalo de nuevo.'))
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    if (busy || !supabase) return
    setBusy(true)
    setError('')
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) throw error
      navigate('/', { replace: true })
    } catch (cause) {
      setError(userMessage(cause, 'No pudimos cerrar tu sesión. Inténtalo de nuevo.'))
    } finally {
      setBusy(false)
    }
  }

  return <div className="container subpage narrow">
    <PageIntro label="Mi cuenta" title={session && !updating ? <>Tu espacio en <em>AyniNexo.</em></> : title}>{session && !updating ? 'Gestiona tu cuenta y consulta tus datos.' : detail}</PageIntro>
    {session && !updating ? <div className="surface simple-panel">
      {location.state?.passwordUpdated && <p role="status" className="confirmation">Tu contraseña se actualizó.</p>}
      <p className="account-email"><Mail size={17} aria-hidden="true" />{session.user.email}</p>
      <div className="action-row">
        <ActionLink to="/perfil" arrow>Ir a mi perfil</ActionLink>
        {role === 'owner' && <ActionLink to="/administracion" variant="outline">Administración</ActionLink>}
        <Button variant="outline" onClick={() => void signOut()} disabled={busy}>{busy ? 'Cerrando sesión…' : 'Cerrar sesión'}</Button>
      </div>
      {error && <p className="error-text auth-feedback" role="alert">{error}</p>}
    </div> : <form className="surface simple-panel stacked-form" onSubmit={submit}>
      {!updating && <label className="field"><span>Correo electrónico</span><input name="email" type="email" autoComplete="email" required maxLength={254} /></label>}
      {needsPassword && <label className="field"><span>{updating ? 'Contraseña nueva' : 'Contraseña'}</span><input name="password" type="password" autoComplete={formMode === 'entrar' ? 'current-password' : 'new-password'} required minLength={formMode === 'entrar' ? undefined : 8} maxLength={128} /></label>}
      {updating && <label className="field"><span>Confirma la contraseña nueva</span><input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} /></label>}
      <div className="action-row"><Button type="submit" disabled={busy}>{busy ? 'Procesando…' : button}<ArrowRight size={17} /></Button></div>
      {notice && <p role="status" className="confirmation">{notice}</p>}
      {error && <p role="alert" className="error-text">{error}</p>}
      <div className="action-row auth-links">
        {formMode === 'entrar' ? <>
          <Link className="inline-link" to="/sesion?modo=registro" state={location.state}>Crear cuenta</Link>
          <Link className="inline-link" to="/sesion?modo=recuperar" state={location.state}>Olvidé mi contraseña</Link>
        </> : <Link className="inline-link" to="/sesion" state={location.state}>Volver a iniciar sesión</Link>}
      </div>
    </form>}
  </div>
}
