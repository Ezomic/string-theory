import { STROKE_GLYPHS, countLabels, type StrumPattern } from '../../lib/strumPatterns'
import styles from './StrumGrid.module.css'

interface StrumGridProps {
  pattern: StrumPattern
  /** Slot within the bar that is sounding now, or null when nothing is playing. */
  activeSlot?: number | null
}

/** One bar of a strum pattern, a group per beat, with the count under each stroke. */
export function StrumGrid({ pattern, activeSlot = null }: StrumGridProps) {
  const labels = countLabels(pattern.subdivision, pattern.beatsPerBar)
  const beats = Array.from({ length: pattern.beatsPerBar }, (_, beat) => beat)

  return (
    <div
      className={styles.grid}
      style={{ gridTemplateColumns: `repeat(${pattern.beatsPerBar}, 1fr)` }}
      role="img"
      aria-label={`${pattern.name}: ${pattern.slots.map((stroke, i) => `${labels[i]} ${stroke}`).join(', ')}`}
    >
      {beats.map((beat) => (
        <div key={beat} className={styles.beat}>
          {pattern.slots.slice(beat * pattern.subdivision, (beat + 1) * pattern.subdivision).map((stroke, sub) => {
            const slot = beat * pattern.subdivision + sub
            return (
              <span
                key={slot}
                className={[styles.slot, slot === activeSlot ? styles.active : ''].filter(Boolean).join(' ')}
                data-stroke={stroke}
              >
                <span className={styles.glyph}>{STROKE_GLYPHS[stroke]}</span>
                <span className={styles.count}>{labels[slot]}</span>
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}
