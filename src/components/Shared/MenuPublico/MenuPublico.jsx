import { useState } from 'react'
import { Link } from 'react-router'
import styles from './MenuPublico.module.scss'

function MenuPublico() {
  const [abierto, setAbierto] = useState(false)

  return (
    <header className={styles.menu}>
      <div className={styles.barra}>
        <Link to="/" className={styles.marca}>
          ReStock Local
        </Link>

        <button
          type="button"
          className={styles.alternar}
          aria-expanded={abierto}
          aria-controls="menu-publico-opciones"
          aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setAbierto(!abierto)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav
          id="menu-publico-opciones"
          className={`${styles.opciones} ${abierto ? styles.abierto : ''}`}
          aria-label="Menú principal"
        >
          <a href="#como-funciona" className={styles.enlace} onClick={() => setAbierto(false)}>
            Cómo funciona
          </a>
          <Link to="/iniciar-sesion" className={styles.secundario}>
            Iniciar sesión
          </Link>
          <Link to="/registro" className={styles.principal}>
            Registrarse
          </Link>
        </nav>
      </div>
    </header>
  )
}

export default MenuPublico
