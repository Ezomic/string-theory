import styles from './Heatmap.module.css'

interface HeatmapProps {
  /** Per-day intensity, 0-3, chunked into rows of 7 (Sun-Sat). */
  days: number[]
}

export function Heatmap({ days }: HeatmapProps) {
  return (
    <div className={styles.grid}>
      {days.map((intensity, index) => (
        <span
          key={index}
          className={styles.cell}
          data-intensity={Math.min(3, Math.max(0, intensity))}
        />
      ))}
    </div>
  )
}
