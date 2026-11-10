import { describe, expect, it } from 'vitest'
import { aplicarCambioEnLista, elegirMasReciente, esMasReciente } from './tiempoReal'

const lista = [
  { id: 'r1', status: 'pendiente', version: 1 },
  { id: 'r2', status: 'en_negociacion', version: 3 }
]

describe('cambios en tiempo real', () => {
  it('agrega una solicitud nueva al inicio', () => {
    const r = aplicarCambioEnLista(lista, { id: 'r3', status: 'pendiente', version: 1 })
    expect(r.cambio).toBe('nueva')
    expect(r.lista.map((s) => s.id)).toEqual(['r3', 'r1', 'r2'])
  })

  it('actualiza una solicitud con una versión más reciente', () => {
    const r = aplicarCambioEnLista(lista, { id: 'r2', status: 'aceptada', version: 4 })
    expect(r.cambio).toBe('actualizada')
    expect(r.lista[1].status).toBe('aceptada')
    expect(lista[1].status).toBe('en_negociacion')
  })

  it('ignora un mensaje repetido', () => {
    const r = aplicarCambioEnLista(lista, { id: 'r2', status: 'en_negociacion', version: 3 })
    expect(r.cambio).toBe('ignorada')
    expect(r.lista).toBe(lista)
  })

  it('no deja que un cambio atrasado pise uno más reciente', () => {
    const r = aplicarCambioEnLista(lista, { id: 'r2', status: 'pendiente', version: 2 })
    expect(r.cambio).toBe('ignorada')
    expect(r.lista[1].status).toBe('en_negociacion')
  })

  it('elige la versión más reciente de una sola solicitud', () => {
    const actual = { id: 'r1', version: 5 }
    expect(elegirMasReciente(actual, { id: 'r1', version: 4 })).toBe(actual)
    expect(elegirMasReciente(actual, { id: 'r1', version: 6 }).version).toBe(6)
    expect(elegirMasReciente(null, { id: 'r1', version: 1 }).version).toBe(1)
    expect(elegirMasReciente(actual, null)).toBe(actual)
    expect(esMasReciente({ version: '10' }, { version: '9' })).toBe(true)
  })
})
