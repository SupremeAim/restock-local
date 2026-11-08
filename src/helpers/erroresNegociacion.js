const MENSAJES = {
  sin_sesion: 'Tu sesión terminó. Vuelve a iniciar sesión.',
  negocio_no_configurado: 'Primero configura la información de tu negocio.',
  cuenta_suspendida: 'Tu cuenta está suspendida y no puede realizar esta acción.',
  solicitud_no_encontrada: 'No encontramos esta solicitud o no tienes acceso a ella.',
  version_desactualizada:
    'La solicitud cambió mientras la veías. Actualizamos la información; revísala e inténtalo de nuevo.',
  sin_permiso: 'No tienes permiso para realizar esta acción.',
  estado_invalido: 'Esta acción ya no está disponible en el estado actual de la solicitud.',
  no_es_tu_turno: 'Ahora es el turno de la otra parte.',
  oferta_no_disponible: 'La oferta ya no está disponible.',
  oferta_propia: 'No puedes enviar una solicitud a tu propia oferta.',
  cantidad_fuera_de_rango: 'La cantidad debe estar entre la compra mínima y las unidades disponibles.',
  cantidad_invalida: 'Ingresa una cantidad entera mayor que 0.',
  precio_invalido: 'Ingresa un precio mayor que 0, con máximo 2 decimales.',
  nota_muy_larga: 'El comentario puede tener máximo 500 caracteres.',
  motivo_invalido: 'Escribe un motivo de entre 5 y 500 caracteres.',
  disponibilidad_insuficiente:
    'No se pudo aceptar: ya no hay unidades suficientes. No se aplicó ningún cambio.',
  solicitud_abierta_existente: 'Ya tienes una negociación abierta sobre esta oferta.'
}

const RECARGAR = ['version_desactualizada', 'estado_invalido', 'disponibilidad_insuficiente']

export function codigoDeError(error) {
  const texto = String(error?.message ?? error ?? '')
  return Object.keys(MENSAJES).find((codigo) => texto.includes(codigo)) ?? null
}

export function mensajeDeError(error) {
  const codigo = codigoDeError(error)
  if (codigo) return MENSAJES[codigo]
  return 'No se pudo completar la acción. Revisa tu conexión e inténtalo de nuevo.'
}

export function debeRecargar(error) {
  return RECARGAR.includes(codigoDeError(error))
}
