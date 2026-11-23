
import { describe, expect, it } from 'vitest'
import Trie from './Trie.js'

describe('Trie (árbol de búsqueda por prefijos)', () => {
  it('busca palabras por prefijo sin importar mayúsculas ni tildes', () => {
    const trie = new Trie()

    trie.insertTitle('Lámparas LED de escritorio', '1')

    expect(trie.search('lam')).toEqual(['1'])
    expect(trie.search('LED')).toEqual(['1'])
    expect(trie.search('LÁM')).toEqual(['1'])
  })

  it('indexa todas las palabras del título', () => {
    const trie = new Trie()

    trie.insertTitle('Cargador USB de carga rápida', '1')

    expect(trie.search('carg')).toEqual(['1'])
    expect(trie.search('usb')).toEqual(['1'])
    expect(trie.search('rap')).toEqual(['1'])
  })

  it('encuentra varias ofertas con el mismo prefijo', () => {
    const trie = new Trie()

    trie.insertTitle('Cargador USB-C', '1')
    trie.insertTitle('Cargadores para celular', '2')

    expect(new Set(trie.search('carg'))).toEqual(
      new Set(['1', '2'])
    )
  })

  it('elimina una oferta sin afectar las demás', () => {
    const trie = new Trie()

    trie.insertTitle('Cargador USB-C', '1')
    trie.insertTitle('Cargadores para celular', '2')

    expect(trie.removeTitle('Cargador USB-C', '1')).toBe(true)

    expect(trie.search('carg')).toEqual(['2'])
    expect(trie.search('usb')).toEqual([])
  })

  it('no duplica una misma palabra para una oferta', () => {
    const trie = new Trie()

    trie.insertTitle('Cargador cargador USB', '1')
    trie.insertTitle('Cargador USB', '1')

    expect(trie.search('carg')).toEqual(['1'])
  })

  it('devuelve una lista vacía para prefijos inexistentes', () => {
    const trie = new Trie()

    trie.insertTitle('Lámparas LED', '1')

    expect(trie.search('zapat')).toEqual([])
    expect(trie.search('')).toEqual([])
  })

  it('elimina correctamente el índice de un título', () => {
    const trie = new Trie()

    trie.insertTitle('Cuadernos argollados', '1')

    expect(trie.removeTitle('Cuadernos argollados', '1')).toBe(true)
    expect(trie.search('cuad')).toEqual([])
    expect(trie.removeTitle('Cuadernos argollados', '1')).toBe(false)
  })
})
