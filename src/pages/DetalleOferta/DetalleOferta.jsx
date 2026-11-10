
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../services/supabaseClient'
import { getOfferImageUrl } from '../../services/offerService'
import { getCatalogOffer } from '../../services/catalogService'
import EnviarSolicitud from '../../components/Solicitudes/EnviarSolicitud/EnviarSolicitud'
import styles from './DetalleOferta.module.scss'

const privateLinks = [
  ['/catalogo', 'Catálogo'],
  ['/mis-publicaciones', 'Mis publicaciones'],
  ['/solicitudes-recibidas', 'Solicitudes recibidas'],
  ['/solicitudes-enviadas', 'Solicitudes enviadas'],
  ['/red-comercial', 'Red comercial'],
  ['/mi-negocio', 'Mi negocio']
]

const publicLinks = [
  ['/', 'Inicio'],
  ['/catalogo', 'Catálogo'],
  ['/registro', 'Registro'],
  ['/iniciar-sesion', 'Iniciar sesión']
]

function formatPrice(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Number(value))
}

function formatDate(value) {
  if (!value) return 'Sin fecha'

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Bogota'
  }).format(new Date(value))
}

function DetalleOferta() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, business } = useAuth()

  const [offer, setOffer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getCatalogOffer(id)
      .then(data => {
        if (!active) return

        if (!data) {
          setError('Esta oferta no existe o ya no está disponible.')
          return
        }

        setOffer(data)
      })
      .catch(err => {
        if (active) {
          setError(err.message || 'No pudimos cargar la oferta.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/iniciar-sesion', { replace: true })
  }

  const navigation = user ? privateLinks : publicLinks

  if (loading) {
    return (
      <main className={styles.statePage}>
        Cargando información de la oferta...
      </main>
    )
  }

  if (error || !offer) {
    return (
      <main className={styles.statePage}>
        <div className={styles.stateCard}>
          <h1>No encontramos esta oferta</h1>
          <p>
            {error || 'La publicación puede haber sido retirada o agotada.'}
          </p>
          <Link to="/catalogo" className={styles.primaryButton}>
            Volver al catálogo
          </Link>
        </div>
      </main>
    )
  }

  const imageUrl = getOfferImageUrl(offer.image_path)

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <Link to="/" className={styles.brand}>
          ReStock Local
        </Link>

        <nav className={styles.navigation}>
          {navigation.map(([path, label]) => (
            <Link
              key={path}
              to={path}
              className={path === '/catalogo' ? styles.active : ''}
            >
              {label}
            </Link>
          ))}
        </nav>

        {user && (
          <div className={styles.sidebarAccount}>
            <strong>{business?.name || user.email}</strong>
            <span>{business?.city}</span>
            <button onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        )}
      </aside>

      <main className={styles.content}>
        <Link to="/catalogo" className={styles.back}>
          ← Volver al catálogo
        </Link>

        <div className={styles.columns}>
          <section className={styles.offerCard}>
            <div className={styles.imageContainer}>
              {imageUrl ? (
                <img src={imageUrl} alt={offer.title} />
              ) : (
                <span>Imagen del producto</span>
              )}
            </div>

            <div className={styles.offerInfo}>
              <div className={styles.titleRow}>
                <h1>{offer.title}</h1>
                <span className={styles.activeBadge}>Activa</span>
              </div>

              <p className={styles.sellerLine}>
                {offer.seller_name} · {offer.seller_city}
              </p>

              <p className={styles.description}>
                {offer.description}
              </p>

              <div className={styles.details}>
                <div>
                  <span>Precio unitario</span>
                  <strong>{formatPrice(offer.unit_price)}</strong>
                </div>

                <div>
                  <span>Disponibles</span>
                  <strong>{offer.qty_available} unidades</strong>
                </div>

                <div>
                  <span>Compra mínima</span>
                  <strong>{offer.min_purchase} unidades</strong>
                </div>

                <div>
                  <span>Categoría</span>
                  <strong>{offer.category}</strong>
                </div>

                <div>
                  <span>Publicada</span>
                  <strong>{formatDate(offer.created_at)}</strong>
                </div>
              </div>
            </div>
          </section>

          <aside className={styles.rightColumn}>
            <EnviarSolicitud oferta={offer} />

            <section className={styles.sellerCard}>
              <h2>Vendedor</h2>

              <strong>{offer.seller_name}</strong>

              <p>
                {offer.seller_city}
                {offer.seller_sector
                  ? ` · Sector ${offer.seller_sector}`
                  : ''}
              </p>

              <small>
                El teléfono de contacto se muestra cuando se acepta
                el acuerdo.
              </small>
            </section>
          </aside>
        </div>
      </main>
    </div>
  )
}

export default DetalleOferta
