import MenuComercio from '../MenuComercio/MenuComercio'
import styles from './LayoutComercio.module.scss'

function LayoutComercio({ children }) {
  return (
    <div className={styles.layout}>
      <MenuComercio />
      <main className={styles.contenido}>{children}</main>
    </div>
  )
}

export default LayoutComercio
