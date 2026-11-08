import Boton from '../Boton/Boton'
import styles from './AvisoDesconexion.module.scss'

function AvisoDesconexion({ onReintentar, reintentando = false }) {
  return (
    <div className={styles.aviso} role="status">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m2 2 20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5.17-2.8M19 13a10 10 0 0 0-2.17-1.5M2 8.82a15 15 0 0 1 4.17-2.65M22 8.82A15 15 0 0 0 11.39 5.02"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="20" r="1" fill="currentColor" />
      </svg>
      <div className={styles.texto}>
        <strong>Se perdió la conexión</strong>
        <p>
          Los cambios de la otra parte no se están mostrando. Al reconectar, la información se vuelve
          a consultar. Mientras tanto, las acciones están desactivadas.
        </p>
      </div>
      {onReintentar && (
        <Boton variante="secundario" onClick={onReintentar} disabled={reintentando}>
          {reintentando ? 'Reintentando...' : 'Reintentar ahora'}
        </Boton>
      )}
    </div>
  )
}

export default AvisoDesconexion
