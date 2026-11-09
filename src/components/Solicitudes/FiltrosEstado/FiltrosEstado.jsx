import styles from './FiltrosEstado.module.scss'

const FILTROS = [
  ['todas', 'Todas'],
  ['pendiente', 'Pendientes'],
  ['en_negociacion', 'En negociación'],
  ['aceptada', 'Aceptadas'],
  ['despachada', 'Despachadas'],
  ['cerradas', 'Cerradas']
]

function FiltrosEstado({ conteo, activo, onCambiar }) {
  return (
    <div className={styles.filtros} role="group" aria-label="Filtrar por estado">
      {FILTROS.map(([clave, etiqueta]) => (
        <button
          key={clave}
          type="button"
          className={`${styles.filtro} ${activo === clave ? styles.activo : ''}`}
          aria-pressed={activo === clave}
          onClick={() => onCambiar(clave)}
        >
          {etiqueta} ({conteo?.[clave] ?? 0})
        </button>
      ))}
    </div>
  )
}

export default FiltrosEstado
