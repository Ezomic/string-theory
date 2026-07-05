import styles from './PillChoiceRow.module.css'

interface PillChoiceOption<Value extends string> {
  value: Value
  label: string
}

interface PillChoiceRowProps<Value extends string> {
  options: PillChoiceOption<Value>[]
  value: Value
  onChange: (value: Value) => void
}

export function PillChoiceRow<Value extends string>({
  options,
  value,
  onChange,
}: PillChoiceRowProps<Value>) {
  return (
    <div className={styles.row}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={[styles.pill, option.value === value ? styles.active : '']
            .filter(Boolean)
            .join(' ')}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
