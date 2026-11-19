
import styles from './TarjetaContraparte.module.scss'

function TarjetaContraparte({
  rol,
  negocio = {},
  telefono,
  direccion,
  contacto
}) {
  const ubicacion = [negocio.city, negocio.sector]
    .filter(Boolean)
    .join(' · ')

  const tieneDatosPrivados = Boolean(telefono || direccion)

  return (
    <section className={styles.tarjeta} aria-label={rol}>
      <span className={styles.etiqueta}>{rol}</span>

      <div>
        <h2>{negocio.name ?? 'Comercio'}</h2>

        {ubicacion && (
          <p className={styles.ubicacion}>{ubicacion}</p>
        )}
      </div>

      {tieneDatosPrivados ? (
        <>
          <div className={styles.contacto}>
            {telefono && (
              <div className={styles.dato}>
                <span>Teléfono</span>
                <strong>{telefono}</strong>
              </div>
            )}

            <div className={styles.dato}>
              <span>Dirección del establecimiento</span>
              <strong>
                {direccion ||
                  'El comercio aún no ha registrado su dirección.'}
              </strong>
            </div>

            {contacto && (
              <span className={styles.nombre}>
                Contacto: {contacto}
              </span>
            )}
          </div>

          <p className={styles.nota}>
            La información de contacto y ubicación está disponible porque
            el acuerdo fue aceptado. Utilízala para coordinar la entrega.
          </p>
        </>
      ) : (
        <p className={styles.nota}>
          El teléfono y la dirección del establecimiento se muestran
          cuando se acepte el acuerdo.
        </p>
      )}
    </section>
  )
}

export default TarjetaContraparte
