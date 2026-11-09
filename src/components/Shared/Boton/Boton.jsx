import { Link } from 'react-router'
import styles from './Boton.module.scss'

function Boton({
  children,
  variante = 'principal',
  ancho = false,
  to,
  type = 'button',
  className = '',
  ...props
}) {
  const clases = [styles.boton, styles[variante], ancho ? styles.ancho : '', className]
    .filter(Boolean)
    .join(' ')

  if (to) {
    return (
      <Link to={to} className={clases} {...props}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type} className={clases} {...props}>
      {children}
    </button>
  )
}

export default Boton
