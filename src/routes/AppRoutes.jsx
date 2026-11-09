
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import UserRoutes from './UserRoutes'
import AdminRoutes from './AdminRoutes'

const VistaTemporal = lazy(() => import('../pages/VistaTemporal'))
const Registro = lazy(() => import('../pages/Registro/Registro'))
const Login = lazy(() => import('../pages/Login/Login'))
const ConfirmarCorreo = lazy(() => import('../pages/ConfirmarCorreo/ConfirmarCorreo'))
const ConfigurarNegocio = lazy(() => import('../pages/ConfigurarNegocio/ConfigurarNegocio'))
const MiNegocio = lazy(() => import('../pages/MiNegocio/MiNegocio'))
const PublicarOferta = lazy(() => import('../pages/PublicarOferta/PublicarOferta'))
const MisPublicaciones = lazy(() => import('../pages/MisPublicaciones/MisPublicaciones'))
const EditarOferta = lazy(() => import('../pages/EditarOferta/EditarOferta'))
const Catalogo = lazy(() => import('../pages/Catalogo/Catalogo'))

const publicas = [
  ['/', 'Inicio'],
  ['/ofertas/:id', 'Detalle de oferta']
]

const comercio = [
  ['/solicitudes-recibidas', 'Solicitudes recibidas'],
  ['/solicitudes-enviadas', 'Solicitudes enviadas'],
  ['/negociaciones/:id', 'Negociación'],
  ['/red-comercial', 'Red comercial']
]

const administracion = [
  ['/admin/comercios', 'Administrar comercios'],
  ['/admin/publicaciones', 'Administrar publicaciones']
]

function AppRoutes() {
  return (
    <Suspense fallback={<main className="vista-temporal">Cargando ReStock Local...</main>}>
      <Routes>
        <Route path="/iniciar-sesion" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/confirmar-correo" element={<ConfirmarCorreo />} />

        <Route path="/catalogo" element={<Catalogo />} />

        {publicas.map(([path, titulo]) => (
          <Route
            key={path}
            path={path}
            element={<VistaTemporal titulo={titulo} />}
          />
        ))}

        <Route element={<UserRoutes />}>
          <Route
            path="/configurar-negocio"
            element={<ConfigurarNegocio />}
          />

          <Route
            path="/mi-negocio"
            element={<MiNegocio />}
          />

          <Route
            path="/publicar-oferta"
            element={<PublicarOferta />}
          />

          <Route
            path="/mis-publicaciones"
            element={<MisPublicaciones />}
          />

          <Route
            path="/editar-oferta/:id"
            element={<EditarOferta />}
          />

          {comercio.map(([path, titulo]) => (
            <Route
              key={path}
              path={path}
              element={<VistaTemporal titulo={titulo} />}
            />
          ))}
        </Route>

        <Route element={<AdminRoutes />}>
          {administracion.map(([path, titulo]) => (
            <Route
              key={path}
              path={path}
              element={<VistaTemporal titulo={titulo} />}
            />
          ))}
        </Route>

        <Route
          path="/cuenta-suspendida"
          element={<VistaTemporal titulo="Cuenta suspendida" />}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes
