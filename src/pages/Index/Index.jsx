
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { useAuth } from '../../hooks/useAuth'
import MenuPublico from '../../components/Shared/MenuPublico/MenuPublico'
import PasoCard from '../../components/Index/PasoCard/PasoCard'
import {
  getCatalogOffers,
  subscribeToCatalogChanges
} from '../../services/catalogService'
import { getOfferImageUrl } from '../../services/offerService'
import styles from './Index.module.scss'

const pasos = [
  {
    titulo: 'Publica tus productos',
    descripcion:
      'Agrega fotos, precio y unidades disponibles. Tú decides la compra mínima.'
  },
  {
    titulo: 'Recibe propuestas',
    descripcion:
      'Otros negocios encuentran tus productos y te hacen una oferta para comprarlos.'
  },
  {
    titulo: 'Pónganse de acuerdo',
    descripcion:
      'Negocien el precio y la cantidad. Cuando acepten el trato, las unidades quedan reservadas.'
  },
  {
    titulo: 'Entrega y confirma',
    descripcion:
      'Registra el despacho y el comprador confirma cuando recibe los productos.'
  }
]

function formatearCOP(valor) {
  return `$${new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 0
  }).format(Number(valor))} COP`
}

function Index() {
  const { user, profile } = useAuth()

  const [ofertas, setOfertas] = useState([])
  const [indice, setIndice] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  // Obtener las ofertas reales del catálogo público.
  useEffect(() => {
    let activo = true

    async function cargarOfertas() {
      try {
        const resultado = await getCatalogOffers()

        if (!activo) return

        const disponibles = resultado.filter(oferta => {
          const cantidad = Number(oferta.qty_available)
          const minimo = Number(oferta.min_purchase)

          return (
            cantidad > 0 &&
            cantidad >= Math.max(minimo || 1, 1)
          )
        })

        setOfertas(disponibles)
        setError('')
      } catch {
        if (activo) {
          setError('No pudimos cargar las ofertas.')
        }
      } finally {
        if (activo) {
          setCargando(false)
        }
      }
    }

    cargarOfertas()

    // Actualizar las publicaciones cuando el catálogo cambie.
    const cancelarSuscripcion = subscribeToCatalogChanges(
      () => cargarOfertas()
    )

    return () => {
      activo = false
      cancelarSuscripcion()
    }
  }, [])

  // Pasar automáticamente a otra oferta cada 5 segundos.
  useEffect(() => {
    if (ofertas.length <= 1) return

    const temporizador = setInterval(() => {
      setIndice(actual => (actual + 1) % ofertas.length)
    }, 5000)

    return () => clearInterval(temporizador)
  }, [ofertas.length])

  const indiceActual = ofertas.length
    ? indice % ofertas.length
    : 0

  const ofertaActual = ofertas[indiceActual] ?? null

  const imagenActual = ofertaActual
    ? getOfferImageUrl(ofertaActual.image_path)
    : null

  if (user && profile) {
    return (
      <Navigate
        to={profile.role === 'admin' ? '/admin/comercios' : '/catalogo'}
        replace
      />
    )
  }

  return (
    <div className={styles.pagina}>
      <MenuPublico />

      <main>
        {/* PRESENTACIÓN PRINCIPAL */}
        <section className={styles.hero}>
          <div className={styles.presentacion}>
            <span className={styles.insignia}>
              Para pequeños comercios
            </span>

            <h1>
              Vende tus excedentes de inventario y abastece
              tu negocio con otros comercios
            </h1>

            <p className={styles.descripcion}>
              Dale salida a los productos que llevan tiempo sin
              venderse y encuentra ofertas de otros comercios
              para surtir tu negocio. Lo que a uno le sobra
              puede ser justo lo que otro necesita.
            </p>

            <div className={styles.acciones}>
              <Link
                to="/registro"
                className={styles.principal}
              >
                Crear cuenta
              </Link>

              <Link
                to="/iniciar-sesion"
                className={styles.secundario}
              >
                Ya tengo cuenta
              </Link>
            </div>

            <p className={styles.nota}>
              Explora las ofertas sin iniciar sesión y envía
              tu solicitud de compra registrándote gratis.
            </p>
          </div>

          {/* CARRUSEL DE OFERTAS REALES */}
          <article
            className={styles.ejemplo}
            aria-label="Ofertas disponibles en ReStock Local"
          >
            <span className={styles.etiqueta}>
              Ofertas disponibles
            </span>

            {cargando ? (
              <div className={styles.imagen}>
                Cargando ofertas...
              </div>
            ) : error ? (
              <div className={styles.imagen} role="status">
                {error}
              </div>
            ) : !ofertaActual ? (
              <div className={styles.imagen}>
                Todavía no hay ofertas disponibles.
              </div>
            ) : (
              <Link
                key={ofertaActual.id}
                to={`/ofertas/${ofertaActual.id}`}
                className={styles.enlaceOferta}
                aria-label={`Ver oferta: ${ofertaActual.title}`}
              >
                <div className={styles.imagen}>
                  {imagenActual ? (
                    <img
                      src={imagenActual}
                      alt={ofertaActual.title}
                    />
                  ) : (
                    <span>Imagen no disponible</span>
                  )}
                </div>

                <div className={styles.tituloOferta}>
                  <h2>{ofertaActual.title}</h2>

                  <span className={styles.activa}>
                    Activa
                  </span>
                </div>

                <p className={styles.vendedor}>
                  {ofertaActual.seller_name}
                  {ofertaActual.seller_city
                    ? ` · ${ofertaActual.seller_city}`
                    : ''}
                </p>

                <hr />

                <dl className={styles.datos}>
                  <div>
                    <dt>Precio unitario</dt>
                    <dd>
                      {formatearCOP(ofertaActual.unit_price)}
                    </dd>
                  </div>

                  <div>
                    <dt>Disponibles</dt>
                    <dd>
                      {ofertaActual.qty_available} unidades
                    </dd>
                  </div>

                  <div>
                    <dt>Compra mínima</dt>
                    <dd>
                      {ofertaActual.min_purchase} unidades
                    </dd>
                  </div>
                </dl>

                <p className={styles.contador}>
                  Ver detalle · {indiceActual + 1} de {ofertas.length}
                </p>
              </Link>
            )}
          </article>
        </section>

        {/* CÓMO FUNCIONA */}
        <section
          id="como-funciona"
          className={styles.comoFunciona}
        >
          <h2>Cómo funciona</h2>

          <p className={styles.subtitulo}>
            Así de fácil puedes comprar y vender entre comercios.
          </p>

          <ol className={styles.pasos}>
            {pasos.map((paso, numero) => (
              <PasoCard
                key={paso.titulo}
                numero={numero + 1}
                titulo={paso.titulo}
                descripcion={paso.descripcion}
              />
            ))}
          </ol>

          {/* AVISO IMPORTANTE */}
          <p className={styles.aviso}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1D4ED8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
              style={{
                display: 'inline-block',
                verticalAlign: '-3px',
                marginRight: '8px',
                flexShrink: 0
              }}
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>

            <strong>Importante:</strong>{' '}
            El pago y la entrega se acuerdan directamente entre
            los comercios, por fuera de la plataforma.
          </p>
        </section>

        {/* INVITACIÓN A REGISTRARSE */}
        <section className={styles.llamado}>
          <div>
            <h2>¿Tienes inventario detenido?</h2>

            <p>
              Crea la cuenta de tu negocio y publica tu primer excedente.
            </p>
          </div>

          <Link
            to="/registro"
            className={styles.principal}
          >
            Registrarse
          </Link>
        </section>
      </main>
    </div>
  )
}

export default Index
