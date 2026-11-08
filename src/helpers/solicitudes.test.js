import { describe, expect, it } from 'vitest'
import {
  accionesDisponibles,
  calcularTotal,
  construirColaRevision,
  contarPorEstado,
  contraparte,
  datosEstado,
  esMiTurno,
  estaAbierta,
  formatearCOP,
  formatearFecha,
  rolEnSolicitud,
  siguientePaso,
  validarPropuesta
} from './solicitudes'

const VENDEDOR = 'v1'
const COMPRADOR = 'c1'
const OTRO = 'x9'

function solicitud(cambios = {}) {
  return {
    id: 'r1',
    buyer_id: COMPRADOR,
    seller_id: VENDEDOR,
    status: 'pendiente',
    current_author_id: COMPRADOR,
    current_qty: 30,
    current_price: 9500,
    version: 1,
    created_at: '2026-10-26T15:05:00Z',
    ...cambios
  }
}

describe('roles', () => {
  it('reconoce al vendedor, al comprador y a un tercero', () => {
    expect(rolEnSolicitud(solicitud(), VENDEDOR)).toBe('vendedor')
    expect(rolEnSolicitud(solicitud(), COMPRADOR)).toBe('comprador')
    expect(rolEnSolicitud(solicitud(), OTRO)).toBeNull()
    expect(rolEnSolicitud(solicitud(), null)).toBeNull()
  })

  it('devuelve la contraparte', () => {
    expect(contraparte(solicitud(), VENDEDOR)).toBe(COMPRADOR)
    expect(contraparte(solicitud(), COMPRADOR)).toBe(VENDEDOR)
    expect(contraparte(solicitud(), OTRO)).toBeNull()
  })
})

describe('acciones disponibles', () => {
  it('pendiente: el vendedor revisa o rechaza y el comprador cancela', () => {
    expect(accionesDisponibles(solicitud(), VENDEDOR)).toEqual(['iniciar_revision', 'rechazar'])
    expect(accionesDisponibles(solicitud(), COMPRADOR)).toEqual(['cancelar'])
  })

  it('en negociación: solo la contraparte del autor acepta o contrapropone', () => {
    const s = solicitud({ status: 'en_negociacion', current_author_id: COMPRADOR })
    expect(accionesDisponibles(s, VENDEDOR)).toEqual(['aceptar', 'contraproponer', 'rechazar'])
    expect(accionesDisponibles(s, COMPRADOR)).toEqual(['cancelar'])
  })

  it('en negociación: nadie acepta su propia propuesta', () => {
    const s = solicitud({ status: 'en_negociacion', current_author_id: VENDEDOR })
    expect(accionesDisponibles(s, VENDEDOR)).not.toContain('aceptar')
    expect(accionesDisponibles(s, COMPRADOR)).toEqual(['aceptar', 'contraproponer', 'cancelar'])
  })

  it('aceptada: el vendedor despacha y ambos pueden cancelar', () => {
    const s = solicitud({ status: 'aceptada' })
    expect(accionesDisponibles(s, VENDEDOR)).toEqual(['despachar', 'cancelar_acuerdo'])
    expect(accionesDisponibles(s, COMPRADOR)).toEqual(['cancelar_acuerdo'])
  })

  it('despachada: solo el comprador confirma y nadie cancela', () => {
    const s = solicitud({ status: 'despachada' })
    expect(accionesDisponibles(s, COMPRADOR)).toEqual(['confirmar_recepcion'])
    expect(accionesDisponibles(s, VENDEDOR)).toEqual([])
  })

  it('los estados terminales no tienen acciones', () => {
    for (const status of ['recibida', 'rechazada', 'cancelada']) {
      expect(accionesDisponibles(solicitud({ status }), VENDEDOR)).toEqual([])
      expect(accionesDisponibles(solicitud({ status }), COMPRADOR)).toEqual([])
    }
  })

  it('un tercero nunca tiene acciones', () => {
    expect(accionesDisponibles(solicitud({ status: 'en_negociacion' }), OTRO)).toEqual([])
  })
})

describe('turno y siguiente paso', () => {
  it('indica de quién es el turno', () => {
    expect(esMiTurno(solicitud(), VENDEDOR)).toBe(true)
    expect(esMiTurno(solicitud(), COMPRADOR)).toBe(false)
    expect(esMiTurno(solicitud({ status: 'despachada' }), COMPRADOR)).toBe(true)
    expect(esMiTurno(solicitud({ status: 'recibida' }), COMPRADOR)).toBe(false)
    expect(esMiTurno(solicitud(), OTRO)).toBe(false)
  })

  it('describe el siguiente paso según el rol', () => {
    const s = solicitud({ status: 'en_negociacion', current_author_id: COMPRADOR })
    expect(siguientePaso(s, VENDEDOR)).toBe('Tu turno: responder la propuesta')
    expect(siguientePaso(s, COMPRADOR)).toBe('Esperando respuesta del vendedor')
    expect(siguientePaso(solicitud({ status: 'aceptada' }), VENDEDOR)).toBe('Despachar')
    expect(siguientePaso(solicitud({ status: 'rechazada' }), COMPRADOR)).toBe('Puedes enviar otra solicitud')
    expect(siguientePaso(solicitud(), OTRO)).toBe('')
  })
})

