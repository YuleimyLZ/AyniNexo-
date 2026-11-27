import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { validateConnection } from './config'

const connection = validateConnection(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)

export const supabase = connection ? createClient<Database>(connection.url, connection.key, {
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
}) : null

export const isDemo = import.meta.env.DEV && !supabase && import.meta.env.VITE_AYNI_DEMO === 'true'
