
class MaxHeap {
  constructor(compare = (a, b) => a - b) {
    this.heap = []
    this.compare = compare
  }

  insert(value) {
    this.heap.push(value)
    this.moveUp(this.heap.length - 1)
  }

  peek() {
    return this.heap[0] ?? null
  }

  extractMax() {
    if (this.heap.length === 0) return null

    const maximum = this.heap[0]
    const last = this.heap.pop()

    if (this.heap.length > 0) {
      this.heap[0] = last
      this.moveDown(0)
    }

    return maximum
  }

  size() {
    return this.heap.length
  }

  isEmpty() {
    return this.heap.length === 0
  }

  moveUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2)

      if (this.compare(this.heap[index], this.heap[parent]) <= 0) {
        break
      }

      this.swap(index, parent)
      index = parent
    }
  }

  moveDown(index) {
    while (true) {
      const left = index * 2 + 1
      const right = index * 2 + 2
      let largest = index

      if (
        left < this.heap.length &&
        this.compare(this.heap[left], this.heap[largest]) > 0
      ) {
        largest = left
      }

      if (
        right < this.heap.length &&
        this.compare(this.heap[right], this.heap[largest]) > 0
      ) {
        largest = right
      }

      if (largest === index) break

      this.swap(index, largest)
      index = largest
    }
  }

  swap(first, second) {
    const temp = this.heap[first]
    this.heap[first] = this.heap[second]
    this.heap[second] = temp
  }
}

export default MaxHeap
