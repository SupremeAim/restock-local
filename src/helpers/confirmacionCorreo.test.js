import { describe, expect, it } from 'vitest'
import { analizarEnlace, esEnlaceDeConfirmacion } from './confirmacionCorreo'

const ubicacion = (pathname, search = '', hash = '') => ({ pathname, search, hash })

describe('enlaces de confirmación que llegan a otra página', () => {
  it('detecta el enlace de registro que Supabase manda al inicio', () => {
    expect(esEnlaceDeConfirmacion(ubicacion('/', '', '#access_token=abc&refresh_token=x&type=signup'))).toBe(true)
  })

  it('detecta el enlace con token_hash', () => {
    expect(esEnlaceDeConfirmacion(ubicacion('/', '?token_hash=abc&type=email'))).toBe(true)
  })

  it('detecta un enlace vencido que llega al inicio', () => {
    expect(esEnlaceDeConfirmacion(ubicacion('/', '', '#error=access_denied&error_code=otp_expired'))).toBe(true)
  })

  it('no mueve una recuperación de contraseña ni una visita normal', () => {
    expect(esEnlaceDeConfirmacion(ubicacion('/', '', '#access_token=abc&type=recovery'))).toBe(false)
    expect(esEnlaceDeConfirmacion(ubicacion('/catalogo'))).toBe(false)
    expect(esEnlaceDeConfirmacion(ubicacion('/', '?code=abc'))).toBe(false)
  })

  it('no hace nada si ya está en la página de confirmación', () => {
    expect(esEnlaceDeConfirmacion(ubicacion('/confirmar-correo', '', '#access_token=abc&type=signup'))).toBe(false)
  })
})

describe('tipo de enlace en la página de confirmación', () => {
  it('reconoce los errores en el hash o en la consulta', () => {
    expect(analizarEnlace(ubicacion('/confirmar-correo', '', '#error=access_denied&error_code=otp_expired'))).toEqual({ tipo: 'error' })
    expect(analizarEnlace(ubicacion('/confirmar-correo', '?error=server_error'))).toEqual({ tipo: 'error' })
  })

  it('reconoce el enlace con token_hash', () => {
    expect(analizarEnlace(ubicacion('/confirmar-correo', '?token_hash=abc&type=signup'))).toEqual({
      tipo: 'token_hash',
      tokenHash: 'abc',
      type: 'signup'
    })
  })

  it('reconoce el enlace con código', () => {
    expect(analizarEnlace(ubicacion('/confirmar-correo', '?code=xyz'))).toEqual({ tipo: 'code', code: 'xyz' })
  })

  it('usa la sesión cuando Supabase ya procesó el enlace', () => {
    expect(analizarEnlace(ubicacion('/confirmar-correo', '', '#'))).toEqual({ tipo: 'sesion' })
    expect(analizarEnlace(ubicacion('/confirmar-correo'))).toEqual({ tipo: 'sesion' })
  })
})
