
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../services/supabaseClient'
import { getOfferImageUrl } from '../../services/offerService'
import {
  getCatalogOffers,
  subscribeToCatalogChanges
} from '../../services/catalogService'
import { CATEGORIAS_OFERTA } from '../../helpers/categorias'
import { getTopOffers } from '../../helpers/ofertasTop'
import Trie, { normalizeSearchText } from '../../structures/Trie'
import styles from './Catalogo.module.scss'

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

function Catalogo() {
  const navigate = useNavigate()
  const { user, business } = useAuth()

  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [live, setLive] = useState(false)
  const [error, setError] = useState('')
  const [refreshVersion, setRefreshVersion] = useState(0)

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [city, setCity] = useState('')
  const [minPrice, setMinPrice] = useState('0')
  const [maxPrice, setMaxPrice] = useState('')

  useEffect(() => {
    let active = true

    getCatalogOffers()
      .then(data => {
        if (!active) return

        setOffers(data)
        setError('')
      })
      .catch(err => {
        if (active) {
          setError(err.message || 'No pudimos cargar las ofertas.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [refreshVersion])

  useEffect(() => {
    let active = true

    const unsubscribe = subscribeToCatalogChanges(
      () => {
        if (active) {
          setRefreshVersion(current => current + 1)
        }
      },
      status => {
        if (active) {
          setLive(status === 'SUBSCRIBED')
        }
      }
    )

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const trie = useMemo(() => {
    const index = new Trie()

    offers.forEach(offer => {
      index.insertTitle(offer.title, offer.id)
    })

    return index
  }, [offers])

  const cities = useMemo(() => {
    return [...new Set(offers.map(offer => offer.seller_city))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'es'))
  }, [offers])

  const topOffers = useMemo(() => {
    return getTopOffers(offers)
  }, [offers])

  const filterError = useMemo(() => {
    if (
      minPrice !== '' &&
      (!Number.isFinite(Number(minPrice)) || Number(minPrice) < 0)
    ) {
      return 'El precio mínimo no puede ser negativo.'
    }

    if (
      maxPrice !== '' &&
      (!Number.isFinite(Number(maxPrice)) || Number(maxPrice) < 0)
    ) {
      return 'El precio máximo no puede ser negativo.'
    }

    if (
      minPrice !== '' &&
      maxPrice !== '' &&
      Number(minPrice) > Number(maxPrice)
    ) {
      return 'El precio mínimo no puede superar al máximo.'
    }

    return ''
  }, [minPrice, maxPrice])

  const filteredOffers = useMemo(() => {
    if (filterError) return []

    const tokens = normalizeSearchText(search)
      .split(' ')
      .filter(Boolean)

    let matchingIds = null

    if (tokens.length > 0) {
      const matches = tokens.map(token =>
        new Set(trie.search(token))
      )

      matchingIds = matches.reduce((result, current) => {
        return new Set(
          [...result].filter(id => current.has(id))
        )
      })
    }

    return offers.filter(offer => {
      const matchesSearch =
        !matchingIds || matchingIds.has(offer.id)

      const matchesCategory =
        !category || offer.category === category

      const matchesCity =
        !city || offer.seller_city === city

      const matchesMin =
        minPrice === '' ||
        Number(offer.unit_price) >= Number(minPrice)

      const matchesMax =
        maxPrice === '' ||
        Number(offer.unit_price) <= Number(maxPrice)

      return (
        matchesSearch &&
        matchesCategory &&
        matchesCity &&
        matchesMin &&
        matchesMax
      )
    })
  }, [
    offers,
    trie,
    search,
    category,
    city,
    minPrice,
    maxPrice,
    filterError
  ])

  function clearFilters() {
    setSearch('')
    setCategory('')
    setCity('')
    setMinPrice('0')
    setMaxPrice('')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/iniciar-sesion', { replace: true })
  }

  const navigation = user ? privateLinks : publicLinks

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
              className={
                path === '/catalogo' ? styles.active : ''
              }
            >
              {label}
            </Link>
          ))}
        </nav>

        {user && (
          <div className={styles.sidebarAccount}>
            <strong>{business?.name}</strong>
            <span>{business?.city}</span>
            <button onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        )}
      </aside>

      <main className={styles.content}>
        <header className={styles.heading}>
          <div>
            <h1>Catálogo</h1>
            <p>
              Excedentes que otros comercios tienen disponibles para vender.
            </p>
          </div>

          <div className={styles.liveStatus}>
            <span>Actualización automática</span>
            <span className={live ? styles.live : styles.connecting}>
              {live ? 'En vivo' : 'Conectando'}
            </span>
          </div>
        </header>

        <section className={styles.topSection}>
          <div className={styles.sectionHeading}>
            <h2>Mayor disponibilidad</h2>
            <p>
              Las 5 ofertas con más unidades disponibles, de mayor a menor.
            </p>
          </div>

          {loading ? (
            <div className={styles.topLoading}>
              Cargando ofertas...
            </div>
          ) : topOffers.length === 0 ? (
            <div className={styles.topLoading}>
              Todavía no hay ofertas disponibles.
            </div>
          ) : (
            <div className={styles.topGrid}>
              {topOffers.map((offer, index) => {
                const imageUrl = getOfferImageUrl(offer.image_path)

                return (
                  <Link
                    to={`/ofertas/${offer.id}`}
                    key={offer.id}
                    className={styles.topCard}
                  >
                    <div className={styles.topCardHeading}>
                      <span>{index + 1}</span>
                      <strong>
                        {offer.qty_available} disponibles
                      </strong>
                    </div>

                    <div className={styles.topImage}>
                      {imageUrl ? (
                        <img src={imageUrl} alt={offer.title} />
                      ) : (
                        <span>Imagen</span>
                      )}
                    </div>

                    <h3>{offer.title}</h3>

                    <p>
                      {offer.seller_name} · {offer.seller_city}
                    </p>

                    <strong className={styles.topPrice}>
                      {formatPrice(offer.unit_price)} c/u
                    </strong>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        <section className={styles.searchSection}>
          <h2>Buscar productos</h2>

          <input
            className={styles.searchInput}
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Ej.: cargador"
            aria-label="Buscar productos por prefijo"
          />

          <small>
            Encuentra cualquier palabra del título por su inicio,
            sin importar mayúsculas ni tildes.
          </small>

          <div className={styles.filters}>
            <div className={styles.field}>
              <label htmlFor="filter-category">Categoría</label>
              <select
                id="filter-category"
                value={category}
                onChange={event => setCategory(event.target.value)}
              >
                <option value="">Todas</option>
                {CATEGORIAS_OFERTA.map(item => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="filter-city">Ciudad</label>
              <select
                id="filter-city"
                value={city}
                onChange={event => setCity(event.target.value)}
              >
                <option value="">Todas</option>
                {cities.map(item => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="min-price">Precio mínimo (COP)</label>
              <input
                id="min-price"
                type="number"
                min="0"
                step="0.01"
                value={minPrice}
                onChange={event => setMinPrice(event.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="max-price">Precio máximo (COP)</label>
              <input
                id="max-price"
                type="number"
                min="0"
                step="0.01"
                value={maxPrice}
                onChange={event => setMaxPrice(event.target.value)}
                placeholder="Sin límite"
              />
            </div>

            <button
              type="button"
              className={styles.clearButton}
              onClick={clearFilters}
            >
              Limpiar filtros
            </button>
          </div>

          {filterError && (
            <p className={styles.filterError} role="alert">
              {filterError}
            </p>
          )}
        </section>

        <section className={styles.resultsSection}>
          <div className={styles.resultsHeading}>
            <h2>
              {filteredOffers.length} ofertas
              {search.trim() && ` para «${search.trim()}»`}
            </h2>

            <span>Tus propias ofertas no aparecen aquí.</span>
          </div>

          {error ? (
            <div className={styles.emptyState}>
              <h3>No pudimos cargar el catálogo</h3>
              <p>{error}</p>
              <button
                onClick={() => setRefreshVersion(current => current + 1)}
              >
                Intentar de nuevo
              </button>
            </div>
          ) : loading ? (
            <div className={styles.emptyState}>
              Cargando ofertas...
            </div>
          ) : filteredOffers.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>⌕</div>

              <h3>No encontramos ofertas</h3>

              <p>
                Prueba con el inicio de otra palabra o cambia los filtros.
                Solo aparecen ofertas activas de otros comercios con
                unidades suficientes.
              </p>

              <button onClick={clearFilters}>
                Limpiar búsqueda y filtros
              </button>
            </div>
          ) : (
            <div className={styles.offerGrid}>
              {filteredOffers.map(offer => {
                const imageUrl = getOfferImageUrl(offer.image_path)

                return (
                  <article
                    className={styles.offerCard}
                    key={offer.id}
                  >
                    <Link
                      to={`/ofertas/${offer.id}`}
                      className={styles.offerImage}
                    >
                      {imageUrl ? (
                        <img src={imageUrl} alt={offer.title} />
                      ) : (
                        <span>Imagen</span>
                      )}
                    </Link>

                    <div className={styles.offerInfo}>
                      <h3>{offer.title}</h3>

                      <p className={styles.seller}>
                        {offer.seller_name} · {offer.seller_city}
                      </p>

                      <strong className={styles.offerPrice}>
                        {formatPrice(offer.unit_price)}
                        <small> por unidad</small>
                      </strong>

                      <p className={styles.stock}>
                        {offer.qty_available} disponibles · compra mínima{' '}
                        {offer.min_purchase}
                      </p>

                      <Link
                        to={`/ofertas/${offer.id}`}
                        className={styles.detailButton}
                      >
                        Ver detalle
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <footer className={styles.footer}>
          Precios expresados en COP.
        </footer>
      </main>
    </div>
  )
}

export default Catalogo
