import { useState } from 'react'
import { Link, useParams } from 'react-router'
import LayoutComercio from '../../components/Shared/LayoutComercio/LayoutComercio'
import EncabezadoPagina from '../../components/Shared/EncabezadoPagina/EncabezadoPagina'
import AvisoDesconexion from '../../components/Shared/AvisoDesconexion/AvisoDesconexion'
import EstadoVacio from '../../components/Shared/EstadoVacio/EstadoVacio'
import Boton from '../../components/Shared/Boton/Boton'
import VentanaConfirmacion from '../../components/Shared/VentanaConfirmacion/VentanaConfirmacion'
import { InsigniaEstado } from '../../components/Shared/Insignia/Insignia'
import PropuestaVigente from '../../components/Negociacion/PropuestaVigente/PropuestaVigente'
import FormularioContrapropuesta from '../../components/Negociacion/FormularioContrapropuesta/FormularioContrapropuesta'
import HistorialNegociacion from '../../components/Negociacion/HistorialNegociacion/HistorialNegociacion'
import ResumenOferta from '../../components/Negociacion/ResumenOferta/ResumenOferta'
import TarjetaContraparte from '../../components/Negociacion/TarjetaContraparte/TarjetaContraparte'
import { useAuth } from '../../hooks/useAuth'
import { useNegociacion } from '../../hooks/useNegociacion'
import { formatearFecha, rolEnSolicitud } from '../../helpers/solicitudes'
import styles from './Negociacion.module.scss'

function confirmaciones(detalle, nombreOtro) {
  const unidades = `${detalle.current_qty} unidades`
  return {
    rechazar: {
      titulo: '¿Rechazar esta solicitud?',
      descripcion: `${nombreOtro} verá la solicitud como rechazada. Esta acción no se puede deshacer.`,
      puntos: [
        'No se reservan ni se liberan unidades, porque la propuesta no se había aceptado.',
        'El comprador podrá enviar una nueva solicitud sobre esta oferta.'
      ],
      textoConfirmar: 'Sí, rechazar solicitud'
    },
    cancelar: {
      titulo: '¿Cancelar esta solicitud?',
      descripcion: `${nombreOtro} verá la solicitud como cancelada. Esta acción no se puede deshacer.`,
      puntos: ['No se reservaron unidades, porque la propuesta no se había aceptado.'],
      textoConfirmar: 'Sí, cancelar solicitud'
    },
    cancelar_acuerdo: {
      titulo: '¿Cancelar este acuerdo?',
      descripcion: `Las ${unidades} reservadas se liberarán y volverán a quedar disponibles. ${nombreOtro} verá el acuerdo como cancelado, junto con el motivo.`,
      pideMotivo: true,
      etiquetaMotivo: 'Motivo de la cancelación',
      ejemploMotivo: 'Ej.: no tengo el producto en el estado acordado.',
      textoConfirmar: 'Sí, cancelar acuerdo'
    },
    despachar: {
      titulo: '¿Marcar como despachada?',
      descripcion: `Confirma que enviaste o pusiste en entrega las ${unidades} según lo acordado.`,
      puntos: ['Después del despacho el acuerdo ya no se puede cancelar en la plataforma.'],
      textoConfirmar: 'Sí, marcar como despachada',
      peligro: false
    },
    confirmar_recepcion: {
      titulo: '¿Confirmar la recepción?',
      descripcion: `Confirma solo si recibiste las ${unidades}. Esto cierra el acuerdo.`,
      puntos: ['Confirmar la recepción no es una prueba de pago.'],
      textoConfirmar: 'Sí, confirmar recepción',
      peligro: false
    }
  }
}

