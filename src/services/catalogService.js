
import { supabase } from './supabaseClient'

export async function getCatalogOffers() {
  const { data, error } = await supabase
    .from('catalog_offers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  return data || []
}

export async function getCatalogOffer(offerId) {
  const { data, error } = await supabase
    .from('catalog_offers')
    .select('*')
    .eq('id', offerId)
    .maybeSingle()

  if (error) throw error

  return data
}

export function subscribeToCatalogChanges(onChange, onStatus) {
  const channel = supabase
    .channel('catalog:offers')
    .on(
      'broadcast',
      { event: 'catalog_changed' },
      payload => onChange(payload)
    )
    .subscribe(status => {
      onStatus?.(status)
    })

  return () => {
    supabase.removeChannel(channel)
  }
}
