
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ejecutarAccion,
  listarEventos,
  obtenerDetalle,
  obtenerTelefono,
  obtenerDireccion,
  suscribirCambios
} from '../services/solicitudes'
import { esMasReciente } from '../helpers/tiempoReal'
import {
  debeRecargar,
  mensajeDeError
} from '../helpers/erroresNegociacion'

const CON_DATOS_PRIVADOS = ['aceptada', 'despachada', 'recibida']

export function useNegociacion(solicitudId) {
  const [detalle, setDetalle] = useState(null)
  const [eventos, setEventos] = useState([])
  const [telefono, setTelefono] = useState(null)
  const [direccion, setDireccion] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [noEncontrada, setNoEncontrada] = useState(false)
  const [error, setError] = useState('')
  const [errorAccion, setErrorAccion] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [conectado, setConectado] = useState(true)

  const actual = useRef(null)
  const estuvoDesconectado = useRef(false)

  const cargar = useCallback(async () => {
    try {
      const respuestas = await Promise.all([
        obtenerDetalle(solicitudId),
        listarEventos(solicitudId)
      ])

      const [datos, historial] = respuestas

      if (!datos) {
        setNoEncontrada(true)
        return
      }

      let numero = null
      let ubicacion = null

      if (CON_DATOS_PRIVADOS.includes(datos.status)) {
        const privados = await Promise.all([
          obtenerTelefono(solicitudId),
          obtenerDireccion(solicitudId)
        ])

        numero = privados[0]
        ubicacion = privados[1]
      }

      actual.current = datos

      setDetalle(datos)
      setEventos(historial ?? [])
      setTelefono(numero)
      setDireccion(ubicacion)
      setNoEncontrada(false)
      setError('')
    } catch (e) {
      setError(mensajeDeError(e))
    } finally {
      setCargando(false)
    }
  }, [solicitudId])

  useEffect(() => {
    let activa = true

    Promise.resolve().then(() => {
      if (activa) cargar()
    })

    return () => {
      activa = false
    }
  }, [cargar])

  useEffect(() => {
    return suscribirCambios({
      filtros: {
        solicitudes: [`id=eq.${solicitudId}`],
        eventos: `request_id=eq.${solicitudId}`
      },

      alCambiarSolicitud: nueva => {
        if (esMasReciente(nueva, actual.current)) {
          cargar()
        }
      },

      alNuevoEvento: evento => {
        setEventos(lista =>
          lista.some(e => e.seq === evento.seq)
            ? lista
            : [...lista, evento]
        )
      },

      alCambiarConexion: estaConectado => {
        setConectado(estaConectado)

        if (!estaConectado) {
          estuvoDesconectado.current = true
        } else if (estuvoDesconectado.current) {
          estuvoDesconectado.current = false
          cargar()
        }
      }
    })
  }, [solicitudId, cargar])

  const ejecutar = useCallback(
    async (accion, datos) => {
      if (!actual.current) return false

      setEnviando(true)
      setErrorAccion('')

      try {
        await ejecutarAccion(accion, actual.current, datos)
        await cargar()
        return true
      } catch (e) {
        setErrorAccion(mensajeDeError(e))

        if (debeRecargar(e)) {
          await cargar()
        }

        return false
      } finally {
        setEnviando(false)
      }
    },
    [cargar]
  )

  return {
    detalle,
    eventos,
    telefono,
    direccion,
    cargando,
    noEncontrada,
    error,
    errorAccion,
    enviando,
    conectado,
    ejecutar,
    limpiarErrorAccion: () => setErrorAccion(''),
    recargar: cargar
  }
}
