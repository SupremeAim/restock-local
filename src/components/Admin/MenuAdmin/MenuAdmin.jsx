
import { useState } from 'react'
import { Link, NavLink } from 'react-router'
import { useAuth } from '../../../hooks/useAuth'
import CerrarSesion from '../../Shared/CerrarSesion/CerrarSesion'
import styles from './MenuAdmin.module.scss'

const OPCIONES = [
  ['/admin/comercios', 'Administrar comercios'],
  ['/admin/publicaciones', 'Administrar publicaciones']
]

function MenuAdmin() {
  const { profile } = useAuth()
  const [abierto, setAbierto] = useState(false)

  return (
    <aside className={styles.menu}>
      <div className={styles.barra}>
        <Link to="/admin/comercios" className={styles.marca}>
          ReStock Local
        </Link>

        <button
          type="button"
          className={styles.alternar}
          aria-expanded={abierto}
          aria-controls="menu-admin-opciones"
          aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setAbierto(!abierto)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div
        id="menu-admin-opciones"
        className={`${styles.cuerpo} ${abierto ? styles.abierto : ''}`}
      >
        <nav aria-label="Menú de administración">
          <p className={styles.etiqueta}>ADMINISTRACIÓN</p>

          <ul>
            {OPCIONES.map(([ruta, nombre]) => (
              <li key={ruta}>
                <NavLink
                  to={ruta}
                  className={({ isActive }) =>
                    `${styles.opcion} ${isActive ? styles.activa : ''}`
                  }
                  onClick={() => setAbierto(false)}
                >
                  {nombre}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.pie}>
          <span className={styles.usuario}>
            {profile?.contact_name || 'Administrador'}
          </span>

          <span className={styles.rol}>Administrador</span>

          <div className={styles.salir}>
            <CerrarSesion />
          </div>
        </div>
      </div>
    </aside>
  )
}

export default MenuAdmin
