import { useId, useState } from 'react'
import Boton from '../../Shared/Boton/Boton'
import { calcularTotal, formatearCOP, validarPropuesta } from '../../../helpers/solicitudes'
import styles from './FormularioContrapropuesta.module.scss'

function FormularioContrapropuesta({
  oferta,
  inicial = {},
  onEnviar,
  onCancelar,
  enviando = false,
  titulo = 'Tu contrapropuesta',
  ayuda = 'Reemplaza a la propuesta vigente. La anterior queda en el historial.',
  etiquetaTotal = 'Total de la contrapropuesta',
  textoEnviar = 'Enviar contrapropuesta',
  sinBorde = false
}) {
  const id = useId()
  const [cantidad, setCantidad] = useState(String(inicial.cantidad ?? ''))
  const [precio, setPrecio] = useState(String(inicial.precio ?? ''))
  const [comentario, setComentario] = useState('')
  const [errores, setErrores] = useState({})

  const valoresValidos =
    Number.isInteger(Number(cantidad)) && cantidad !== '' && Number(precio) > 0
  const total = valoresValidos ? formatearCOP(calcularTotal(cantidad, precio)) : '—'

  function enviar(evento) {
    evento.preventDefault()
    const nuevosErrores = validarPropuesta({ cantidad, precio, comentario }, oferta)
    setErrores(nuevosErrores)
    if (Object.keys(nuevosErrores).length > 0) return
    onEnviar({
      cantidad: Number(cantidad),
      precio: Number(precio),
      comentario: comentario.trim()
    })
  }

  return (
    <form
      className={[styles.formulario, sinBorde ? styles.sinBorde : ''].filter(Boolean).join(' ')}
      onSubmit={enviar}
      noValidate
    >
      <div>
        <h3>{titulo}</h3>
        <p className={styles.ayuda}>{ayuda}</p>
      </div>

      <div className={styles.fila}>
        <div className={styles.campo}>
          <label htmlFor={`${id}-cantidad`}>Cantidad (unidades)</label>
          <input
            id={`${id}-cantidad`}
            type="number"
            inputMode="numeric"
            min={oferta.min_purchase}
            max={oferta.qty_available}
            step="1"
            value={cantidad}
            aria-invalid={Boolean(errores.cantidad)}
            aria-describedby={`${id}-cantidad-ayuda`}
            className={errores.cantidad ? styles.conError : ''}
            onChange={(evento) => setCantidad(evento.target.value)}
          />
          <p id={`${id}-cantidad-ayuda`} className={errores.cantidad ? styles.textoError : styles.ayuda}>
            {errores.cantidad ??
              `Entre ${oferta.min_purchase} (mínimo) y ${oferta.qty_available} (disponibles)`}
          </p>
        </div>

        <div className={styles.campo}>
          <label htmlFor={`${id}-precio`}>Precio unitario (COP)</label>
          <input
            id={`${id}-precio`}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={precio}
            aria-invalid={Boolean(errores.precio)}
            aria-describedby={`${id}-precio-ayuda`}
            className={errores.precio ? styles.conError : ''}
            onChange={(evento) => setPrecio(evento.target.value)}
          />
          <p id={`${id}-precio-ayuda`} className={errores.precio ? styles.textoError : styles.ayuda}>
            {errores.precio ??
              (oferta.unit_price !== undefined
                ? `Precio publicado: ${formatearCOP(oferta.unit_price)}`
                : 'Mayor que 0, máximo 2 decimales')}
          </p>
        </div>
      </div>

      <div className={styles.total} aria-live="polite">
        <span>{etiquetaTotal}</span>
        <strong>{total}</strong>
      </div>

      <div className={styles.campo}>
        <label htmlFor={`${id}-comentario`}>Comentario (opcional)</label>
        <textarea
          id={`${id}-comentario`}
          rows={3}
          maxLength={500}
          value={comentario}
          aria-describedby={`${id}-comentario-ayuda`}
          onChange={(evento) => setComentario(evento.target.value)}
        />
        <p id={`${id}-comentario-ayuda`} className={styles.pie}>
          <span>{errores.comentario ?? 'Lo verá la otra parte en el historial.'}</span>
          <span>{comentario.length}/500</span>
        </p>
      </div>

      <div className={styles.acciones}>
        <Boton type="submit" disabled={enviando}>
          {enviando ? 'Enviando...' : textoEnviar}
        </Boton>
        {onCancelar && (
          <Boton variante="secundario" onClick={onCancelar} disabled={enviando}>
            Cancelar
          </Boton>
        )}
      </div>
    </form>
  )
}

export default FormularioContrapropuesta
