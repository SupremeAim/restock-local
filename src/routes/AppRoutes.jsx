import { Navigate, Route, Routes } from 'react-router'
import UserRoutes from './UserRoutes'
import AdminRoutes from './AdminRoutes'
import VistaTemporal from '../pages/VistaTemporal'
import Registro from '../pages/Registro/Registro'
import Login from '../pages/Login/Login'
import ConfirmarCorreo from '../pages/ConfirmarCorreo/ConfirmarCorreo'
import Index from '../pages/Index/Index'
import SolicitudesRecibidas from '../pages/SolicitudesRecibidas/SolicitudesRecibidas'
import SolicitudesEnviadas from '../pages/SolicitudesEnviadas/SolicitudesEnviadas'
import Negociacion from '../pages/Negociacion/Negociacion'

const comercio = [
  ['/catalogo', 'Catálogo'],
  ['/ofertas/:id', 'Detalle de oferta'],
  ['/configurar-negocio', 'Configurar negocio'],
  ['/mi-negocio', 'Mi negocio'],
  ['/mis-publicaciones', 'Mis publicaciones'],
  ['/publicar-oferta', 'Publicar excedente'],
  ['/editar-oferta/:id', 'Editar oferta'],
  ['/solicitudes-recibidas', 'Solicitudes recibidas'],
  ['/solicitudes-enviadas', 'Solicitudes enviadas'],
  ['/negociaciones/:id', 'Negociación'],
  ['/red-comercial', 'Red comercial']
]

const paginas = {
  '/solicitudes-recibidas': <SolicitudesRecibidas />,
  '/solicitudes-enviadas': <SolicitudesEnviadas />,
  '/negociaciones/:id': <Negociacion />
}

const administracion = [
  ['/admin/comercios', 'Administrar comercios'],
  ['/admin/publicaciones', 'Administrar publicaciones']
]

function AppRoutes() {
  return (
    <Routes>
      <Route path="/iniciar-sesion" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/confirmar-correo" element={<ConfirmarCorreo />} />

      <Route path="/" element={<Index />} />

      <Route element={<UserRoutes />}>
        {comercio.map(([path, titulo]) => (
          <Route
            key={path}
            path={path}
            element={paginas[path] ?? <VistaTemporal titulo={titulo} />}
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
  )
}

export default AppRoutes