import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from './useAuth'
import { listarSolicitudes, suscribirCambios } from '../services/solicitudes'
import { aplicarCambioEnLista } from '../helpers/tiempoReal'
import { mensajeDeError } from '../helpers/erroresNegociacion'

export function useSolicitudes(tipo) {
  const { user } = useAuth()
  const usuarioId = user?.id
  const [solicitudes, setSolicitudes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [conectado, setConectado] = useState(true)
  const lista = useRef([])
  const estuvoDesconectado = useRef(false)

  const cargar = useCallback(async () => {
    try {
      const datos = await listarSolicitudes(tipo)
      lista.current = datos ?? []
      setSolicitudes(lista.current)
      setError('')
    } catch (e) {
      setError(mensajeDeError(e))
    } finally {
      setCargando(false)
    }
  }, [tipo])

  useEffect(() => {
    cargar()
  }, [cargar])

  useEffect(() => {
    if (!usuarioId) return undefined

    const columna = tipo === 'recibidas' ? 'seller_id' : 'buyer_id'

    return suscribirCambios({
      filtros: { solicitudes: [`${columna}=eq.${usuarioId}`] },
      alCambiarSolicitud: (nueva) => {
        const existente = lista.current.find((solicitud) => solicitud.id === nueva.id)
        if (!existente) {
          cargar()
          return
        }
        const resultado = aplicarCambioEnLista(lista.current, { ...existente, ...nueva })
        if (resultado.cambio === 'ignorada') return
        lista.current = resultado.lista
        setSolicitudes(resultado.lista)
      },
      alCambiarConexion: (estaConectado) => {
        setConectado(estaConectado)
        if (!estaConectado) {
          estuvoDesconectado.current = true
        } else if (estuvoDesconectado.current) {
          estuvoDesconectado.current = false
          cargar()
        }
      }
    })
  }, [usuarioId, tipo, cargar])

  return { solicitudes, cargando, error, conectado, recargar: cargar }
}
