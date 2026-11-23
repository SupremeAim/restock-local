
import { useEffect, useMemo, useState } from 'react'
import Boton from '../../components/Shared/Boton/Boton'
import Insignia from '../../components/Shared/Insignia/Insignia'
import VentanaConfirmacion from '../../components/Shared/VentanaConfirmacion/VentanaConfirmacion'
import {
  listarPublicaciones,
  bloquearPublicacion,
  desbloquearPublicacion
} from '../../services/adminService'
import styles from './AdminPublicaciones.module.scss'

function formatearFecha(fecha) {
  if (!fecha) return '—'

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(fecha))
}

function formatearPrecio(valor) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Number(valor))
}

function datosEstado(publicacion) {
  if (publicacion.blocked) {
    return {
      etiqueta: 'Bloqueada',
      tipo: 'Error'
    }
  }

  const estados = {
    activa: { etiqueta: 'Activa', tipo: 'Correcto' },
    pausada: { etiqueta: 'Pausada', tipo: 'Pendiente' },
    agotada: { etiqueta: 'Agotada', tipo: 'Inactivo' },
    archivada: { etiqueta: 'Archivada', tipo: 'Inactivo' }
  }

  return estados[publicacion.status] || {
    etiqueta: publicacion.status || 'Sin estado',
    tipo: 'Inactivo'
  }
}

function mensajeError(error) {
  const codigo = error?.message ?? ''

  if (codigo.includes('publicacion_ya_bloqueada')) {
    return 'Esta publicación ya está bloqueada.'
  }

  if (codigo.includes('publicacion_no_bloqueada')) {
    return 'Esta publicación no está bloqueada.'
  }

  if (codigo.includes('publicacion_no_encontrada')) {
    return 'No encontramos la publicación seleccionada.'
  }

  if (codigo.includes('motivo_invalido')) {
    return 'El motivo debe tener entre 5 y 500 caracteres.'
  }

  if (codigo.includes('estado_publicacion_invalido')) {
    return 'El filtro de estado no es válido.'
  }

  if (
    codigo.includes('sin_permiso') ||
    codigo.includes('admin_required')
  ) {
    return 'No tienes permisos para realizar esta acción.'
  }

  return 'No pudimos completar la operación. Inténtalo nuevamente.'
}

