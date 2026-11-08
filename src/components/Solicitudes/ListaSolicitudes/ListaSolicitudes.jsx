import { Link } from 'react-router'
import { InsigniaEstado } from '../../Shared/Insignia/Insignia'
import {
  calcularTotal,
  esMiTurno,
  formatearCOP,
  siguientePaso
} from '../../../helpers/solicitudes'
import styles from './ListaSolicitudes.module.scss'

const fechaCorta = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  timeZone: 'America/Bogota'
})

function ListaSolicitudes({ solicitudes, miId, tipo = 'recibidas', negocios = {}, ofertas = {} }) {
  const columnaComercio = tipo === 'recibidas' ? 'Comercio comprador' : 'Comercio vendedor'

  const filas = solicitudes.map((solicitud) => {
    const idOtro = tipo === 'recibidas' ? solicitud.buyer_id : solicitud.seller_id
    const negocio = negocios[idOtro] ?? {}
    return {
      solicitud,
      nombre: negocio.name ?? 'Comercio',
      lugar: [negocio.city, fechaCorta.format(new Date(solicitud.created_at))]
        .filter(Boolean)
        .join(' · '),
      oferta: ofertas[solicitud.offer_id]?.title ?? 'Oferta',
      total: formatearCOP(calcularTotal(solicitud.current_qty, solicitud.current_price), false),
      precio: formatearCOP(solicitud.current_price, false),
      paso: siguientePaso(solicitud, miId),
      turno: esMiTurno(solicitud, miId),
      enlace: `/negociaciones/${solicitud.id}`
    }
  })

  return (
    <div className={styles.contenedor}>
      <table className={styles.tabla}>
        <thead>
          <tr>
            <th scope="col">{columnaComercio}</th>
            <th scope="col">Oferta</th>
            <th scope="col">Cantidad</th>
            <th scope="col">Precio unitario</th>
            <th scope="col">Total</th>
            <th scope="col">Estado</th>
            <th scope="col">Siguiente paso</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.solicitud.id}>
              <td>
                <Link to={fila.enlace} className={styles.nombre}>
                  {fila.nombre}
                </Link>
                <span className={styles.secundario}>{fila.lugar}</span>
              </td>
              <td>{fila.oferta}</td>
              <td>{fila.solicitud.current_qty}</td>
              <td>{fila.precio}</td>
              <td className={styles.total}>{fila.total}</td>
              <td>
                <InsigniaEstado estado={fila.solicitud.status} />
              </td>
              <td className={fila.turno ? styles.turno : styles.espera}>{fila.paso}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className={styles.tarjetas}>
        {filas.map((fila) => (
          <li key={fila.solicitud.id}>
            <Link to={fila.enlace} className={styles.tarjeta}>
              <div className={styles.cabecera}>
                <div>
                  <strong>{fila.nombre}</strong>
                  <span className={styles.secundario}>{fila.lugar}</span>
                </div>
                <InsigniaEstado estado={fila.solicitud.status} />
              </div>
              <span>{fila.oferta}</span>
              <span className={styles.total}>
                {fila.solicitud.current_qty} u. · {fila.precio} c/u · {fila.total}
              </span>
              <span className={fila.turno ? styles.turno : styles.espera}>{fila.paso}</span>
            </Link>
          </li>
        ))}
      </ul>

      <p className={styles.nota}>Precios en COP por unidad.</p>
    </div>
  )
}

export default ListaSolicitudes
