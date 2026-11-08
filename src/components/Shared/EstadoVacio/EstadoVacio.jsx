import styles from './EstadoVacio.module.scss'

const ICONOS = {
  bandeja: (
    <>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </>
  ),
  enviar: (
    <>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7z" />
    </>
  ),
  candado: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  )
}

function EstadoVacio({ icono = 'bandeja', titulo, descripcion, peligro = false, children }) {
  return (
    <div className={styles.vacio}>
      <span className={`${styles.icono} ${peligro ? styles.peligro : ''}`} aria-hidden="true">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {ICONOS[icono]}
        </svg>
      </span>
      <h2>{titulo}</h2>
      {descripcion && <p>{descripcion}</p>}
      {children && <div className={styles.acciones}>{children}</div>}
    </div>
  )
}

export default EstadoVacio
