
import { useEffect, useMemo, useState } from 'react'
import LayoutComercio from '../../components/Shared/LayoutComercio/LayoutComercio'
import EncabezadoPagina from '../../components/Shared/EncabezadoPagina/EncabezadoPagina'
import EstadoVacio from '../../components/Shared/EstadoVacio/EstadoVacio'
import Boton from '../../components/Shared/Boton/Boton'
import { obtenerRedComercial } from '../../services/networkService'
import Graph from '../../structures/Graph'
import styles from './RedComercial.module.scss'

const ANCHO = 900
const ALTO = 560

function calcularPosiciones(negocios, negocioActual) {
  const posiciones = new Map()

  const centroX = ANCHO / 2
  const centroY = ALTO / 2

  const otros = negocios.filter(
    (negocio) => negocio.id !== negocioActual
  )

  if (negocioActual) {
    posiciones.set(negocioActual, {
      x: centroX,
      y: centroY
    })
  }

  const radio = Math.min(
    215,
    Math.max(145, 100 + otros.length * 8)
  )

  otros.forEach((negocio, index) => {
    const angulo =
      -Math.PI / 2 + (2 * Math.PI * index) / otros.length

    posiciones.set(negocio.id, {
      x: centroX + radio * Math.cos(angulo),
      y: centroY + radio * Math.sin(angulo)
    })
  })

  return posiciones
}

function nombreCorto(nombre) {
  return nombre.length > 17
    ? `${nombre.slice(0, 15)}...`
    : nombre
}

function construirGrafo(red) {
  const grafo = new Graph()

  red.negocios.forEach((negocio) => {
    grafo.addVertex(negocio.id, {
      name: negocio.name
    })
  })

  red.conexiones.forEach((conexion) => {
    if (
      grafo.hasVertex(conexion.source) &&
      grafo.hasVertex(conexion.target)
    ) {
      grafo.addEdge(
        conexion.source,
        conexion.target,
        Number(conexion.weight)
      )
    }
  })

  return grafo
}

