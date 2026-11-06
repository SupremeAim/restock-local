import { useEffect, useState } from 'react'
import { AuthContext } from './AuthContext'
import { supabase } from '../services/supabaseClient'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [profileState, setProfileState] = useState(null)

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
        const { data, error } = await supabase
          .from('profiles')
          .select('id, role, contact_name')
          .eq('id', id)
          .single()

        if (error) throw error

        if (!['comercio', 'admin'].includes(data.role)) {
          throw new Error('Rol no válido')
        }

        if (active) {
          setProfileState({
            userId: id,
            profile: data,
            error: null
          })
        }
      } catch {
        if (active) {
          setProfileState({
            userId: id,
            profile: null,
            error: 'No pudimos cargar tu perfil. Inténtalo de nuevo.'
          })
        }
      }
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [session])

  const currentProfile = userId && profileState?.userId === userId
    ? profileState
    : null

  const loading = sessionLoading || Boolean(userId && !currentProfile)

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile: currentProfile?.profile ?? null,
        profileError: currentProfile?.error ?? null,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}