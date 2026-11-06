import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '../../../services/supabaseClient'

function CerrarSesion() {
  const navigate = useNavigate()
  const sending = useRef(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogout() {
    if (sending.current) return

    sending.current = true
    setLoading(true)
    setError('')

    try {
      const { error: logoutError } = await supabase.auth.signOut({
        scope: 'local'
      })

      if (logoutError) throw logoutError

      navigate('/iniciar-sesion', { replace: true })
    } catch {
      setError('No pudimos cerrar la sesión. Inténtalo de nuevo.')
    } finally {
      sending.current = false
      setLoading(false)
    }
  }

  return (
    <div>
      <button type="button" onClick={handleLogout} disabled={loading}>
        {loading ? 'Cerrando sesión...' : 'Cerrar sesión'}
      </button>

      {error && <p role="alert">{error}</p>}
    </div>
  )
}

export default CerrarSesion