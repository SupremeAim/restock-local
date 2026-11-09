import DoublyLinkedList from '../structures/DoublyLinkedList'

export function construirHistorial(eventos) {
  const ordenados = [...eventos].sort((a, b) => a.seq - b.seq)
  const historial = DoublyLinkedList.desdeLista(ordenados)
  historial.irAlUltimo()
  return historial
}

export function agregarEventoNuevo(historial, evento) {
  const ultimo = historial.ultimo()

  if (ultimo && evento.seq <= ultimo.seq) {
    return { resultado: 'duplicado', hayNovedades: false }
  }

  if (ultimo && evento.seq > ultimo.seq + 1) {
    return { resultado: 'recargar', hayNovedades: false }
  }

  const estabaAlFinal = !historial.haySiguiente()
  historial.agregarAlFinal(evento)

  if (estabaAlFinal) {
    historial.irAlUltimo()
    return { resultado: 'agregado', hayNovedades: false }
  }

  return { resultado: 'agregado', hayNovedades: true }
}
