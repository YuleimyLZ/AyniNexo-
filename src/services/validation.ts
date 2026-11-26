export function officialUrl(value: string) {
  const cleaned = value.trim()
  if (cleaned.length > 2048 || !/^https?:\/\//i.test(cleaned) || /[\s\p{Cc}\\]/u.test(cleaned)) return null
  try {
    const url = new URL(cleaned)
    const validDomain = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(url.hostname)
    if (url.username || url.password || !validDomain || !url.hostname.includes('.') || url.hostname.includes('..')) return null
    return url.href.length <= 2048 ? url.href : null
  } catch {
    return null
  }
}

export function userMessage(error: unknown, fallback = 'No pudimos completar la operación. Inténtalo de nuevo.') {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : ''
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (message === 'invalid login credentials') return 'El correo o la contraseña son incorrectos.'
  if (message === 'email not confirmed') return 'Confirma tu correo antes de iniciar sesión.'
  switch (code) {
    case 'P0429':
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit': return 'Alcanzaste el límite de envíos. Inténtalo más tarde.'
    case '23505': return 'Esta fuente oficial ya está registrada.'
    case '23502':
    case '23514':
    case '22023':
    case '22P02': return 'Revisa los campos y los límites del formulario.'
    case '42501':
    case 'PGRST301':
    case 'PGRST303':
    case 'session_not_found': return 'Tu sesión o tu rol no permiten esta operación. Comprueba que has iniciado sesión.'
    case '40001':
    case '55000': return 'Este registro cambió. Actualiza la vista antes de continuar.'
    case 'P0002': return 'El registro ya no está disponible.'
    case 'invalid_credentials': return 'El correo o la contraseña son incorrectos.'
    case 'email_not_confirmed': return 'Confirma tu correo antes de iniciar sesión.'
    case 'weak_password': return 'Elige una contraseña más larga y difícil de adivinar.'
    case 'same_password': return 'Elige una contraseña diferente de la anterior.'
    case 'otp_expired': return 'El enlace venció. Solicita uno nuevo.'
    default: return fallback
  }
}

export function validReturnPath(value: unknown) {
  return typeof value === 'string' && /^\/(?![/\\])/.test(value) && !/[\\\p{Cc}]/u.test(value) ? value : '/perfil'
}
