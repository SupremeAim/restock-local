
import test from 'node:test'
import assert from 'node:assert/strict'
import MaxHeap from './MaxHeap.js'

test('un heap nuevo empieza vacio', () => {
  const heap = new MaxHeap()

  assert.equal(heap.isEmpty(), true)
  assert.equal(heap.size(), 0)
  assert.equal(heap.peek(), null)
  assert.equal(heap.extractMax(), null)
})

test('inserta valores y consulta el maximo', () => {
  const heap = new MaxHeap()

  heap.insert(4)
  heap.insert(9)
  heap.insert(2)
  heap.insert(7)

  assert.equal(heap.peek(), 9)
  assert.equal(heap.size(), 4)
})

test('extrae los valores de mayor a menor', () => {
  const heap = new MaxHeap()

  ;[4, 9, 2, 7, 15, 3].forEach(value => heap.insert(value))

  assert.deepEqual(
    Array.from({ length: 6 }, () => heap.extractMax()),
    [15, 9, 7, 4, 3, 2]
  )

  assert.equal(heap.isEmpty(), true)
})

test('mantiene el orden despues de nuevas inserciones', () => {
  const heap = new MaxHeap()

  heap.insert(10)
  heap.insert(5)
  heap.extractMax()
  heap.insert(20)
  heap.insert(8)

  assert.equal(heap.extractMax(), 20)
  assert.equal(heap.extractMax(), 8)
  assert.equal(heap.extractMax(), 5)
  assert.equal(heap.isEmpty(), true)
})
