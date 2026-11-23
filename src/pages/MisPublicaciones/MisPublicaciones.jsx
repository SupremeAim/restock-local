
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../../hooks/useAuth'
import LayoutComercio from '../../components/Shared/LayoutComercio/LayoutComercio'
import {
  changeOfferStatus,
  getMyOffers,
  getOfferImageUrl,
  deleteMyOffer
} from '../../services/offerService'
import styles from './MisPublicaciones.module.scss'

const filters = [
  ['todas', 'Todas'],
  ['activa', 'Activas'],
  ['pausada', 'Pausadas'],
  ['agotada', 'Agotadas'],
  ['archivada', 'Archivadas'],
  ['bloqueadas', 'Bloqueadas']
]

const statusLabels = {
  activa: 'Activa',
  pausada: 'Pausada',
  agotada: 'Agotada',
  archivada: 'Archivada'
}

function formatPrice(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Number(value))
}

function mensajeErrorEliminacion(error) {
  const codigo = error?.message ?? ''

  if (codigo.includes('publicacion_no_encontrada')) {
    return 'No encontramos esta publicación o no te pertenece.'
  }

  if (codigo.includes('publicacion_no_archivada')) {
    return 'Primero debes archivar la publicación.'
  }

  if (codigo.includes('publicacion_bloqueada')) {
    return 'No puedes eliminar una publicación bloqueada por administración.'
  }

  if (codigo.includes('publicacion_con_reservas')) {
    return 'No puedes eliminar una publicación que tiene unidades reservadas.'
  }

  if (codigo.includes('publicacion_con_entregas')) {
    return 'No puedes eliminar una publicación que tiene unidades entregadas.'
  }

  if (codigo.includes('publicacion_con_historial')) {
    return 'Esta publicación tiene solicitudes o negociaciones registradas. Debes conservarla para proteger el historial comercial.'
  }

  if (codigo.includes('sin_permiso')) {
    return 'No tienes permiso para eliminar esta publicación.'
  }

  return 'No pudimos eliminar la publicación. Inténtalo nuevamente.'
}

