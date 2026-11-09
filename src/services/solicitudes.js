import { supabase } from './supabaseClient'

const FUNCIONES = {
  iniciar_revision: 'iniciar_revision',
  aceptar: 'aceptar_propuesta',
  contraproponer: 'contraproponer',
  rechazar: 'rechazar_solicitud',
  cancelar: 'cancelar_solicitud',
  cancelar_acuerdo: 'cancelar_acuerdo',
  despachar: 'despachar_acuerdo',
  confirmar_recepcion: 'confirmar_recepcion'
}

async function llamar(funcion, parametros) {
  const { data, error } = await supabase.rpc(funcion, parametros)
  if (error) throw error
  return data
}

export function listarSolicitudes(tipo) {
  return llamar('listar_solicitudes', { p_tipo: tipo })
}

export async function obtenerDetalle(solicitudId) {
  const filas = await llamar('detalle_solicitud', { p_request_id: solicitudId })
  return filas?.[0] ?? null
}

export async function listarEventos(solicitudId) {
  const { data, error } = await supabase
    .from('request_events')
    .select('id, seq, actor_id, type, qty, price, note, created_at')
    .eq('request_id', solicitudId)
    .order('seq')

  if (error) throw error
  return data
}

export function obtenerTelefono(solicitudId) {
  return llamar('telefono_contraparte', { p_request_id: solicitudId })
}

export function crearSolicitud(ofertaId, { cantidad, precio, comentario }) {
  return llamar('crear_solicitud', {
    p_offer_id: ofertaId,
    p_qty: cantidad,
    p_price: precio,
    p_note: comentario || null
  })
}

export function ejecutarAccion(accion, solicitud, datos = {}) {
  const base = { p_request_id: solicitud.id, p_version: solicitud.version }

  switch (accion) {
    case 'iniciar_revision':
    case 'aceptar':
      return llamar(FUNCIONES[accion], base)
    case 'contraproponer':
      return llamar(FUNCIONES.contraproponer, {
        ...base,
        p_qty: datos.cantidad,
        p_price: datos.precio,
        p_note: datos.comentario || null
      })
    case 'cancelar_acuerdo':
      return llamar(FUNCIONES.cancelar_acuerdo, { ...base, p_reason: datos.motivo })
    default:
      if (!FUNCIONES[accion]) throw new Error('Acción desconocida')
      return llamar(FUNCIONES[accion], { ...base, p_note: datos.nota || null })
  }
}

export function suscribirCambios({ filtros, alCambiarSolicitud, alNuevoEvento, alCambiarConexion }) {
  const canal = supabase.channel(`restock-${crypto.randomUUID()}`)

  for (const filtro of filtros.solicitudes ?? []) {
    canal.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'requests', filter: filtro },
      (cambio) => cambio.new?.id && alCambiarSolicitud?.(cambio.new)
    )
  }

  if (filtros.eventos) {
    canal.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'request_events', filter: filtros.eventos },
      (cambio) => alNuevoEvento?.(cambio.new)
    )
  }

  canal.subscribe((estado) => alCambiarConexion?.(estado === 'SUBSCRIBED'))

  return () => {
    supabase.removeChannel(canal)
  }
}
