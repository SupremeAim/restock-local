import { useState } from 'react'
import Boton from '../../Shared/Boton/Boton'
import { agregarEventoNuevo, construirHistorial } from '../../../helpers/historial'
import { TIPOS_EVENTO, formatearCOP, formatearFecha } from '../../../helpers/solicitudes'
import styles from './HistorialNegociacion.module.scss'

function describirCambio(evento) {
  const terminos =
    evento.qty != null && evento.price != null
      ? `${evento.qty} unidades a ${formatearCOP(evento.price)} por unidad`
      : ''

  switch (evento.type) {
    case 'creada':
      return `Propuesta inicial: ${terminos}`
    case 'contrapropuesta':
      return terminos
    case 'aceptada':
      return `${terminos}. Se reservaron ${evento.qty} unidades.`
    case 'revision_iniciada':
      return 'El vendedor empezó a revisar la solicitud.'
    case 'despachada':
      return 'Enviado o puesto en entrega según lo acordado.'
    case 'recibida':
     return `${evento.qty ?? ''} unidades entregadas. El acuerdo queda cerrado.`.trim()
    case 'rechazada':
      return 'El vendedor rechazó la solicitud.'
    case 'cancelada':
      return evento.qty != null
        ? `Se liberaron ${evento.qty} unidades reservadas.`
        : 'La solicitud se canceló antes de aceptarse.'
    default:
      return terminos
  }
}

function abreviar(evento) {
  if (evento.qty != null && evento.price != null) {
    return `${evento.qty} u. · ${formatearCOP(evento.price, false)}`
  }
  return '—'
}

function sincronizar(lista, eventos) {
  if (eventos.length < lista.tamano()) {
    return { lista: construirHistorial(eventos), hayNovedades: false }
  }

  const ultimoSeq = lista.ultimo()?.seq ?? 0
  const nuevos = eventos.filter((evento) => evento.seq > ultimoSeq).sort((a, b) => a.seq - b.seq)
  let hayNovedades = false

  for (const evento of nuevos) {
    const respuesta = agregarEventoNuevo(lista, evento)
    if (respuesta.resultado === 'recargar') {
      return { lista: construirHistorial(eventos), hayNovedades: false }
    }
    if (respuesta.hayNovedades) hayNovedades = true
  }

  return { lista, hayNovedades }
}

function HistorialNegociacion({ eventos, negocios = {} }) {
  const [lista, setLista] = useState(() => construirHistorial(eventos))
  const [eventosPrevios, setEventosPrevios] = useState(eventos)
  const [hayNovedades, setHayNovedades] = useState(false)
  const [, setVersion] = useState(0)

  if (eventos !== eventosPrevios) {
    setEventosPrevios(eventos)
    const resultado = sincronizar(lista, eventos)
    if (resultado.lista !== lista) {
      setLista(resultado.lista)
      setHayNovedades(false)
    } else if (resultado.hayNovedades) {
      setHayNovedades(true)
    }
  }

  if (lista.estaVacia()) {
    return (
      <section className={styles.tarjeta}>
        <h2>Historial de la negociación</h2>
        <p className={styles.vacio}>Todavía no hay eventos registrados.</p>
      </section>
    )
  }

  const evento = lista.actual()
  const actor = negocios[evento.actor_id]?.name ?? 'Comercio'

  function mover(direccion) {
    if (direccion === 'anterior') lista.anterior()
    if (direccion === 'siguiente') lista.siguiente()
    if (!lista.haySiguiente()) setHayNovedades(false)
    setVersion((v) => v + 1)
  }

  function irAlUltimo() {
    lista.irAlUltimo()
    setHayNovedades(false)
    setVersion((v) => v + 1)
  }

  const todos = lista.recorrerAdelante()
  const posicion = lista.posicion()

  return (
    <section className={styles.tarjeta} aria-labelledby="historial-titulo">
      <header className={styles.encabezado}>
        <div>
          <h2 id="historial-titulo">Historial de la negociación</h2>
          <p aria-live="polite">
            Evento {posicion} de {lista.tamano()}
          </p>
        </div>
        {lista.tamano() > 1 && (
          <div className={styles.navegacion}>
            <Boton variante="secundario" onClick={() => mover('anterior')} disabled={!lista.hayAnterior()}>
              ← Anterior
            </Boton>
            <Boton variante="secundario" onClick={() => mover('siguiente')} disabled={!lista.haySiguiente()}>
              Siguiente →
            </Boton>
          </div>
        )}
      </header>

      {hayNovedades && (
        <div className={styles.novedades} role="status">
          <span>Hay eventos nuevos en esta negociación.</span>
          <button type="button" onClick={irAlUltimo}>
            Ver lo más reciente
          </button>
        </div>
      )}

      <article className={styles.actual}>
        <h3>{TIPOS_EVENTO[evento.type] ?? evento.type}</h3>
        <p className={styles.meta}>
          {actor} · {formatearFecha(evento.created_at)}
        </p>
        {describirCambio(evento) && <p>{describirCambio(evento)}</p>}
        {evento.note && <p className={styles.nota}>Nota: «{evento.note}»</p>}
      </article>

      <ol className={styles.lista}>
        {todos.map((item, indice) => {
          const esActual = indice + 1 === posicion
          return (
            <li
              key={item.seq}
              className={esActual ? styles.seleccionado : ''}
              aria-current={esActual ? 'step' : undefined}
            >
              <span className={styles.numero}>{item.seq}</span>
              <div className={styles.texto}>
                <strong>{TIPOS_EVENTO[item.type] ?? item.type}</strong>
                <span>
                  {negocios[item.actor_id]?.name ?? 'Comercio'} · {formatearFecha(item.created_at)}
                </span>
              </div>
              <span className={styles.terminos}>{abreviar(item)}</span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export default HistorialNegociacion
