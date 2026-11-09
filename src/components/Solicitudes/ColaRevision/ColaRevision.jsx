import { useMemo } from 'react'
import Boton from '../../Shared/Boton/Boton'
import Insignia from '../../Shared/Insignia/Insignia'
import {
  calcularTotal,
  construirColaRevision,
  formatearCOP,
  formatearFecha
} from '../../../helpers/solicitudes'
import styles from './ColaRevision.module.scss'

function ColaRevision({
  solicitudes,
  negocios = {},
  ofertas = {},
  onIniciarRevision,
  onRechazar,
  deshabilitado = false
}) {
  const cola = useMemo(() => construirColaRevision(solicitudes), [solicitudes])
  const primera = cola.verFrente()
  const enEspera = cola.aLista().slice(1)

  if (cola.estaVacia()) {
    return (
      <section className={styles.vacia} aria-labelledby="cola-titulo">
        <div>
          <h2 id="cola-titulo">Cola de revisión</h2>
          <p>No hay solicitudes pendientes por revisar.</p>
        </div>
        <Insignia tipo="Inactivo">0 pendientes</Insignia>
      </section>
    )
  }

  const comprador = negocios[primera.buyer_id] ?? {}
  const oferta = ofertas[primera.offer_id] ?? {}
  const terminos = [
    ['Cantidad propuesta', `${primera.current_qty} unidades`],
    ['Precio unitario propuesto', formatearCOP(primera.current_price)],
    ['Total', formatearCOP(calcularTotal(primera.current_qty, primera.current_price))]
  ]
  if (oferta.unit_price !== undefined) {
    terminos.push(['Precio publicado', formatearCOP(oferta.unit_price)])
  }

  return (
    <section className={styles.cola} aria-labelledby="cola-titulo">
      <article className={styles.primera}>
        <header className={styles.encabezado}>
          <div>
            <h2 id="cola-titulo">Cola de revisión</h2>
            <p>
              {cola.tamano()} {cola.tamano() === 1 ? 'pendiente' : 'pendientes'} · se atienden en
              orden de llegada
            </p>
          </div>
          <Insignia tipo="Informativo">Primera en la cola</Insignia>
        </header>

        <hr />

        <div className={styles.comprador}>
          <h3>{comprador.name ?? 'Comercio comprador'}</h3>
          <Insignia tipo="Pendiente">Pendiente</Insignia>
        </div>
        <p className={styles.detalle}>
          {comprador.city ? `${comprador.city} · ` : ''}recibida el {formatearFecha(primera.created_at)}
        </p>
        {oferta.title && <p className={styles.oferta}>Oferta: {oferta.title}</p>}

        <dl className={styles.terminos}>
          {terminos.map(([etiqueta, valor]) => (
            <div key={etiqueta}>
              <dt>{etiqueta}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>

        {primera.comentario && (
          <div className={styles.comentario}>
            <span>Comentario del comprador</span>
            <p>{primera.comentario}</p>
          </div>
        )}

        <div className={styles.acciones}>
          <Boton onClick={() => onIniciarRevision(primera)} disabled={deshabilitado}>
            Iniciar revisión
          </Boton>
          <Boton variante="peligro" onClick={() => onRechazar(primera)} disabled={deshabilitado}>
            Rechazar
          </Boton>
        </div>
        <p className={styles.nota}>Iniciar la revisión no acepta la solicitud ni reserva unidades.</p>
      </article>

      <aside className={styles.espera} aria-label="Solicitudes en espera">
        <h3>En espera</h3>
        {enEspera.length === 0 ? (
          <p className={styles.nota}>No hay más solicitudes en espera.</p>
        ) : (
          <ol>
            {enEspera.map((solicitud, indice) => {
              const negocio = negocios[solicitud.buyer_id] ?? {}
              const titulo = ofertas[solicitud.offer_id]?.title
              return (
                <li key={solicitud.id}>
                  <span className={styles.posicion}>{indice + 2}</span>
                  <div>
                    <strong>
                      {negocio.name ?? 'Comercio comprador'}
                      {negocio.city ? ` · ${negocio.city}` : ''}
                    </strong>
                    <span>
                      {titulo ? `${titulo} · ` : ''}
                      {solicitud.current_qty} unidades
                    </span>
                    <span>{formatearFecha(solicitud.created_at)}</span>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
        <p className={styles.nota}>Las contrapropuestas no vuelven a la cola.</p>
      </aside>
    </section>
  )
}

export default ColaRevision
