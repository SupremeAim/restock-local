
import { useState } from 'react'
import styles from './FormularioNegocio.module.scss'

const cities = [
  'Cali',
  'Palmira',
  'Jamundí',
  'Yumbo',
  'Candelaria',
  'Buga',
  'Tuluá',
  'Cartago',
  'Buenaventura',
  'Bogotá',
  'Medellín',
  'Popayán',
  'Pasto',
  'Pereira',
  'Manizales',
  'Armenia',
  'Barranquilla',
  'Cartagena',
  'Bucaramanga',
  'Otra ciudad'
]

const emptyValues = {
  name: '',
  city: '',
  sector: '',
  contactName: '',
  phone: '',
  description: ''
}

function FormularioNegocio({
  initialValues = emptyValues,
  showContact = false,
  loading = false,
  message = '',
  submitLabel = 'Guardar',
  onSubmit,
  onCancel
}) {
  const [values, setValues] = useState({
    ...emptyValues,
    ...initialValues
  })

  const initialCity = cities.includes(initialValues.city)
    ? initialValues.city
    : initialValues.city
      ? 'Otra ciudad'
      : ''

  const [cityChoice, setCityChoice] = useState(initialCity)
  const [otherCity, setOtherCity] = useState(
    initialCity === 'Otra ciudad' ? initialValues.city : ''
  )
  const [errors, setErrors] = useState({})

  const city = cityChoice === 'Otra ciudad' ? otherCity : cityChoice

  function handleChange(event) {
    const { name, value } = event.target

    setValues(current => ({
      ...current,
      [name]: name === 'phone'
        ? value.replace(/\D/g, '').slice(0, 15)
        : value
    }))

    setErrors(current => ({
      ...current,
      [name]: ''
    }))
  }

  function validate() {
    const nextErrors = {}

    if (values.name.trim().length < 2 || values.name.trim().length > 80) {
      nextErrors.name = 'El nombre debe tener entre 2 y 80 caracteres.'
    }

    if (!city.trim()) {
      nextErrors.city = 'Selecciona o escribe una ciudad.'
    }

    if (!values.sector.trim()) {
      nextErrors.sector = 'Ingresa el barrio o sector.'
    }

    if (!/^[0-9]{7,15}$/.test(values.phone)) {
      nextErrors.phone = 'Ingresa entre 7 y 15 dígitos, solo números.'
    }

    if (showContact && !values.contactName.trim()) {
      nextErrors.contactName = 'Ingresa el nombre de contacto.'
    }

    if (showContact && values.contactName.trim().length > 100) {
      nextErrors.contactName = 'El nombre no puede superar 100 caracteres.'
    }

    if (values.description.length > 500) {
      nextErrors.description = 'La descripción no puede superar 500 caracteres.'
    }

    setErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!validate()) return

    await onSubmit({
      ...values,
      city: city.trim()
    })
  }

  function resetForm() {
    setValues({
      ...emptyValues,
      ...initialValues
    })

    setCityChoice(initialCity)
    setOtherCity(initialCity === 'Otra ciudad' ? initialValues.city : '')
    setErrors({})
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} aria-busy={loading}>
      <h2>Datos del negocio</h2>

      {message && (
        <p className={styles.message} role="alert">
          {message}
        </p>
      )}

      <div className={styles.field}>
        <label htmlFor="business-name">Nombre comercial</label>
        <input
          id="business-name"
          name="name"
          value={values.name}
          onChange={handleChange}
          placeholder="Ej.: Tienda Aurora"
          maxLength={80}
          disabled={loading}
          aria-invalid={Boolean(errors.name)}
        />
        <small>Entre 2 y 80 caracteres.</small>
        {errors.name && <span className={styles.error}>{errors.name}</span>}
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="business-city">Ciudad</label>
          <select
            id="business-city"
            value={cityChoice}
            onChange={event => {
              setCityChoice(event.target.value)
              setErrors(current => ({ ...current, city: '' }))
            }}
            disabled={loading}
            aria-invalid={Boolean(errors.city)}
          >
            <option value="">Selecciona tu ciudad</option>
            {cities.map(item => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          {cityChoice === 'Otra ciudad' && (
            <input
              className={styles.otherCity}
              value={otherCity}
              onChange={event => {
                setOtherCity(event.target.value)
                setErrors(current => ({ ...current, city: '' }))
              }}
              placeholder="Escribe tu ciudad"
              maxLength={80}
              disabled={loading}
            />
          )}

          {errors.city && <span className={styles.error}>{errors.city}</span>}
        </div>

        <div className={styles.field}>
          <label htmlFor="business-sector">Barrio o sector</label>
          <input
            id="business-sector"
            name="sector"
            value={values.sector}
            onChange={handleChange}
            placeholder="Ej.: Granada"
            maxLength={80}
            disabled={loading}
            aria-invalid={Boolean(errors.sector)}
          />
          {errors.sector && (
            <span className={styles.error}>{errors.sector}</span>
          )}
        </div>
      </div>

      {showContact && (
        <div className={styles.field}>
          <label htmlFor="contact-name">Nombre de contacto</label>
          <input
            id="contact-name"
            name="contactName"
            value={values.contactName}
            onChange={handleChange}
            maxLength={100}
            disabled={loading}
            aria-invalid={Boolean(errors.contactName)}
          />
          <small>Visible solo para ti.</small>
          {errors.contactName && (
            <span className={styles.error}>{errors.contactName}</span>
          )}
        </div>
      )}

      <div className={styles.field}>
        <label htmlFor="business-phone">Teléfono de contacto</label>
        <input
          id="business-phone"
          name="phone"
          type="text"
          inputMode="numeric"
          value={values.phone}
          onChange={handleChange}
          placeholder="Ej.: 3104567890"
          maxLength={15}
          disabled={loading}
          aria-invalid={Boolean(errors.phone)}
        />
        <small>Entre 7 y 15 dígitos. Solo lo verá la contraparte de un acuerdo aceptado.</small>
        {errors.phone && <span className={styles.error}>{errors.phone}</span>}
      </div>

      <div className={styles.field}>
        <label htmlFor="business-description">Descripción (opcional)</label>
        <textarea
          id="business-description"
          name="description"
          value={values.description}
          onChange={handleChange}
          placeholder="Cuenta qué vende tu negocio y qué productos te interesan."
          maxLength={500}
          disabled={loading}
          aria-invalid={Boolean(errors.description)}
        />
        <div className={styles.descriptionInfo}>
          <small>La descripción se mostrará junto a tus ofertas públicas.</small>
          <small>{values.description.length}/500</small>
        </div>
        {errors.description && (
          <span className={styles.error}>{errors.description}</span>
        )}
      </div>

      <p className={styles.privacy}>
        No pedimos documentos empresariales ni direcciones residenciales.
        ReStock Local no verifica legalmente a los negocios.
      </p>

      <div className={styles.actions}>
        {onCancel && (
          <button
            type="button"
            className={styles.cancel}
            onClick={resetForm}
            disabled={loading}
          >
            Cancelar
          </button>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : submitLabel}
        </button>
      </div>
    </form>
  )
}

export default FormularioNegocio
