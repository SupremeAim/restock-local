import { Link } from 'react-router'
import MenuPublico from '../../components/Shared/MenuPublico/MenuPublico'
import PasoCard from '../../components/Index/PasoCard/PasoCard'
import styles from './Index.module.scss'

const pasos = [
  {
    titulo: 'Publica tu excedente',
    descripcion: 'Sube el producto con cantidad, precio unitario en COP y compra mínima.'
  },
  {
    titulo: 'Recibe solicitudes',
    descripcion: 'Otros comercios encuentran tu oferta y te proponen cantidad y precio.'
  },
  {
    titulo: 'Negocia y acepta',
    descripcion: 'Intercambien contrapropuestas. Al aceptar, las unidades quedan reservadas.'
  },
  {
    titulo: 'Despacha y confirma',
    descripcion: 'Registra el despacho y el comprador confirma la recepción.'
  }
]

const datosEjemplo = [
  ['Precio unitario', '$45.000 COP'],
  ['Disponibles', '40 unidades'],
  ['Compra mínima', '5 unidades']
]

function Index() {
  return (
    <div className={styles.pagina}>
      <MenuPublico />

      <main>
        <section className={styles.hero}>
          <div className={styles.presentacion}>
            <span className={styles.insignia}>Para pequeños comercios</span>
            <h1>Vende tus excedentes de inventario y abastece tu negocio con otros comercios</h1>
            <p className={styles.descripcion}>
              ReStock Local conecta a pequeños comercios para publicar los productos que no han
              logrado vender y comprar lotes a precios negociados entre negocios.
            </p>
            <div className={styles.acciones}>
              <Link to="/registro" className={styles.principal}>
                Crear cuenta
              </Link>
              <Link to="/iniciar-sesion" className={styles.secundario}>
                Ya tengo cuenta
              </Link>
            </div>
            <p className={styles.nota}>
              Registro gratuito. Las ofertas solo son visibles para comercios con sesión iniciada.
            </p>
          </div>

          <article className={styles.ejemplo} aria-label="Ejemplo de oferta">
            <span className={styles.etiqueta}>Ejemplo de oferta</span>
            <div className={styles.imagen} aria-hidden="true">
              Imagen del producto
            </div>
            <div className={styles.tituloOferta}>
              <h2>Bolsos de cuero, colección anterior</h2>
              <span className={styles.activa}>Activa</span>
            </div>
            <p className={styles.vendedor}>Tienda Aurora · Cali</p>
            <hr />
            <dl className={styles.datos}>
              {datosEjemplo.map(([etiqueta, valor]) => (
                <div key={etiqueta}>
                  <dt>{etiqueta}</dt>
                  <dd>{valor}</dd>
                </div>
              ))}
            </dl>
            <p className={styles.ficticio}>Datos ficticios de demostración</p>
          </article>
        </section>

        <section id="como-funciona" className={styles.comoFunciona}>
          <h2>Cómo funciona</h2>
          <p className={styles.subtitulo}>Cuatro pasos, desde la publicación hasta la entrega.</p>
          <ol className={styles.pasos}>
            {pasos.map((paso, indice) => (
              <PasoCard
                key={paso.titulo}
                numero={indice + 1}
                titulo={paso.titulo}
                descripcion={paso.descripcion}
              />
            ))}
          </ol>
          <p className={styles.aviso}>
            <strong>Importante:</strong> el pago y la entrega se acuerdan directamente entre los
            comercios, por fuera de la plataforma.
          </p>
        </section>

        <section className={styles.llamado}>
          <div>
            <h2>¿Tienes inventario detenido?</h2>
            <p>Crea la cuenta de tu negocio y publica tu primer excedente.</p>
          </div>
          <Link to="/registro" className={styles.principal}>
            Registrarse
          </Link>
        </section>
      </main>

      <footer className={styles.pie}>
        <Link to="/iniciar-sesion">Iniciar sesión</Link>
        <Link to="/registro">Registrarse</Link>
      </footer>
    </div>
  )
}

export default Index
