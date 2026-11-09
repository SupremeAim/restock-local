import { describe, expect, it } from 'vitest'
import { codigoDeError, debeRecargar, mensajeDeError, accionParaError } from './erroresNegociacion'

describe('errores de la negociación', () => {
  it('reconoce el código que devuelve la base de datos', () => {
    expect(codigoDeError({ message: 'disponibilidad_insuficiente' })).toBe('disponibilidad_insuficiente')
    expect(codigoDeError({ message: 'ERROR: version_desactualizada' })).toBe('version_desactualizada')
    expect(codigoDeError({ message: 'algo raro' })).toBeNull()
    expect(codigoDeError(null)).toBeNull()
  })

  it('traduce el código a un mensaje claro', () => {
    expect(mensajeDeError({ message: 'no_es_tu_turno' })).toBe('Ahora es el turno de la otra parte.')
    expect(mensajeDeError({ message: 'disponibilidad_insuficiente' })).toMatch('No se aplicó ningún cambio')
  })

  it('usa un mensaje general si el error es desconocido o de conexión', () => {
    expect(mensajeDeError(new Error('Failed to fetch'))).toMatch('Revisa tu conexión')
  })

  it('indica cuándo hay que volver a consultar la solicitud', () => {
    expect(debeRecargar({ message: 'version_desactualizada' })).toBe(true)
    expect(debeRecargar({ message: 'disponibilidad_insuficiente' })).toBe(true)
    expect(debeRecargar({ message: 'sin_permiso' })).toBe(false)
    expect(debeRecargar(new Error('Failed to fetch'))).toBe(false)
  })
})

describe('acciones sugeridas para errores', () => {
  it('ofrece configurar el negocio cuando falta', () => {
    expect(accionParaError({ message: 'negocio_no_configurado' })).toEqual({
      texto: 'Configurar mi negocio',
      ruta: '/configurar-negocio'
    })
  })

  it('lleva a las solicitudes enviadas si ya hay una abierta', () => {
    expect(accionParaError({ message: 'solicitud_abierta_existente' }).ruta).toBe('/solicitudes-enviadas')
  })

  it('no sugiere nada para otros errores', () => {
    expect(accionParaError({ message: 'precio_invalido' })).toBeNull()
    expect(accionParaError(new Error('Failed to fetch'))).toBeNull()
  })
})
