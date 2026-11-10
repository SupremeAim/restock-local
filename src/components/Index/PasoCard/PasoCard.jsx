import styles from './PasoCard.module.scss'

function PasoCard({ numero, titulo, descripcion }) {
  return (
    <li className={styles.paso}>
      <span className={styles.numero} aria-hidden="true">
        {numero}
      </span>
      <h3>{titulo}</h3>
      <p>{descripcion}</p>
    </li>
  )
}

export default PasoCard
