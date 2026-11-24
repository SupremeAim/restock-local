import { createClient } from '@supabase/supabase-js'
import { esEnlaceDeConfirmacion } from '../helpers/confirmacionCorreo'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const preferenceKey = 'restock:remember-session'

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Falta configurar la URL o la clave pública de Supabase')
}

export function setRememberSession(remember) {
  sessionStorage.setItem(preferenceKey, String(remember))
}

const sessionStorageAdapter = {
  getItem(key) {
    return sessionStorage.getItem(key) ?? localStorage.getItem(key)
  },

  setItem(key, value) {
    const preference = sessionStorage.getItem(preferenceKey)
    const remember = preference === 'true' ||
      (preference === null && localStorage.getItem(key) !== null)

    if (remember) {
      localStorage.setItem(key, value)
      sessionStorage.removeItem(key)
    } else {
      sessionStorage.setItem(key, value)
      localStorage.removeItem(key)
    }
  },

  removeItem(key) {
    sessionStorage.removeItem(key)
    localStorage.removeItem(key)
  }
}

if (typeof window !== 'undefined' && esEnlaceDeConfirmacion(window.location)) {
  window.history.replaceState(
    window.history.state,
    '',
    `/confirmar-correo${window.location.search}${window.location.hash}`
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: sessionStorageAdapter,
    persistSession: true,
    autoRefreshToken: true
  }
})