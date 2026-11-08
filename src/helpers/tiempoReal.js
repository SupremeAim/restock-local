export function esMasReciente(nueva, actual) {
  if (!actual) return true
  return Number(nueva.version) > Number(actual.version)
}

export function elegirMasReciente(actual, nueva) {
  if (!nueva) return actual
  return esMasReciente(nueva, actual) ? nueva : actual
}

export function aplicarCambioEnLista(lista, nueva) {
  const indice = lista.findIndex((solicitud) => solicitud.id === nueva.id)

  if (indice === -1) {
    return { lista: [nueva, ...lista], cambio: 'nueva' }
  }

  if (!esMasReciente(nueva, lista[indice])) {
    return { lista, cambio: 'ignorada' }
  }

  const copia = [...lista]
  copia[indice] = nueva
  return { lista: copia, cambio: 'actualizada' }
}
