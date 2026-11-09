import { useState } from 'react'
import { Link, NavLink } from 'react-router'
import { useAuth } from '../../../hooks/useAuth'
import CerrarSesion from '../CerrarSesion/CerrarSesion'
import styles from './MenuComercio.module.scss'

const OPCIONES = [
  ['/catalogo', 'Catálogo'],
  ['/mis-publicaciones', 'Mis publicaciones'],
  ['/solicitudes-recibidas', 'Solicitudes recibidas'],
  ['/solicitudes-enviadas', 'Solicitudes enviadas'],
  ['/red-comercial', 'Red comercial'],
  ['/mi-negocio', 'Mi negocio']
]

function MenuComercio() {
  const { profile } = useAuth()
  const [abierto, setAbierto] = useState(false)

  return (
    <aside className={styles.menu}>
      <div className={styles.barra}>
        <Link to="/catalogo" className={styles.marca}>
          ReStock Local
        </Link>
        <button
          type="button"
          className={styles.alternar}
          aria-expanded={abierto}
          aria-controls="menu-comercio-opciones"
          aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setAbierto(!abierto)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div id="menu-comercio-opciones" className={`${styles.cuerpo} ${abierto ? styles.abierto : ''}`}>
        <nav aria-label="Menú del comercio">
          <ul>
            {OPCIONES.map(([ruta, etiqueta]) => (
              <li key={ruta}>
                <NavLink
                  to={ruta}
                  className={({ isActive }) => `${styles.opcion} ${isActive ? styles.activa : ''}`}
                  onClick={() => setAbierto(false)}
                >
                  {etiqueta}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.pie}>
          {profile?.contact_name && <span className={styles.usuario}>{profile.contact_name}</span>}
          <div className={styles.salir}>
            <CerrarSesion />
          </div>
        </div>
      </div>
    </aside>
  )
}

export default MenuComercio
