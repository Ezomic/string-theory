import styles from './Toggle.module.css'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className={styles.wrapper}>
      {label ? <span className={styles.label}>{label}</span> : null}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={[styles.track, checked ? styles.on : ''].filter(Boolean).join(' ')}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.thumb} />
      </button>
    </label>
  )
}
