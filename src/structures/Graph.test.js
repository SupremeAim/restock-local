
import { describe, expect, it } from 'vitest'
import Graph from './Graph'

describe('Graph (grafo de conexiones comerciales)', () => {
  it('empieza vacío', () => {
    const graph = new Graph()

    expect(graph.isEmpty()).toBe(true)
    expect(graph.getVertexCount()).toBe(0)
    expect(graph.getEdgeCount()).toBe(0)
  })

  it('agrega negocios sin conexiones', () => {
    const graph = new Graph()

    graph.addVertex('A', { name: 'Tienda A' })
    graph.addVertex('B', { name: 'Tienda B' })

    expect(graph.getVertexCount()).toBe(2)
    expect(graph.getNeighbors('A')).toHaveLength(0)
  })

  it('no duplica negocios existentes', () => {
    const graph = new Graph()

    graph.addVertex('A', { name: 'Tienda A' })
    const resultado = graph.addVertex('A', { city: 'Cali' })

    expect(resultado).toBe(false)
    expect(graph.getVertexCount()).toBe(1)
    expect(graph.getVertex('A')).toEqual({
      id: 'A',
      name: 'Tienda A',
      city: 'Cali'
    })
  })

  it('crea conexiones bidireccionales', () => {
    const graph = new Graph()

    graph.addVertex('A')
    graph.addVertex('B')
    graph.addEdge('A', 'B')

    expect(graph.getEdgeWeight('A', 'B')).toBe(1)
    expect(graph.getEdgeWeight('B', 'A')).toBe(1)
    expect(graph.getEdgeCount()).toBe(1)
  })

  it('acumula operaciones sin duplicar conexiones', () => {
    const graph = new Graph()

    graph.addVertex('A')
    graph.addVertex('B')

    graph.addEdge('A', 'B', 2)
    graph.addEdge('A', 'B', 3)

    expect(graph.getEdgeWeight('A', 'B')).toBe(5)
    expect(graph.getEdgeWeight('B', 'A')).toBe(5)
    expect(graph.getEdgeCount()).toBe(1)
  })

  it('consulta los vecinos directos', () => {
    const graph = new Graph()

    graph.addVertex('A')
    graph.addVertex('B', { name: 'Tienda B' })
    graph.addVertex('C')

    graph.addEdge('A', 'B', 2)
    graph.addEdge('A', 'C', 4)

    expect(graph.getNeighbors('A')).toHaveLength(2)
    expect(graph.getNeighbors('A')[0].weight).toBe(2)
  })

  it('BFS encuentra el camino con menos conexiones', () => {
    const graph = new Graph()

    for (const id of ['A', 'B', 'C', 'D', 'E']) {
      graph.addVertex(id)
    }

    graph.addEdge('A', 'B')
    graph.addEdge('B', 'C')
    graph.addEdge('A', 'D')
    graph.addEdge('D', 'E')
    graph.addEdge('E', 'C')

    expect(graph.bfs('A', 'C')).toEqual(['A', 'B', 'C'])
  })

  it('BFS devuelve lista vacía cuando no existe camino', () => {
    const graph = new Graph()

    graph.addVertex('A')
    graph.addVertex('B')

    expect(graph.bfs('A', 'B')).toEqual([])
  })

  it('BFS permite consultar el mismo negocio', () => {
    const graph = new Graph()

    graph.addVertex('A')

    expect(graph.bfs('A', 'A')).toEqual(['A'])
  })

  it('rechaza conexiones con negocios inexistentes', () => {
    const graph = new Graph()

    graph.addVertex('A')

    expect(() => graph.addEdge('A', 'B')).toThrow(
      'Ambos negocios deben existir en el grafo.'
    )
  })

  it('rechaza conexiones de un negocio consigo mismo', () => {
    const graph = new Graph()

    graph.addVertex('A')

    expect(() => graph.addEdge('A', 'A')).toThrow(
      'Un negocio no puede conectarse consigo mismo.'
    )
  })

  it('rechaza pesos inválidos', () => {
    const graph = new Graph()

    graph.addVertex('A')
    graph.addVertex('B')

    expect(() => graph.addEdge('A', 'B', 0)).toThrow()
    expect(() => graph.addEdge('A', 'B', -1)).toThrow()
    expect(() => graph.addEdge('A', 'B', 1.5)).toThrow()
  })
})
