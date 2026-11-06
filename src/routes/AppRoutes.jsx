
import { Navigate, Route, Routes } from 'react-router'
import UserRoutes from './UserRoutes'
import AdminRoutes from './AdminRoutes'
import VistaTemporal from '../pages/VistaTemporal'
import Registro from '../pages/Registro/Registro'

const publicas = [
  ['/', 'Inicio'],
  ['/iniciar-sesion', 'Iniciar sesión'],
  ['/registro', 'Crear cuenta']
]

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

const administracion = [
  ['/admin/comercios', 'Administrar comercios'],
  ['/admin/publicaciones', 'Administrar publicaciones']
]

function AppRoutes() {
  return (
    <Routes>
      <Route path="/registro" element={<Registro />} />
      {publicas.map(([path, titulo]) => (
        <Route
          key={path}
          path={path}
          element={<VistaTemporal titulo={titulo} />}
        />
      ))}

      <Route element={<UserRoutes />}>
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
  )
}

export default AppRoutes
