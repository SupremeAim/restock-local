
import { supabase } from './supabaseClient'

export async function obtenerRedComercial() {
  const { data, error } = await supabase.rpc('get_business_network')

  if (error) {
    throw new Error(
      error.message || 'No pudimos cargar la red comercial.'
    )
  }

  if (!data || !Array.isArray(data.businesses) || !Array.isArray(data.connections)) {
    throw new Error('La información recibida de la red comercial no es válida.')
  }

  return {
    negocioActual: data.current_business_id,
    negocios: data.businesses,
    conexiones: data.connections
  }
}
