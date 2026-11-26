function isPublicKey(key: string) {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true
  // Supabase CLI can still issue a local legacy JWT with the anon role.
  try {
    const parts = key.split('.')
    const payload = parts[1]?.replace(/-/g, '+').replace(/_/g, '/')
    return parts.length === 3 && payload && JSON.parse(atob(payload)).role === 'anon'
  } catch {
    return false
  }
}

export function validateConnection(rawUrl: string | undefined, rawKey: string | undefined) {
  if (!rawUrl && !rawKey) return null
  const key = rawKey?.trim() ?? ''
  let url: URL
  try {
    url = new URL(rawUrl?.trim() ?? '')
  } catch {
    throw new Error('Configura VITE_SUPABASE_URL con la URL del proyecto.')
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
      url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('VITE_SUPABASE_URL debe ser el origen HTTPS del proyecto de Supabase.')
  }
  if (!isPublicKey(key)) throw new Error('Usa únicamente la Publishable Key de Supabase en VITE_SUPABASE_PUBLISHABLE_KEY.')
  return { url: url.origin, key }
}
