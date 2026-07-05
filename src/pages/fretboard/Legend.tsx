import styles from './Legend.module.css'

interface LegendItem {
  color: string
  label: string
}

export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <div className={styles.legend}>
      {items.map((item) => (
        <span key={item.label} className={styles.item}>
          <i className={styles.dot} style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  )
}
