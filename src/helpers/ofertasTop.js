
import MaxHeap from '../structures/MaxHeap.js'

export function compareOffers(a, b) {
  const quantity = Number(a.qty_available) - Number(b.qty_available)

  if (quantity !== 0) return quantity

  const date = new Date(b.created_at).getTime() -
    new Date(a.created_at).getTime()

  if (date !== 0) return date

  if (a.id < b.id) return 1
  if (a.id > b.id) return -1

  return 0
}

export function getTopOffers(offers) {
  const heap = new MaxHeap(compareOffers)

  offers.forEach(offer => heap.insert(offer))

  const result = []

  while (result.length < 5 && !heap.isEmpty()) {
    result.push(heap.extractMax())
  }

  return result
}
