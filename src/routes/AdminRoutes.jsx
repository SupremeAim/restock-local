import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../hooks/useAuth'

function AdminRoutes() {
  const { user, profile, profileError, loading } = useAuth()

  if (loading) {
    return <main className="vista-temporal">Cargando tu cuenta...</main>
  }

  if (!user) {
    return <Navigate to="/iniciar-sesion" replace />
  }

  if (profileError || !profile) {
    return (
      <main className="vista-temporal">
        <p role="alert">
          {profileError || 'No pudimos cargar tu perfil.'}
        </p>
        <button onClick={() => window.location.reload()}>
          Reintentar
        </button>
      </main>
    )
  }

  if (profile.role !== 'admin') {
    return <Navigate to="/catalogo" replace />
  }

  return <Outlet />
}

export default AdminRoutes