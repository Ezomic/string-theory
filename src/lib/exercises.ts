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
const majorPentatonicScale = SCALES.find((s) => s.id === 'majorPentatonic')!.formula
const naturalMinorScale = SCALES.find((s) => s.id === 'naturalMinor')!.formula
const harmonicMinorScale = SCALES.find((s) => s.id === 'harmonicMinor')!.formula
const melodicMinorScale = SCALES.find((s) => s.id === 'melodicMinor')!.formula
const dorianScale = SCALES.find((s) => s.id === 'dorian')!.formula
const mixolydianScale = SCALES.find((s) => s.id === 'mixolydian')!.formula
const phrygianScale = SCALES.find((s) => s.id === 'phrygian')!.formula
const lydianScale = SCALES.find((s) => s.id === 'lydian')!.formula
const locrianScale = SCALES.find((s) => s.id === 'locrian')!.formula
const majorChord = CHORDS.find((c) => c.id === 'major')!.formula
const minorChord = CHORDS.find((c) => c.id === 'minor')!.formula
const diminishedChord = CHORDS.find((c) => c.id === 'diminished')!.formula
const augmentedChord = CHORDS.find((c) => c.id === 'augmented')!.formula
const dom7Chord = CHORDS.find((c) => c.id === 'dom7')!.formula
const maj7Chord = CHORDS.find((c) => c.id === 'maj7')!.formula
const min7Chord = CHORDS.find((c) => c.id === 'min7')!.formula
const sus2Chord = CHORDS.find((c) => c.id === 'sus2')!.formula
const sus4Chord = CHORDS.find((c) => c.id === 'sus4')!.formula
const dim7Chord = CHORDS.find((c) => c.id === 'dim7')!.formula
const m7b5Chord = CHORDS.find((c) => c.id === 'm7b5')!.formula

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
    id: 'a-natural-minor-scale',
    category: 'scale',
    title: 'A natural minor scale',
    subtitle: '1 octave · relative minor of C major',
    instrument: 'guitar',
    expectedNotes: scaleNotes('A', naturalMinorScale),
  },
  {
    id: 'g-dominant-7-arpeggio',
    category: 'arpeggio',
    title: 'G7 arpeggio',
    subtitle: 'dominant 7th · root position',
    instrument: 'guitar',
    expectedNotes: [...notesForFormula('G', dom7Chord), transposeNote('G', 12)],
  },
  {
    id: 'c-major-7-arpeggio',
    category: 'arpeggio',
    title: 'Cmaj7 arpeggio',
    subtitle: 'major 7th · root position',
    instrument: 'guitar',
    expectedNotes: [...notesForFormula('C', maj7Chord), transposeNote('C', 12)],
  },
  {
    id: 'a-minor-7-arpeggio',
    category: 'arpeggio',
    title: 'Am7 arpeggio',
    subtitle: 'minor 7th · root position',
    instrument: 'guitar',
    expectedNotes: [...notesForFormula('A', min7Chord), transposeNote('A', 12)],
  },
  {
    id: 'chromatic-run',
    category: 'exercise',
    title: 'Chromatic run',
    subtitle: 'E to E · one octave',
    instrument: 'guitar',
    expectedNotes: Array.from({ length: 13 }, (_, i) => transposeNote('E', i)),
  },
  {
    id: 'd-dorian-scale',
    category: 'scale',
    title: 'D Dorian scale',
    subtitle: '1 octave',
    instrument: 'guitar',
    expectedNotes: scaleNotes('D', dorianScale),
  },
  {
    id: 'g-mixolydian-scale',
    category: 'scale',
    title: 'G Mixolydian scale',
    subtitle: '1 octave',
    instrument: 'guitar',
    expectedNotes: scaleNotes('G', mixolydianScale),
  },
  {
    id: 'e-phrygian-scale',
    category: 'scale',
    title: 'E Phrygian scale',
    subtitle: '1 octave',
    instrument: 'guitar',
    expectedNotes: scaleNotes('E', phrygianScale),
  },
  {
    id: 'd-sus4-arpeggio',
    category: 'arpeggio',
    title: 'Dsus4 arpeggio',
    subtitle: 'suspended 4th · root position',
    instrument: 'guitar',
    expectedNotes: [...notesForFormula('D', sus4Chord), transposeNote('D', 12)],
  },
  {
    id: 'b-diminished-7-arpeggio',
    category: 'arpeggio',
    title: 'Bdim7 arpeggio',
    subtitle: 'fully diminished 7th · root position',
    instrument: 'guitar',
    expectedNotes: [...notesForFormula('B', dim7Chord), transposeNote('B', 12)],
  },
  {
    id: 'b-half-diminished-arpeggio',
    category: 'arpeggio',
    title: 'Bm7♭5 arpeggio',
    subtitle: 'half-diminished · root position',
    instrument: 'guitar',
    expectedNotes: [...notesForFormula('B', m7b5Chord), transposeNote('B', 12)],
  },
  {
    id: 'f-major-pentatonic',
    category: 'scale',
    title: 'F major pentatonic',
    subtitle: '1 octave',
    instrument: 'guitar',
    expectedNotes: scaleNotes('F', majorPentatonicScale),
  },
  {
    id: 'c-sharp-harmonic-minor-scale',
    category: 'scale',
    title: 'C# harmonic minor scale',
    subtitle: '1 octave',
    instrument: 'guitar',
    expectedNotes: scaleNotes('C#', harmonicMinorScale),
  },
  {
    id: 'f-sharp-lydian-scale',
    category: 'scale',
    title: 'F# Lydian scale',
    subtitle: '1 octave',
    instrument: 'guitar',
    expectedNotes: scaleNotes('F#', lydianScale),
  },
  {
    id: 'g-sharp-locrian-scale',
    category: 'scale',
    title: 'G# Locrian scale',
    subtitle: '1 octave',
    instrument: 'guitar',
    expectedNotes: scaleNotes('G#', locrianScale),
  },
  {
    id: 'd-sharp-melodic-minor-scale',
    category: 'scale',
    title: 'D# melodic minor scale',
    subtitle: '1 octave',
    instrument: 'guitar',
    expectedNotes: scaleNotes('D#', melodicMinorScale),
  },
  {
    id: 'a-sharp-diminished-arpeggio',
    category: 'arpeggio',
    title: 'A#dim arpeggio',
    subtitle: 'diminished · root position',
    instrument: 'guitar',
    expectedNotes: [...notesForFormula('A#', diminishedChord), transposeNote('A#', 12)],
  },
  {
    id: 'd-sharp-augmented-arpeggio',
    category: 'arpeggio',
    title: 'D#aug arpeggio',
    subtitle: 'augmented · root position',
    instrument: 'guitar',
    expectedNotes: [...notesForFormula('D#', augmentedChord), transposeNote('D#', 12)],
  },
  {
    id: 'f-sus2-arpeggio',
    category: 'arpeggio',
    title: 'Fsus2 arpeggio',
    subtitle: 'suspended 2nd · root position',
    instrument: 'guitar',
    expectedNotes: [...notesForFormula('F', sus2Chord), transposeNote('F', 12)],
  },
]

export function exercisesInCategory(category: ExerciseCategory): Exercise[] {
  return EXERCISES.filter((e) => e.category === category)
}

export function exerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id)
}
