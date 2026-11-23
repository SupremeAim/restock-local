
import { useEffect, useState } from 'react'
import { AuthContext } from './AuthContext'
import { supabase } from '../services/supabaseClient'
import { getMyBusiness } from '../services/businessService'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [profileState, setProfileState] = useState(null)
  const [refreshVersion, setRefreshVersion] = useState(0)

  const userId = session?.user?.id ?? null

  // Escuchar los cambios de autenticación.
  useEffect(() => {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession)
        setSessionLoading(false)

        // Limpiar el perfil cuando se cierra sesión.
        // No hacerlo al renovar el token.
        if (event === 'SIGNED_OUT') {
          setProfileState(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Cargar el perfil al iniciar sesión, cambiar de
  // usuario o solicitar una actualización explícita.
  useEffect(() => {
    if (!userId) return

    let active = true

    async function loadProfile() {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, role, contact_name, created_at')
          .eq('id', userId)
          .single()

        if (error) throw error

        if (!['comercio', 'admin'].includes(profile.role)) {
          throw new Error('Rol no válido')
        }

        const business = profile.role === 'comercio'
          ? await getMyBusiness(userId)
          : null

        if (active) {
          setProfileState({
            userId,
            profile,
            business,
            error: null
          })
        }
      } catch {
        if (active) {
          setProfileState({
            userId,
            profile: null,
            business: null,
            error: 'No pudimos cargar tu cuenta. Inténtalo de nuevo.'
          })
        }
      }
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [userId, refreshVersion])

  // Evitar mostrar datos de una cuenta diferente.
  const currentProfile =
    userId && profileState?.userId === userId
      ? profileState
      : null

  const loading =
    sessionLoading ||
    Boolean(userId && !currentProfile)

  function refreshAccount() {
    setProfileState(null)
    setRefreshVersion(current => current + 1)
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile: currentProfile?.profile ?? null,
        business: currentProfile?.business ?? null,
        profileError: currentProfile?.error ?? null,
        refreshAccount,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}