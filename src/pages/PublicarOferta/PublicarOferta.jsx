
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../services/supabaseClient'
import { createOffer } from '../../services/offerService'
import { CATEGORIAS_OFERTA } from '../../helpers/categorias'
import styles from './PublicarOferta.module.scss'

const initialValues = {
  title: '',
  description: '',
  category: '',
  quantity: '',
  minPurchase: '',
  unitPrice: ''
}

const links = [
  ['/catalogo', 'Catálogo'],
  ['/mis-publicaciones', 'Mis publicaciones'],
  ['/solicitudes-recibidas', 'Solicitudes recibidas'],
  ['/solicitudes-enviadas', 'Solicitudes enviadas'],
  ['/red-comercial', 'Red comercial'],
  ['/mi-negocio', 'Mi negocio']
]

function PublicarOferta() {
  const navigate = useNavigate()
  const { user, business } = useAuth()

  const sending = useRef(false)

  const [values, setValues] = useState(initialValues)
  const [image, setImage] = useState(null)
  const [imageInputKey, setImageInputKey] = useState(0)
  const [imagePreview, setImagePreview] = useState('')
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!imagePreview) return

    return () => URL.revokeObjectURL(imagePreview)
  }, [imagePreview])

  const price = Number(values.unitPrice)

  const formattedPrice = Number.isFinite(price) && price > 0
    ? new Intl.NumberFormat('es-CO', {
        maximumFractionDigits: 2
      }).format(price)
    : '0'

  function handleChange(event) {
    const { name, value } = event.target

    setValues(current => ({
      ...current,
      [name]: value
    }))

    setErrors(current => ({
      ...current,
      [name]: ''
    }))
  }

  function handleImage(event) {
    const file = event.target.files?.[0]

    if (!file) return

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setImage(null)
      setImagePreview('')
      setImageInputKey(current => current + 1)

      setErrors(current => ({
        ...current,
        image: 'Selecciona una imagen JPG o PNG.'
      }))

      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setImage(null)
      setImagePreview('')
      setImageInputKey(current => current + 1)

      setErrors(current => ({
        ...current,
        image: 'La imagen supera el límite de 5 MB.'
      }))

      return
    }

    setImage(file)
    setImagePreview(URL.createObjectURL(file))

    setErrors(current => ({
      ...current,
      image: ''
    }))
  }

  function removeImage() {
    setImage(null)
    setImagePreview('')
    setImageInputKey(current => current + 1)

    setErrors(current => ({
      ...current,
      image: ''
    }))
  }

  function validate() {
    const nextErrors = {}

    const title = values.title.trim()
    const description = values.description.trim()
    const quantity = Number(values.quantity)
    const minimum = Number(values.minPurchase)
    const validPrice = /^\d+(\.\d{1,2})?$/.test(values.unitPrice)
    const unitPrice = Number(values.unitPrice)

    if (title.length < 3 || title.length > 100) {
      nextErrors.title = 'El título debe tener entre 3 y 100 caracteres.'
    }

    if (description.length < 10 || description.length > 1000) {
      nextErrors.description =
        'La descripción debe tener entre 10 y 1000 caracteres.'
    }

    if (!CATEGORIAS_OFERTA.includes(values.category)) {
      nextErrors.category = 'Selecciona una categoría.'
    }

    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      nextErrors.quantity = 'Ingresa una cantidad entera mayor que cero.'
    }

    if (
      !Number.isSafeInteger(minimum) ||
      minimum < 1 ||
      minimum > quantity
    ) {
      nextErrors.minPurchase =
        'La compra mínima debe estar entre 1 y la cantidad disponible.'
    }

    if (!validPrice || !Number.isFinite(unitPrice) || unitPrice <= 0) {
      nextErrors.unitPrice =
        'Ingresa un precio positivo con máximo dos decimales.'
    }

    setErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (sending.current) return
    if (!validate()) return

    sending.current = true
    setLoading(true)
    setMessage('')

    try {
      await createOffer({
        ...values,
        image
      }, user.id)

      navigate('/mis-publicaciones', {
        replace: true,
        state: {
          message: 'La oferta se publicó correctamente.'
        }
      })
    } catch (error) {
      setMessage(
        error.message || 'No pudimos publicar la oferta. Inténtalo de nuevo.'
      )
    } finally {
      sending.current = false
      setLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/iniciar-sesion', { replace: true })
  }

  function cancel() {
    navigate('/mis-publicaciones')
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <Link to="/" className={styles.brand}>
          ReStock Local
        </Link>

        <nav className={styles.navigation}>
          {links.map(([path, label]) => (
            <Link
              key={path}
              to={path}
              className={
                path === '/mis-publicaciones' ? styles.active : ''
              }
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarAccount}>
          <strong>{business?.name}</strong>
          <span>{business?.city}</span>
          <button onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </aside>

      <main className={styles.content}>
        <Link to="/mis-publicaciones" className={styles.back}>
          ← Volver a mis publicaciones
        </Link>

        <header className={styles.heading}>
          <h1>Publicar excedente</h1>
          <p>
            Cada publicación corresponde a un producto o variante: tallas o
            colores distintos se publican por separado. Todos los campos son
            obligatorios, salvo la imagen.
          </p>
        </header>

        {message && (
          <p className={styles.message} role="alert">
            {message}
          </p>
        )}

        <div className={styles.columns}>
          <form
            className={styles.formCard}
            onSubmit={handleSubmit}
            noValidate
            aria-busy={loading}
          >
            <div className={styles.field}>
              <label htmlFor="offer-title">Título</label>

              <input
                id="offer-title"
                name="title"
                value={values.title}
                onChange={handleChange}
                maxLength={100}
                placeholder="Ej.: Lámparas LED de escritorio"
                disabled={loading}
                aria-invalid={Boolean(errors.title)}
              />

              <div className={styles.fieldInfo}>
                <small>Entre 3 y 100 caracteres.</small>
                <small>{values.title.length}/100</small>
              </div>

              {errors.title && (
                <span className={styles.error}>{errors.title}</span>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="offer-description">Descripción</label>

              <textarea
                id="offer-description"
                name="description"
                value={values.description}
                onChange={handleChange}
                maxLength={1000}
                placeholder="Describe el producto, su estado y las características del lote."
                disabled={loading}
                aria-invalid={Boolean(errors.description)}
              />

              <div className={styles.fieldInfo}>
                <small>Entre 10 y 1000 caracteres.</small>
                <small>{values.description.length}/1000</small>
              </div>

              {errors.description && (
                <span className={styles.error}>{errors.description}</span>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="offer-category">Categoría</label>

              <select
                id="offer-category"
                name="category"
                value={values.category}
                onChange={handleChange}
                disabled={loading}
                aria-invalid={Boolean(errors.category)}
              >
                <option value="">Selecciona una categoría</option>

                {CATEGORIAS_OFERTA.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              {errors.category && (
                <span className={styles.error}>{errors.category}</span>
              )}
            </div>

            <div className={styles.numbers}>
              <div className={styles.field}>
                <label htmlFor="offer-quantity">
                  Cantidad disponible
                </label>

                <input
                  id="offer-quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={values.quantity}
                  onChange={handleChange}
                  placeholder="50"
                  disabled={loading}
                  aria-invalid={Boolean(errors.quantity)}
                />

                <small>Número entero mayor que 0.</small>

                {errors.quantity && (
                  <span className={styles.error}>{errors.quantity}</span>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="offer-minimum">Compra mínima</label>

                <input
                  id="offer-minimum"
                  name="minPurchase"
                  type="number"
                  min="1"
                  step="1"
                  value={values.minPurchase}
                  onChange={handleChange}
                  placeholder="5"
                  disabled={loading}
                  aria-invalid={Boolean(errors.minPurchase)}
                />

                <small>Entre 1 y la cantidad.</small>

                {errors.minPurchase && (
                  <span className={styles.error}>{errors.minPurchase}</span>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="offer-price">
                  Precio unitario (COP)
                </label>

                <input
                  id="offer-price"
                  name="unitPrice"
                  type="text"
                  inputMode="decimal"
                  value={values.unitPrice}
                  onChange={handleChange}
                  placeholder="32000"
                  disabled={loading}
                  aria-invalid={Boolean(errors.unitPrice)}
                />

                <small>Mayor que 0, hasta 2 decimales.</small>

                {errors.unitPrice && (
                  <span className={styles.error}>{errors.unitPrice}</span>
                )}
              </div>
            </div>

            <div className={styles.field}>
              <label>Imagen (opcional)</label>

              <div className={styles.uploadBox}>
                {image ? (
                  <>
                    <div className={styles.fileInfo}>
                      <span className={styles.fileIcon}>IMG</span>

                      <div>
                        <strong>{image.name}</strong>

                        <small>
                          {(image.size / (1024 * 1024)).toFixed(2)} MB ·
                          {' '}
                          {image.type === 'image/png' ? 'PNG' : 'JPG'}
                        </small>
                      </div>
                    </div>

                    <div className={styles.fileActions}>
                      <label htmlFor="offer-image">Cambiar</label>

                      <button
                        type="button"
                        onClick={removeImage}
                        disabled={loading}
                      >
                        Quitar
                      </button>
                    </div>
                  </>
                ) : (
                  <label
                    htmlFor="offer-image"
                    className={styles.uploadLabel}
                  >
                    Seleccionar imagen JPG o PNG
                  </label>
                )}

                <input
                  key={imageInputKey}
                  id="offer-image"
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleImage}
                  disabled={loading}
                  className={styles.fileInput}
                />
              </div>

              <small>
                JPG o PNG, máximo 5 MB. Si la carga falla, la oferta no se publica.
              </small>

              {errors.image && (
                <span className={styles.error}>{errors.image}</span>
              )}
            </div>

            <div className={styles.inventoryNote}>
              Al publicar, la oferta queda activa con {values.quantity || 0}
              {' '}unidades disponibles, 0 reservadas y 0 entregadas.
              Después, las cantidades solo cambian al aceptar, cancelar o
              recibir acuerdos.
            </div>

            <div className={styles.actions}>
              <button
                type="submit"
                className={styles.submit}
                disabled={loading}
              >
                {loading ? 'Publicando...' : 'Publicar oferta'}
              </button>

              <button
                type="button"
                className={styles.cancel}
                onClick={cancel}
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
          </form>

          <aside className={styles.previewCard}>
            <span className={styles.previewLabel}>
              Vista previa en el catálogo
            </span>

            <div className={styles.previewImage}>
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Vista previa del producto"
                />
              ) : (
                <span>Imagen del producto</span>
              )}
            </div>

            <h2>{values.title || 'Título del producto'}</h2>

            <p className={styles.seller}>
              {business?.name || 'Tu negocio'} · {business?.city || 'Ciudad'}
            </p>

            <p className={styles.previewPrice}>
              ${formattedPrice} COP
              <small> por unidad</small>
            </p>

            <p className={styles.previewStock}>
              {values.quantity || 0} disponibles · compra mínima{' '}
              {values.minPurchase || 0}
            </p>

            <p className={styles.previewDescription}>
              {values.description || 'Aquí aparecerá la descripción del producto.'}
            </p>

            <p className={styles.previewNote}>
              Así la verán otros comercios. Tú no verás tus propias ofertas en
              el catálogo de compra.
            </p>
          </aside>
        </div>
      </main>
    </div>
  )
}

export default PublicarOferta
