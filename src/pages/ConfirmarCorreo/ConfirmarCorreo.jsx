import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../../services/supabaseClient'
import styles from './ConfirmarCorreo.module.scss'

const initialParams = new URLSearchParams(window.location.hash.slice(1))
const initialQuery = new URLSearchParams(window.location.search)

const linkHasError = window.location.pathname === '/confirmar-correo' && (
  initialParams.has('error') ||
  initialParams.has('error_code') ||
  initialQuery.has('error') ||
  initialQuery.has('error_code')
)

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
      if (linkHasError) {
        if (active) setStatus('invalid')
        return
      }

      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) throw error

        if (!data.session) {
          if (active) setStatus('pending')
          return
        }

        const { data: userData, error: userError } =
          await supabase.auth.getUser()

        if (userError) throw userError

        if (active) {
          setStatus(
            userData.user?.email_confirmed_at ? 'confirmed' : 'pending'
          )
        }
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