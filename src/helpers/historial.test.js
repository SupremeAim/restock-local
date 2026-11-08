import { describe, expect, it } from 'vitest'
import { agregarEventoNuevo, construirHistorial } from './historial'

const eventos = [
  { seq: 3, type: 'contrapropuesta' },
  { seq: 1, type: 'creada' },
  { seq: 2, type: 'revision_iniciada' }
]

describe('historial de una negociación', () => {
  it('ordena por secuencia y empieza en el último evento', () => {
    const historial = construirHistorial(eventos)
    expect(historial.recorrerAdelante().map((e) => e.seq)).toEqual([1, 2, 3])
    expect(historial.actual().seq).toBe(3)
    expect(historial.posicion()).toBe(3)
  })

  it('agrega un evento nuevo y lo muestra si el usuario estaba al final', () => {
    const historial = construirHistorial(eventos)
    const r = agregarEventoNuevo(historial, { seq: 4, type: 'aceptada' })
    expect(r).toEqual({ resultado: 'agregado', hayNovedades: false })
    expect(historial.actual().seq).toBe(4)
  })

  it('conserva la posición y avisa novedades si el usuario leía un evento anterior', () => {
    const historial = construirHistorial(eventos)
    historial.anterior()
    const r = agregarEventoNuevo(historial, { seq: 4, type: 'aceptada' })
    expect(r).toEqual({ resultado: 'agregado', hayNovedades: true })
    expect(historial.actual().seq).toBe(2)
    expect(historial.tamano()).toBe(4)
  })

  it('no duplica un evento repetido', () => {
    const historial = construirHistorial(eventos)
    expect(agregarEventoNuevo(historial, { seq: 3, type: 'contrapropuesta' }).resultado).toBe('duplicado')
    expect(agregarEventoNuevo(historial, { seq: 1, type: 'creada' }).resultado).toBe('duplicado')
    expect(historial.tamano()).toBe(3)
  })

  it('pide recargar si falta un evento intermedio', () => {
    const historial = construirHistorial(eventos)
    expect(agregarEventoNuevo(historial, { seq: 5, type: 'despachada' }).resultado).toBe('recargar')
    expect(historial.tamano()).toBe(3)
  })

  it('funciona con un historial vacío', () => {
    const historial = construirHistorial([])
    const r = agregarEventoNuevo(historial, { seq: 1, type: 'creada' })
    expect(r.resultado).toBe('agregado')
    expect(historial.actual().seq).toBe(1)
    expect(historial.hayAnterior()).toBe(false)
    expect(historial.haySiguiente()).toBe(false)
  })
})
