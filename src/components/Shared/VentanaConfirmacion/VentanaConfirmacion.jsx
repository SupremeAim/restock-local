import { useEffect, useId, useRef, useState } from 'react'
import Boton from '../Boton/Boton'
import styles from './VentanaConfirmacion.module.scss'

function Contenido({
  titulo,
  descripcion,
  puntos = [],
  pideMotivo = false,
  etiquetaMotivo = 'Motivo',
  ejemploMotivo = '',
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Volver',
  peligro = true,
  enviando = false,
  error = '',
  onConfirmar,
  onCancelar
}) {
  const id = useId()
  const [motivo, setMotivo] = useState('')
  const [errorMotivo, setErrorMotivo] = useState('')
  const primerCampo = useRef(null)

  useEffect(() => {
    primerCampo.current?.focus()
  }, [])

  useEffect(() => {
    function alPresionar(evento) {
      if (evento.key === 'Escape' && !enviando) onCancelar()
    }
    document.addEventListener('keydown', alPresionar)
    return () => document.removeEventListener('keydown', alPresionar)
  }, [enviando, onCancelar])

  function confirmar(evento) {
    evento.preventDefault()
    const texto = motivo.trim()
    if (pideMotivo && texto.length < 5) {
      setErrorMotivo('Escribe un motivo de al menos 5 caracteres.')
      return
    }
    onConfirmar(pideMotivo ? texto : undefined)
  }

  return (
    <div className={styles.fondo} onMouseDown={() => !enviando && onCancelar()}>
      <form
        className={styles.ventana}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-titulo`}
        aria-describedby={`${id}-descripcion`}
        onMouseDown={(evento) => evento.stopPropagation()}
        onSubmit={confirmar}
      >
        <h2 id={`${id}-titulo`}>{titulo}</h2>
        <p id={`${id}-descripcion`} className={styles.descripcion}>
          {descripcion}
        </p>

        {puntos.length > 0 && (
          <ul className={styles.puntos}>
            {puntos.map((punto) => (
              <li key={punto}>{punto}</li>
            ))}
          </ul>
        )}

        {pideMotivo && (
          <div className={styles.campo}>
            <label htmlFor={`${id}-motivo`}>{etiquetaMotivo}</label>
            <textarea
              id={`${id}-motivo`}
              ref={primerCampo}
              rows={4}
              maxLength={500}
              value={motivo}
              placeholder={ejemploMotivo}
              aria-invalid={Boolean(errorMotivo)}
              aria-describedby={`${id}-ayuda`}
              className={errorMotivo ? styles.conError : ''}
              onChange={(evento) => setMotivo(evento.target.value)}
            />
            <p id={`${id}-ayuda`} className={errorMotivo ? styles.textoError : styles.ayuda}>
              {errorMotivo || 'Obligatorio. Quedará registrado en el historial para ambas partes.'}
            </p>
          </div>
        )}

        {error && (
          <p className={styles.alerta} role="alert">
            {error}
          </p>
        )}

        <div className={styles.acciones}>
          <Boton
            variante="secundario"
            onClick={onCancelar}
            disabled={enviando}
            ref={pideMotivo ? undefined : primerCampo}
          >
            {textoCancelar}
          </Boton>
          <Boton type="submit" variante={peligro ? 'peligro' : 'principal'} disabled={enviando}>
            {enviando ? 'Enviando...' : textoConfirmar}
          </Boton>
        </div>
      </form>
    </div>
  )
}

function VentanaConfirmacion({ abierta, ...props }) {
  return abierta ? <Contenido {...props} /> : null
}

export default VentanaConfirmacion