function Negociacion() {
  const { id } = useParams()
  const { user } = useAuth()
  const {
    detalle,
    eventos,
    telefono,
    cargando,
    noEncontrada,
    error,
    errorAccion,
    enviando,
    conectado,
    ejecutar,
    limpiarErrorAccion,
    recargar
  } = useNegociacion(id)
  const [contraproponiendo, setContraproponiendo] = useState(false)
  const [porConfirmar, setPorConfirmar] = useState(null)

  if (cargando) {
    return (
      <LayoutComercio>
        <p className={styles.estado} role="status">
          Cargando negociación...
        </p>
      </LayoutComercio>
    )
  }

  if (noEncontrada) {
    return (
      <LayoutComercio>
        <EstadoVacio
          icono="candado"
          peligro
          titulo="No tienes acceso a esta negociación"
          descripcion="Solo el comercio comprador y el comercio vendedor de una solicitud pueden ver sus términos y su historial."
        >
          <Boton to="/solicitudes-recibidas">Ver mis solicitudes</Boton>
          <Boton to="/catalogo" variante="secundario">
            Ir al catálogo
          </Boton>
        </EstadoVacio>
      </LayoutComercio>
    )
  }

  if (error && !detalle) {
    return (
      <LayoutComercio>
        <div className={styles.error} role="alert">
          <span>{error}</span>
          <Boton variante="secundario" onClick={recargar}>
            Reintentar
          </Boton>
        </div>
      </LayoutComercio>
    )
  }

  const rol = rolEnSolicitud(detalle, user?.id)
  const esVendedor = rol === 'vendedor'
  const negocios = {
    [detalle.buyer_id]: { name: detalle.buyer_name, city: detalle.buyer_city, sector: detalle.buyer_sector },
    [detalle.seller_id]: { name: detalle.seller_name, city: detalle.seller_city, sector: detalle.seller_sector }
  }
  const otro = negocios[esVendedor ? detalle.buyer_id : detalle.seller_id]
  const textos = confirmaciones(detalle, otro.name)
  const oferta = {
    title: detalle.offer_title,
    unit_price: detalle.offer_unit_price,
    min_purchase: detalle.offer_min_purchase,
    qty_available: detalle.offer_qty_available,
    qty_reserved: detalle.offer_qty_reserved,
    qty_delivered: detalle.offer_qty_delivered,
    status: detalle.offer_status,
    blocked: detalle.offer_blocked
  }

  function alPedirAccion(accion) {
    limpiarErrorAccion()
    if (accion === 'contraproponer') {
      setContraproponiendo(true)
      return
    }
    if (textos[accion]) {
      setPorConfirmar(accion)
      return
    }
    ejecutar(accion)
  }

  async function confirmar(motivo) {
    const ok = await ejecutar(porConfirmar, { motivo })
    if (ok) setPorConfirmar(null)
  }

  async function enviarContrapropuesta(datos) {
    const ok = await ejecutar('contraproponer', datos)
    if (ok) setContraproponiendo(false)
  }

  return (
    <LayoutComercio>
      <Link
        to={esVendedor ? '/solicitudes-recibidas' : '/solicitudes-enviadas'}
        className={styles.volver}
      >
        ← Volver a solicitudes {esVendedor ? 'recibidas' : 'enviadas'}
      </Link>

      <EncabezadoPagina
        titulo={`Negociación con ${otro.name}`}
        subtitulo={`${detalle.offer_title} · solicitud creada el ${formatearFecha(detalle.created_at)}`}
        insignia={<InsigniaEstado estado={detalle.status} />}
        conectado={conectado}
      />

      {!conectado && <AvisoDesconexion onReintentar={recargar} />}

      <div className={styles.columnas}>
        <div className={styles.principal}>
          <PropuestaVigente
            solicitud={detalle}
            miId={user?.id}
            negocios={negocios}
            precioPublicado={detalle.offer_unit_price}
            onAccion={alPedirAccion}
            deshabilitado={enviando || !conectado || contraproponiendo}
            error={porConfirmar ? '' : errorAccion}
          >
            {contraproponiendo && (
              <FormularioContrapropuesta
                oferta={oferta}
                inicial={{ cantidad: detalle.current_qty, precio: detalle.current_price }}
                enviando={enviando}
                onEnviar={enviarContrapropuesta}
                onCancelar={() => setContraproponiendo(false)}
              />
            )}
          </PropuestaVigente>

          <HistorialNegociacion key={detalle.id} eventos={eventos} negocios={negocios} />
        </div>

        <div className={styles.lateral}>
          <ResumenOferta oferta={oferta} esVendedor={esVendedor} />
          <TarjetaContraparte
            rol={esVendedor ? 'Comprador' : 'Vendedor'}
            negocio={otro}
            telefono={telefono}
          />
        </div>
      </div>

      <VentanaConfirmacion
        abierta={Boolean(porConfirmar)}
        {...(porConfirmar ? textos[porConfirmar] : {})}
        enviando={enviando}
        error={errorAccion}
        onConfirmar={confirmar}
        onCancelar={() => setPorConfirmar(null)}
      />
    </LayoutComercio>
  )
}

export default Negociacion
