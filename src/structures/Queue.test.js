import { describe, expect, it } from 'vitest'
import Queue from './Queue'

describe('Queue (cola FIFO)', () => {
  it('empieza vacía', () => {
    const cola = new Queue()
    expect(cola.estaVacia()).toBe(true)
    expect(cola.tamano()).toBe(0)
    expect(cola.verFrente()).toBeNull()
    expect(cola.desencolar()).toBeNull()
  })

  it('atiende en orden de llegada', () => {
    const cola = new Queue()
    cola.encolar('A')
    cola.encolar('B')
    cola.encolar('C')
    expect(cola.desencolar()).toBe('A')
    expect(cola.desencolar()).toBe('B')
    expect(cola.desencolar()).toBe('C')
    expect(cola.estaVacia()).toBe(true)
  })

  it('verFrente no quita el elemento', () => {
    const cola = Queue.desdeLista(['A', 'B'])
    expect(cola.verFrente()).toBe('A')
    expect(cola.verFrente()).toBe('A')
    expect(cola.tamano()).toBe(2)
  })

  it('lleva bien el tamaño al encolar y desencolar', () => {
    const cola = new Queue()
    expect(cola.encolar(1)).toBe(1)
    expect(cola.encolar(2)).toBe(2)
    cola.desencolar()
    expect(cola.tamano()).toBe(1)
  })

  it('sigue funcionando después de vaciarse', () => {
    const cola = Queue.desdeLista(['A'])
    cola.desencolar()
    cola.encolar('B')
    expect(cola.verFrente()).toBe('B')
    expect(cola.aLista()).toEqual(['B'])
  })

  it('aLista devuelve el orden sin modificar la cola', () => {
    const cola = Queue.desdeLista(['A', 'B', 'C'])
    expect(cola.aLista()).toEqual(['A', 'B', 'C'])
    expect(cola.tamano()).toBe(3)
  })

  it('funciona con solicitudes reales (objetos)', () => {
    const pendientes = [
      { id: 'r1', comprador: 'Distribuidora El Puente' },
      { id: 'r2', comprador: 'Moda Express' }
    ]
    const cola = Queue.desdeLista(pendientes)
    expect(cola.verFrente().id).toBe('r1')
  })
})
