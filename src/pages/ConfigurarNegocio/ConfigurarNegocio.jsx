
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { supabase } from '../../services/supabaseClient'
import { saveBusinessProfile } from '../../services/businessService'
import { useAuth } from '../../hooks/useAuth'
import FormularioNegocio from '../../components/Negocio/FormularioNegocio/FormularioNegocio'
import styles from './ConfigurarNegocio.module.scss'

function ConfigurarNegocio() {
  const navigate = useNavigate()
  const { user, profile, refreshAccount } = useAuth()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSave(values) {
    setSaving(true)
    setMessage('')

    try {
      await saveBusinessProfile({
        ...values,
        contactName: profile?.contact_name || user?.user_metadata?.contact_name || ''
      })

      refreshAccount()
      navigate('/catalogo', { replace: true })
    } catch (error) {
      setMessage(error.message || 'No pudimos guardar los datos del negocio.')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/iniciar-sesion', { replace: true })
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          ReStock Local
        </Link>

        <div className={styles.account}>
          <span>{profile?.contact_name}</span>
          <button onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </header>

      <section className={styles.card}>
        <span className={styles.badge}>Primer acceso</span>

        <h1>Completa la información de tu negocio</h1>

        <p className={styles.description}>
          Completa estos datos para empezar a publicar ofertas y enviar
          solicitudes. Puedes editarlos después desde Mi negocio.
        </p>

        <FormularioNegocio
          initialValues={{
            name: '',
            city: '',
            sector: '',
            phone: '',
            description: ''
          }}
          loading={saving}
          message={message}
          submitLabel="Guardar y continuar"
          onSubmit={handleSave}
        />
      </section>
    </main>
  )
}

export default ConfigurarNegocio
