
import { supabase } from './supabaseClient'

// ==========================================
// ADMINISTRACIÓN DE COMERCIOS
// ==========================================

export async function listarComercios({
  busqueda = '',
  estado = 'todos'
} = {}) {
  const { data, error } = await supabase.rpc('admin_list_businesses', {
    p_search: busqueda.trim() || null,
    p_status: estado
  })

  if (error) throw error

  return data ?? []
}

export async function suspenderComercio(businessId, motivo) {
  const { data, error } = await supabase.rpc('admin_suspend_business', {
    p_business_id: businessId,
    p_reason: motivo
  })

  if (error) throw error

  return data
}

export async function rehabilitarComercio(businessId, motivo) {
  const { data, error } = await supabase.rpc('admin_reactivate_business', {
    p_business_id: businessId,
    p_reason: motivo
  })

  if (error) throw error

  return data
}

// ==========================================
// ADMINISTRACIÓN DE PUBLICACIONES
// ==========================================

export async function listarPublicaciones({
  busqueda = '',
  estado = 'todos',
  bloqueado = null
} = {}) {
  const { data, error } = await supabase.rpc('admin_list_offers', {
    p_search: busqueda.trim() || null,
    p_status: estado,
    p_blocked: bloqueado
  })

  if (error) throw error

  return data ?? []
}

export async function bloquearPublicacion(offerId, motivo) {
  const { data, error } = await supabase.rpc('admin_block_offer', {
    p_offer_id: offerId,
    p_reason: motivo
  })

  if (error) throw error

  return data
}

export async function desbloquearPublicacion(offerId, motivo) {
  const { data, error } = await supabase.rpc('admin_unblock_offer', {
    p_offer_id: offerId,
    p_reason: motivo
  })

  if (error) throw error

  return data
}