function RedComercial() {
  const [red, setRed] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [destino, setDestino] = useState('')
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let activo = true

    async function cargarRed() {
      try {
        const datos = await obtenerRedComercial()

        if (activo) {
          setRed(datos)
          setError('')
        }
      } catch (fallo) {
        if (activo) {
          setError(
            fallo.message || 'No pudimos cargar la red comercial.'
          )
        }
      } finally {
        if (activo) {
          setCargando(false)
        }
      }
    }

    cargarRed()

    return () => {
      activo = false
    }
  }, [intento])

  const grafo = useMemo(
    () => (red ? construirGrafo(red) : null),
    [red]
  )

  const posiciones = useMemo(
    () =>
      red
        ? calcularPosiciones(red.negocios, red.negocioActual)
        : new Map(),
    [red]
  )

  const vecinos = useMemo(
    () =>
      grafo && red
        ? grafo.getNeighbors(red.negocioActual)
        : [],
    [grafo, red]
  )

  const nombres = useMemo(
    () =>
      new Map(
        (red?.negocios ?? []).map((negocio) => [
          negocio.id,
          negocio.name
        ])
      ),
    [red]
  )

  const camino = useMemo(() => {
    if (!grafo || !destino || !red) return null

    return grafo.bfs(red.negocioActual, destino)
  }, [grafo, destino, red])

  const negocioActual = red?.negocios.find(
    (negocio) => negocio.id === red.negocioActual
  )

  function recargar() {
    setCargando(true)
    setError('')
    setIntento((actual) => actual + 1)
  }

  if (cargando) {
    return (
      <LayoutComercio>
        <div className={styles.pagina}>
          <EncabezadoPagina
            titulo="Red comercial"
            subtitulo="Explora las conexiones entre comercios."
          />
          <p className={styles.cargando} role="status">
            Cargando red comercial...
          </p>
        </div>
      </LayoutComercio>
    )
  }

  if (error) {
    return (
      <LayoutComercio>
        <div className={styles.pagina}>
          <EncabezadoPagina
            titulo="Red comercial"
            subtitulo="Explora las conexiones entre comercios."
          />

          <div className={styles.error} role="alert">
            <span>{error}</span>
            <Boton variante="secundario" onClick={recargar}>
              Reintentar
            </Boton>
          </div>
        </div>
      </LayoutComercio>
    )
  }

  if (!red || red.negocios.length === 0 || !grafo) {
    return (
      <LayoutComercio>
        <div className={styles.pagina}>
          <EncabezadoPagina titulo="Red comercial" />
          <EstadoVacio
            titulo="No encontramos negocios en la red"
            descripcion="Comprueba que tu negocio tenga un perfil completo y esté habilitado."
          >
            <Boton to="/mi-negocio">Revisar mi negocio</Boton>
          </EstadoVacio>
        </div>
      </LayoutComercio>
    )
  }

  return (
    <LayoutComercio>
      <div className={styles.pagina}>
        <EncabezadoPagina
          titulo="Red comercial"
          subtitulo={`Explora las relaciones comerciales de ${negocioActual?.name ?? 'tu negocio'}.`}
        />

        <section className={styles.resumen}>
          <article>
            <h2>Negocios en la red</h2>
            <strong>{grafo.getVertexCount()}</strong>
            <p>Comercios habilitados</p>
          </article>

          <article>
            <h2>Conexiones comerciales</h2>
            <strong>{grafo.getEdgeCount()}</strong>
            <p>Relaciones entre negocios</p>
          </article>

          <article className={styles.destacado}>
            <h2>Mis conexiones directas</h2>
            <strong>{vecinos.length}</strong>
            <p>Negocios con operaciones compartidas</p>
          </article>
        </section>

        <div className={styles.contenido}>
          <section className={styles.panelGrafo}>
            <header className={styles.panelEncabezado}>
              <div>
                <h2>Mapa de conexiones</h2>
                <p>
                  Cada nodo representa un negocio y cada línea una relación comercial.
                </p>
              </div>

              <span className={styles.leyenda}>
                <span className={styles.puntoPropio} />
                Mi negocio
              </span>
            </header>

            {red.conexiones.length === 0 && (
              <p className={styles.aviso}>
                Todavía no hay operaciones completadas que generen conexiones.
                Los negocios habilitados aparecen igualmente en el grafo.
              </p>
            )}

            <div className={styles.grafoContenedor}>
              <svg
                viewBox={`0 0 ${ANCHO} ${ALTO}`}
                className={styles.grafoSvg}
                role="img"
                aria-label="Grafo de conexiones comerciales"
              >
                {red.conexiones.map((conexion) => {
                  const origen = posiciones.get(conexion.source)
                  const destinoPosicion = posiciones.get(conexion.target)

                  if (!origen || !destinoPosicion) return null

                  const centroX =
                    (origen.x + destinoPosicion.x) / 2

                  const centroY =
                    (origen.y + destinoPosicion.y) / 2

                  return (
                    <g key={`${conexion.source}-${conexion.target}`}>
                      <line
                        x1={origen.x}
                        y1={origen.y}
                        x2={destinoPosicion.x}
                        y2={destinoPosicion.y}
                        className={styles.conexion}
                        strokeWidth={Math.min(
                          5,
                          1.5 + Math.log2(conexion.weight + 1)
                        )}
                      />

                      <text
                        x={centroX}
                        y={centroY - 8}
                        className={styles.peso}
                      >
                        {conexion.weight}
                      </text>
                    </g>
                  )
                })}

                {red.negocios.map((negocio) => {
                  const posicion = posiciones.get(negocio.id)
                  if (!posicion) return null

                  const esPropio =
                    negocio.id === red.negocioActual

                  return (
                    <g
                      key={negocio.id}
                      className={
                        esPropio
                          ? styles.nodoActual
                          : styles.nodo
                      }
                    >
                      <title>{negocio.name}</title>

                      <circle
                        cx={posicion.x}
                        cy={posicion.y}
                        r={esPropio ? 31 : 25}
                      />

                      <text
                        x={posicion.x}
                        y={posicion.y + 6}
                        className={styles.inicial}
                      >
                        {negocio.name.charAt(0).toUpperCase()}
                      </text>

                      <text
                        x={posicion.x}
                        y={posicion.y + (esPropio ? 52 : 46)}
                        className={styles.nombreNodo}
                      >
                        {nombreCorto(negocio.name)}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>

            <p className={styles.nota}>
              El número sobre cada conexión indica las operaciones completadas
              entre los dos negocios.
            </p>
          </section>

          <aside className={styles.lateral}>
            <section className={styles.panel}>
              <h2>Mis conexiones directas</h2>
              <p className={styles.descripcion}>
                Negocios con los que has completado operaciones.
              </p>

              {vecinos.length === 0 ? (
                <p className={styles.sinDatos}>
                  Aún no tienes conexiones comerciales directas.
                </p>
              ) : (
                <ul className={styles.listaVecinos}>
                  {vecinos.map((vecino) => (
                    <li key={vecino.id}>
                      <span>{vecino.name}</span>
                      <strong>
                        {vecino.weight}{' '}
                        {vecino.weight === 1
                          ? 'operación'
                          : 'operaciones'}
                      </strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={styles.panel}>
              <h2>Buscar camino</h2>
              <p className={styles.descripcion}>
                Encuentra la ruta con menos conexiones desde tu negocio
                hasta otro comercio.
              </p>

              <label htmlFor="negocio-destino">
                Negocio de destino
              </label>

              <select
                id="negocio-destino"
                value={destino}
                onChange={(evento) => setDestino(evento.target.value)}
              >
                <option value="">Selecciona un negocio</option>

                {red.negocios
                  .filter(
                    (negocio) => negocio.id !== red.negocioActual
                  )
                  .map((negocio) => (
                    <option key={negocio.id} value={negocio.id}>
                      {negocio.name}
                    </option>
                  ))}
              </select>

              {camino !== null && camino.length > 0 && (
                <div className={styles.resultadoCamino}>
                  <p>
                    Camino más corto:{' '}
                    <strong>{camino.length - 1} conexiones</strong>
                  </p>

                  <div className={styles.camino}>
                    {camino.map((id, index) => (
                      <span key={id}>
                        <span className={styles.paso}>
                          {nombres.get(id)}
                        </span>

                        {index < camino.length - 1 && (
                          <span className={styles.flecha}>→</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {camino !== null && camino.length === 0 && (
                <p className={styles.sinDatos} role="status">
                  No existe un camino comercial entre estos negocios.
                </p>
              )}

              {!destino && (
                <p className={styles.sinDatos}>
                  Selecciona un negocio para consultar su conexión.
                </p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </LayoutComercio>
  )
}

export default RedComercial
