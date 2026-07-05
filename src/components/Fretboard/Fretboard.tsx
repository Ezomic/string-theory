import styles from './Fretboard.module.css'
import type { FretboardProps, MarkerRole } from './fretboardTypes'

const MARGIN = 24
const OPEN_WIDTH = 44
const FRET_WIDTH = 64
const STRING_GAP = 30
const SINGLE_INLAY_FRETS = new Set([3, 5, 7, 9, 15, 17, 19, 21])
const DOUBLE_INLAY_FRETS = new Set([12, 24])

const ROLE_CLASS: Record<MarkerRole, string> = {
  root: styles.root,
  scale: styles.scale,
  chord: styles.chord,
  interval: styles.interval,
  correct: styles.correct,
  ghost: styles.ghost,
}

function fretCenterX(fret: number): number {
  if (fret === 0) {
    return MARGIN + OPEN_WIDTH / 2
  }
  return MARGIN + OPEN_WIDTH + FRET_WIDTH * (fret - 1) + FRET_WIDTH / 2
}

export function Fretboard({
  instrument,
  tuning,
  frets,
  markers,
  labelMode,
  leftHanded,
  onFretTap,
}: FretboardProps) {
  const stringCount = tuning.length
  const width = MARGIN * 2 + OPEN_WIDTH + FRET_WIDTH * frets
  const height = MARGIN * 2 + STRING_GAP * (stringCount - 1)
  const nutX = MARGIN + OPEN_WIDTH

  function visualRow(stringNumber: number): number {
    return leftHanded ? stringCount - stringNumber : stringNumber - 1
  }

  function rowY(stringNumber: number): number {
    return MARGIN + visualRow(stringNumber) * STRING_GAP
  }

  function strokeWidthFor(stringNumber: number): number {
    if (stringCount <= 1) return 2
    return Math.max(1, 3.5 - ((stringNumber - 1) * 2.5) / (stringCount - 1))
  }

  const markersByCell = new Map(
    markers.map((marker) => [`${marker.string}:${marker.fret}`, marker]),
  )

  return (
    <svg
      className={styles.fretboard}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${instrument} fretboard`}
    >
      {/* fret inlays */}
      {Array.from({ length: frets }, (_, index) => index + 1)
        .filter((fret) => SINGLE_INLAY_FRETS.has(fret) || DOUBLE_INLAY_FRETS.has(fret))
        .map((fret) => {
          const x = fretCenterX(fret)
          const centerY = height / 2
          if (DOUBLE_INLAY_FRETS.has(fret)) {
            return (
              <g key={`inlay-${fret}`} className={styles.inlay}>
                <circle cx={x} cy={centerY - STRING_GAP} r={4} />
                <circle cx={x} cy={centerY + STRING_GAP} r={4} />
              </g>
            )
          }
          return <circle key={`inlay-${fret}`} className={styles.inlay} cx={x} cy={centerY} r={4} />
        })}

      {/* fret lines */}
      {Array.from({ length: frets + 1 }, (_, fret) => (
        <line
          key={`fret-${fret}`}
          className={fret === 0 ? styles.nut : styles.fretLine}
          x1={nutX + FRET_WIDTH * fret}
          x2={nutX + FRET_WIDTH * fret}
          y1={MARGIN - 10}
          y2={height - MARGIN + 10}
        />
      ))}

      {/* strings */}
      {tuning.map((_, index) => {
        const stringNumber = index + 1
        const y = rowY(stringNumber)
        return (
          <line
            key={`string-${stringNumber}`}
            className={styles.string}
            strokeWidth={strokeWidthFor(stringNumber)}
            x1={MARGIN}
            x2={width - MARGIN}
            y1={y}
            y2={y}
          />
        )
      })}

      {/* tap targets */}
      {onFretTap &&
        tuning.map((_, index) => {
          const stringNumber = index + 1
          const y = rowY(stringNumber)
          return Array.from({ length: frets + 1 }, (_, fret) => (
            <rect
              key={`tap-${stringNumber}-${fret}`}
              className={styles.tapTarget}
              x={fretCenterX(fret) - FRET_WIDTH / 2}
              y={y - STRING_GAP / 2}
              width={fret === 0 ? OPEN_WIDTH : FRET_WIDTH}
              height={STRING_GAP}
              onClick={() => onFretTap(stringNumber, fret)}
            />
          ))
        })}

      {/* markers */}
      {tuning.map((_, index) => {
        const stringNumber = index + 1
        const y = rowY(stringNumber)
        return Array.from({ length: frets + 1 }, (_, fret) => {
          const marker = markersByCell.get(`${stringNumber}:${fret}`)
          if (!marker) return null
          const x = fretCenterX(fret)
          return (
            <g key={`marker-${stringNumber}-${fret}`} className={ROLE_CLASS[marker.role]}>
              <circle cx={x} cy={y} r={12} className={styles.markerDot} />
              {labelMode !== 'none' && (
                <text x={x} y={y} className={styles.markerLabel} textAnchor="middle" dominantBaseline="central">
                  {marker.label}
                </text>
              )}
            </g>
          )
        })
      })}
    </svg>
  )
}
