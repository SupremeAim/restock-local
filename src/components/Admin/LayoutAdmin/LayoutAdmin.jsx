
import MenuAdmin from '../MenuAdmin/MenuAdmin'
import styles from './LayoutAdmin.module.scss'

function LayoutAdmin({ children }) {
  return (
    <div className={styles.layout}>
      <MenuAdmin />

      <main className={styles.contenido}>
        {children}
      </main>
    </div>
  )
}

export default LayoutAdmin
