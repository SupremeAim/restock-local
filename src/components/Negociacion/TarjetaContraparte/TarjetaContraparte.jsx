import styles from './TarjetaContraparte.module.scss'

function TarjetaContraparte({ rol, negocio = {}, telefono, contacto }) {
  const ubicacion = [negocio.city, negocio.sector].filter(Boolean).join(' · ')

  return (
    <section className={styles.tarjeta} aria-label={rol}>
      <span className={styles.etiqueta}>{rol}</span>
      <div>
        <h2>{negocio.name ?? 'Comercio'}</h2>
        {ubicacion && <p className={styles.ubicacion}>{ubicacion}</p>}
      </div>
      {telefono ? (
        <>
          <div className={styles.contacto}>
            <span>Teléfono</span>
            <strong>{telefono}</strong>
            {contacto && <span className={styles.nombre}>Contacto: {contacto}</span>}
          </div>
          <p className={styles.nota}>
            Visible porque el acuerdo fue aceptado. Úsalo para coordinar el pago y la entrega.
          </p>
        </>
      ) : (
        <p className={styles.nota}>El teléfono de contacto se muestra cuando se acepte el acuerdo.</p>
      )}
    </section>
  )
}

export default TarjetaContraparte
