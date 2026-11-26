import '@fontsource-variable/dm-sans/wght.css'
import '@fontsource-variable/playfair-display/wght.css'
import '@fontsource-variable/playfair-display/wght-italic.css'
import './styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthGate } from './components/AuthGate'
import { Layout } from './components/Layout'
import { ActionLink, EmptyState } from './components/ui'
import { Admin } from './pages/Admin'
import { Contact, Privacy, Share } from './pages/Community'
import { Detail } from './pages/Detail'
import { Explore } from './pages/Explore'
import { Home } from './pages/Home'
import { Nexo } from './pages/Nexo'
import { Profile, Roadmap, Saved } from './pages/Student'
import { Session } from './pages/Session'
import { WorkspaceProvider } from './services/WorkspaceProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode><BrowserRouter useTransitions={false}><WorkspaceProvider><Routes>
    <Route element={<Layout />} path="/">
      <Route index element={<Home />} />
      <Route path="explorar" element={<Explore />} />
      <Route path="oportunidades/:id" element={<Detail />} />
      <Route path="mi-nexo" element={<Nexo />} />
      <Route element={<AuthGate personal />}>
        <Route path="mi-ruta" element={<Roadmap />} />
        <Route path="perfil" element={<Profile />} />
        <Route path="guardadas" element={<Saved />} />
        <Route path="compartir" element={<Share />} />
      </Route>
      <Route path="sesion" element={<Session />} />
      <Route path="contacto" element={<Contact />} />
      <Route path="privacidad" element={<Privacy />} />
      <Route element={<AuthGate owner />}>
        <Route path="administracion" element={<Admin />} />
        <Route path="admin-demo" element={<Navigate to="/administracion" replace />} />
      </Route>
      <Route path="*" element={<div className="container section-space"><EmptyState title="No encontramos esta página" action={<ActionLink to="/">Volver al inicio</ActionLink>}>Verifica el enlace o vuelve a la portada.</EmptyState></div>} />
    </Route>
  </Routes></WorkspaceProvider></BrowserRouter></StrictMode>,
)
