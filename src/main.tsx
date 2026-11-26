import '@fontsource-variable/dm-sans/wght.css'
import '@fontsource-variable/playfair-display/wght.css'
import '@fontsource-variable/playfair-display/wght-italic.css'
import './styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ActionLink, EmptyState } from './components/ui'
import { Admin } from './pages/Admin'
import { Contact, Privacy, Share } from './pages/Community'
import { Detail } from './pages/Detail'
import { Explore } from './pages/Explore'
import { Home } from './pages/Home'
import { Nexo } from './pages/Nexo'
import { Profile, Roadmap, Saved, Session } from './pages/Student'
import { WorkspaceProvider } from './services/WorkspaceProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode><BrowserRouter useTransitions={false}><WorkspaceProvider><Routes>
    <Route element={<Layout />} path="/">
      <Route index element={<Home />} />
      <Route path="explorar" element={<Explore />} />
      <Route path="oportunidades/:id" element={<Detail />} />
      <Route path="mi-nexo" element={<Nexo />} />
      <Route path="mi-ruta" element={<Roadmap />} />
      <Route path="perfil" element={<Profile />} />
      <Route path="guardadas" element={<Saved />} />
      <Route path="compartir" element={<Share />} />
      <Route path="sesion" element={<Session />} />
      <Route path="contacto" element={<Contact />} />
      <Route path="privacidad" element={<Privacy />} />
      <Route path="admin-demo" element={<Admin />} />
      <Route path="*" element={<div className="container section-space"><EmptyState title="No encontramos esta página" action={<ActionLink to="/">Volver al inicio</ActionLink>}>Verifica el enlace o vuelve a la portada.</EmptyState></div>} />
    </Route>
  </Routes></WorkspaceProvider></BrowserRouter></StrictMode>,
)
