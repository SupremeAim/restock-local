
import { useEffect, useMemo, useState } from 'react'
import Boton from '../../components/Shared/Boton/Boton'
import Insignia from '../../components/Shared/Insignia/Insignia'
import VentanaConfirmacion from '../../components/Shared/VentanaConfirmacion/VentanaConfirmacion'
import {
  listarComercios,
  suspenderComercio,
  rehabilitarComercio
} from '../../services/adminService'
import styles from './AdminComercios.module.scss'

function formatearFecha(fecha) {
  if (!fecha) return '—'

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(fecha))
}

function mensajeError(error) {
  const codigo = error?.message ?? ''

  if (codigo.includes('comercio_ya_suspendido')) {
    return 'Este comercio ya está suspendido.'
  }

  if (codigo.includes('comercio_no_suspendido')) {
    return 'Este comercio ya está habilitado.'
  }

  if (codigo.includes('comercio_no_encontrado')) {
    return 'No encontramos el comercio seleccionado.'
  }

  if (codigo.includes('motivo_invalido')) {
    return 'El motivo debe tener entre 5 y 500 caracteres.'
  }

  if (codigo.includes('sin_permiso')) {
    return 'No tienes permisos para realizar esta acción.'
  }

  return 'No pudimos completar la operación. Inténtalo nuevamente.'
}