function MisPublicaciones() {
  const location = useLocation()
  const { user } = useAuth()
  const userId = user?.id

  const [offers, setOffers] = useState([])
  const [filter, setFilter] = useState('todas')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')
  const [offerToArchive, setOfferToArchive] = useState(null)
  const [offerToDelete, setOfferToDelete] = useState(null)

  const [message, setMessage] = useState(location.state?.message || '')
  const [warningMessage, setWarningMessage] = useState('')
  const [error, setError] = useState('')
  const [refreshVersion, setRefreshVersion] = useState(0)

  useEffect(() => {
    let active = true

    if (!userId) return

    getMyOffers(userId)
      .then(data => {
        if (!active) return

        setOffers(data)
        setError('')
      })
      .catch(err => {
        if (active) {
          setError(err.message || 'No pudimos cargar tus publicaciones.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [userId, refreshVersion])

  const counts = {
    todas: offers.length,
    activa: offers.filter(offer => offer.status === 'activa').length,
    pausada: offers.filter(offer => offer.status === 'pausada').length,
    agotada: offers.filter(offer => offer.status === 'agotada').length,
    archivada: offers.filter(offer => offer.status === 'archivada').length,
    bloqueadas: offers.filter(offer => offer.blocked).length
  }

  const visibleOffers = offers.filter(offer => {
    if (filter === 'todas') return true
    if (filter === 'bloqueadas') return offer.blocked

    return offer.status === filter
  })

  async function handleStatusChange(action, offer) {
    setActionLoading(offer.id)
    setMessage('')
    setWarningMessage('')
    setError('')

    try {
      await changeOfferStatus(action, offer.id)

      const messages = {
        pause: 'La publicación se pausó correctamente.',
        resume: 'La publicación se reanudó correctamente.',
        archive: 'La publicación se archivó correctamente.'
      }

      setMessage(messages[action])
      setRefreshVersion(current => current + 1)
    } catch (err) {
      setError(err.message || 'No pudimos realizar la acción.')
    } finally {
      setActionLoading('')
    }
  }

  async function handleArchive() {
    if (!offerToArchive) return

    const offer = offerToArchive

    setOfferToArchive(null)
    await handleStatusChange('archive', offer)
  }

  async function handleDelete() {
    if (!offerToDelete) return

    const offer = offerToDelete

    setActionLoading(offer.id)
    setMessage('')
    setWarningMessage('')
    setError('')

    try {
      const result = await deleteMyOffer(offer.id)

      setOfferToDelete(null)

      if (result.warning) {
        setWarningMessage(result.warning)
      } else {
        setMessage('La publicación se eliminó definitivamente.')
      }

      setRefreshVersion(current => current + 1)
    } catch (err) {
      setError(mensajeErrorEliminacion(err))
    } finally {
      setActionLoading('')
    }
  }

  return (
    <>
      <LayoutComercio>
        <div className={styles.page}>
          <header className={styles.heading}>
            <div>
              <h1>Mis publicaciones</h1>
              <p>
                Tus excedentes publicados y el estado de sus unidades.
              </p>
            </div>

            <Link to="/publicar-oferta" className={styles.publishButton}>
              Publicar excedente
            </Link>
          </header>

          {message && (
            <div className={styles.successMessage} role="status">
              {message}
              <button onClick={() => setMessage('')}>×</button>
            </div>
          )}

          {warningMessage && (
            <div className={styles.warningMessage} role="alert">
              {warningMessage}
              <button onClick={() => setWarningMessage('')}>×</button>
            </div>
          )}

          {error && (
            <div className={styles.errorMessage} role="alert">
              {error}
            </div>
          )}

          <div className={styles.filters}>
            {filters.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={filter === value ? styles.selectedFilter : ''}
                onClick={() => setFilter(value)}
              >
                {label} ({counts[value]})
              </button>
            ))}
          </div>

          {loading ? (
            <div className={styles.loading}>
              Cargando tus publicaciones...
            </div>
          ) : offers.length === 0 ? (
            <section className={styles.emptyState}>
              <div className={styles.emptyIcon}>◇</div>
              <h2>Aún no tienes publicaciones</h2>
              <p>
                Publica tu primer excedente: productos que no has logrado
                vender o lotes de colecciones anteriores. Otros comercios
                podrán encontrarlos en el catálogo.
              </p>
              <Link to="/publicar-oferta">
                Publicar mi primer excedente
              </Link>
            </section>
          ) : visibleOffers.length === 0 ? (
            <section className={styles.emptyFilter}>
              No tienes publicaciones en esta categoría.
            </section>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Publicación</th>
                    <th>Precio unitario</th>
                    <th>Disponibles</th>
                    <th>Reservadas</th>
                    <th>Entregadas</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleOffers.map(offer => {
                    const imageUrl = getOfferImageUrl(offer.image_path)

                    return (
                      <tr key={offer.id}>
                        <td>
                          <div className={styles.product}>
                            {imageUrl ? (
                              <img src={imageUrl} alt={offer.title} />
                            ) : (
                              <div className={styles.noImage}>IMG</div>
                            )}

                            <div>
                              <strong>{offer.title}</strong>
                              <small>
                                {offer.category} · mínimo {offer.min_purchase}
                              </small>

                              {offer.blocked && (
                                <small className={styles.blockReason}>
                                  Bloqueo administrativo:{' '}
                                  {offer.block_reason || 'Publicación bloqueada.'}
                                </small>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>{formatPrice(offer.unit_price)}</td>
                        <td>{offer.qty_available}</td>
                        <td>{offer.qty_reserved}</td>
                        <td>{offer.qty_delivered}</td>

                        <td>
                          <div className={styles.statusColumn}>
                            <span
                              className={`${styles.status} ${styles[offer.status]}`}
                            >
                              {statusLabels[offer.status]}
                            </span>

                            {offer.blocked && (
                              <span className={styles.blockedBadge}>
                                Bloqueada
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          <div className={styles.actions}>
                            {offer.blocked ? (
                              <span className={styles.noActions}>
                                No puedes modificar el bloqueo
                              </span>
                            ) : offer.status === 'archivada' ? (
                              <button
                                className={styles.deleteAction}
                                onClick={() => {
                                  setError('')
                                  setOfferToDelete(offer)
                                }}
                                disabled={actionLoading === offer.id}
                              >
                                Eliminar
                              </button>
                            ) : (
                              <>
                                <Link to={`/editar-oferta/${offer.id}`}>
                                  Editar
                                </Link>

                                {offer.status === 'activa' && (
                                  <button
                                    onClick={() =>
                                      handleStatusChange('pause', offer)
                                    }
                                    disabled={actionLoading === offer.id}
                                  >
                                    Pausar
                                  </button>
                                )}

                                {offer.status === 'pausada' && (
                                  <button
                                    onClick={() =>
                                      handleStatusChange('resume', offer)
                                    }
                                    disabled={actionLoading === offer.id}
                                  >
                                    Reanudar
                                  </button>
                                )}

                                <button
                                  className={styles.archiveAction}
                                  onClick={() => setOfferToArchive(offer)}
                                  disabled={actionLoading === offer.id}
                                >
                                  Archivar
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className={styles.footerNote}>
            Las cantidades no se editan manualmente: cambian solo al aceptar,
            cancelar o recibir un acuerdo. Los precios se expresan en COP.
            Las publicaciones archivadas sin historial comercial pueden
            eliminarse definitivamente.
          </p>
        </div>
      </LayoutComercio>

      {offerToArchive && (
        <div className={styles.modalBackdrop}>
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-title"
          >
            <h2 id="archive-title">¿Archivar esta oferta?</h2>

            <p>
              «{offerToArchive.title}» dejará de aparecer en el catálogo y
              no admitirá solicitudes ni aceptaciones nuevas.
            </p>

            <p>
              Sus {offerToArchive.qty_available} unidades disponibles
              dejarán de ofrecerse.
            </p>

            <ul>
              <li>
                Los acuerdos ya aceptados se pueden cumplir o cancelar
                con normalidad.
              </li>
              <li>
                El historial de la oferta y de sus negociaciones no se borra.
              </li>
            </ul>

            <div className={styles.modalActions}>
              <button
                className={styles.cancelModal}
                onClick={() => setOfferToArchive(null)}
              >
                Volver
              </button>

              <button
                className={styles.confirmArchive}
                onClick={handleArchive}
              >
                Sí, archivar oferta
              </button>
            </div>
          </section>
        </div>
      )}

      {offerToDelete && (
        <div className={styles.modalBackdrop}>
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <h2 id="delete-title">
              ¿Eliminar definitivamente esta publicación?
            </h2>

            <p>
              Estás a punto de eliminar «{offerToDelete.title}».
              Esta acción no se puede deshacer.
            </p>

            <ul>
              <li>
                La publicación se eliminará permanentemente de tu cuenta.
              </li>
              <li>
                También intentaremos eliminar su imagen de almacenamiento.
              </li>
              <li>
                Solo se permite eliminar publicaciones sin solicitudes
                ni negociaciones asociadas.
              </li>
              <li>
                Si existe historial comercial, la base de datos rechazará
                la operación.
              </li>
            </ul>

            <div className={styles.modalActions}>
              <button
                className={styles.cancelModal}
                onClick={() => setOfferToDelete(null)}
                disabled={actionLoading === offerToDelete.id}
              >
                Volver
              </button>

              <button
                className={styles.confirmDelete}
                onClick={handleDelete}
                disabled={actionLoading === offerToDelete.id}
              >
                {actionLoading === offerToDelete.id
                  ? 'Eliminando...'
                  : 'Sí, eliminar definitivamente'}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

export default MisPublicaciones
