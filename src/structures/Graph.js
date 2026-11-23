
class Graph {
  constructor() {
    this.vertices = new Map()
    this.edgeCount = 0
  }

  addVertex(id, data = {}) {
    if (id === null || id === undefined || id === '') {
      throw new Error('El identificador del negocio es obligatorio.')
    }

    if (this.vertices.has(id)) {
      const actual = this.vertices.get(id)
      actual.data = { ...actual.data, ...data }
      return false
    }

    this.vertices.set(id, {
      data: { ...data },
      neighbors: new Map()
    })

    return true
  }

  addEdge(origen, destino, peso = 1) {
    if (!this.vertices.has(origen) || !this.vertices.has(destino)) {
      throw new Error('Ambos negocios deben existir en el grafo.')
    }

    if (origen === destino) {
      throw new Error('Un negocio no puede conectarse consigo mismo.')
    }

    if (!Number.isInteger(peso) || peso <= 0) {
      throw new Error('El peso debe ser un entero positivo.')
    }

    const vecinosOrigen = this.vertices.get(origen).neighbors
    const vecinosDestino = this.vertices.get(destino).neighbors

    const pesoActual = vecinosOrigen.get(destino) ?? 0
    const nuevoPeso = pesoActual + peso

    vecinosOrigen.set(destino, nuevoPeso)
    vecinosDestino.set(origen, nuevoPeso)

    if (pesoActual === 0) {
      this.edgeCount++
    }

    return nuevoPeso
  }

  hasVertex(id) {
    return this.vertices.has(id)
  }

  getVertex(id) {
    const vertex = this.vertices.get(id)

    if (!vertex) return null

    return {
      id,
      ...vertex.data
    }
  }

  getVertices() {
    return Array.from(this.vertices, ([id, vertex]) => ({
      id,
      ...vertex.data
    }))
  }

  getNeighbors(id) {
    const vertex = this.vertices.get(id)

    if (!vertex) return []

    return Array.from(vertex.neighbors, ([neighborId, weight]) => ({
      id: neighborId,
      ...this.vertices.get(neighborId).data,
      weight
    }))
  }

  getEdgeWeight(origen, destino) {
    return this.vertices.get(origen)?.neighbors.get(destino) ?? 0
  }

  bfs(origen, destino) {
    if (!this.vertices.has(origen) || !this.vertices.has(destino)) {
      return []
    }

    if (origen === destino) return [origen]

    const cola = [origen]
    const visitados = new Set([origen])
    const anteriores = new Map()

    while (cola.length > 0) {
      const actual = cola.shift()

      if (actual === destino) break

      for (const vecino of this.vertices.get(actual).neighbors.keys()) {
        if (visitados.has(vecino)) continue

        visitados.add(vecino)
        anteriores.set(vecino, actual)
        cola.push(vecino)
      }
    }

    if (!visitados.has(destino)) return []

    const camino = []
    let actual = destino

    while (actual !== undefined) {
      camino.unshift(actual)
      actual = anteriores.get(actual)
    }

    return camino
  }

  getVertexCount() {
    return this.vertices.size
  }

  getEdgeCount() {
    return this.edgeCount
  }

  isEmpty() {
    return this.vertices.size === 0
  }
}

export default Graph
