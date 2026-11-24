const TIPOS_CONFIRMACION = ['signup', 'email', 'invite', 'email_change']

function leer(location) {
  return {
    hash: new URLSearchParams((location.hash ?? '').replace(/^#/, '')),
    query: new URLSearchParams(location.search ?? '')
  }
}

function tieneError({ hash, query }) {
  return ['error', 'error_code'].some(clave => hash.has(clave) || query.has(clave))
}

export function esEnlaceDeConfirmacion(location) {
  if (location.pathname === '/confirmar-correo') return false

  const parametros = leer(location)
  const { hash, query } = parametros

  if (hash.has('access_token') && TIPOS_CONFIRMACION.includes(hash.get('type'))) return true
  if (query.has('token_hash') && TIPOS_CONFIRMACION.includes(query.get('type'))) return true
  if (hash.has('error_code') && hash.get('error_code').startsWith('otp')) return true

  return tieneError(parametros) && TIPOS_CONFIRMACION.includes(hash.get('type') ?? query.get('type'))
}

export function analizarEnlace(location) {
  const parametros = leer(location)
  const { query } = parametros

  if (tieneError(parametros)) return { tipo: 'error' }

  if (query.get('token_hash') && TIPOS_CONFIRMACION.includes(query.get('type'))) {
    return { tipo: 'token_hash', tokenHash: query.get('token_hash'), type: query.get('type') }
  }

  if (query.get('code')) return { tipo: 'code', code: query.get('code') }

  return { tipo: 'sesion' }
}
