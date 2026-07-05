import styles from './TunerMeter.module.css'

interface TunerMeterProps {
  /** Cents deviation, typically clamped to [-50, 50]. */
  cents: number
}

const OFF_PITCH_THRESHOLD = 15
const RANGE = 50

export function TunerMeter({ cents }: TunerMeterProps) {
  const clamped = Math.min(RANGE, Math.max(-RANGE, cents))
  const positionPct = ((clamped + RANGE) / (RANGE * 2)) * 100
  const offPitch = Math.abs(clamped) > OFF_PITCH_THRESHOLD

  return (
    <div className={styles.wrapper}>
      <div className={styles.scale}>
        <div className={styles.track} />
        <div className={styles.center} />
        <div
          className={[styles.needle, offPitch ? styles.warn : ''].filter(Boolean).join(' ')}
          style={{ left: `${positionPct}%` }}
        />
      </div>
      <div className={styles.cents}>
        <span>♭ -50</span>
        <span>-20</span>
        <span className={styles.zero}>0</span>
        <span>+20</span>
        <span>+50 ♯</span>
      </div>
    </div>
  )
}
