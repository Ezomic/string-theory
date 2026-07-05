import styles from './StatTile.module.css'

interface StatTileProps {
  label: string
  value: string
}

export function StatTile({ label, value }: StatTileProps) {
  return (
    <div className={styles.tile}>
      <span className={styles.value}>{value}</span>
      <span className={styles.label}>{label}</span>
    </div>
  )
}
