import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { supabase } from '../../services/supabaseClient'
import styles from './Registro.module.scss'

function Registro() {
  const navigate = useNavigate()
  const sending = useRef(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    if (sending.current) return

    const form = new FormData(event.currentTarget)
    const contactName = String(form.get('contactName') ?? '').trim()
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')
    const nextErrors = {}

    if (!contactName || contactName.length > 100) {
      nextErrors.contactName =
        'Ingresa un nombre de contacto de hasta 100 caracteres.'
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email =
        'Ingresa un correo válido, por ejemplo negocio@gmail.com.'
    }

    if (password.length < 8) {
      nextErrors.password =
        'La contraseña debe tener al menos 8 caracteres.'
    }

    setErrors(nextErrors)
    setMessage('')

    if (Object.keys(nextErrors).length > 0) return

    sending.current = true
    setLoading(true)
    setShowPassword(false)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            contact_name: contactName
          }
        }
      })

      if (error) {
        if (['user_already_exists', 'email_exists'].includes(error.code)) {
          setErrors({
            email:
              'Este correo ya tiene una cuenta. Inicia sesión o usa otro correo.'
          })
        } else if (error.code === 'weak_password') {
          setErrors({
            password: 'Elige una contraseña más segura.'
          })
        } else if (error.status === 429) {
          setMessage(
            'Has hecho varios intentos. Espera un momento y vuelve a intentarlo.'
          )
        } else {
          setMessage('No pudimos crear tu cuenta. Inténtalo de nuevo.')
        }

        return
      }

      if (!data.session) {
        setMessage(
          'Revisa tu correo para confirmar la cuenta antes de iniciar sesión.'
        )
        return
      }

      navigate('/configurar-negocio', { replace: true })
    } catch {
      setMessage(
        'No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.'
      )
    } finally {
      sending.current = false
      setLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="registro-title">
        <Link className={styles.brand} to="/">
          ReStock Local
        </Link>

        <h1 id="registro-title">Crear cuenta</h1>

        <p className={styles.description}>
          Registra los datos de contacto de tu negocio.
        </p>

        {message && (
          <p className={styles.alert} role="alert">
            {message}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate aria-busy={loading}>
          <div className={styles.field}>
            <label htmlFor="contactName">Nombre de contacto</label>
            <input
              id="contactName"
              name="contactName"
              autoComplete="name"
              placeholder="Nombre y apellido"
              maxLength={100}
              required
              disabled={loading}
              aria-invalid={Boolean(errors.contactName)}
              aria-describedby={
                errors.contactName ? 'contact-error' : undefined
              }
            />

            {errors.contactName && (
              <p
                id="contact-error"
                className={styles.error}
                role="alert"
              >
                {errors.contactName}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="negocio@gmail.com"
              required
              disabled={loading}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />

            {errors.email && (
              <p id="email-error" className={styles.error} role="alert">
                {errors.email}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Contraseña</label>

            <div className={styles.passwordWrapper}>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Crea una contraseña"
                minLength={8}
                required
                disabled={loading}
                aria-invalid={Boolean(errors.password)}
                aria-describedby="password-help"
              />

              <button
                className={styles.passwordToggle}
                type="button"
                onClick={() => setShowPassword(visible => !visible)}
                disabled={loading}
                aria-label={
                  showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                }
                aria-controls="password"
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>

            <p
              id="password-help"
              className={errors.password ? styles.error : styles.help}
              role={errors.password ? 'alert' : undefined}
            >
              {errors.password || 'Mínimo 8 caracteres.'}
            </p>
          </div>

          <button
            className={styles.submit}
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className={styles.footer}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/iniciar-sesion">Iniciar sesión</Link>
        </p>
      </section>
    </main>
  )
}

export default Registro