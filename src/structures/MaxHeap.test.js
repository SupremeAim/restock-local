
import { describe, expect, it } from 'vitest'
import MaxHeap from './MaxHeap.js'

describe('MaxHeap (montículo máximo)', () => {
  it('un heap nuevo empieza vacío', () => {
    const heap = new MaxHeap()

    expect(heap.isEmpty()).toBe(true)
    expect(heap.size()).toBe(0)
    expect(heap.peek()).toBeNull()
    expect(heap.extractMax()).toBeNull()
  })

  it('inserta valores y consulta el máximo', () => {
    const heap = new MaxHeap()

    heap.insert(4)
    heap.insert(9)
    heap.insert(2)
    heap.insert(7)

    expect(heap.peek()).toBe(9)
    expect(heap.size()).toBe(4)
  })

  it('extrae los valores de mayor a menor', () => {
    const heap = new MaxHeap()

    ;[4, 9, 2, 7, 15, 3].forEach(value => heap.insert(value))

    expect(
      Array.from({ length: 6 }, () => heap.extractMax())
    ).toEqual([15, 9, 7, 4, 3, 2])

    expect(heap.isEmpty()).toBe(true)
  })

  it('mantiene el orden después de nuevas inserciones', () => {
    const heap = new MaxHeap()

    heap.insert(10)
    heap.insert(5)
    heap.extractMax()
    heap.insert(20)
    heap.insert(8)

    expect(heap.extractMax()).toBe(20)
    expect(heap.extractMax()).toBe(8)
    expect(heap.extractMax()).toBe(5)
    expect(heap.isEmpty()).toBe(true)
  })
})
