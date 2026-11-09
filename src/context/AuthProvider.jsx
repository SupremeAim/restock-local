
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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setProfileState(null)
        setSession(currentSession)
        setSessionLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return

    let active = true
    const id = session.user.id

    async function loadProfile() {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, role, contact_name, created_at')
          .eq('id', id)
          .single()

        if (error) throw error

        if (!['comercio', 'admin'].includes(profile.role)) {
          throw new Error('Rol no válido')
        }

        const business = profile.role === 'comercio'
          ? await getMyBusiness(id)
          : null

        if (active) {
          setProfileState({
            userId: id,
            profile,
            business,
            error: null
          })
        }
      } catch {
        if (active) {
          setProfileState({
            userId: id,
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
  }, [session, refreshVersion])

  const currentProfile = userId && profileState?.userId === userId
    ? profileState
    : null

  const loading = sessionLoading || Boolean(userId && !currentProfile)

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
