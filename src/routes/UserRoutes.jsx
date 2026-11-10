
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../hooks/useAuth'

function UserRoutes() {
  const location = useLocation()

  const {
    user,
    profile,
    business,
    profileError,
    loading
  } = useAuth()

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

  if (profile.role !== 'comercio') {
    return <Navigate to="/admin/comercios" replace />
  }

  if (business?.status === 'suspendido') {
    return <Navigate to="/cuenta-suspendida" replace />
  }

  if (!business && location.pathname !== '/configurar-negocio') {
    return <Navigate to="/configurar-negocio" replace />
  }

  if (business && location.pathname === '/configurar-negocio') {
    return <Navigate to="/catalogo" replace />
  }

  return <Outlet />
}

export default UserRoutes
