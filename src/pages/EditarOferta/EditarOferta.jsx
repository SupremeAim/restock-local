
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../services/supabaseClient'
import {
  getMyOffer,
  getOfferImageUrl,
  updateOfferDetails
} from '../../services/offerService'
import styles from '../PublicarOferta/PublicarOferta.module.scss'

const links = [
  ['/catalogo', 'Catálogo'],
  ['/mis-publicaciones', 'Mis publicaciones'],
  ['/solicitudes-recibidas', 'Solicitudes recibidas'],
  ['/solicitudes-enviadas', 'Solicitudes enviadas'],
  ['/red-comercial', 'Red comercial'],
  ['/mi-negocio', 'Mi negocio']
]

function formatPrice(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Number(value))
}

function EditarOferta() {
  const { id } = useParams()
  const { user } = useAuth()

  const [offer, setOffer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadOffer() {
      try {
        const data = await getMyOffer(id, user.id)

        if (active) setOffer(data)
      } catch (err) {
        if (active) {
          setError(err.message || 'No pudimos cargar esta publicación.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    if (user?.id) loadOffer()

    return () => {
      active = false
    }
  }, [id, user?.id])

  if (loading) {
    return <main className={styles.content}>Cargando publicación...</main>
  }

  if (error || !offer) {
    return (
      <main className={styles.content}>
        <p className={styles.error}>
          {error || 'No encontramos esta publicación.'}
        </p>
        <Link to="/mis-publicaciones">Volver a mis publicaciones</Link>
      </main>
    )
  }

  if (offer.blocked || offer.status === 'archivada') {
    return (
      <main className={styles.content}>
        <p className={styles.error}>
          {offer.blocked
            ? 'Esta publicación tiene un bloqueo administrativo y no se puede editar.'
            : 'Esta publicación está archivada y no admite modificaciones.'}
        </p>
        <Link to="/mis-publicaciones">Volver a mis publicaciones</Link>
      </main>
    )
  }

  return <EditarOfertaForm offer={offer} user={user} />
}

function EditarOfertaForm({ offer, user }) {
  const navigate = useNavigate()
  const sending = useRef(false)

  const [description, setDescription] = useState(offer.description)
  const [unitPrice, setUnitPrice] = useState(String(offer.unit_price))
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(
    getOfferImageUrl(offer.image_path) || ''
  )
  const [removeImage, setRemoveImage] = useState(false)
  const [imageInputKey, setImageInputKey] = useState(0)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!imagePreview.startsWith('blob:')) return

    return () => URL.revokeObjectURL(imagePreview)
  }, [imagePreview])

  const formattedPrice = Number(unitPrice) > 0
    ? formatPrice(unitPrice)
    : '$0'

  function handleImage(event) {
    const file = event.target.files?.[0]

    if (!file) return

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setErrors(current => ({
        ...current,
        image: 'Selecciona una imagen JPG o PNG.'
      }))
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors(current => ({
        ...current,
        image: 'La imagen no puede superar los 5 MB.'
      }))
      return
    }

    setImageFile(file)
    setRemoveImage(false)
    setImagePreview(URL.createObjectURL(file))

    setErrors(current => ({
      ...current,
      image: ''
    }))
  }

  function handleRemoveImage() {
    setImageFile(null)
    setRemoveImage(true)
    setImagePreview('')
    setImageInputKey(current => current + 1)
    setErrors(current => ({
      ...current,
      image: ''
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (sending.current) return

    const nextErrors = {}
    const cleanDescription = description.trim()
    const validPrice = /^\d+(\.\d{1,2})?$/.test(unitPrice)
    const numericPrice = Number(unitPrice)

    if (cleanDescription.length < 10 || cleanDescription.length > 1000) {
      nextErrors.description =
        'La descripción debe tener entre 10 y 1000 caracteres.'
    }

    if (!validPrice || !Number.isFinite(numericPrice) || numericPrice <= 0) {
      nextErrors.unitPrice =
        'Ingresa un precio positivo con máximo dos decimales.'
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    sending.current = true
    setSaving(true)
    setMessage('')

    try {
      await updateOfferDetails({
        offerId: offer.id,
        description: cleanDescription,
        unitPrice: numericPrice,
        imageFile,
        removeImage
      }, user.id)

      navigate('/mis-publicaciones', {
        replace: true,
        state: {
          message: 'Los cambios de la publicación se guardaron correctamente.'
        }
      })
    } catch (err) {
      setMessage(
        err.message || 'No pudimos guardar los cambios de la publicación.'
      )
    } finally {
      sending.current = false
      setSaving(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/iniciar-sesion', { replace: true })
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
          <strong>{user?.email}</strong>
          <button onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </aside>

      <main className={styles.content}>
        <Link to="/mis-publicaciones" className={styles.back}>
          ← Volver a mis publicaciones
        </Link>

        <header className={styles.heading}>
          <h1>Editar oferta</h1>
          <p>
            Puedes cambiar la descripción, la imagen y el precio.
            El título, la categoría y las cantidades no se editan aquí.
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
            aria-busy={saving}
          >
            <div className={styles.field}>
              <label htmlFor="edit-title">Título · solo lectura</label>
              <input
                id="edit-title"
                value={offer.title}
                disabled
                readOnly
              />
              <small>No se puede cambiar después de publicar.</small>
            </div>

            <div className={styles.field}>
              <label htmlFor="edit-description">Descripción</label>
              <textarea
                id="edit-description"
                value={description}
                onChange={event => {
                  setDescription(event.target.value)
                  setErrors(current => ({
                    ...current,
                    description: ''
                  }))
                }}
                maxLength={1000}
                disabled={saving}
                aria-invalid={Boolean(errors.description)}
              />
              <div className={styles.fieldInfo}>
                <small>Entre 10 y 1000 caracteres.</small>
                <small>{description.length}/1000</small>
              </div>
              {errors.description && (
                <span className={styles.error}>{errors.description}</span>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="edit-category">Categoría · solo lectura</label>
              <input
                id="edit-category"
                value={offer.category}
                disabled
                readOnly
              />
            </div>

            <div className={styles.numbers}>
              <div className={styles.field}>
                <label htmlFor="edit-quantity">
                  Cantidad disponible · solo lectura
                </label>
                <input
                  id="edit-quantity"
                  value={offer.qty_available}
                  disabled
                  readOnly
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-minimum">
                  Compra mínima · solo lectura
                </label>
                <input
                  id="edit-minimum"
                  value={offer.min_purchase}
                  disabled
                  readOnly
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="edit-price">Precio unitario (COP)</label>
                <input
                  id="edit-price"
                  type="text"
                  inputMode="decimal"
                  value={unitPrice}
                  onChange={event => {
                    setUnitPrice(event.target.value)
                    setErrors(current => ({
                      ...current,
                      unitPrice: ''
                    }))
                  }}
                  disabled={saving}
                  aria-invalid={Boolean(errors.unitPrice)}
                />
                {errors.unitPrice && (
                  <span className={styles.error}>{errors.unitPrice}</span>
                )}
              </div>
            </div>

            <div className={styles.field}>
              <label>Imagen (opcional)</label>

              <div className={styles.uploadBox}>
                {imagePreview ? (
                  <>
                    <div className={styles.fileInfo}>
                      <span className={styles.fileIcon}>IMG</span>
                      <div>
                        <strong>
                          {imageFile?.name || 'Imagen actual'}
                        </strong>
                        <small>
                          {imageFile
                            ? `${(imageFile.size / (1024 * 1024)).toFixed(2)} MB`
                            : 'Imagen guardada en ReStock Local'}
                        </small>
                      </div>
                    </div>

                    <div className={styles.fileActions}>
                      <label htmlFor="edit-image">Cambiar</label>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        disabled={saving}
                      >
                        Quitar
                      </button>
                    </div>
                  </>
                ) : (
                  <label
                    htmlFor="edit-image"
                    className={styles.uploadLabel}
                  >
                    Seleccionar imagen JPG o PNG
                  </label>
                )}

                <input
                  key={imageInputKey}
                  id="edit-image"
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleImage}
                  disabled={saving}
                  className={styles.fileInput}
                />
              </div>

              <small>JPG o PNG, máximo 5 MB.</small>

              {errors.image && (
                <span className={styles.error}>{errors.image}</span>
              )}
            </div>

            <div className={styles.inventoryNote}>
              El nuevo precio solo se aplica a solicitudes futuras.
              Las solicitudes enviadas y los acuerdos aceptados conservan
              sus términos.
            </div>

            <div className={styles.actions}>
              <button
                type="submit"
                className={styles.submit}
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>

              <button
                type="button"
                className={styles.cancel}
                onClick={() => navigate('/mis-publicaciones')}
                disabled={saving}
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
                <img src={imagePreview} alt={offer.title} />
              ) : (
                <span>Imagen del producto</span>
              )}
            </div>

            <h2>{offer.title}</h2>

            <p className={styles.seller}>
              {offer.category} · {offer.status}
            </p>

            <p className={styles.previewPrice}>
              {formattedPrice}
              <small> por unidad</small>
            </p>

            <p className={styles.previewStock}>
              {offer.qty_available} disponibles · compra mínima{' '}
              {offer.min_purchase}
            </p>

            <p className={styles.previewDescription}>
              {description || 'Aquí aparecerá la descripción del producto.'}
            </p>

            <p className={styles.previewNote}>
              El precio actualizado se aplicará a las solicitudes nuevas.
              Los acuerdos existentes mantienen sus condiciones.
            </p>
          </aside>
        </div>
      </main>
    </div>
  )
}

export default EditarOferta
