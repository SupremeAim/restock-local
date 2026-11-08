import Boton from '../../Shared/Boton/Boton'
import Insignia from '../../Shared/Insignia/Insignia'
import {
  ACCIONES,
  accionesDisponibles,
  calcularTotal,
  esMiTurno,
  formatearCOP,
  formatearFecha,
  rolEnSolicitud
} from '../../../helpers/solicitudes'
import styles from './PropuestaVigente.module.scss'

const TITULOS = {
  pendiente: 'Propuesta inicial',
  en_negociacion: 'Propuesta vigente',
  aceptada: 'Acuerdo aceptado',
  despachada: 'Acuerdo despachado',
  recibida: 'Acuerdo completado',
  rechazada: 'Solicitud rechazada',
  cancelada: 'Solicitud cancelada'
}

const VARIANTES = {
  iniciar_revision: 'principal',
  aceptar: 'principal',
  despachar: 'principal',
  confirmar_recepcion: 'principal',
  contraproponer: 'secundario',
  rechazar: 'peligro',
  cancelar: 'peligro',
  cancelar_acuerdo: 'peligro'
}

function aviso(solicitud, rol, acciones) {
  const unidades = `${solicitud.current_qty} unidades`
  switch (solicitud.status) {
    case 'pendiente':
      return rol === 'vendedor'
        ? 'Iniciar la revisión no acepta la solicitud ni reserva unidades.'
        : 'Enviar la solicitud no reservó unidades. Se reservan solo si el vendedor acepta.'
    case 'en_negociacion':
      return acciones.includes('aceptar')
        ? `Si aceptas, se reservan ${unidades} de la oferta. La disponibilidad se valida de nuevo en ese momento.`
        : 'Todavía no hay unidades reservadas.'
    case 'aceptada':
      return rol === 'vendedor'
        ? `Las ${unidades} quedaron reservadas. Marca el acuerdo como despachado cuando lo envíes. El pago y la entrega se coordinan por fuera de la plataforma.`
        : `Las ${unidades} quedaron reservadas para ti. El pago y la entrega se coordinan por fuera de la plataforma.`
    case 'despachada':
      return rol === 'comprador'
        ? 'Confirmar la recepción cierra el acuerdo. No es una prueba de pago. Después del despacho el acuerdo ya no se puede cancelar en la plataforma.'
        : 'Esperando a que el comprador confirme la recepción.'
    case 'recibida':
      return 'Este acuerdo está cerrado. Para más unidades se puede enviar una nueva solicitud.'
    default:
      return ''
  }
}

function PropuestaVigente({
  solicitud,
  miId,
  negocios = {},
  precioPublicado,
  onAccion,
  deshabilitado = false,
  error = '',
  children
}) {
  const rol = rolEnSolicitud(solicitud, miId)
  const acciones = accionesDisponibles(solicitud, miId)
  const miTurno = esMiTurno(solicitud, miId)
  const autor = negocios[solicitud.current_author_id]?.name ?? 'La otra parte'
  const rolAutor = solicitud.current_author_id === solicitud.buyer_id ? 'comprador' : 'vendedor'
  const terminado = ['recibida', 'rechazada', 'cancelada'].includes(solicitud.status)
  const textoAviso = aviso(solicitud, rol, acciones)

  const datos = [
    ['Cantidad', `${solicitud.current_qty} unidades`],
    ['Precio unitario', formatearCOP(solicitud.current_price)],
    ['Total', formatearCOP(calcularTotal(solicitud.current_qty, solicitud.current_price))]
  ]
  if (precioPublicado !== undefined) datos.push(['Precio publicado', formatearCOP(precioPublicado)])

  return (
    <section className={styles.tarjeta} aria-labelledby="propuesta-titulo">
      <header className={styles.encabezado}>
        <h2 id="propuesta-titulo">{TITULOS[solicitud.status] ?? 'Solicitud'}</h2>
        {!terminado &&
          (miTurno ? (
            <Insignia tipo="Pendiente">Tu turno</Insignia>
          ) : (
            <Insignia tipo="Inactivo">Turno de la otra parte</Insignia>
          ))}
        {solicitud.status === 'recibida' && <Insignia tipo="Correcto">Completado</Insignia>}
      </header>

      {['pendiente', 'en_negociacion'].includes(solicitud.status) && (
        <p className={styles.autor}>
          Enviada por {autor} ({rolAutor}) · {formatearFecha(solicitud.updated_at ?? solicitud.created_at)}
        </p>
      )}

      <dl className={styles.datos}>
        {datos.map(([etiqueta, valor]) => (
          <div key={etiqueta}>
            <dt>{etiqueta}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>

      {solicitud.cancel_reason && (
        <p className={styles.motivo}>
          <strong>Motivo:</strong> {solicitud.cancel_reason}
        </p>
      )}

      {error && (
        <div className={styles.error} role="alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <path d="M12 7v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="16.5" r="1.2" fill="currentColor" />
          </svg>
          <p>{error}</p>
        </div>
      )}

      {textoAviso && <p className={terminado ? styles.avisoCerrado : styles.aviso}>{textoAviso}</p>}

      {acciones.length > 0 && (
        <div className={styles.acciones}>
          {acciones.map((accion) => (
            <Boton
              key={accion}
              variante={VARIANTES[accion]}
              disabled={deshabilitado}
              onClick={() => onAccion(accion)}
            >
              {ACCIONES[accion]}
            </Boton>
          ))}
        </div>
      )}

      {children}
    </section>
  )
}

export default PropuestaVigente
