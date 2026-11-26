import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useWorkspace } from '../services/workspaceContext'
import { ActionLink, Button, EmptyState } from './ui'

export function AuthGate({ owner = false, personal = false, children }: { owner?: boolean; personal?: boolean; children?: ReactNode }) {
  const { session, authState, recovery, role, roleState, mode, reloadRole, studentState, reloadStudent } = useWorkspace()
  const location = useLocation()

  if (mode !== 'live') return <GateState title="Las cuentas requieren Supabase" action={<ActionLink to="/explorar" variant="outline">Explorar oportunidades</ActionLink>}>
    {mode === 'demo' ? 'Estás en el modo de desarrollo con un catálogo de ejemplo.' : 'Conecta el proyecto de Supabase para habilitar esta sección.'}
  </GateState>
  if (authState === 'loading' || (session && ((owner && roleState === 'loading') || (personal && studentState === 'loading')))) {
    return <p className="container state-message" role="status">Cargando tu cuenta…</p>
  }
  if (!session) return <Navigate to="/sesion" replace state={{ returnTo: location.pathname + location.search }} />
  if (recovery) return <Navigate to="/sesion?modo=actualizar" replace />
  if (owner && roleState === 'error') return <GateState title="No pudimos consultar tu rol" action={<Button onClick={reloadRole}>Reintentar</Button>}>
    Comprueba tu conexión para abrir la administración.
  </GateState>
  if (owner && role !== 'owner') return <GateState title="Acceso restringido" action={<ActionLink to="/perfil" variant="outline">Ir a mi perfil</ActionLink>}>
    Esta sección está reservada a la persona administradora.
  </GateState>
  if (personal && studentState === 'error') return <GateState title="No pudimos cargar tus datos" action={<Button onClick={reloadStudent}>Reintentar</Button>}>
    Comprueba tu conexión para continuar con tus datos guardados.
  </GateState>
  return <>{children ?? <Outlet />}</>
}

function GateState({ title, action, children }: { title: string; action: ReactNode; children: ReactNode }) {
  return <div className="container subpage narrow"><EmptyState title={title} action={action}>{children}</EmptyState></div>
}
