import { describe, expect, it } from 'vitest'
import DoublyLinkedList from './DoublyLinkedList'

const eventos = [
  { seq: 1, tipo: 'Solicitud creada' },
  { seq: 2, tipo: 'Revisión iniciada' },
  { seq: 3, tipo: 'Contrapropuesta' },
  { seq: 4, tipo: 'Contrapropuesta' }
]

describe('DoublyLinkedList (lista doblemente enlazada)', () => {
  it('empieza vacía', () => {
    const lista = new DoublyLinkedList()
    expect(lista.estaVacia()).toBe(true)
    expect(lista.primero()).toBeNull()
    expect(lista.ultimo()).toBeNull()
    expect(lista.irAlUltimo()).toBeNull()
    expect(lista.posicion()).toBe(0)
    expect(lista.recorrerAdelante()).toEqual([])
  })

  it('agrega al final y conserva el orden', () => {
    const lista = new DoublyLinkedList()
    lista.agregarAlFinal('A')
    lista.agregarAlFinal('B')
    lista.agregarAlFinal('C')
    expect(lista.tamano()).toBe(3)
    expect(lista.primero()).toBe('A')
    expect(lista.ultimo()).toBe('C')
  })

  it('recorre hacia adelante y hacia atrás', () => {
    const lista = DoublyLinkedList.desdeLista(['A', 'B', 'C'])
    expect(lista.recorrerAdelante()).toEqual(['A', 'B', 'C'])
    expect(lista.recorrerAtras()).toEqual(['C', 'B', 'A'])
  })

  it('navega con anterior y siguiente desde el último evento', () => {
    const lista = DoublyLinkedList.desdeLista(eventos)
    expect(lista.irAlUltimo().seq).toBe(4)
    expect(lista.posicion()).toBe(4)
    expect(lista.haySiguiente()).toBe(false)
    expect(lista.anterior().seq).toBe(3)
    expect(lista.anterior().seq).toBe(2)
    expect(lista.posicion()).toBe(2)
    expect(lista.siguiente().seq).toBe(3)
  })

  it('no se sale de los extremos', () => {
    const lista = DoublyLinkedList.desdeLista(eventos)
    lista.irAlPrimero()
    expect(lista.hayAnterior()).toBe(false)
    expect(lista.anterior().seq).toBe(1)
    expect(lista.posicion()).toBe(1)
    lista.irAlUltimo()
    expect(lista.siguiente().seq).toBe(4)
    expect(lista.posicion()).toBe(4)
  })

  it('un evento nuevo al final se puede alcanzar con siguiente', () => {
    const lista = DoublyLinkedList.desdeLista(eventos)
    lista.irAlUltimo()
    lista.agregarAlFinal({ seq: 5, tipo: 'Propuesta aceptada' })
    expect(lista.haySiguiente()).toBe(true)
    expect(lista.siguiente().seq).toBe(5)
    expect(lista.posicion()).toBe(5)
    expect(lista.recorrerAtras()[0].seq).toBe(5)
  })

  it('con un solo elemento no hay anterior ni siguiente', () => {
    const lista = DoublyLinkedList.desdeLista(['A'])
    lista.irAlUltimo()
    expect(lista.hayAnterior()).toBe(false)
    expect(lista.haySiguiente()).toBe(false)
    expect(lista.posicion()).toBe(1)
  })
})
