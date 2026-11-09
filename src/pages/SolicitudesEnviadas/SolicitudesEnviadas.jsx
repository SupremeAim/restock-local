import { useMemo, useState } from 'react'
import LayoutComercio from '../../components/Shared/LayoutComercio/LayoutComercio'
import EncabezadoPagina from '../../components/Shared/EncabezadoPagina/EncabezadoPagina'
import AvisoDesconexion from '../../components/Shared/AvisoDesconexion/AvisoDesconexion'
import EstadoVacio from '../../components/Shared/EstadoVacio/EstadoVacio'
import Boton from '../../components/Shared/Boton/Boton'
import FiltrosEstado from '../../components/Solicitudes/FiltrosEstado/FiltrosEstado'
import ListaSolicitudes from '../../components/Solicitudes/ListaSolicitudes/ListaSolicitudes'
import { useAuth } from '../../hooks/useAuth'
import { useSolicitudes } from '../../hooks/useSolicitudes'
import {
  contarPorEstado,
  datosEstado,
  esMiTurno,
  filtrarSolicitudes,
  mapasDesdeFilas
} from '../../helpers/solicitudes'
import styles from './SolicitudesEnviadas.module.scss'

function SolicitudesEnviadas() {
  const { user } = useAuth()
  const { solicitudes, cargando, error, conectado, recargar } = useSolicitudes('enviadas')
  const [filtro, setFiltro] = useState('todas')

  const { negocios, ofertas } = useMemo(() => mapasDesdeFilas(solicitudes, 'enviadas'), [solicitudes])
  const conteo = useMemo(() => contarPorEstado(solicitudes), [solicitudes])
  const visibles = useMemo(() => filtrarSolicitudes(solicitudes, filtro), [solicitudes, filtro])

  const resumen = useMemo(() => {
    const tuAccion = solicitudes.filter((s) => esMiTurno(s, user?.id)).length
    const cerradas = solicitudes.filter((s) => datosEstado(s.status).terminal).length
    return [
      ['Requieren tu acción', tuAccion, 'Responder propuestas o confirmar recepciones', true],
      ['Esperando a los vendedores', solicitudes.length - tuAccion - cerradas, 'Revisión, respuesta o despacho', false],
      ['Cerradas', cerradas, 'Recibidas, canceladas o rechazadas', false]
    ]
  }, [solicitudes, user?.id])

  return (
    <LayoutComercio>
      <EncabezadoPagina
        titulo="Solicitudes enviadas"
        subtitulo="Solicitudes que enviaste a otros comercios."
        conectado={conectado}
      />

      {!conectado && <AvisoDesconexion onReintentar={recargar} />}

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
      ) : solicitudes.length === 0 ? (
        <EstadoVacio
          icono="enviar"
          titulo="Aún no has enviado solicitudes"
          descripcion="Busca en el catálogo una oferta que te interese y envía una solicitud con la cantidad y el precio que propones."
        >
          <Boton to="/catalogo">Ir al catálogo</Boton>
        </EstadoVacio>
      ) : (
        <>
          <section className={styles.resumen} aria-label="Resumen">
            {resumen.map(([titulo, numero, detalle, destacado]) => (
              <article key={titulo} className={destacado ? styles.destacado : ''}>
                <h2>{titulo}</h2>
                <strong>{numero}</strong>
                <p>{detalle}</p>
              </article>
            ))}
          </section>

          <FiltrosEstado conteo={conteo} activo={filtro} onCambiar={setFiltro} />

          {visibles.length === 0 ? (
            <p className={styles.cargando}>No hay solicitudes en este estado.</p>
          ) : (
            <ListaSolicitudes
              solicitudes={visibles}
              miId={user?.id}
              tipo="enviadas"
              negocios={negocios}
              ofertas={ofertas}
            />
          )}
        </>
      )}
    </LayoutComercio>
  )
}

export default SolicitudesEnviadas
