
export function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

class TrieNode {
  constructor() {
    this.children = new Map()
    this.values = new Map()
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode()
    this.entries = new Map()
  }

  insert(word, value) {
    const normalized = normalizeSearchText(word).replace(/\s/g, '')

    if (!normalized || value === undefined || value === null) return

    let words = this.entries.get(value)

    if (!words) {
      words = new Set()
      this.entries.set(value, words)
    }

    if (words.has(normalized)) return

    words.add(normalized)

    let node = this.root

    for (const character of normalized) {
      if (!node.children.has(character)) {
        node.children.set(character, new TrieNode())
      }

      node = node.children.get(character)
      node.values.set(value, (node.values.get(value) || 0) + 1)
    }
  }

  insertTitle(title, value) {
    const words = new Set(normalizeSearchText(title).split(' '))

    for (const word of words) {
      if (word) this.insert(word, value)
    }
  }

  search(prefix) {
    const normalized = normalizeSearchText(prefix).replace(/\s/g, '')

    if (!normalized) return []

    let node = this.root

    for (const character of normalized) {
      node = node.children.get(character)

      if (!node) return []
    }

    return [...node.values.keys()]
  }

  remove(word, value) {
    const normalized = normalizeSearchText(word).replace(/\s/g, '')
    const words = this.entries.get(value)

    if (!normalized || !words?.has(normalized)) return false

    words.delete(normalized)

    let node = this.root
    const path = []

    for (const character of normalized) {
      const parent = node
      node = node.children.get(character)

      if (!node) return false

      path.push({ parent, node, character })

      const count = node.values.get(value)

      if (count > 1) {
        node.values.set(value, count - 1)
      } else {
        node.values.delete(value)
      }
    }

    for (let i = path.length - 1; i >= 0; i--) {
      const item = path[i]

      if (item.node.values.size === 0 && item.node.children.size === 0) {
        item.parent.children.delete(item.character)
      } else {
        break
      }
    }

    if (words.size === 0) {
      this.entries.delete(value)
    }

    return true
  }

  removeTitle(title, value) {
    const words = new Set(normalizeSearchText(title).split(' '))
    let removed = false

    for (const word of words) {
      if (word && this.remove(word, value)) {
        removed = true
      }
    }

    return removed
  }
}

export default Trie
