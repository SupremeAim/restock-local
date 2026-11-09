import Queue from '../structures/Queue'

export const ESTADOS = {
  pendiente: { etiqueta: 'Pendiente', insignia: 'Pendiente', terminal: false },
  en_negociacion: { etiqueta: 'En negociación', insignia: 'Informativo', terminal: false },
  aceptada: { etiqueta: 'Aceptada', insignia: 'Correcto', terminal: false },
  despachada: { etiqueta: 'Despachada', insignia: 'Informativo', terminal: false },
  recibida: { etiqueta: 'Recibida', insignia: 'Correcto', terminal: true },
  rechazada: { etiqueta: 'Rechazada', insignia: 'Error', terminal: true },
  cancelada: { etiqueta: 'Cancelada', insignia: 'Inactivo', terminal: true }
}

export const TIPOS_EVENTO = {
  creada: 'Solicitud creada',
  revision_iniciada: 'Revisión iniciada',
  contrapropuesta: 'Contrapropuesta',
  aceptada: 'Propuesta aceptada',
  rechazada: 'Solicitud rechazada',
  cancelada: 'Cancelada',
  despachada: 'Acuerdo despachado',
  recibida: 'Recepción confirmada'
}

export const ACCIONES = {
  iniciar_revision: 'Iniciar revisión',
  aceptar: 'Aceptar propuesta',
  contraproponer: 'Contraproponer',
  rechazar: 'Rechazar',
  cancelar: 'Cancelar solicitud',
  cancelar_acuerdo: 'Cancelar acuerdo',
  despachar: 'Marcar como despachada',
  confirmar_recepcion: 'Confirmar recepción'
}

const ABIERTOS = ['pendiente', 'en_negociacion', 'aceptada', 'despachada']

export function datosEstado(estado) {
  return ESTADOS[estado] ?? { etiqueta: 'Desconocido', insignia: 'Inactivo', terminal: false }
}

export function estaAbierta(solicitud) {
  return ABIERTOS.includes(solicitud.status)
}

export function rolEnSolicitud(solicitud, miId) {
  if (!solicitud || !miId) return null
  if (solicitud.seller_id === miId) return 'vendedor'
  if (solicitud.buyer_id === miId) return 'comprador'
  return null
}

export function contraparte(solicitud, miId) {
  const rol = rolEnSolicitud(solicitud, miId)
  if (rol === 'vendedor') return solicitud.buyer_id
  if (rol === 'comprador') return solicitud.seller_id
  return null
}

export function accionesDisponibles(solicitud, miId) {
  const rol = rolEnSolicitud(solicitud, miId)
  if (!rol) return []

  const autorEsOtro = solicitud.current_author_id !== miId

  switch (solicitud.status) {
    case 'pendiente':
      return rol === 'vendedor' ? ['iniciar_revision', 'rechazar'] : ['cancelar']
    case 'en_negociacion': {
      const acciones = autorEsOtro ? ['aceptar', 'contraproponer'] : []
      acciones.push(rol === 'vendedor' ? 'rechazar' : 'cancelar')
      return acciones
    }
    case 'aceptada':
      return rol === 'vendedor' ? ['despachar', 'cancelar_acuerdo'] : ['cancelar_acuerdo']
    case 'despachada':
      return rol === 'comprador' ? ['confirmar_recepcion'] : []
    default:
      return []
  }
}

export function esMiTurno(solicitud, miId) {
  const rol = rolEnSolicitud(solicitud, miId)
  if (!rol) return false

  switch (solicitud.status) {
    case 'pendiente':
      return rol === 'vendedor'
    case 'en_negociacion':
      return solicitud.current_author_id !== miId
    case 'aceptada':
      return rol === 'vendedor'
    case 'despachada':
      return rol === 'comprador'
    default:
      return false
  }
}

