
import test from 'node:test'
import assert from 'node:assert/strict'
import Trie from './Trie.js'

test('busca palabras por prefijo sin importar mayusculas ni tildes', () => {
  const trie = new Trie()

  trie.insertTitle('Lámparas LED de escritorio', '1')

  assert.deepEqual(trie.search('lam'), ['1'])
  assert.deepEqual(trie.search('LED'), ['1'])
  assert.deepEqual(trie.search('LÁM'), ['1'])
})

test('indexa todas las palabras del titulo', () => {
  const trie = new Trie()

  trie.insertTitle('Cargador USB de carga rápida', '1')

  assert.deepEqual(trie.search('carg'), ['1'])
  assert.deepEqual(trie.search('usb'), ['1'])
  assert.deepEqual(trie.search('rap'), ['1'])
})

test('encuentra varias ofertas con el mismo prefijo', () => {
  const trie = new Trie()

  trie.insertTitle('Cargador USB-C', '1')
  trie.insertTitle('Cargadores para celular', '2')

  assert.deepEqual(
    new Set(trie.search('carg')),
    new Set(['1', '2'])
  )
})

test('elimina una oferta sin afectar las demas', () => {
  const trie = new Trie()

  trie.insertTitle('Cargador USB-C', '1')
  trie.insertTitle('Cargadores para celular', '2')

  assert.equal(trie.removeTitle('Cargador USB-C', '1'), true)

  assert.deepEqual(trie.search('carg'), ['2'])
  assert.deepEqual(trie.search('usb'), [])
})

test('no duplica una misma palabra para una oferta', () => {
  const trie = new Trie()

  trie.insertTitle('Cargador cargador USB', '1')
  trie.insertTitle('Cargador USB', '1')

  assert.deepEqual(trie.search('carg'), ['1'])
})

test('devuelve una lista vacia para prefijos inexistentes', () => {
  const trie = new Trie()

  trie.insertTitle('Lámparas LED', '1')

  assert.deepEqual(trie.search('zapat'), [])
  assert.deepEqual(trie.search(''), [])
})

test('elimina correctamente el indice de un titulo', () => {
  const trie = new Trie()

  trie.insertTitle('Cuadernos argollados', '1')

  assert.equal(trie.removeTitle('Cuadernos argollados', '1'), true)
  assert.deepEqual(trie.search('cuad'), [])
  assert.equal(trie.removeTitle('Cuadernos argollados', '1'), false)
})
