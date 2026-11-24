import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../../services/supabaseClient'
import { analizarEnlace } from '../../helpers/confirmacionCorreo'
import styles from './ConfirmarCorreo.module.scss'

const enlaceInicial = window.location.pathname === '/confirmar-correo'
  ? analizarEnlace(window.location)
  : { tipo: 'sesion' }

let procesoDelEnlace = null

function procesarEnlace() {
  if (procesoDelEnlace) return procesoDelEnlace

  procesoDelEnlace = (async () => {
    if (enlaceInicial.tipo === 'error') return 'invalid'

    if (enlaceInicial.tipo === 'token_hash') {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: enlaceInicial.tokenHash,
        type: enlaceInicial.type
      })

      window.history.replaceState(window.history.state, '', '/confirmar-correo')
      if (error) return 'invalid'
    }

    if (enlaceInicial.tipo === 'code') {
      const { error } = await supabase.auth.exchangeCodeForSession(enlaceInicial.code)

      window.history.replaceState(window.history.state, '', '/confirmar-correo')
      if (error) return 'invalid'
    }

    const { data, error } = await supabase.auth.getSession()

    if (error) throw error
    if (!data.session) return 'pending'

    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError) throw userError

    return userData.user?.email_confirmed_at ? 'confirmed' : 'pending'
  })()

  procesoDelEnlace.catch(() => {
    procesoDelEnlace = null
  })

  return procesoDelEnlace
}

function ConfirmarCorreo() {
  const [status, setStatus] = useState('loading')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [seconds, setSeconds] = useState(0)
  const sendingRef = useRef(false)

  useEffect(() => {
    let active = true

    async function checkConfirmation() {
      try {
        const resultado = await procesarEnlace()

        if (active) setStatus(resultado)
      } catch {
        if (active) setStatus('error')
      }
    }

    checkConfirmation()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (seconds === 0) return

    const timeout = window.setTimeout(() => {
      setSeconds(value => Math.max(0, value - 1))
    }, 1000)

    return () => window.clearTimeout(timeout)
  }, [seconds])

  async function handleResend(event) {
    event.preventDefault()

    if (sendingRef.current || seconds > 0) return

    setMessage('')
    setErrorMessage('')

    const cleanEmail = email.trim()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage('Ingresa un correo electrónico válido.')
      return
    }

    sendingRef.current = true
    setSending(true)

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/confirmar-correo`
        }
      })

      if (error) {
        if (error.status === 429) {
          setSeconds(60)
          setErrorMessage(
            'Has hecho varios intentos. Espera un momento antes de reenviar.'
          )
        } else {
          setErrorMessage(
            'No pudimos reenviar el correo. Inténtalo de nuevo.'
          )
        }

        return
      }

      setSeconds(60)
      setMessage(
        'Si ese correo tiene una cuenta pendiente de confirmación, recibirás un enlace. Revisa también la carpeta de spam.'
      )
    } catch {
      setErrorMessage(
        'No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.'
      )
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="confirmation-title">
        <Link className={styles.brand} to="/">
          ReStock Local
        </Link>

        {status === 'loading' && (
          <>
            <h1 id="confirmation-title">Comprobando tu cuenta</h1>
            <p role="status">Espera un momento...</p>
          </>
        )}

        {status === 'confirmed' && (
          <>
            <h1 id="confirmation-title">Correo confirmado</h1>
            <p>Tu correo está confirmado. Puedes continuar a tu cuenta.</p>

            <Link className={styles.primary} to="/iniciar-sesion">
              Continuar
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 id="confirmation-title">No pudimos comprobar tu cuenta</h1>
            <p role="alert">
              Revisa tu conexión y vuelve a intentarlo.
            </p>

            <button
              className={styles.primary}
              type="button"
              onClick={() => window.location.reload()}
            >
              Reintentar
            </button>
          </>
        )}

        {['pending', 'invalid'].includes(status) && (
          <>
            <h1 id="confirmation-title">
              {status === 'invalid'
                ? 'El enlace no es válido o ya venció'
                : 'Confirma tu correo'}
            </h1>

            <p>
              {status === 'invalid'
                ? 'Si ya confirmaste tu cuenta, puedes iniciar sesión. Si aún no lo has hecho, solicita otro enlace.'
                : 'Abre el enlace del correo de confirmación para activar tu cuenta. Revisa también la carpeta de spam.'}
            </p>

            <form onSubmit={handleResend} noValidate aria-busy={sending}>
              <label htmlFor="confirmation-email">Correo electrónico</label>

              <input
                id="confirmation-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="negocio@gmail.com"
                value={email}
                onChange={event => setEmail(event.target.value)}
                disabled={sending}
                required
              />

              {errorMessage && (
                <p className={styles.error} role="alert">
                  {errorMessage}
                </p>
              )}

              {message && (
                <p className={styles.notice} role="status">
                  {message}
                </p>
              )}

              <button
                className={styles.primary}
                type="submit"
                disabled={sending || seconds > 0}
              >
                {sending
                  ? 'Enviando...'
                  : seconds > 0
                    ? `Reenviar en ${seconds} s`
                    : 'Reenviar confirmación'}
              </button>
            </form>

            <p className={styles.footer}>
              <Link to="/iniciar-sesion">Ir a iniciar sesión</Link>
              {' · '}
              <Link to="/registro">Volver al registro</Link>
            </p>
          </>
        )}
      </section>
    </main>
  )
}

export default ConfirmarCorreo