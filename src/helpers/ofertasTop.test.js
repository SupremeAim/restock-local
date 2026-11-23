
import { describe, expect, it } from 'vitest'
import { getTopOffers } from './ofertasTop.js'

describe('ofertas con mayor disponibilidad', () => {
  it('muestra las cinco ofertas con mayor disponibilidad', () => {
    const offers = [
      { id: '1', qty_available: 20, created_at: '2026-01-01' },
      { id: '2', qty_available: 350, created_at: '2026-01-02' },
      { id: '3', qty_available: 95, created_at: '2026-01-03' },
      { id: '4', qty_available: 240, created_at: '2026-01-04' },
      { id: '5', qty_available: 180, created_at: '2026-01-05' },
      { id: '6', qty_available: 80, created_at: '2026-01-06' }
    ]

    const result = getTopOffers(offers)

    expect(result).toHaveLength(5)
    expect(result.map(offer => offer.id)).toEqual([
      '2', '4', '5', '3', '6'
    ])
  })

  it('resuelve empates por fecha más antigua e identificador', () => {
    const offers = [
      { id: 'z', qty_available: 100, created_at: '2026-01-02' },
      { id: 'b', qty_available: 100, created_at: '2026-01-01' },
      { id: 'a', qty_available: 100, created_at: '2026-01-01' },
      { id: 'c', qty_available: 100, created_at: '2026-01-03' }
    ]

    const result = getTopOffers(offers)

    expect(result.map(offer => offer.id)).toEqual([
      'a', 'b', 'z', 'c'
    ])
  })

  it('muestra menos de cinco ofertas cuando no hay suficientes', () => {
    const offers = [
      { id: '1', qty_available: 20, created_at: '2026-01-01' },
      { id: '2', qty_available: 50, created_at: '2026-01-02' }
    ]

    expect(getTopOffers(offers).map(offer => offer.id)).toEqual([
      '2', '1'
    ])
  })

  it('devuelve una lista vacía cuando no hay ofertas', () => {
    expect(getTopOffers([])).toEqual([])
  })

  it('no modifica la lista original de ofertas', () => {
    const offers = [
      { id: '1', qty_available: 10, created_at: '2026-01-01' },
      { id: '2', qty_available: 50, created_at: '2026-01-02' }
    ]

    const original = [...offers]

    getTopOffers(offers)

    expect(offers).toEqual(original)
  })
})