function AdminComercios() {
  const [comercios, setComercios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [textoBusqueda, setTextoBusqueda] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('todos')
  const [refreshVersion, setRefreshVersion] = useState(0)

  const [accion, setAccion] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')

  useEffect(() => {
    let activo = true

    listarComercios({ busqueda, estado })
      .then(resultado => {
        if (!activo) return

        setComercios(resultado)
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
  }, [busqueda, estado, refreshVersion])

  function recargarComercios() {
    setCargando(true)
    setError('')
    setRefreshVersion(version => version + 1)
  }

  const resumen = useMemo(() => ({
    total: comercios.length,
    habilitados: comercios.filter(
      comercio => comercio.status === 'habilitado'
    ).length,
    suspendidos: comercios.filter(
      comercio => comercio.status === 'suspendido'
    ).length
  }), [comercios])

  function buscar(evento) {
    evento.preventDefault()

    const nuevaBusqueda = textoBusqueda.trim()

    if (nuevaBusqueda === busqueda) {
      recargarComercios()
      return
    }

    setCargando(true)
    setError('')
    setBusqueda(nuevaBusqueda)
  }

  function abrirAccion(tipo, comercio) {
    setErrorAccion('')
    setAccion({ tipo, comercio })
  }

  async function confirmarAccion(motivo) {
    if (!accion) return

    setEnviando(true)
    setErrorAccion('')

    try {
      const { tipo, comercio } = accion

      if (tipo === 'suspender') {
        await suspenderComercio(comercio.business_id, motivo)
      } else {
        await rehabilitarComercio(comercio.business_id, motivo)
      }

      setAccion(null)
      recargarComercios()
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
          <h1>Administrar comercios</h1>
          <p>
            Consulta los comercios registrados y administra sus estados.
          </p>
        </div>

        <Boton
          variante="secundario"
          onClick={recargarComercios}
          disabled={cargando}
        >
          Actualizar
        </Boton>
      </header>

      <section className={styles.resumen}>
        <article>
          <span>Comercios encontrados</span>
          <strong>{resumen.total}</strong>
        </article>

        <article>
          <span>Habilitados</span>
          <strong>{resumen.habilitados}</strong>
        </article>

        <article>
          <span>Suspendidos</span>
          <strong>{resumen.suspendidos}</strong>
        </article>
      </section>

      <section className={styles.filtros}>
        <div className={styles.tituloFiltros}>
          <h2>Directorio de comercios</h2>
          <span>{comercios.length} resultados</span>
        </div>

        <form className={styles.formularioFiltros} onSubmit={buscar}>
          <div className={styles.campoBusqueda}>
            <label htmlFor="buscar-comercio">Buscar comercio</label>

            <input
              id="buscar-comercio"
              type="search"
              placeholder="Nombre del comercio..."
              value={textoBusqueda}
              onChange={evento => setTextoBusqueda(evento.target.value)}
            />
          </div>

          <div className={styles.campoEstado}>
            <label htmlFor="estado-comercio">Estado</label>

            <select
              id="estado-comercio"
              value={estado}
              onChange={evento => {
                setCargando(true)
                setError('')
                setEstado(evento.target.value)
              }}
            >
              <option value="todos">Todos los estados</option>
              <option value="habilitado">Habilitados</option>
              <option value="suspendido">Suspendidos</option>
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
            onClick={recargarComercios}
          >
            Reintentar
          </Boton>
        </div>
      )}

      <section className={styles.tablaCard}>
        {cargando ? (
          <p className={styles.estadoCarga}>
            Cargando comercios...
          </p>
        ) : comercios.length === 0 ? (
          <div className={styles.vacio}>
            <h3>No encontramos comercios</h3>
            <p>Prueba con otro nombre o cambia los filtros.</p>
          </div>
        ) : (
          <div className={styles.tablaScroll}>
            <table>
              <thead>
                <tr>
                  <th>Comercio</th>
                  <th>Ubicación</th>
                  <th>Contacto</th>
                  <th>Estado</th>
                  <th>Motivo de suspensión</th>
                  <th>Registro</th>
                  <th>Acción</th>
                </tr>
              </thead>

              <tbody>
                {comercios.map(comercio => (
                  <tr key={comercio.business_id}>
                    <td>
                      <strong>{comercio.business_name}</strong>
                    </td>

                    <td>
                      {comercio.city}
                      <span className={styles.secundario}>
                        {comercio.sector}
                      </span>
                    </td>

                    <td>{comercio.contact_name || '—'}</td>

                    <td>
                      <Insignia
                        tipo={
                          comercio.status === 'habilitado'
                            ? 'Correcto'
                            : 'Error'
                        }
                      >
                        {comercio.status === 'habilitado'
                          ? 'Habilitado'
                          : 'Suspendido'}
                      </Insignia>
                    </td>

                    <td className={styles.motivo}>
                      {comercio.suspend_reason || '—'}
                    </td>

                    <td>{formatearFecha(comercio.created_at)}</td>

                    <td>
                      {comercio.status === 'habilitado' ? (
                        <Boton
                          variante="peligro"
                          className={styles.botonAccion}
                          onClick={() => abrirAccion('suspender', comercio)}
                        >
                          Suspender
                        </Boton>
                      ) : (
                        <Boton
                          variante="principal"
                          className={styles.botonAccion}
                          onClick={() => abrirAccion('rehabilitar', comercio)}
                        >
                          Rehabilitar
                        </Boton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className={styles.pie}>
        Las acciones administrativas quedan registradas en el historial.
      </p>

      <VentanaConfirmacion
        abierta={Boolean(accion)}
        titulo={
          accion?.tipo === 'suspender'
            ? 'Suspender comercio'
            : 'Rehabilitar comercio'
        }
        descripcion={
          accion?.tipo === 'suspender'
            ? `¿Confirmas la suspensión de ${accion?.comercio.business_name}?`
            : `¿Confirmas la rehabilitación de ${accion?.comercio.business_name}?`
        }
        puntos={
          accion?.tipo === 'suspender'
            ? [
                'El comercio perderá acceso a sus operaciones.',
                'Los acuerdos y las reservas existentes se conservarán.',
                'El motivo quedará registrado en la auditoría.'
              ]
            : [
                'El comercio recuperará el acceso a sus operaciones.',
                'Se conservarán sus publicaciones y negociaciones.',
                'La rehabilitación quedará registrada en la auditoría.'
              ]
        }
        pideMotivo
        etiquetaMotivo="Motivo de la decisión"
        ejemploMotivo="Explica el motivo de esta decisión..."
        textoConfirmar={
          accion?.tipo === 'suspender'
            ? 'Confirmar suspensión'
            : 'Confirmar rehabilitación'
        }
        peligro={accion?.tipo === 'suspender'}
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

export default AdminComercios
