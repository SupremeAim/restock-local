
import { Link } from 'react-router'

const enlaces = [
  { ruta: '/', nombre: 'Inicio' },
  { ruta: '/catalogo', nombre: 'Catálogo' },
  { ruta: '/registro', nombre: 'Registro' },
  { ruta: '/iniciar-sesion', nombre: 'Iniciar sesión' },
  { ruta: '/mi-negocio', nombre: 'Mi negocio' },
  { ruta: '/mis-publicaciones', nombre: 'Mis publicaciones' },
  { ruta: '/solicitudes-recibidas', nombre: 'Solicitudes' },
  { ruta: '/red-comercial', nombre: 'Red comercial' },
  { ruta: '/admin/comercios', nombre: 'Administración' }
]

function VistaTemporal({ titulo }) {
  return (
    <main className="vista-temporal">
      <p className="marca">ReStock Local</p>

      <h1>{titulo}</h1>

      <p>
        Esta ruta ya está creada. Su pantalla se construirá
        siguiendo la propuesta de Figma.
      </p>

      <h2>Probar navegación</h2>

      <nav className="enlaces-prueba">
        {enlaces.map(enlace => (
          <Link key={enlace.ruta} to={enlace.ruta}>
            {enlace.nombre}
          </Link>
        ))}
      </nav>
    </main>
  )
}

export default VistaTemporal
