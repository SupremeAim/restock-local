import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../../../hooks/useAuth'
import { crearSolicitud } from '../../../services/solicitudes'
import { disponibilidadParaSolicitar } from '../../../helpers/solicitudes'
import { accionParaError, mensajeDeError } from '../../../helpers/erroresNegociacion'
import FormularioContrapropuesta from '../../Negociacion/FormularioContrapropuesta/FormularioContrapropuesta'
import Boton from '../../Shared/Boton/Boton'
import styles from './EnviarSolicitud.module.scss'

const AVISOS = {
  propia: 'Esta es una de tus ofertas. Las solicitudes que te envíen aparecerán en Solicitudes recibidas.',
  sin_unidades: 'Ya no quedan unidades suficientes para cumplir la compra mínima de esta oferta.',
  no_disponible: 'Esta oferta no está recibiendo solicitudes en este momento.'
}

function EnviarSolicitud({ oferta }) {
  const { user } = useAuth()
  const navegar = useNavigate()
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  const disponibilidad = disponibilidadParaSolicitar(oferta, user?.id)

  async function enviar(datos) {
    setEnviando(true)
    setError(null)
    try {
      const solicitud = await crearSolicitud(oferta.id, datos)
      navegar(`/negociaciones/${solicitud.id}`)
    } catch (fallo) {
      setError(fallo)
      setEnviando(false)
    }
  }

  if (disponibilidad !== 'disponible') {
    return (
      <section className={styles.tarjeta} aria-labelledby="enviar-solicitud-titulo">
        <h2 id="enviar-solicitud-titulo">Enviar solicitud</h2>
        <p className={styles.aviso}>{AVISOS[disponibilidad]}</p>
        {disponibilidad === 'propia' && (
          <Boton variante="secundario" to="/solicitudes-recibidas" className={styles.botonSuelto}>
            Ver solicitudes recibidas
          </Boton>
        )}
      </section>
    )
  }

  const accion = error ? accionParaError(error) : null

  return (
    <section className={styles.tarjeta} aria-labelledby="enviar-solicitud-titulo">
      <h2 id="enviar-solicitud-titulo" className={styles.oculto}>
        Enviar solicitud
      </h2>

      {error && (
        <div className={styles.error} role="alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <path d="M12 7v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="16.5" r="1.2" fill="currentColor" />
          </svg>
          <div>
            <p>{mensajeDeError(error)}</p>
            {accion && (
              <Boton variante="secundario" to={accion.ruta} className={styles.accionError}>
                {accion.texto}
              </Boton>
            )}
          </div>
        </div>
      )}

      <FormularioContrapropuesta
        oferta={oferta}
        inicial={{ cantidad: oferta.min_purchase, precio: oferta.unit_price }}
        onEnviar={enviar}
        enviando={enviando}
        titulo="Enviar solicitud"
        ayuda="Propón la cantidad y el precio por unidad. El vendedor puede aceptar, rechazar o hacerte una contrapropuesta."
        etiquetaTotal="Total de la solicitud"
        textoEnviar="Enviar solicitud"
        sinBorde
      />

      <p className={styles.nota}>
        Las unidades no se reservan hasta que ambas partes acepten. El pago y la entrega se coordinan por
        fuera de la plataforma.
      </p>
    </section>
  )
}

export default EnviarSolicitud
