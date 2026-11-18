
import { supabase } from './supabaseClient'

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
