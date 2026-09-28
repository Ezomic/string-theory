import { isSharp, ledgerLines, stepsFromBottomLine, type StaffNote } from '../../lib/staff'
import styles from './Staff.module.css'

const LINE_GAP = 12
const HALF = LINE_GAP / 2
const STAFF_TOP = 40
const BOTTOM_LINE_Y = STAFF_TOP + 4 * LINE_GAP
const HEIGHT = 132

const CLEF_X = 12
const NOTE_X0 = 46
const NOTE_SPACING = 32
const RIGHT_PAD = 26

const HEAD_RX = 5.4
const HEAD_RY = 4.2
const STEM_LEN = 30
const LEDGER_HALF_WIDTH = 8.5

const stepY = (step: number) => BOTTOM_LINE_Y - step * HALF

interface StaffProps {
  notes: StaffNote[]
  /** Rendered pixel width; the SVG scales to it. */
  width?: number
  ariaLabel?: string
}

export function Staff({ notes, width = 220, ariaLabel }: StaffProps) {
  const svgWidth = NOTE_X0 + Math.max(0, notes.length - 1) * NOTE_SPACING + RIGHT_PAD
  const label = ariaLabel ?? notes.map((n) => `${n.note}${n.octave}`).join(', ')

  return (
    <svg
      className={styles.staff}
      style={{ width }}
      viewBox={`0 0 ${svgWidth} ${HEIGHT}`}
      role="img"
      aria-label={label}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <line
          key={`line-${i}`}
          className={styles.line}
          x1={CLEF_X}
          x2={svgWidth - 6}
          y1={STAFF_TOP + i * LINE_GAP}
          y2={STAFF_TOP + i * LINE_GAP}
        />
      ))}

      <text x={CLEF_X + 2} y={BOTTOM_LINE_Y - LINE_GAP} className={styles.clef} dominantBaseline="middle">
        𝄞
      </text>

      {notes.map((note, i) => {
        const x = NOTE_X0 + i * NOTE_SPACING
        const step = stepsFromBottomLine(note)
        const y = stepY(step)
        const stemUp = step < 4
        const filled = note.duration === 'quarter' || note.duration === 'eighth'
        const hasStem = note.duration !== 'whole'
        const stemX = stemUp ? x + HEAD_RX - 0.4 : x - HEAD_RX + 0.4
        const stemEndY = stemUp ? y - STEM_LEN : y + STEM_LEN

        return (
          <g key={i}>
            {ledgerLines(note).map((k) => (
              <line
                key={`ledger-${k}`}
                className={styles.line}
                x1={x - LEDGER_HALF_WIDTH}
                x2={x + LEDGER_HALF_WIDTH}
                y1={stepY(k)}
                y2={stepY(k)}
              />
            ))}

            {isSharp(note) && (
              <text x={x - HEAD_RX - 7} y={y} className={styles.accidental} textAnchor="middle" dominantBaseline="central">
                ♯
              </text>
            )}

            <ellipse
              cx={x}
              cy={y}
              rx={HEAD_RX}
              ry={HEAD_RY}
              className={filled ? styles.headFilled : styles.headHollow}
              transform={`rotate(-20 ${x} ${y})`}
            />

            {hasStem && <line className={styles.stem} x1={stemX} x2={stemX} y1={y} y2={stemEndY} />}

            {note.duration === 'eighth' && (
              <path
                className={styles.flag}
                d={`M ${stemX} ${stemEndY} q 7 3 6 12`}
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}
