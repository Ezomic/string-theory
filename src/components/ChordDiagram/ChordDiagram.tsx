import { displayStringOrder, type ChordVoicing } from '../../lib/chordVoicings'
import styles from './ChordDiagram.module.css'

const FRET_ROWS = 5
const STRING_GAP = 16
const FRET_GAP = 20
const LEFT = 22
const RIGHT = 12
const TOP = 26
const BOTTOM = 10
const DOT_R = 6

interface ChordDiagramProps {
  voicing: ChordVoicing
  leftHanded?: boolean
  /** Rendered pixel width; the SVG scales to it. */
  size?: number
}

export function ChordDiagram({ voicing, leftHanded = false, size = 96 }: ChordDiagramProps) {
  const count = voicing.frets.length
  const order = displayStringOrder(count, leftHanded)
  const columnX = (stringNumber: number) => LEFT + order.indexOf(stringNumber) * STRING_GAP
  const rowCenterY = (fret: number) => TOP + (fret - voicing.baseFret + 0.5) * FRET_GAP

  const width = LEFT + STRING_GAP * (count - 1) + RIGHT
  const height = TOP + FRET_GAP * FRET_ROWS + BOTTOM
  const boxLeft = LEFT
  const boxRight = LEFT + STRING_GAP * (count - 1)

  const isBarred = (stringNumber: number, fret: number): boolean =>
    (voicing.barres ?? []).some(
      (b) => b.fret === fret && stringNumber >= b.fromString && stringNumber <= b.toString,
    )

  return (
    <svg
      className={styles.diagram}
      style={{ width: size }}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={voicing.name}
    >
      {voicing.baseFret > 1 && (
        <text x={LEFT - 8} y={rowCenterY(voicing.baseFret)} className={styles.baseFret} textAnchor="end" dominantBaseline="central">
          {voicing.baseFret}fr
        </text>
      )}

      {/* fret lines (row 0 is the nut when baseFret === 1) */}
      {Array.from({ length: FRET_ROWS + 1 }, (_, row) => (
        <line
          key={`fret-${row}`}
          className={row === 0 && voicing.baseFret === 1 ? styles.nut : styles.fret}
          x1={boxLeft}
          x2={boxRight}
          y1={TOP + row * FRET_GAP}
          y2={TOP + row * FRET_GAP}
        />
      ))}

      {/* strings */}
      {Array.from({ length: count }, (_, i) => i + 1).map((stringNumber) => (
        <line
          key={`string-${stringNumber}`}
          className={styles.string}
          x1={columnX(stringNumber)}
          x2={columnX(stringNumber)}
          y1={TOP}
          y2={TOP + FRET_GAP * FRET_ROWS}
        />
      ))}

      {/* open / muted markers above the nut */}
      {voicing.frets.map((fret, i) => {
        const stringNumber = i + 1
        if (fret !== 0 && fret !== null) return null
        return (
          <text
            key={`om-${stringNumber}`}
            x={columnX(stringNumber)}
            y={TOP - 9}
            className={styles.openMuted}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {fret === 0 ? 'O' : 'X'}
          </text>
        )
      })}

      {/* barre bars */}
      {(voicing.barres ?? []).map((barre, i) => {
        const xs = [columnX(barre.fromString), columnX(barre.toString)]
        const x1 = Math.min(...xs)
        const x2 = Math.max(...xs)
        const y = rowCenterY(barre.fret)
        return (
          <rect
            key={`barre-${i}`}
            className={styles.barre}
            x={x1 - DOT_R}
            y={y - DOT_R}
            width={x2 - x1 + DOT_R * 2}
            height={DOT_R * 2}
            rx={DOT_R}
          />
        )
      })}

      {/* fretted-note dots (skip ones already covered by a barre) */}
      {voicing.frets.map((fret, i) => {
        const stringNumber = i + 1
        if (fret === null || fret === 0 || isBarred(stringNumber, fret)) return null
        const x = columnX(stringNumber)
        const y = rowCenterY(fret)
        const finger = voicing.fingers[i]
        return (
          <g key={`dot-${stringNumber}`}>
            <circle cx={x} cy={y} r={DOT_R} className={styles.dot} />
            {finger != null && (
              <text x={x} y={y} className={styles.finger} textAnchor="middle" dominantBaseline="central">
                {finger}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
