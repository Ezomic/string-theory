import type { MarkerRole } from '../components/Fretboard'
import type { Instrument } from './db/types'
import { transposeNote, type NoteName } from './pitch/noteMath'
import { CHORDS, SCALES, notesForFormula } from './theory'

export interface CurriculumUnit {
  id: string
  title: string
  /** Starting placement level this unit is appropriate for (1-3). */
  level: number
  order: number
}

export interface LessonReadStep {
  title: string
  paragraphs: string[]
  formula?: string
}

export interface LessonSeeStep {
  root: NoteName
  mode: Extract<MarkerRole, 'scale' | 'chord'>
  formulaId: string
  instrument: Instrument
}

export interface LessonHearStep {
  label: string
  noteNames: NoteName[]
  mode: 'harmonic' | 'melodic'
}

export interface LessonPlayStep {
  expectedNotes: NoteName[]
}

export interface CurriculumLesson {
  id: string
  unitId: string
  order: number
  title: string
  concept: string
  timeEstimateMin: number
  instrumentNote: string
  read: LessonReadStep
  see: LessonSeeStep
  hear: LessonHearStep
  play: LessonPlayStep
}

export const UNITS: CurriculumUnit[] = [
  { id: 'unit-1', title: 'Intervals & Steps', level: 1, order: 1 },
  { id: 'unit-2', title: 'Scales & Keys', level: 2, order: 2 },
  { id: 'unit-3', title: 'Chords on the Neck', level: 3, order: 3 },
]

const majorScaleNotes = notesForFormula('C', SCALES.find((s) => s.id === 'major')!.formula)
const majorChordFormula = CHORDS.find((c) => c.id === 'major')!.formula

export const LESSONS: CurriculumLesson[] = [
  {
    id: 'lesson-1-1',
    unitId: 'unit-1',
    order: 1,
    title: 'Whole steps & half steps',
    concept: 'The two building blocks every scale is made from.',
    timeEstimateMin: 4,
    instrumentNote: 'Guitar & bass',
    read: {
      title: 'Whole steps and half steps',
      paragraphs: [
        'Every note on the fretboard is one fret (a half step) or two frets (a whole step) from its neighbor.',
        'Stack these steps in the right pattern and you get every scale — starting with the major scale’s pattern later in this unit.',
      ],
      formula: 'H = 1 fret, W = 2 frets',
    },
    see: { root: 'E', mode: 'scale', formulaId: 'major', instrument: 'guitar' },
    hear: { label: 'E F# G#', noteNames: notesForFormula('E', [0, 2, 4]), mode: 'melodic' },
    play: { expectedNotes: notesForFormula('E', [0, 2, 4]) },
  },
  {
    id: 'lesson-1-2',
    unitId: 'unit-1',
    order: 2,
    title: 'Intervals recap',
    concept: 'The distance between two notes, and why thirds build chords.',
    timeEstimateMin: 5,
    instrumentNote: 'Guitar & bass',
    read: {
      title: 'What’s an interval?',
      paragraphs: [
        'An interval is just the distance between two notes, measured in steps.',
        'Stack two thirds on top of a root and you’ve built a triad — the basis of every chord.',
      ],
    },
    see: { root: 'A', mode: 'chord', formulaId: 'major', instrument: 'guitar' },
    hear: { label: 'A C# E', noteNames: notesForFormula('A', majorChordFormula), mode: 'harmonic' },
    play: { expectedNotes: notesForFormula('A', majorChordFormula) },
  },
  {
    id: 'lesson-2-1',
    unitId: 'unit-2',
    order: 3,
    title: 'Building the Major Scale',
    concept: 'Learn the W-W-H-W-W-W-H formula and find it anywhere on the neck.',
    timeEstimateMin: 6,
    instrumentNote: 'Guitar & bass',
    read: {
      title: 'The major scale formula',
      paragraphs: [
        'Seven notes, built by stacking a fixed pattern of steps from the root:',
        'W = whole step (2 frets), H = half step (1 fret). Start on C and this gives you C-D-E-F-G-A-B-C — all the natural notes.',
      ],
      formula: 'W – W – H – W – W – W – H',
    },
    see: { root: 'C', mode: 'scale', formulaId: 'major', instrument: 'guitar' },
    hear: { label: 'C D E F G A B C', noteNames: [...majorScaleNotes, 'C'], mode: 'melodic' },
    play: { expectedNotes: [...majorScaleNotes, 'C'] },
  },
  {
    id: 'lesson-2-2',
    unitId: 'unit-2',
    order: 4,
    title: 'The Circle of Fifths',
    concept: 'Stack perfect fifths and you can find every major key.',
    timeEstimateMin: 5,
    instrumentNote: 'Guitar & bass',
    read: {
      title: 'Stacking fifths',
      paragraphs: [
        'Start on C and go up a perfect fifth (7 semitones) repeatedly: C, G, D, A, E, B, F#…',
        'This order is the circle of fifths — neighboring keys share all but one note.',
      ],
    },
    see: { root: 'C', mode: 'scale', formulaId: 'major', instrument: 'guitar' },
    hear: {
      label: 'C G D A',
      noteNames: [0, 7, 14, 21].map((s) => transposeNote('C', s)),
      mode: 'melodic',
    },
    play: { expectedNotes: [0, 7, 14, 21].map((s) => transposeNote('C', s)) },
  },
  {
    id: 'lesson-3-1',
    unitId: 'unit-3',
    order: 5,
    title: 'Triads & How They’re Built',
    concept: 'Root, third, and fifth — the three notes behind every basic chord.',
    timeEstimateMin: 6,
    instrumentNote: 'Guitar & bass',
    read: {
      title: 'Root, third, fifth',
      paragraphs: [
        'A triad is a root note plus the third and fifth stacked above it.',
        'Change the third from major to minor and the whole chord’s mood flips from bright to dark.',
      ],
    },
    see: { root: 'G', mode: 'chord', formulaId: 'major', instrument: 'guitar' },
    hear: { label: 'G B D', noteNames: notesForFormula('G', majorChordFormula), mode: 'harmonic' },
    play: { expectedNotes: notesForFormula('G', majorChordFormula) },
  },
]

export function unitFor(lesson: CurriculumLesson): CurriculumUnit {
  return UNITS.find((u) => u.id === lesson.unitId)!
}

export function lessonsInUnit(unitId: string): CurriculumLesson[] {
  return LESSONS.filter((l) => l.unitId === unitId).sort((a, b) => a.order - b.order)
}

export function lessonById(lessonId: string): CurriculumLesson | undefined {
  return LESSONS.find((l) => l.id === lessonId)
}

export function nextLesson(lesson: CurriculumLesson): CurriculumLesson | undefined {
  return LESSONS.find((l) => l.order === lesson.order + 1)
}

export const ALL_LESSONS_ORDERED = [...LESSONS].sort((a, b) => a.order - b.order)

/** Lessons whose unit level is below `level` are treated as already known (auto-completed). */
export function lessonsToAutoComplete(level: number): CurriculumLesson[] {
  return ALL_LESSONS_ORDERED.filter((lesson) => unitFor(lesson).level < level)
}

/** The first lesson a learner at this placement level should land on. */
export function startingLesson(level: number): CurriculumLesson {
  const firstAtLevel = ALL_LESSONS_ORDERED.find((lesson) => unitFor(lesson).level >= level)
  return firstAtLevel ?? ALL_LESSONS_ORDERED[0]
}
