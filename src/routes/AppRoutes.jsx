import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import UserRoutes from './UserRoutes'
import AdminRoutes from './AdminRoutes'

const Index = lazy(() => import('../pages/Index/Index'))
const Registro = lazy(() => import('../pages/Registro/Registro'))
const Login = lazy(() => import('../pages/Login/Login'))
const ConfirmarCorreo = lazy(() => import('../pages/ConfirmarCorreo/ConfirmarCorreo'))
const ConfigurarNegocio = lazy(() => import('../pages/ConfigurarNegocio/ConfigurarNegocio'))
const MiNegocio = lazy(() => import('../pages/MiNegocio/MiNegocio'))
const PublicarOferta = lazy(() => import('../pages/PublicarOferta/PublicarOferta'))
const MisPublicaciones = lazy(() => import('../pages/MisPublicaciones/MisPublicaciones'))
const EditarOferta = lazy(() => import('../pages/EditarOferta/EditarOferta'))
const Catalogo = lazy(() => import('../pages/Catalogo/Catalogo'))
const DetalleOferta = lazy(() => import('../pages/DetalleOferta/DetalleOferta'))
const Negociacion = lazy(() => import('../pages/Negociacion/Negociacion'))
const SolicitudesRecibidas = lazy(() => import('../pages/SolicitudesRecibidas/SolicitudesRecibidas'))
const SolicitudesEnviadas = lazy(() => import('../pages/SolicitudesEnviadas/SolicitudesEnviadas'))
const RedComercial = lazy(() => import('../pages/RedComercial/RedComercial'))
const AdminComercios = lazy(() => import('../pages/AdminComercios/AdminComercios'))
const CuentaSuspendida = lazy(() => import('../pages/CuentaSuspendida/CuentaSuspendida'))
const AdminPublicaciones = lazy(
  () => import('../pages/AdminPublicaciones/AdminPublicaciones')
)
function AppRoutes() {
  return (
    <Suspense
      fallback={
        <main className="vista-temporal">
          Cargando ReStock Local...
        </main>
      }
    >
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/iniciar-sesion" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/confirmar-correo" element={<ConfirmarCorreo />} />

        {/*Rutas públicas: no requieren iniciar sesión */}
        <Route path="/catalogo" element={<Catalogo />} />
        <Route path="/ofertas/:id" element={<DetalleOferta />} />

        <Route element={<UserRoutes />}>
          <Route path="/configurar-negocio" element={<ConfigurarNegocio />} />
          <Route path="/mi-negocio" element={<MiNegocio />} />
          <Route path="/publicar-oferta" element={<PublicarOferta />} />
          <Route path="/mis-publicaciones" element={<MisPublicaciones />} />
          <Route path="/editar-oferta/:id" element={<EditarOferta />} />
          <Route path="/solicitudes-recibidas" element={<SolicitudesRecibidas />} />
          <Route path="/solicitudes-enviadas" element={<SolicitudesEnviadas />} />
          <Route path="/negociaciones/:id" element={<Negociacion />} />
          <Route path="/red-comercial" element={<RedComercial />} />
        </Route>

        <Route element={<AdminRoutes />}>
          <Route path="/admin/comercios" element={<AdminComercios />} />
          <Route
          path="/admin/publicaciones"
          element={<AdminPublicaciones />}
          />
        </Route>

        <Route
          path="/cuenta-suspendida"
          element={<CuentaSuspendida />}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes