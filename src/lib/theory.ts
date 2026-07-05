import { NOTE_NAMES, transposeNote, type NoteName } from './pitch/noteMath'
import type { FretboardMarker, MarkerRole } from '../components/Fretboard'

const INTERVAL_LABELS = ['R', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7']

/** Short interval-degree label of `note` relative to `root` (e.g. 'R', '3', '♭7'). */
export function intervalLabel(root: NoteName, note: NoteName): string {
  const semitones = (NOTE_NAMES.indexOf(note) - NOTE_NAMES.indexOf(root) + 12) % 12
  return INTERVAL_LABELS[semitones]
}

export interface ScaleDefinition {
  id: string
  label: string
  /** Semitone offsets from the root. */
  formula: number[]
}

export interface ChordDefinition {
  id: string
  label: string
  formula: number[]
}

export const SCALES: ScaleDefinition[] = [
  { id: 'major', label: 'Major', formula: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'naturalMinor', label: 'Natural minor', formula: [0, 2, 3, 5, 7, 8, 10] },
  { id: 'majorPentatonic', label: 'Major pentatonic', formula: [0, 2, 4, 7, 9] },
  { id: 'minorPentatonic', label: 'Minor pentatonic', formula: [0, 3, 5, 7, 10] },
]

export const CHORDS: ChordDefinition[] = [
  { id: 'major', label: 'Major', formula: [0, 4, 7] },
  { id: 'minor', label: 'Minor', formula: [0, 3, 7] },
  { id: 'dom7', label: '7', formula: [0, 4, 7, 10] },
  { id: 'maj7', label: 'maj7', formula: [0, 4, 7, 11] },
  { id: 'min7', label: 'm7', formula: [0, 3, 7, 10] },
]

/** The chromatic note names produced by a scale/chord formula rooted on `root`. */
export function notesForFormula(root: string, formula: number[]): NoteName[] {
  return formula.map((semitones) => transposeNote(root, semitones))
}

/** Every (string, fret) position within range whose note is in `noteNames`, for a Fretboard. */
export function fretboardMarkersForNotes(
  tuning: string[],
  frets: number,
  noteNames: readonly NoteName[],
  rootNote: NoteName,
  role: Extract<MarkerRole, 'scale' | 'chord'>,
  labelMode: 'names' | 'intervals' = 'names',
): FretboardMarker[] {
  const markers: FretboardMarker[] = []
  tuning.forEach((openNote, index) => {
    const stringNumber = index + 1
    for (let fret = 0; fret <= frets; fret += 1) {
      const note = transposeNote(openNote, fret)
      if (noteNames.includes(note)) {
        markers.push({
          string: stringNumber,
          fret,
          label: labelMode === 'intervals' ? intervalLabel(rootNote, note) : note,
          role: note === rootNote ? 'root' : role,
        })
      }
    }
  })
  return markers
}

/** Every (string, fret) position within range that plays `noteName`, for the note-finding quiz. */
export function fretboardPositionsForNote(
  tuning: string[],
  frets: number,
  noteName: NoteName,
): { string: number; fret: number }[] {
  const positions: { string: number; fret: number }[] = []
  tuning.forEach((openNote, index) => {
    const stringNumber = index + 1
    for (let fret = 0; fret <= frets; fret += 1) {
      if (transposeNote(openNote, fret) === noteName) {
        positions.push({ string: stringNumber, fret })
      }
    }
  })
  return positions
}