export function siguientePaso(solicitud, miId) {
  const rol = rolEnSolicitud(solicitud, miId)
  if (!rol) return ''
  const otro = rol === 'vendedor' ? 'del comprador' : 'del vendedor'

  switch (solicitud.status) {
    case 'pendiente':
      return rol === 'vendedor' ? 'En la cola de revisión' : 'Esperando revisión del vendedor'
    case 'en_negociacion':
      return esMiTurno(solicitud, miId)
        ? 'Tu turno: responder la propuesta'
        : `Esperando respuesta ${otro}`
    case 'aceptada':
      return rol === 'vendedor' ? 'Despachar' : 'Esperando despacho'
    case 'despachada':
      return rol === 'comprador' ? 'Confirmar recepción' : 'Esperando confirmación del comprador'
    case 'recibida':
      return 'Completada'
    case 'rechazada':
      return rol === 'comprador' ? 'Puedes enviar otra solicitud' : 'Rechazada'
    case 'cancelada':
      return 'Cancelada'
    default:
      return ''
  }
}

export function calcularTotal(cantidad, precio) {
  const centavos = Math.round(Number(precio) * 100)
  return (Number(cantidad) * centavos) / 100
}

const formatoNumero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 })

export function formatearCOP(valor, conMoneda = true) {
  const texto = `$${formatoNumero.format(Number(valor))}`
  return conMoneda ? `${texto} COP` : texto
}

const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Bogota'
})

export function formatearFecha(fecha) {
  return formatoFecha.format(new Date(fecha))
}

export function validarPropuesta({ cantidad, precio, comentario = '' }, oferta) {
  const errores = {}
  const cantidadNumero = Number(cantidad)
  const precioTexto = String(precio ?? '').trim()
  const precioNumero = Number(precioTexto)

  if (!Number.isInteger(cantidadNumero) || String(cantidad).trim() === '') {
    errores.cantidad = 'Ingresa una cantidad entera.'
  } else if (cantidadNumero < oferta.min_purchase) {
    errores.cantidad = `La compra mínima es de ${oferta.min_purchase} unidades.`
  } else if (cantidadNumero > oferta.qty_available) {
    errores.cantidad = `Solo hay ${oferta.qty_available} unidades disponibles.`
  }

  if (precioTexto === '' || !Number.isFinite(precioNumero) || precioNumero <= 0) {
    errores.precio = 'Ingresa un precio mayor que 0.'
  } else if (!/^\d+(\.\d{1,2})?$/.test(precioTexto)) {
    errores.precio = 'Usa máximo 2 decimales.'
  }

  if (comentario.length > 500) {
    errores.comentario = 'El comentario puede tener máximo 500 caracteres.'
  }

  return errores
}

function compararLlegada(a, b) {
  const diferencia = new Date(a.created_at) - new Date(b.created_at)
  if (diferencia !== 0) return diferencia
  return String(a.id).localeCompare(String(b.id))
}

export function construirColaRevision(solicitudes) {
  const pendientes = solicitudes.filter((solicitud) => solicitud.status === 'pendiente')
  return Queue.desdeLista([...pendientes].sort(compararLlegada))
}

export function contarPorEstado(solicitudes) {
  const conteo = { todas: solicitudes.length, cerradas: 0 }
  for (const estado of Object.keys(ESTADOS)) conteo[estado] = 0
  for (const solicitud of solicitudes) {
    if (conteo[solicitud.status] !== undefined) conteo[solicitud.status]++
    if (datosEstado(solicitud.status).terminal) conteo.cerradas++
  }
  return conteo
}

export function filtrarSolicitudes(solicitudes, filtro) {
  if (filtro === 'todas') return solicitudes
  if (filtro === 'cerradas') {
    return solicitudes.filter((solicitud) => datosEstado(solicitud.status).terminal)
  }
  return solicitudes.filter((solicitud) => solicitud.status === filtro)
}

export function mapasDesdeFilas(filas, tipo) {
  const negocios = {}
  const ofertas = {}
  for (const fila of filas) {
    const otro = tipo === 'recibidas' ? fila.buyer_id : fila.seller_id
    negocios[otro] = { name: fila.counterpart_name, city: fila.counterpart_city }
    ofertas[fila.offer_id] = { title: fila.offer_title, unit_price: fila.offer_unit_price }
  }
  return { negocios, ofertas }
}

export function disponibilidadParaSolicitar(oferta, usuarioId) {
  if (!oferta) return 'no_disponible'
  if (usuarioId && oferta.seller_id === usuarioId) return 'propia'
  if (oferta.blocked || (oferta.status && oferta.status !== 'activa')) return 'no_disponible'
  if (Number(oferta.qty_available) < Number(oferta.min_purchase)) return 'sin_unidades'
  return 'disponible'
}
