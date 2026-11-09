import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import LayoutComercio from '../../components/Shared/LayoutComercio/LayoutComercio'
import EncabezadoPagina from '../../components/Shared/EncabezadoPagina/EncabezadoPagina'
import AvisoDesconexion from '../../components/Shared/AvisoDesconexion/AvisoDesconexion'
import EstadoVacio from '../../components/Shared/EstadoVacio/EstadoVacio'
import Boton from '../../components/Shared/Boton/Boton'
import VentanaConfirmacion from '../../components/Shared/VentanaConfirmacion/VentanaConfirmacion'
import ColaRevision from '../../components/Solicitudes/ColaRevision/ColaRevision'
import FiltrosEstado from '../../components/Solicitudes/FiltrosEstado/FiltrosEstado'
import ListaSolicitudes from '../../components/Solicitudes/ListaSolicitudes/ListaSolicitudes'
import { useAuth } from '../../hooks/useAuth'
import { useSolicitudes } from '../../hooks/useSolicitudes'
import { ejecutarAccion } from '../../services/solicitudes'
import { contarPorEstado, filtrarSolicitudes, mapasDesdeFilas } from '../../helpers/solicitudes'
import { mensajeDeError } from '../../helpers/erroresNegociacion'
import styles from './SolicitudesRecibidas.module.scss'

function SolicitudesRecibidas() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { solicitudes, cargando, error, conectado, recargar } = useSolicitudes('recibidas')
  const [filtro, setFiltro] = useState('todas')
  const [porRechazar, setPorRechazar] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')

  const { negocios, ofertas } = useMemo(() => mapasDesdeFilas(solicitudes, 'recibidas'), [solicitudes])
  const conteo = useMemo(() => contarPorEstado(solicitudes), [solicitudes])
  const visibles = useMemo(() => filtrarSolicitudes(solicitudes, filtro), [solicitudes, filtro])

  async function iniciarRevision(solicitud) {
    setEnviando(true)
    setErrorAccion('')
    try {
      await ejecutarAccion('iniciar_revision', solicitud)
      navigate(`/negociaciones/${solicitud.id}`)
    } catch (e) {
      setErrorAccion(mensajeDeError(e))
      recargar()
    } finally {
      setEnviando(false)
    }
  }

  async function rechazar() {
    setEnviando(true)
    setErrorAccion('')
    try {
      await ejecutarAccion('rechazar', porRechazar)
      setPorRechazar(null)
      recargar()
    } catch (e) {
      setErrorAccion(mensajeDeError(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <LayoutComercio>
      <EncabezadoPagina
        titulo="Solicitudes recibidas"
        subtitulo="Solicitudes de otros comercios sobre tus ofertas."
        conectado={conectado}
      />

      {!conectado && <AvisoDesconexion onReintentar={recargar} />}

      {errorAccion && !porRechazar && (
        <p className={styles.error} role="alert">
          {errorAccion}
        </p>
      )}

      {cargando ? (
        <p className={styles.cargando} role="status">
          Cargando solicitudes...
        </p>
      ) : error ? (
        <div className={styles.error} role="alert">
          <span>{error}</span>
          <Boton variante="secundario" onClick={recargar}>
            Reintentar
          </Boton>
        </div>
      ) : (
        <>
          <ColaRevision
            solicitudes={solicitudes}
            negocios={negocios}
            ofertas={ofertas}
            onIniciarRevision={iniciarRevision}
            onRechazar={(solicitud) => {
              setErrorAccion('')
              setPorRechazar(solicitud)
            }}
            deshabilitado={enviando || !conectado}
          />

          {solicitudes.length === 0 ? (
            <EstadoVacio
              titulo="Aún no tienes solicitudes"
              descripcion="Cuando otro comercio envíe una solicitud sobre tus ofertas, aparecerá aquí sin necesidad de recargar la página."
            >
              <Boton to="/mis-publicaciones">Ver mis publicaciones</Boton>
            </EstadoVacio>
          ) : (
            <>
              <FiltrosEstado conteo={conteo} activo={filtro} onCambiar={setFiltro} />
              {visibles.length === 0 ? (
                <p className={styles.sinResultados}>No hay solicitudes en este estado.</p>
              ) : (
                <ListaSolicitudes
                  solicitudes={visibles}
                  miId={user?.id}
                  tipo="recibidas"
                  negocios={negocios}
                  ofertas={ofertas}
                />
              )}
            </>
          )}
        </>
      )}

      <VentanaConfirmacion
        abierta={Boolean(porRechazar)}
        titulo="¿Rechazar esta solicitud?"
        descripcion={`${negocios[porRechazar?.buyer_id]?.name ?? 'El comprador'} verá la solicitud como rechazada. Esta acción no se puede deshacer.`}
        puntos={[
          'No se reservan ni se liberan unidades, porque la propuesta no se había aceptado.',
          'El comprador podrá enviar una nueva solicitud sobre esta oferta.'
        ]}
        textoConfirmar="Sí, rechazar solicitud"
        enviando={enviando}
        error={errorAccion}
        onConfirmar={rechazar}
        onCancelar={() => setPorRechazar(null)}
      />
    </LayoutComercio>
  )
}

export default SolicitudesRecibidas
