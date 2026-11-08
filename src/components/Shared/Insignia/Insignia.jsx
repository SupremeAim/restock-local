import { datosEstado } from '../../../helpers/solicitudes'
import styles from './Insignia.module.scss'

function Insignia({ tipo = 'Informativo', children }) {
  return <span className={`${styles.insignia} ${styles[tipo] ?? ''}`}>{children}</span>
}

export function InsigniaEstado({ estado }) {
  const { etiqueta, insignia } = datosEstado(estado)
  return <Insignia tipo={insignia}>{etiqueta}</Insignia>
}

export default Insignia
