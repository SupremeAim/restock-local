class Nodo {
  constructor(valor) {
    this.valor = valor
    this.siguiente = null
  }
}

export default class Queue {
  constructor() {
    this.frente = null
    this.final = null
    this.cantidad = 0
  }

  static desdeLista(lista) {
    const cola = new Queue()
    for (const elemento of lista) cola.encolar(elemento)
    return cola
  }

  encolar(valor) {
    const nodo = new Nodo(valor)
    if (this.final) {
      this.final.siguiente = nodo
    } else {
      this.frente = nodo
    }
    this.final = nodo
    this.cantidad++
    return this.cantidad
  }

  desencolar() {
    if (!this.frente) return null
    const valor = this.frente.valor
    this.frente = this.frente.siguiente
    if (!this.frente) this.final = null
    this.cantidad--
    return valor
  }

  verFrente() {
    return this.frente ? this.frente.valor : null
  }

  tamano() {
    return this.cantidad
  }

  estaVacia() {
    return this.cantidad === 0
  }

  aLista() {
    const resultado = []
    let actual = this.frente
    while (actual) {
      resultado.push(actual.valor)
      actual = actual.siguiente
    }
    return resultado
  }
}
