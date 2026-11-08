import Insignia from '../../Shared/Insignia/Insignia'
import { formatearCOP } from '../../../helpers/solicitudes'
import styles from './ResumenOferta.module.scss'

const ESTADOS_OFERTA = {
  activa: ['Correcto', 'Activa'],
  pausada: ['Pendiente', 'Pausada'],
  agotada: ['Informativo', 'Agotada'],
  archivada: ['Inactivo', 'Archivada']
}

function ResumenOferta({ oferta, imagenUrl, esVendedor = false }) {
  const [tipo, etiqueta] = ESTADOS_OFERTA[oferta.status] ?? ['Inactivo', oferta.status]

  const datos = [
    ['Precio publicado', formatearCOP(oferta.unit_price)],
    ['Compra mínima', `${oferta.min_purchase} unidades`],
    ['Disponibles', oferta.qty_available]
  ]
  if (esVendedor) {
    datos.push(['Reservadas', oferta.qty_reserved], ['Entregadas', oferta.qty_delivered])
  }

  return (
    <section className={styles.tarjeta} aria-labelledby="oferta-titulo">
      <span className={styles.etiqueta}>Oferta</span>
      {imagenUrl ? (
        <img src={imagenUrl} alt={oferta.title} className={styles.imagen} />
      ) : (
        <div className={styles.imagen} aria-hidden="true">
          Imagen del producto
        </div>
      )}
      <div className={styles.titulo}>
        <h2 id="oferta-titulo">{oferta.title}</h2>
        <div className={styles.insignias}>
          <Insignia tipo={tipo}>{etiqueta}</Insignia>
          {oferta.blocked && <Insignia tipo="Error">Bloqueada</Insignia>}
        </div>
      </div>
      <dl className={styles.datos}>
        {datos.map(([nombre, valor]) => (
          <div key={nombre}>
            <dt>{nombre}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>
      {esVendedor && (
        <p className={styles.nota}>Aceptar resta de disponibles y suma a reservadas.</p>
      )}
    </section>
  )
}

export default ResumenOferta