describe('estados', () => {
  it('conoce si una solicitud sigue abierta', () => {
    expect(estaAbierta(solicitud({ status: 'despachada' }))).toBe(true)
    expect(estaAbierta(solicitud({ status: 'recibida' }))).toBe(false)
  })

  it('devuelve la etiqueta y la insignia', () => {
    expect(datosEstado('en_negociacion').etiqueta).toBe('En negociación')
    expect(datosEstado('rechazada').insignia).toBe('Error')
    expect(datosEstado('inexistente').etiqueta).toBe('Desconocido')
  })

  it('cuenta por estado', () => {
    const conteo = contarPorEstado([
      solicitud({ status: 'pendiente' }),
      solicitud({ status: 'pendiente' }),
      solicitud({ status: 'recibida' }),
      solicitud({ status: 'cancelada' })
    ])
    expect(conteo.todas).toBe(4)
    expect(conteo.pendiente).toBe(2)
    expect(conteo.cerradas).toBe(2)
  })
})

describe('montos y fechas', () => {
  it('calcula el total sin errores de decimales', () => {
    expect(calcularTotal(30, 9500)).toBe(285000)
    expect(calcularTotal(3, 0.1)).toBe(0.3)
    expect(calcularTotal(7, 12500.55)).toBe(87503.85)
  })

  it('formatea pesos colombianos', () => {
    expect(formatearCOP(45000)).toBe('$45.000 COP')
    expect(formatearCOP(285000, false)).toBe('$285.000')
    expect(formatearCOP(9500.5)).toBe('$9.500,5 COP')
  })

  it('formatea fechas en hora de Colombia', () => {
    expect(formatearFecha('2026-10-27T14:14:00Z')).toBe('27 de oct de 2026, 9:14 a. m.')
  })
})

describe('validación de propuestas', () => {
  const oferta = { min_purchase: 10, qty_available: 60 }

  it('acepta una propuesta válida', () => {
    expect(validarPropuesta({ cantidad: 20, precio: '10500' }, oferta)).toEqual({})
    expect(validarPropuesta({ cantidad: '10', precio: '9999.99' }, oferta)).toEqual({})
  })

  it('rechaza cantidades fuera de rango o no enteras', () => {
    expect(validarPropuesta({ cantidad: 5, precio: '1' }, oferta).cantidad).toMatch('mínima')
    expect(validarPropuesta({ cantidad: 61, precio: '1' }, oferta).cantidad).toMatch('60')
    expect(validarPropuesta({ cantidad: 10.5, precio: '1' }, oferta).cantidad).toMatch('entera')
    expect(validarPropuesta({ cantidad: '', precio: '1' }, oferta).cantidad).toMatch('entera')
  })

  it('rechaza precios no positivos o con más de 2 decimales', () => {
    expect(validarPropuesta({ cantidad: 10, precio: '0' }, oferta).precio).toMatch('mayor')
    expect(validarPropuesta({ cantidad: 10, precio: '' }, oferta).precio).toMatch('mayor')
    expect(validarPropuesta({ cantidad: 10, precio: '-5' }, oferta).precio).toMatch('mayor')
    expect(validarPropuesta({ cantidad: 10, precio: '10.555' }, oferta).precio).toMatch('decimales')
  })

  it('limita el comentario a 500 caracteres', () => {
    const largo = 'a'.repeat(501)
    expect(validarPropuesta({ cantidad: 10, precio: '1', comentario: largo }, oferta).comentario).toBeDefined()
  })
})

describe('cola de revisión', () => {
  it('ordena las pendientes por llegada y deja por fuera las demás', () => {
    const cola = construirColaRevision([
      solicitud({ id: 'b', created_at: '2026-10-27T10:00:00Z' }),
      solicitud({ id: 'a', created_at: '2026-10-26T10:00:00Z' }),
      solicitud({ id: 'z', status: 'en_negociacion', created_at: '2026-10-20T10:00:00Z' }),
      solicitud({ id: 'c', status: 'cancelada', created_at: '2026-10-21T10:00:00Z' })
    ])
    expect(cola.aLista().map((s) => s.id)).toEqual(['a', 'b'])
    expect(cola.verFrente().id).toBe('a')
  })

  it('desempata por identificador cuando llegan al mismo tiempo', () => {
    const cola = construirColaRevision([
      solicitud({ id: 'r2', created_at: '2026-10-26T10:00:00Z' }),
      solicitud({ id: 'r1', created_at: '2026-10-26T10:00:00Z' })
    ])
    expect(cola.aLista().map((s) => s.id)).toEqual(['r1', 'r2'])
  })

  it('queda vacía si no hay pendientes', () => {
    expect(construirColaRevision([solicitud({ status: 'aceptada' })]).estaVacia()).toBe(true)
  })
})
