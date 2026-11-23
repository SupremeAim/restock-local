
import { supabase } from './supabaseClient'

export async function getMyBusiness(userId) {
  const { data: business, error } = await supabase
    .from('businesses')
    .select(`
      id,
      owner_id,
      name,
      city,
      sector,
      description,
      status,
      created_at,
      updated_at
    `)
    .eq('owner_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!business) return null

  const [
    { data: contact, error: contactError },
    { data: address, error: addressError }
  ] = await Promise.all([
    supabase
      .from('business_contacts')
      .select('business_id, phone')
      .eq('business_id', business.id)
      .maybeSingle(),

    supabase.rpc('mi_direccion_negocio')
  ])

  if (contactError) throw contactError
  if (addressError) throw addressError

  return {
    ...business,
    phone: contact?.phone ?? '',
    address: address ?? ''
  }
}

export async function saveBusinessProfile(values) {
  const { data, error } = await supabase.rpc('save_business_profile', {
    p_contact_name: values.contactName,
    p_name: values.name,
    p_city: values.city,
    p_sector: values.sector,
    p_phone: values.phone,
    p_address: values.address,
    p_description: values.description || ''
  })

  if (error) throw error

  return data
}