
import { supabase } from './supabaseClient'

const BUCKET = 'offer-images'

export async function createOffer(values, userId) {
  let imagePath = null

  try {
    if (values.image) {
      const extension = values.image.type === 'image/png' ? 'png' : 'jpg'

      imagePath = `${userId}/${crypto.randomUUID()}.${extension}`

      const { error: uploadError } = await supabase
        .storage
        .from(BUCKET)
        .upload(imagePath, values.image, {
          contentType: values.image.type,
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError
    }

    const { data, error } = await supabase.rpc('create_offer', {
      p_title: values.title.trim(),
      p_description: values.description.trim(),
      p_category: values.category,
      p_quantity: Number(values.quantity),
      p_min_purchase: Number(values.minPurchase),
      p_unit_price: Number(values.unitPrice),
      p_image_path: imagePath
    })

    if (error) throw error

    return data
  } catch (error) {
    if (imagePath) {
      await supabase.storage.from(BUCKET).remove([imagePath])
    }

    throw error
  }
}

export async function getMyOffers(userId) {
  const { data, error } = await supabase
    .from('offers')
    .select(`
      id,
      seller_id,
      title,
      description,
      category,
      unit_price,
      min_purchase,
      qty_available,
      qty_reserved,
      qty_delivered,
      image_path,
      status,
      blocked,
      block_reason,
      created_at,
      updated_at
    `)
    .eq('seller_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return data || []
}

export async function getMyOffer(offerId, userId) {
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('id', offerId)
    .eq('seller_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('No encontramos esta publicación.')

  return data
}

export function getOfferImageUrl(imagePath) {
  if (!imagePath) return null

  const { data } = supabase
    .storage
    .from(BUCKET)
    .getPublicUrl(imagePath)

  return data.publicUrl
}

export async function updateOfferDetails(values, userId) {
  let newImagePath = null

  try {
    if (values.imageFile) {
      const extension = values.imageFile.type === 'image/png' ? 'png' : 'jpg'

      newImagePath = `${userId}/${crypto.randomUUID()}.${extension}`

      const { error: uploadError } = await supabase
        .storage
        .from(BUCKET)
        .upload(newImagePath, values.imageFile, {
          contentType: values.imageFile.type,
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError
    }

    const { data, error } = await supabase.rpc('update_offer_details', {
      p_offer_id: values.offerId,
      p_description: values.description.trim(),
      p_unit_price: Number(values.unitPrice),
      p_image_path: newImagePath,
      p_remove_image: values.removeImage
    })

    if (error) throw error

    if (data.old_image_path) {
      await supabase.storage
        .from(BUCKET)
        .remove([data.old_image_path])
    }

    return data
  } catch (error) {
    if (newImagePath) {
      await supabase.storage.from(BUCKET).remove([newImagePath])
    }

    throw error
  }
}

export async function changeOfferStatus(action, offerId) {
  const functions = {
    pause: 'pause_offer',
    resume: 'resume_offer',
    archive: 'archive_offer'
  }

  const functionName = functions[action]

  if (!functionName) {
    throw new Error('Acción no válida.')
  }

  const { error } = await supabase.rpc(functionName, {
    p_offer_id: offerId
  })

  if (error) throw error
}
