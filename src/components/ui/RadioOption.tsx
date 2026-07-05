import styles from './RadioOption.module.css'

interface RadioOptionProps {
  label: string
  description?: string
  selected: boolean
  onSelect: () => void
}

export function RadioOption({ label, description, selected, onSelect }: RadioOptionProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={[styles.option, selected ? styles.selected : ''].filter(Boolean).join(' ')}
      onClick={onSelect}
    >
      <span className={styles.bullet} />
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {description ? <span className={styles.description}>{description}</span> : null}
      </span>
    </button>
  )
}
