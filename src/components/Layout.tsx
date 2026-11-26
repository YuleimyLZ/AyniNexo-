import { ArrowUpRight, Bookmark, Menu, UserRound, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useWorkspace } from '../services/workspaceContext'

const links = [
  { to: '/explorar', label: 'Explorar' },
  { to: '/mi-nexo', label: 'Mi Nexo IA' },
  { to: '/mi-ruta', label: 'Mi ruta' },
  { to: '/compartir', label: 'Compartir oportunidad' },
]

function Brand() {
  return <Link to="/" className="brand" aria-label="AyniNexo, inicio"><img src="/ayni.svg" width="35" height="35" alt="" /><span>ayninexo<span className="brand-period">.</span></span></Link>
}

function Header() {
  const { workspace } = useWorkspace()
  const [open, setOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const count = Object.keys(workspace.saved).length
  return (
    <header className="site-header" onKeyDown={(event) => {
      if (event.key === 'Escape' && open) {
        setOpen(false)
        menuButton.current?.focus()
      }
    }}>
      <div className="container nav-inner">
        <Brand />
        <button ref={menuButton} className="menu-toggle icon-button" type="button" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} aria-controls="site-navigation" onClick={() => setOpen(!open)}>{open ? <X size={23} /> : <Menu size={23} />}</button>
        <nav id="site-navigation" className={`site-nav ${open ? 'site-nav--open' : ''}`} aria-label="Navegación principal" onClick={(event) => {
          if (event.target instanceof Element && event.target.closest('a')) setOpen(false)
        }}>
          <div className="nav-links">{links.map(({ to, label }) => <NavLink key={to} to={to}>{label}</NavLink>)}</div>
          <div className="nav-actions">
            <NavLink to="/guardadas" className="nav-bookmark">
              <Bookmark size={19} strokeWidth={1.65} aria-hidden="true" />
              <span className="sr-only">Mis oportunidades guardadas</span>
              {count > 0 && <span className="nav-bookmark-count">{count}</span>}
            </NavLink>
            <NavLink to={workspace.session ? '/perfil' : '/sesion'} className="nav-sign-in"><UserRound size={17} strokeWidth={1.65} />{workspace.session ? 'Mi perfil' : 'Iniciar sesión'}</NavLink>
          </div>
        </nav>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="site-footer"><div className="container">
      <div className="footer-main">
        <div><Brand /><p>Conectamos talento, multiplicamos oportunidades.</p></div>
        <div className="footer-links" aria-label="Navegación del pie">
          <Link to="/explorar">Explorar</Link><Link to="/mi-nexo">Mi Nexo IA</Link><Link to="/compartir">Compartir</Link>
          <Link to="/contacto">Contacto <ArrowUpRight size={13} /></Link><Link to="/privacidad">Privacidad</Link>
        </div>
      </div>
      <div className="footer-bottom"><span>Nacido en Perú, construido para todos.</span><span>Proyecto independiente · Public Beta v0.1 · Demo</span></div>
    </div></footer>
  )
}

export function Layout() {
  const { pathname } = useLocation()
  const main = useRef<HTMLElement>(null)
  const { storageError } = useWorkspace()
  useEffect(() => {
    window.scrollTo(0, 0)
    main.current?.focus({ preventScroll: true })
  }, [pathname])
  return (
    <>
      <a className="skip-link" href="#contenido">Ir al contenido</a>
      <Header key={pathname} />
      {storageError && <div className="storage-alert" role="alert">El navegador bloqueó el almacenamiento. Los cambios durarán hasta que cierres esta página.</div>}
      <main id="contenido" ref={main} tabIndex={-1}><Outlet /></main>
      <Footer />
    </>
  )
}