function AdminPublicaciones() {
  const [publicaciones, setPublicaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [textoBusqueda, setTextoBusqueda] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('todos')
  const [bloqueo, setBloqueo] = useState('todos')
  const [refreshVersion, setRefreshVersion] = useState(0)

  const [accion, setAccion] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')

  useEffect(() => {
    let activo = true

    listarPublicaciones({
      busqueda,
      estado,
      bloqueado:
        bloqueo === 'bloqueadas'
          ? true
          : bloqueo === 'sin_bloqueo'
            ? false
            : null
    })
      .then(resultado => {
        if (!activo) return

        setPublicaciones(resultado)
        setError('')
      })
      .catch(errorConsulta => {
        if (!activo) return

        setError(mensajeError(errorConsulta))
      })
      .finally(() => {
        if (activo) setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [busqueda, estado, bloqueo, refreshVersion])

  function recargarPublicaciones() {
    setCargando(true)
    setError('')
    setRefreshVersion(version => version + 1)
  }

  const resumen = useMemo(() => ({
  total: publicaciones.length,

  bloqueadas: publicaciones.filter(
    publicacion => publicacion.blocked
  ).length,

  sinBloqueo: publicaciones.filter(
    publicacion => !publicacion.blocked
  ).length
}), [publicaciones])

  function buscar(evento) {
    evento.preventDefault()

    const nuevaBusqueda = textoBusqueda.trim()

    if (nuevaBusqueda === busqueda) {
      recargarPublicaciones()
      return
    }

    setCargando(true)
    setError('')
    setBusqueda(nuevaBusqueda)
  }

  function abrirAccion(tipo, publicacion) {
    setErrorAccion('')
    setAccion({ tipo, publicacion })
  }

  async function confirmarAccion(motivo) {
    if (!accion) return

    setEnviando(true)
    setErrorAccion('')

    try {
      const { tipo, publicacion } = accion

      if (tipo === 'bloquear') {
        await bloquearPublicacion(publicacion.offer_id, motivo)
      } else {
        await desbloquearPublicacion(publicacion.offer_id, motivo)
      }

      setAccion(null)
      recargarPublicaciones()
    } catch (errorOperacion) {
      setErrorAccion(mensajeError(errorOperacion))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className={styles.pagina}>
      <header className={styles.encabezado}>
        <div>
          <h1>Administrar publicaciones</h1>
          <p>
            Consulta y modera las publicaciones realizadas por los comercios.
          </p>
        </div>

        <Boton
          variante="secundario"
          onClick={recargarPublicaciones}
          disabled={cargando}
        >
          Actualizar
        </Boton>
      </header>

      <section className={styles.resumen}>
        <article>
          <span>Publicaciones encontradas</span>
          <strong>{resumen.total}</strong>
        </article>

        <article>
          <span>Sin bloqueo administrativo</span>
          <strong>{resumen.sinBloqueo}</strong>
        </article>

        <article>
          <span>Bloqueadas</span>
          <strong>{resumen.bloqueadas}</strong>
        </article>
      </section>

      <section className={styles.filtros}>
        <div className={styles.tituloFiltros}>
          <h2>Directorio de publicaciones</h2>
          <span>{publicaciones.length} resultados</span>
        </div>

        <form className={styles.formularioFiltros} onSubmit={buscar}>
          <div className={styles.campoBusqueda}>
            <label htmlFor="buscar-publicacion">
              Buscar publicación
            </label>

            <input
              id="buscar-publicacion"
              type="search"
              placeholder="Producto, comercio o ciudad..."
              value={textoBusqueda}
              onChange={evento => setTextoBusqueda(evento.target.value)}
            />
          </div>

          <div className={styles.campo}>
            <label htmlFor="estado-publicacion">Estado operativo</label>

            <select
              id="estado-publicacion"
              value={estado}
              onChange={evento => {
                setCargando(true)
                setError('')
                setEstado(evento.target.value)
              }}
            >
              <option value="todos">Todos los estados</option>
              <option value="activa">Activas</option>
              <option value="pausada">Pausadas</option>
              <option value="agotada">Agotadas</option>
              <option value="archivada">Archivadas</option>
            </select>
          </div>

          <div className={styles.campo}>
            <label htmlFor="filtro-bloqueo">Bloqueo administrativo</label>

            <select
              id="filtro-bloqueo"
              value={bloqueo}
              onChange={evento => {
                setCargando(true)
                setError('')
                setBloqueo(evento.target.value)
              }}
            >
              <option value="todos">Todas</option>
              <option value="bloqueadas">Bloqueadas</option>
              <option value="sin_bloqueo">Sin bloqueo</option>
            </select>
          </div>

          <Boton type="submit" disabled={cargando}>
            Buscar
          </Boton>
        </form>
      </section>

      {error && (
        <div className={styles.error} role="alert">
          <span>{error}</span>

          <Boton
            variante="secundario"
            onClick={recargarPublicaciones}
          >
            Reintentar
          </Boton>
        </div>
      )}

      <section className={styles.tablaCard}>
        {cargando ? (
          <p className={styles.estadoCarga}>
            Cargando publicaciones...
          </p>
        ) : publicaciones.length === 0 ? (
          <div className={styles.vacio}>
            <h3>No encontramos publicaciones</h3>
            <p>
              Prueba con otro término de búsqueda o modifica los filtros.
            </p>
          </div>
        ) : (
          <div className={styles.tablaScroll}>
            <table>
              <thead>
                <tr>
                  <th>Publicación</th>
                  <th>Comercio</th>
                  <th>Precio unitario</th>
                  <th>Disponibilidad</th>
                  <th>Estado</th>
                  <th>Moderación</th>
                  <th>Registro</th>
                  <th>Acción</th>
                </tr>
              </thead>

              <tbody>
                {publicaciones.map(publicacion => {
                  const estadoInfo = datosEstado(publicacion)

                  return (
                    <tr key={publicacion.offer_id}>
                      <td>
                        <strong>{publicacion.title}</strong>
                        <span className={styles.secundario}>
                          {publicacion.category}
                        </span>
                      </td>

                      <td>
                        <strong>{publicacion.seller_name}</strong>
                        <span className={styles.secundario}>
                          {publicacion.seller_city}
                        </span>
                      </td>

                      <td>
                        {formatearPrecio(publicacion.unit_price)}
                      </td>

                      <td>
                        <strong>
                          {publicacion.qty_available} disponibles
                        </strong>
                        <span className={styles.secundario}>
                          {publicacion.qty_reserved} reservadas
                        </span>
                      </td>

                      <td>
                        <Insignia tipo={estadoInfo.tipo}>
                          {estadoInfo.etiqueta}
                        </Insignia>
                      </td>

                      <td className={styles.motivo}>
                        {publicacion.blocked
                          ? publicacion.block_reason || 'Bloqueada'
                          : 'Sin bloqueo'}
                      </td>

                      <td>
                        {formatearFecha(publicacion.created_at)}
                      </td>

                      <td>
                        {publicacion.blocked ? (
                          <Boton
                            variante="principal"
                            className={styles.botonAccion}
                            onClick={() =>
                              abrirAccion('desbloquear', publicacion)
                            }
                          >
                            Desbloquear
                          </Boton>
                        ) : (
                          <Boton
                            variante="peligro"
                            className={styles.botonAccion}
                            onClick={() =>
                              abrirAccion('bloquear', publicacion)
                            }
                          >
                            Bloquear
                          </Boton>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className={styles.pie}>
        Los bloqueos y desbloqueos requieren un motivo y quedan registrados
        en el historial de auditoría. El bloqueo administrativo no modifica
        el estado operativo ni las cantidades de la publicación.
      </p>

      <VentanaConfirmacion
        abierta={Boolean(accion)}
        titulo={
          accion?.tipo === 'bloquear'
            ? 'Bloquear publicación'
            : 'Desbloquear publicación'
        }
        descripcion={
          accion?.tipo === 'bloquear'
            ? `¿Confirmas el bloqueo de "${accion?.publicacion.title}"?`
            : `¿Confirmas el desbloqueo de "${accion?.publicacion.title}"?`
        }
        puntos={
          accion?.tipo === 'bloquear'
            ? [
                'La publicación quedará marcada como bloqueada por administración.',
                'No se modificarán las cantidades disponibles ni reservadas.',
                'El motivo quedará registrado en la auditoría.'
              ]
            : [
                'Se retirará el bloqueo administrativo.',
                'Se conservará el estado operativo anterior de la publicación.',
                'El desbloqueo quedará registrado en la auditoría.'
              ]
        }
        pideMotivo
        etiquetaMotivo="Motivo de la decisión"
        ejemploMotivo="Explica el motivo de esta decisión..."
        textoConfirmar={
          accion?.tipo === 'bloquear'
            ? 'Confirmar bloqueo'
            : 'Confirmar desbloqueo'
        }
        peligro={accion?.tipo === 'bloquear'}
        enviando={enviando}
        error={errorAccion}
        onConfirmar={confirmarAccion}
        onCancelar={() => {
          if (!enviando) {
            setAccion(null)
            setErrorAccion('')
          }
        }}
      />
    </main>
  )
}

export default AdminPublicaciones
