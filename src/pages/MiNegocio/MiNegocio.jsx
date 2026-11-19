import { useState } from 'react'
import { saveBusinessProfile } from '../../services/businessService'
import { useAuth } from '../../hooks/useAuth'
import LayoutComercio from '../../components/Shared/LayoutComercio/LayoutComercio'
import FormularioNegocio from '../../components/Negocio/FormularioNegocio/FormularioNegocio'
import styles from './MiNegocio.module.scss'

function MiNegocio() {
  const { user, profile, business, refreshAccount } = useAuth()

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState(null)
  const [savedValues, setSavedValues] = useState(null)
  const [formVersion, setFormVersion] = useState(0)

  if (!business) {
    return (
      <LayoutComercio>
        <p className={styles.loading} role="status">
          Cargando información del negocio...
        </p>
      </LayoutComercio>
    )
  }

  const initialValues = savedValues || {
    name: business.name,
    city: business.city,
    sector: business.sector,
    contactName: profile?.contact_name || '',
    phone: business.phone || '',
    description: business.description || ''
  }

  const currentBusiness = preview || business

  const memberSince = new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(business.created_at))

  async function handleSave(values) {
    setSaving(true)
    setMessage('')

    try {
      const updated = await saveBusinessProfile(values)

      setSavedValues(values)
      setPreview({
        ...business,
        ...values,
        ...updated
      })

      setFormVersion(current => current + 1)
      setMessage('Los cambios se guardaron correctamente.')
      refreshAccount()
    } catch (error) {
      setMessage(error.message || 'No pudimos actualizar el negocio.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <LayoutComercio>
      <header className={styles.heading}>
        <h1>Mi negocio</h1>
        <p>Así te identifican otros comercios. Solo tú puedes editar estos datos.</p>
      </header>

      <div className={styles.columns}>
        <section className={styles.formCard}>
          <FormularioNegocio
            key={formVersion}
            initialValues={initialValues}
            showContact
            loading={saving}
            message={message}
            submitLabel="Guardar cambios"
            onSubmit={handleSave}
            onCancel
          />
        </section>

        <aside className={styles.previewColumn}>
          <section className={styles.previewCard}>
            <span>Así te ven otros comercios</span>

            <h2>{currentBusiness.name}</h2>

            <p>
              {currentBusiness.city} · {currentBusiness.sector}
            </p>

            <p className={styles.previewDescription}>
              {currentBusiness.description ||
                'Este negocio todavía no tiene descripción.'}
            </p>

            <div className={styles.phoneInfo}>
              <small>Teléfono</small>
              <strong>Oculto hasta que se acepte un acuerdo</strong>
            </div>
          </section>

          <section className={styles.accountCard}>
            <h3>Tu cuenta</h3>

            <div>
              <span>Correo</span>
              <strong>{user?.email}</strong>
            </div>

            <div>
              <span>Miembro desde</span>
              <strong>{memberSince}</strong>
            </div>

            <div>
              <span>Estado</span>
              <strong className={styles.status}>Habilitado</strong>
            </div>
          </section>
        </aside>
      </div>
    </LayoutComercio>
  )
}

export default MiNegocio