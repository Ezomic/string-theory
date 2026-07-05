import type { Instrument } from './db/types'
import { transposeNote, type NoteName } from './pitch/noteMath'
import { CHORDS, SCALES, notesForFormula } from './theory'

export type ExerciseCategory = 'scale' | 'arpeggio' | 'exercise'

export interface Exercise {
  id: string
  category: ExerciseCategory
  title: string
  subtitle: string
  instrument: Instrument
  expectedNotes: NoteName[]
}

export const TEMPO_OPTIONS = [60, 80, 100, 120] as const

const majorScale = SCALES.find((s) => s.id === 'major')!.formula
const minorPentatonic = SCALES.find((s) => s.id === 'minorPentatonic')!.formula
const majorChord = CHORDS.find((c) => c.id === 'major')!.formula
const minorChord = CHORDS.find((c) => c.id === 'minor')!.formula

function scaleNotes(root: string, formula: number[]): NoteName[] {
  return [...notesForFormula(root, formula), transposeNote(root, 12)]
}

function twoOctaveScaleNotes(root: string, formula: number[]): NoteName[] {
  const octave1 = notesForFormula(root, formula)
  const octave2 = notesForFormula(root, formula.map((s) => s + 12))
  return [...octave1, ...octave2, transposeNote(root, 24)]
}

export const EXERCISES: Exercise[] = [
  {
    id: 'c-major-scale',
    category: 'scale',
    title: 'C major scale',
    subtitle: '1 octave · open position',
    instrument: 'guitar',
    expectedNotes: scaleNotes('C', majorScale),
  },
  {
    id: 'g-major-scale',
    category: 'scale',
    title: 'G major scale',
    subtitle: '2 octaves',
    instrument: 'guitar',
    expectedNotes: twoOctaveScaleNotes('G', majorScale),
  },
  {
    id: 'a-minor-pentatonic',
    category: 'scale',
    title: 'A minor pentatonic',
    subtitle: 'box 1',
    instrument: 'guitar',
    expectedNotes: scaleNotes('A', minorPentatonic),
  },
  {
    id: 'c-major-arpeggio',
    category: 'arpeggio',
    title: 'C major arpeggio',
    subtitle: 'root position',
    instrument: 'guitar',
    expectedNotes: [...notesForFormula('C', majorChord), transposeNote('C', 12)],
  },
  {
    id: 'a-minor-arpeggio',
    category: 'arpeggio',
    title: 'A minor arpeggio',
    subtitle: 'root position',
    instrument: 'guitar',
    expectedNotes: [...notesForFormula('A', minorChord), transposeNote('A', 12)],
  },
  {
    id: 'chromatic-run',
    category: 'exercise',
    title: 'Chromatic run',
    subtitle: 'E to E · one octave',
    instrument: 'guitar',
    expectedNotes: Array.from({ length: 13 }, (_, i) => transposeNote('E', i)),
  },
]

export function exercisesInCategory(category: ExerciseCategory): Exercise[] {
  return EXERCISES.filter((e) => e.category === category)
}

export function exerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id)
}
