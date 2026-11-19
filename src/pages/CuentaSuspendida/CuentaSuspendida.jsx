import { Navigate } from 'react-router'
import { useAuth } from '../../hooks/useAuth'
import CerrarSesion from '../../components/Shared/CerrarSesion/CerrarSesion'
import styles from './CuentaSuspendida.module.scss'

function CuentaSuspendida() {
  const {
    user,
    profile,
    business,
    profileError,
    accountCheckedAt,
    refreshAccount,
    loading
  } = useAuth()

  if (loading) {
    return (
      <main className={styles.page}>
        <section className={styles.card} aria-busy="true">
          <p className={styles.brand}>ReStock Local</p>
          <p role="status">Consultando el estado de tu cuenta...</p>
        </section>
      </main>
    )
  }

  if (!user) {
    return <Navigate to="/iniciar-sesion" replace />
  }

  if (profileError || !profile) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <p className={styles.brand}>ReStock Local</p>
          <h1>No pudimos consultar tu cuenta</h1>

          <p role="alert">
            {profileError || 'Inténtalo de nuevo en unos momentos.'}
          </p>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={refreshAccount}
            >
              Reintentar
            </button>

            <div className={styles.logout}>
              <CerrarSesion />
            </div>
          </div>
        </section>
      </main>
    )
  }

  if (profile.role === 'admin') {
    return <Navigate to="/admin/comercios" replace />
  }

  if (profile.role !== 'comercio') {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <h1>No pudimos validar tu acceso</h1>
          <p role="alert">Tu cuenta no tiene un rol reconocido.</p>
          <div className={styles.logout}>
            <CerrarSesion />
          </div>
        </section>
      </main>
    )
  }

  if (!business) {
    return <Navigate to="/configurar-negocio" replace />
  }

  if (business.status !== 'suspendido') {
    return <Navigate to="/catalogo" replace />
  }

  const checkedTime = accountCheckedAt
    ? new Date(accountCheckedAt).toLocaleTimeString('es-CO')
    : null

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="suspension-title">
        <p className={styles.brand}>ReStock Local</p>

        <span className={styles.badge}>Cuenta suspendida</span>

        <h1 id="suspension-title">
          Tu negocio está suspendido
        </h1>

        <p>
          El acceso de <strong>{business.name}</strong> a las funciones
          de comercio está suspendido.
        </p>

        <div className={styles.reason}>
          <h2>Motivo de la suspensión</h2>
          <p>
            {business.suspend_reason?.trim() ||
              'No se ha registrado un motivo para esta suspensión.'}
          </p>
        </div>

        <p>
          <p>
            Cuando la administración rehabilite tu negocio, pulsa
            «Revisar estado» para volver a ingresar.
            </p>
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={refreshAccount}
          >
            Revisar estado
          </button>

          <div className={styles.logout}>
            <CerrarSesion />
          </div>
        </div>

        {checkedTime && (
          <p className={styles.lastCheck} role="status">
            Última consulta: {checkedTime}
          </p>
        )}
      </section>
    </main>
  )
}

export default CuentaSuspendida