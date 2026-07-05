import styles from './TunerMeter.module.css'

interface TunerMeterProps {
  /** Cents deviation, typically clamped to [-50, 50]. */
  cents: number
}

const IN_TUNE_THRESHOLD = 5
const RANGE = 50

export function TunerMeter({ cents }: TunerMeterProps) {
  const clamped = Math.min(RANGE, Math.max(-RANGE, cents))
  const positionPct = ((clamped + RANGE) / (RANGE * 2)) * 100
  const inTune = Math.abs(clamped) <= IN_TUNE_THRESHOLD

  return (
    <div className={styles.meter}>
      <div className={styles.scale}>
        <div className={styles.centerTick} />
        <div
          className={[styles.needle, inTune ? styles.good : styles.warn].join(' ')}
          style={{ left: `${positionPct}%` }}
        />
      </div>
      <div className={styles.labels}>
        <span>flat</span>
        <span>in tune</span>
        <span>sharp</span>
      </div>
    </div>
  )
}
