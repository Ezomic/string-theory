import styles from './Segmented.module.css'

export interface SegmentedOption<Value extends string> {
  value: Value
  label: string
}

interface SegmentedProps<Value extends string> {
  options: SegmentedOption<Value>[]
  value: Value
  onChange: (value: Value) => void
}

export function Segmented<Value extends string>({
  options,
  value,
  onChange,
}: SegmentedProps<Value>) {
  return (
    <div className={styles.track} role="tablist">
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          type="button"
          aria-selected={option.value === value}
          className={[styles.option, option.value === value ? styles.active : '']
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
