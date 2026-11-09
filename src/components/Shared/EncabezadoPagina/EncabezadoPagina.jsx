import Insignia from '../Insignia/Insignia'
import styles from './EncabezadoPagina.module.scss'

function EncabezadoPagina({ titulo, subtitulo, conectado, insignia }) {
  return (
    <header className={styles.encabezado}>
      <div className={styles.titulos}>
        <div className={styles.linea}>
          <h1>{titulo}</h1>
          {insignia}
        </div>
        {subtitulo && <p>{subtitulo}</p>}
      </div>
      {conectado !== undefined && (
        <div className={styles.vivo} aria-live="polite">
          <span>{conectado ? 'Actualización automática' : 'Sin actualización automática'}</span>
          {conectado ? (
            <Insignia tipo="Correcto">En vivo</Insignia>
          ) : (
            <Insignia tipo="Pendiente">Reconectando...</Insignia>
          )}
        </div>
      )}
    </header>
  )
}

export default EncabezadoPagina
