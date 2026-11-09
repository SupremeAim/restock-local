class Nodo {
  constructor(valor) {
    this.valor = valor
    this.anterior = null
    this.siguiente = null
  }
}

export default class DoublyLinkedList {
  constructor() {
    this.cabeza = null
    this.cola = null
    this.cantidad = 0
    this.cursor = null
    this.indiceCursor = -1
  }

  static desdeLista(lista) {
    const resultado = new DoublyLinkedList()
    for (const elemento of lista) resultado.agregarAlFinal(elemento)
    return resultado
  }

  agregarAlFinal(valor) {
    const nodo = new Nodo(valor)
    if (this.cola) {
      nodo.anterior = this.cola
      this.cola.siguiente = nodo
    } else {
      this.cabeza = nodo
    }
    this.cola = nodo
    this.cantidad++
    return this.cantidad
  }

  tamano() {
    return this.cantidad
  }

  estaVacia() {
    return this.cantidad === 0
  }

  primero() {
    return this.cabeza ? this.cabeza.valor : null
  }

  ultimo() {
    return this.cola ? this.cola.valor : null
  }

  recorrerAdelante() {
    const resultado = []
    let actual = this.cabeza
    while (actual) {
      resultado.push(actual.valor)
      actual = actual.siguiente
    }
    return resultado
  }

  recorrerAtras() {
    const resultado = []
    let actual = this.cola
    while (actual) {
      resultado.push(actual.valor)
      actual = actual.anterior
    }
    return resultado
  }

  irAlPrimero() {
    this.cursor = this.cabeza
    this.indiceCursor = this.cabeza ? 0 : -1
    return this.actual()
  }

  irAlUltimo() {
    this.cursor = this.cola
    this.indiceCursor = this.cola ? this.cantidad - 1 : -1
    return this.actual()
  }

  actual() {
    return this.cursor ? this.cursor.valor : null
  }

  hayAnterior() {
    return Boolean(this.cursor && this.cursor.anterior)
  }

  haySiguiente() {
    return Boolean(this.cursor && this.cursor.siguiente)
  }

  anterior() {
    if (this.hayAnterior()) {
      this.cursor = this.cursor.anterior
      this.indiceCursor--
    }
    return this.actual()
  }

  siguiente() {
    if (this.haySiguiente()) {
      this.cursor = this.cursor.siguiente
      this.indiceCursor++
    }
    return this.actual()
  }

  posicion() {
    return this.indiceCursor + 1
  }
}
