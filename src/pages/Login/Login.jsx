import { useRef, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { useAuth } from '../../hooks/useAuth'
import {
  supabase,
  setRememberSession
} from '../../services/supabaseClient'
import styles from './Login.module.scss'

function Login() {
  const { user, profile, profileError, loading: authLoading } = useAuth()
  const sending = useRef(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    if (sending.current) return

    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')
    const remember = form.get('remember') === 'on'
    const nextErrors = {}

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Ingresa un correo electrónico válido.'
    }

    if (!password) {
      nextErrors.password = 'Ingresa tu contraseña.'
    }

    setErrors(nextErrors)
    setMessage('')

    if (Object.keys(nextErrors).length > 0) return

    sending.current = true
    setLoading(true)
    setShowPassword(false)

    try {
      setRememberSession(remember)

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        if (error.code === 'invalid_credentials') {
          setMessage('El correo o la contraseña no son correctos.')
        } else if (error.code === 'email_not_confirmed') {
          setMessage('Confirma tu correo antes de iniciar sesión.')
        } else if (error.status === 429) {
          setMessage('Has hecho varios intentos. Espera un momento y vuelve a intentarlo.')
        } else {
          setMessage('No pudimos iniciar sesión. Inténtalo de nuevo.')
        }
      }
    } catch {
      setMessage('No pudimos iniciar sesión. Revisa tu conexión y que el navegador permita guardar datos del sitio.')
    } finally {
      sending.current = false
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <main className={styles.page}>
        <p role="status">Cargando tu cuenta...</p>
      </main>
    )
  }

  if (user && profile) {
    const destination = profile.role === 'admin'
      ? '/admin/comercios'
      : '/configurar-negocio'

    return <Navigate to={destination} replace />
  }

  if (user && profileError) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <h1>No pudimos abrir tu cuenta</h1>
          <p role="alert">{profileError}</p>
          <button
            className={styles.submit}
            type="button"
            onClick={() => window.location.reload()}
          >
            Reintentar
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="login-title">
        <Link className={styles.brand} to="/">
          ReStock Local
        </Link>

        <h1 id="login-title">Iniciar sesión</h1>

        {message && (
          <div className={styles.alert} role="alert">
            <strong>No pudimos iniciar sesión</strong>
            <p>{message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate aria-busy={loading}>
          <div className={styles.field}>
            <label htmlFor="login-email">Correo electrónico</label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="negocio@gmail.com"
              required
              disabled={loading}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'login-email-error' : undefined}
            />
            {errors.email && (
              <p id="login-email-error" className={styles.error} role="alert">
                {errors.email}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="login-password">Contraseña</label>

            <div className={styles.passwordWrapper}>
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Ingresa tu contraseña"
                required
                disabled={loading}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? 'login-password-error' : undefined
                }
              />

              <button
                className={styles.passwordToggle}
                type="button"
                onClick={() => setShowPassword(visible => !visible)}
                disabled={loading}
                aria-label={
                  showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                }
                aria-controls="login-password"
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>

            {errors.password && (
              <p id="login-password-error" className={styles.error} role="alert">
                {errors.password}
              </p>
            )}
          </div>

          <label className={styles.remember}>
            <input
              name="remember"
              type="checkbox"
              disabled={loading}
            />
            <span>Mantener sesión iniciada</span>
          </label>

          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className={styles.footer}>
          ¿No tienes cuenta? <Link to="/registro">Crear cuenta</Link>
        </p>
      </section>
    </main>
  )
}

export default Login