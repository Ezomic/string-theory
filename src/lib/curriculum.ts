import type { MarkerRole } from '../components/Fretboard'
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
}

export interface LessonHearStep {
  label: string
  noteNames: NoteName[]
  mode: 'harmonic' | 'melodic'
}

export interface LessonPlayStep {
  expectedNotes: NoteName[]
}

export interface LessonQuizStep {
  question: string
  choices: string[]
  correctLabel: string
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
  /** A pool of quiz questions for this lesson; one is picked at random each time it's run. */
  quiz: LessonQuizStep[]
}

/** Picks one quiz question at random from a lesson's pool, so replaying a lesson doesn't always show the same one. */
export function randomQuizFor(lesson: CurriculumLesson): LessonQuizStep {
  return lesson.quiz[Math.floor(Math.random() * lesson.quiz.length)]
}

export const UNITS: CurriculumUnit[] = [
  { id: 'unit-1', title: 'Intervals & Steps', level: 1, order: 1 },
  { id: 'unit-2', title: 'Scales & Keys', level: 2, order: 2 },
  { id: 'unit-3', title: 'Chords on the Neck', level: 3, order: 3 },
  { id: 'unit-4', title: 'Modes & Extended Harmony', level: 3, order: 4 },
]

const majorScaleNotes = notesForFormula('C', SCALES.find((s) => s.id === 'major')!.formula)
const majorChordFormula = CHORDS.find((c) => c.id === 'major')!.formula
const minorChordFormula = CHORDS.find((c) => c.id === 'minor')!.formula
const naturalMinorFormula = SCALES.find((s) => s.id === 'naturalMinor')!.formula
const majorPentatonicFormula = SCALES.find((s) => s.id === 'majorPentatonic')!.formula
const minorPentatonicFormula = SCALES.find((s) => s.id === 'minorPentatonic')!.formula
const diminishedChordFormula = CHORDS.find((c) => c.id === 'diminished')!.formula
const dom7ChordFormula = CHORDS.find((c) => c.id === 'dom7')!.formula
const maj7ChordFormula = CHORDS.find((c) => c.id === 'maj7')!.formula
const dorianFormula = SCALES.find((s) => s.id === 'dorian')!.formula
const mixolydianFormula = SCALES.find((s) => s.id === 'mixolydian')!.formula
const phrygianFormula = SCALES.find((s) => s.id === 'phrygian')!.formula
const sus4ChordFormula = CHORDS.find((c) => c.id === 'sus4')!.formula
const dim7ChordFormula = CHORDS.find((c) => c.id === 'dim7')!.formula

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
    see: { root: 'E', mode: 'scale', formulaId: 'major' },
    hear: { label: 'E F# G#', noteNames: notesForFormula('E', [0, 2, 4]), mode: 'melodic' },
    play: { expectedNotes: notesForFormula('E', [0, 2, 4]) },
    quiz: [
      {
        question: 'How many frets is a half step?',
        choices: ['1 fret', '2 frets', '3 frets'],
        correctLabel: '1 fret',
      },
      {
        question: 'How many frets is a whole step?',
        choices: ['1 fret', '2 frets', '3 frets'],
        correctLabel: '2 frets',
      },
      {
        question: 'Stacking whole and half steps in the right pattern gives you a...?',
        choices: ['A scale', 'A tuning', 'A capo'],
        correctLabel: 'A scale',
      },
    ],
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
    see: { root: 'A', mode: 'chord', formulaId: 'major' },
    hear: { label: 'A C# E', noteNames: notesForFormula('A', majorChordFormula), mode: 'harmonic' },
    play: { expectedNotes: notesForFormula('A', majorChordFormula) },
    quiz: [
      {
        question: 'Stack two of which interval on a root to build a basic triad?',
        choices: ['Thirds', 'Fourths', 'Fifths'],
        correctLabel: 'Thirds',
      },
      {
        question: 'What is an interval?',
        choices: ['The distance between two notes', 'The loudness of a note', 'A type of tuning'],
        correctLabel: 'The distance between two notes',
      },
      {
        question: 'How many thirds do you stack on a root to build a triad?',
        choices: ['One', 'Two', 'Three'],
        correctLabel: 'Two',
      },
    ],
  },
  {
    id: 'lesson-1-3',
    unitId: 'unit-1',
    order: 3,
    title: 'Major vs Minor Thirds',
    concept: 'The single semitone that flips a chord from bright to dark.',
    timeEstimateMin: 4,
    instrumentNote: 'Guitar & bass',
    read: {
      title: 'One fret makes all the difference',
      paragraphs: [
        'A major third spans 4 semitones from the root; a minor third spans just 3 — one fret less.',
        'That one-fret gap is the whole reason a chord sounds happy or sad: swap a chord’s major third for a minor third and everything else can stay the same.',
      ],
      formula: 'Major 3rd = 4 semitones, Minor 3rd = 3 semitones',
    },
    see: { root: 'C', mode: 'chord', formulaId: 'minor' },
    hear: { label: 'C D# G', noteNames: notesForFormula('C', minorChordFormula), mode: 'harmonic' },
    play: { expectedNotes: notesForFormula('C', minorChordFormula) },
    quiz: [
      {
        question: 'How many semitones is a minor third?',
        choices: ['3', '4', '5'],
        correctLabel: '3',
      },
      {
        question: 'How many semitones is a major third?',
        choices: ['3', '4', '5'],
        correctLabel: '4',
      },
      {
        question: 'What single change flips a chord from major to minor?',
        choices: ['Swapping the major third for a minor third', 'Adding a seventh', 'Removing the fifth'],
        correctLabel: 'Swapping the major third for a minor third',
      },
    ],
  },
  {
    id: 'lesson-1-4',
    unitId: 'unit-1',
    order: 4,
    title: 'Perfect Fourths and Fifths',
    concept: 'The two “open” intervals every power chord is built from.',
    timeEstimateMin: 4,
    instrumentNote: 'Guitar & bass',
    read: {
      title: 'Perfect intervals',
      paragraphs: [
        'A perfect fourth is 5 semitones above the root; a perfect fifth is 7. Both sound stable and open — no major or minor flavor to argue about.',
        'Play just a root and a fifth together and you’ve got a power chord: the sound behind almost every rock riff.',
      ],
      formula: 'P4 = 5 semitones, P5 = 7 semitones',
    },
    see: { root: 'G', mode: 'scale', formulaId: 'major' },
    hear: { label: 'G C D', noteNames: notesForFormula('G', [0, 5, 7]), mode: 'melodic' },
    play: { expectedNotes: notesForFormula('G', [0, 5, 7]) },
    quiz: [
      {
        question: 'How many semitones above the root is a perfect fifth?',
        choices: ['5', '7', '9'],
        correctLabel: '7',
      },
      {
        question: 'How many semitones above the root is a perfect fourth?',
        choices: ['4', '5', '7'],
        correctLabel: '5',
      },
      {
        question: 'A root plus a fifth played together is called a...?',
        choices: ['Power chord', 'Suspended chord', 'Diminished chord'],
        correctLabel: 'Power chord',
      },
    ],
  },
  {
    id: 'lesson-1-5',
    unitId: 'unit-1',
    order: 5,
    title: 'The Leading Tone',
    concept: 'The 7th scale degree — a half step below the root, pulling your ear straight back home.',
    timeEstimateMin: 4,
    instrumentNote: 'Guitar & bass',
    read: {
      title: 'Why the 7th degree feels unfinished',
      paragraphs: [
        'The major scale’s 7th note sits just one half step below the root — the smallest possible gap.',
        'That tension is why a scale run from root to the leading tone feels unfinished until it resolves up to the root.',
      ],
      formula: 'Leading tone = 11 semitones above the root',
    },
    see: { root: 'D', mode: 'scale', formulaId: 'major' },
    hear: { label: 'D C# D', noteNames: notesForFormula('D', [0, 11, 0]), mode: 'melodic' },
    play: { expectedNotes: notesForFormula('D', [0, 11, 0]) },
    quiz: [
      {
        question: 'How many semitones above the root is the leading tone?',
        choices: ['9', '10', '11'],
        correctLabel: '11',
      },
      {
        question: 'Which scale degree is the leading tone?',
        choices: ['The 5th', 'The 6th', 'The 7th'],
        correctLabel: 'The 7th',
      },
      {
        question: "Why does the leading tone feel 'unfinished'?",
        choices: ['It sits a half step below the root', 'It sits a whole step below the root', "It's the same note as the root"],
        correctLabel: 'It sits a half step below the root',
      },
    ],
  },
  {
    id: 'lesson-2-1',
    unitId: 'unit-2',
    order: 6,
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
    see: { root: 'C', mode: 'scale', formulaId: 'major' },
    hear: { label: 'C D E F G A B C', noteNames: [...majorScaleNotes, 'C'], mode: 'melodic' },
    play: { expectedNotes: [...majorScaleNotes, 'C'] },
    quiz: [
      {
        question: "What's the major scale's step pattern?",
        choices: ['W–W–H–W–W–W–H', 'W–H–W–W–H–W–W', 'H–W–W–W–H–W–W'],
        correctLabel: 'W–W–H–W–W–W–H',
      },
      {
        question: 'Starting on C, the major scale gives you which notes?',
        choices: ['C-D-E-F-G-A-B-C', 'C-D-Eb-F-G-Ab-Bb-C', 'C-Db-Eb-F-Gb-Ab-Bb-C'],
        correctLabel: 'C-D-E-F-G-A-B-C',
      },
      {
        question: 'How many notes are in a major scale (before repeating the root)?',
        choices: ['Five', 'Six', 'Seven'],
        correctLabel: 'Seven',
      },
    ],
  },
  {
    id: 'lesson-2-2',
    unitId: 'unit-2',
    order: 7,
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
    see: { root: 'C', mode: 'scale', formulaId: 'major' },
    hear: {
      label: 'C G D A',
      noteNames: [0, 7, 14, 21].map((s) => transposeNote('C', s)),
      mode: 'melodic',
    },
    play: { expectedNotes: [0, 7, 14, 21].map((s) => transposeNote('C', s)) },
    quiz: [
      {
        question: 'Each step around the circle of fifths moves up by a...?',
        choices: ['Perfect fourth', 'Perfect fifth', 'Major third'],
        correctLabel: 'Perfect fifth',
      },
      {
        question: "Starting on C and going around the circle of fifths, what's the next key?",
        choices: ['G', 'F', 'D'],
        correctLabel: 'G',
      },
      {
        question: 'Neighboring keys on the circle of fifths share...?',
        choices: ['All but one note', 'Exactly half their notes', 'No notes at all'],
        correctLabel: 'All but one note',
      },
    ],
  },
  {
    id: 'lesson-2-3',
    unitId: 'unit-2',
    order: 8,
    title: 'The Natural Minor Scale',
    concept: 'Same seven notes as a major scale, starting from a different root — but it feels completely different.',
    timeEstimateMin: 5,
    instrumentNote: 'Guitar & bass',
    read: {
      title: 'The natural minor formula',
      paragraphs: [
        'Natural minor uses the pattern W-H-W-W-H-W-W — the two half steps land in different spots than in major, giving it a darker, moodier sound.',
        'A minor and C major share every single note — they’re “relative” keys, just built from a different starting point.',
      ],
      formula: 'W – H – W – W – H – W – W',
    },
    see: { root: 'A', mode: 'scale', formulaId: 'naturalMinor' },
    hear: {
      label: 'A B C D E F G A',
      noteNames: [...notesForFormula('A', naturalMinorFormula), 'A'],
      mode: 'melodic',
    },
    play: { expectedNotes: [...notesForFormula('A', naturalMinorFormula), 'A'] },
    quiz: [
      {
        question: "Natural minor's step pattern is...?",
        choices: ['W–H–W–W–H–W–W', 'W–W–H–W–W–W–H', 'H–W–W–W–H–W–W'],
        correctLabel: 'W–H–W–W–H–W–W',
      },
      {
        question: 'A minor and C major are called...?',
        choices: ['Relative keys', 'Parallel keys', 'Enharmonic keys'],
        correctLabel: 'Relative keys',
      },
      {
        question: 'What makes natural minor sound darker than major?',
        choices: ['Its two half steps land in different spots', 'It has fewer notes', 'It starts on a different fret'],
        correctLabel: 'Its two half steps land in different spots',
      },
    ],
  },
  {
    id: 'lesson-2-4',
    unitId: 'unit-2',
    order: 9,
    title: 'Major Pentatonic',
    concept: 'Drop the two “spicy” notes from major and you get five notes that are hard to play wrong.',
    timeEstimateMin: 5,
    instrumentNote: 'Guitar & bass',
    read: {
      title: 'Five notes, no wrong notes',
      paragraphs: [
        'The major pentatonic scale keeps the root, 2nd, 3rd, 5th, and 6th of the major scale — dropping the 4th and 7th, the two notes most likely to clash.',
        'That’s why it’s the first scale most players learn to improvise with: almost anything you play from it over a major-key backing track sounds right.',
      ],
    },
    see: { root: 'G', mode: 'scale', formulaId: 'majorPentatonic' },
    hear: { label: 'G A B D E', noteNames: notesForFormula('G', majorPentatonicFormula), mode: 'melodic' },
    play: { expectedNotes: notesForFormula('G', majorPentatonicFormula) },
    quiz: [
      {
        question: 'Which two scale degrees does major pentatonic drop from the major scale?',
        choices: ['4th and 7th', '2nd and 6th', '3rd and 5th'],
        correctLabel: '4th and 7th',
      },
      {
        question: 'How many notes are in a pentatonic scale?',
        choices: ['Five', 'Six', 'Seven'],
        correctLabel: 'Five',
      },
      {
        question: 'Why is major pentatonic popular for improvising?',
        choices: [
          'Almost nothing in it clashes with a major backing track',
          'It has the most notes of any scale',
          'It only works in one key',
        ],
        correctLabel: 'Almost nothing in it clashes with a major backing track',
      },
    ],
  },
  {
    id: 'lesson-2-5',
    unitId: 'unit-2',
    order: 10,
    title: 'Minor Pentatonic',
    concept: 'The five-note scale behind most blues and rock guitar solos.',
    timeEstimateMin: 5,
    instrumentNote: 'Guitar & bass',
    read: {
      title: 'The go-to soloing scale',
      paragraphs: [
        'Minor pentatonic drops the 2nd and 6th from natural minor, leaving root, minor 3rd, 4th, 5th, and minor 7th.',
        'It’s forgiving — nearly every note in the pattern works over a minor-key or blues progression, which is why it’s usually the first scale players reach for.',
      ],
    },
    see: { root: 'E', mode: 'scale', formulaId: 'minorPentatonic' },
    hear: { label: 'E G A B D', noteNames: notesForFormula('E', minorPentatonicFormula), mode: 'melodic' },
    play: { expectedNotes: notesForFormula('E', minorPentatonicFormula) },
    quiz: [
      {
        question: 'Which two scale degrees does minor pentatonic drop from natural minor?',
        choices: ['2nd and 6th', '4th and 7th', '3rd and 5th'],
        correctLabel: '2nd and 6th',
      },
      {
        question: 'Minor pentatonic is built from which scale?',
        choices: ['Natural minor', 'Major', 'Harmonic minor'],
        correctLabel: 'Natural minor',
      },
      {
        question: 'What style of music is minor pentatonic most associated with?',
        choices: ['Blues and rock soloing', 'Classical counterpoint', 'Barbershop harmony'],
        correctLabel: 'Blues and rock soloing',
      },
    ],
  },
  {
    id: 'lesson-3-1',
    unitId: 'unit-3',
    order: 11,
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
    see: { root: 'G', mode: 'chord', formulaId: 'major' },
    hear: { label: 'G B D', noteNames: notesForFormula('G', majorChordFormula), mode: 'harmonic' },
    play: { expectedNotes: notesForFormula('G', majorChordFormula) },
    quiz: [
      {
        question: 'A triad stacks a root with which two intervals?',
        choices: ['Third and fifth', 'Fourth and sixth', 'Second and fourth'],
        correctLabel: 'Third and fifth',
      },
      {
        question: 'What are the three notes of a basic triad?',
        choices: ['Root, third, fifth', 'Root, fourth, sixth', 'Root, second, seventh'],
        correctLabel: 'Root, third, fifth',
      },
      {
        question: "Changing a triad's third from major to minor changes its...?",
        choices: ['Mood, from bright to dark', 'Root note', 'Number of notes'],
        correctLabel: 'Mood, from bright to dark',
      },
    ],
  },
  {
    id: 'lesson-3-2',
    unitId: 'unit-3',
    order: 12,
    title: 'Minor Triads',
    concept: 'Flip the third and the same shape turns from bright to dark.',
    timeEstimateMin: 5,
    instrumentNote: 'Guitar & bass',
    read: {
      title: 'Major to minor in one move',
      paragraphs: [
        'A minor triad is root, minor third, and perfect fifth — the exact same shape as a major triad with the third lowered one fret.',
        'Every major chord has a minor twin hiding one fret away on the third.',
      ],
    },
    see: { root: 'G', mode: 'chord', formulaId: 'minor' },
    hear: { label: 'G A# D', noteNames: notesForFormula('G', minorChordFormula), mode: 'harmonic' },
    play: { expectedNotes: notesForFormula('G', minorChordFormula) },
    quiz: [
      {
        question: 'A minor triad differs from a major triad by...?',
        choices: ['A lowered third', 'A lowered fifth', 'A raised seventh'],
        correctLabel: 'A lowered third',
      },
      {
        question: "A minor triad's fifth compared to a major triad's fifth is...?",
        choices: ['The same', 'Lowered', 'Raised'],
        correctLabel: 'The same',
      },
      {
        question: 'Every major chord has a minor twin found by...?',
        choices: ['Lowering the third one fret', 'Raising the fifth one fret', 'Adding a seventh'],
        correctLabel: 'Lowering the third one fret',
      },
    ],
  },
  {
    id: 'lesson-3-3',
    unitId: 'unit-3',
    order: 13,
    title: 'Diminished & Augmented Triads',
    concept: 'The two unstable, tension-filled triads — each built from stacking identical intervals.',
    timeEstimateMin: 5,
    instrumentNote: 'Guitar & bass',
    read: {
      title: 'Symmetrical and unstable',
      paragraphs: [
        'A diminished triad stacks two minor thirds (root, ♭3, ♭5) — it sounds tense and wants to resolve somewhere.',
        'An augmented triad stacks two major thirds instead (root, 3, #5) — a different flavor of tension, but the same restless feeling.',
      ],
      formula: 'Diminished = R + ♭3 + ♭5, Augmented = R + 3 + #5',
    },
    see: { root: 'B', mode: 'chord', formulaId: 'diminished' },
    hear: { label: 'B D F', noteNames: notesForFormula('B', diminishedChordFormula), mode: 'harmonic' },
    play: { expectedNotes: notesForFormula('B', diminishedChordFormula) },
    quiz: [
      {
        question: 'A diminished triad stacks two of which interval?',
        choices: ['Minor thirds', 'Major thirds', 'Perfect fourths'],
        correctLabel: 'Minor thirds',
      },
      {
        question: 'An augmented triad stacks two of which interval?',
        choices: ['Major thirds', 'Minor thirds', 'Perfect fourths'],
        correctLabel: 'Major thirds',
      },
      {
        question: 'What do diminished and augmented triads have in common?',
        choices: [
          'Both are built from two identical stacked intervals',
          'Both contain a perfect fifth',
          'Both are the same as a major triad',
        ],
        correctLabel: 'Both are built from two identical stacked intervals',
      },
    ],
  },
  {
    id: 'lesson-3-4',
    unitId: 'unit-3',
    order: 14,
    title: 'Dominant 7th Chords',
    concept: 'Add a flat seventh to a major triad and you get the chord that wants to resolve.',
    timeEstimateMin: 5,
    instrumentNote: 'Guitar & bass',
    read: {
      title: 'The chord that pulls forward',
      paragraphs: [
        'A dominant 7th is a major triad plus a flat seventh — root, 3, 5, ♭7.',
        'It’s the “V7” chord in a key, and it gives the single strongest pull back to the root of any chord in Western music.',
      ],
    },
    see: { root: 'G', mode: 'chord', formulaId: 'dom7' },
    hear: { label: 'G B D F', noteNames: notesForFormula('G', dom7ChordFormula), mode: 'harmonic' },
    play: { expectedNotes: notesForFormula('G', dom7ChordFormula) },
    quiz: [
      {
        question: 'A dominant 7th chord adds which note to a major triad?',
        choices: ['A flat seventh', 'A major seventh', 'A raised fifth'],
        correctLabel: 'A flat seventh',
      },
      {
        question: 'A dominant 7th chord is often labeled as which chord in a key?',
        choices: ['V7', 'I7', 'ii7'],
        correctLabel: 'V7',
      },
      {
        question: 'What does a dominant 7th chord want to do?',
        choices: ['Resolve back to the root', 'Stay unresolved forever', 'Move to the relative minor'],
        correctLabel: 'Resolve back to the root',
      },
    ],
  },
  {
    id: 'lesson-3-5',
    unitId: 'unit-3',
    order: 15,
    title: 'Major 7 and Minor 7 Chords',
    concept: 'Smoother, jazzier cousins of the plain major and minor triads.',
    timeEstimateMin: 5,
    instrumentNote: 'Guitar & bass',
    read: {
      title: 'Adding the seventh',
      paragraphs: [
        'A major 7 chord adds the major seventh (one half step below the octave) to a major triad — root, 3, 5, 7 — for a lush, settled sound.',
        'A minor 7 does the same to a minor triad but with a flat seventh instead — root, ♭3, 5, ♭7 — common in jazz and soul.',
      ],
    },
    see: { root: 'C', mode: 'chord', formulaId: 'maj7' },
    hear: { label: 'C E G B', noteNames: notesForFormula('C', maj7ChordFormula), mode: 'harmonic' },
    play: { expectedNotes: notesForFormula('C', maj7ChordFormula) },
    quiz: [
      {
        question: 'A major 7 chord adds which note to a major triad?',
        choices: ['The major seventh', 'The flat seventh', 'The sixth'],
        correctLabel: 'The major seventh',
      },
      {
        question: 'A minor 7 chord adds which note to a minor triad?',
        choices: ['A flat seventh', 'A major seventh', 'A raised fifth'],
        correctLabel: 'A flat seventh',
      },
      {
        question: 'Major 7 and minor 7 chords are especially common in which style?',
        choices: ['Jazz and soul', 'Thrash metal', 'Classical minuets'],
        correctLabel: 'Jazz and soul',
      },
    ],
  },
  {
    id: 'lesson-4-1',
    unitId: 'unit-4',
    order: 16,
    title: 'The Dorian Mode',
    concept: 'A minor scale with a brighter 6th — the sound of modal jazz and funk.',
    timeEstimateMin: 5,
    instrumentNote: 'Guitar & bass',
    read: {
      title: 'Minor, but not quite',
      paragraphs: [
        'Dorian is a natural minor scale with one note raised: the 6th degree. Play the white keys from D to D and that’s D Dorian.',
        'That raised 6th keeps it from sounding as dark as natural minor — it’s the scale behind tunes like “So What” and countless funk basslines.',
      ],
      formula: 'W – H – W – W – W – H – W',
    },
    see: { root: 'D', mode: 'scale', formulaId: 'dorian' },
    hear: { label: 'D E F G A B C', noteNames: [...notesForFormula('D', dorianFormula), 'D'], mode: 'melodic' },
    play: { expectedNotes: [...notesForFormula('D', dorianFormula), 'D'] },
    quiz: [
      {
        question: 'Dorian is natural minor with which degree raised?',
        choices: ['The 6th', 'The 2nd', 'The 7th'],
        correctLabel: 'The 6th',
      },
      {
        question: 'Playing the white keys from D to D gives you which mode?',
        choices: ['D Dorian', 'D Mixolydian', 'D Phrygian'],
        correctLabel: 'D Dorian',
      },
      {
        question: 'What keeps Dorian from sounding as dark as natural minor?',
        choices: ['The raised 6th', 'The flattened 2nd', 'The raised 7th'],
        correctLabel: 'The raised 6th',
      },
    ],
  },
  {
    id: 'lesson-4-2',
    unitId: 'unit-4',
    order: 17,
    title: 'The Mixolydian Mode',
    concept: 'A major scale with a flat 7th — the sound of blues-rock and dominant vamps.',
    timeEstimateMin: 5,
    instrumentNote: 'Guitar & bass',
    read: {
      title: 'Major, with an attitude',
      paragraphs: [
        'Mixolydian is a major scale with the 7th degree flattened. Play the white keys from G to G and that’s G Mixolydian.',
        'That flat 7th is the same note that turns a major triad into a dominant 7th chord — which is why this mode is the natural scale to solo over a dominant vamp.',
      ],
      formula: 'W – W – H – W – W – H – W',
    },
    see: { root: 'G', mode: 'scale', formulaId: 'mixolydian' },
    hear: {
      label: 'G A B C D E F',
      noteNames: [...notesForFormula('G', mixolydianFormula), 'G'],
      mode: 'melodic',
    },
    play: { expectedNotes: [...notesForFormula('G', mixolydianFormula), 'G'] },
    quiz: [
      {
        question: 'Mixolydian is major with which degree flattened?',
        choices: ['The 7th', 'The 3rd', 'The 4th'],
        correctLabel: 'The 7th',
      },
      {
        question: 'Playing the white keys from G to G gives you which mode?',
        choices: ['G Mixolydian', 'G Dorian', 'G Lydian'],
        correctLabel: 'G Mixolydian',
      },
      {
        question: "Mixolydian's flat 7th is the same note found in which chord?",
        choices: ['A dominant 7th chord', 'A major 7 chord', 'A diminished chord'],
        correctLabel: 'A dominant 7th chord',
      },
    ],
  },
  {
    id: 'lesson-4-3',
    unitId: 'unit-4',
    order: 18,
    title: 'The Phrygian Mode',
    concept: 'A minor scale with a flat 2nd — a dark, Spanish-tinged sound.',
    timeEstimateMin: 5,
    instrumentNote: 'Guitar & bass',
    read: {
      title: 'The half step right above the root',
      paragraphs: [
        'Phrygian is a natural minor scale with the 2nd degree flattened, putting a half step right above the root. Play the white keys from E to E and that’s E Phrygian.',
        'That flat 2nd gives Phrygian its distinctive flamenco/metal flavor — it resolves down into the root even more strongly than natural minor.',
      ],
      formula: 'H – W – W – W – H – W – W',
    },
    see: { root: 'E', mode: 'scale', formulaId: 'phrygian' },
    hear: {
      label: 'E F G A B C D',
      noteNames: [...notesForFormula('E', phrygianFormula), 'E'],
      mode: 'melodic',
    },
    play: { expectedNotes: [...notesForFormula('E', phrygianFormula), 'E'] },
    quiz: [
      {
        question: 'Phrygian is natural minor with which degree flattened?',
        choices: ['The 2nd', 'The 6th', 'The 5th'],
        correctLabel: 'The 2nd',
      },
      {
        question: 'Playing the white keys from E to E gives you which mode?',
        choices: ['E Phrygian', 'E Locrian', 'E Dorian'],
        correctLabel: 'E Phrygian',
      },
      {
        question: "Phrygian's flat 2nd creates what kind of gap above the root?",
        choices: ['A half step', 'A whole step', 'A minor third'],
        correctLabel: 'A half step',
      },
    ],
  },
  {
    id: 'lesson-4-4',
    unitId: 'unit-4',
    order: 19,
    title: 'Sus2 and Sus4 Chords',
    concept: 'Replace a chord’s third with a 2nd or 4th and the major/minor question disappears.',
    timeEstimateMin: 5,
    instrumentNote: 'Guitar & bass',
    read: {
      title: 'Neither major nor minor',
      paragraphs: [
        'A “sus” chord suspends the third — replacing it with either the 2nd (sus2) or the 4th (sus4) — so the chord is neither major nor minor, just open and unresolved.',
        'Sus chords almost always want to resolve back to the plain triad they came from, which is why they’re so common as a chord leading into itself: sus4 to major is one of the most familiar moves in rock and pop.',
      ],
      formula: 'Sus2 = R + 2 + 5, Sus4 = R + 4 + 5',
    },
    see: { root: 'D', mode: 'chord', formulaId: 'sus4' },
    hear: { label: 'D G A', noteNames: notesForFormula('D', sus4ChordFormula), mode: 'harmonic' },
    play: { expectedNotes: notesForFormula('D', sus4ChordFormula) },
    quiz: [
      {
        question: 'A sus chord replaces which note with a 2nd or 4th?',
        choices: ['The third', 'The fifth', 'The root'],
        correctLabel: 'The third',
      },
      {
        question: 'Which note does sus4 add in place of the third?',
        choices: ['The 4th', 'The 2nd', 'The 6th'],
        correctLabel: 'The 4th',
      },
      {
        question: 'What do sus chords almost always want to do?',
        choices: [
          'Resolve back to the plain triad they came from',
          'Stay suspended forever',
          'Turn into a diminished chord',
        ],
        correctLabel: 'Resolve back to the plain triad they came from',
      },
    ],
  },
  {
    id: 'lesson-4-5',
    unitId: 'unit-4',
    order: 20,
    title: 'Diminished 7th and Half-Diminished Chords',
    concept: 'Two tense four-note chords built from a diminished triad, each resolving differently.',
    timeEstimateMin: 6,
    instrumentNote: 'Guitar & bass',
    read: {
      title: 'Stacking a fourth minor third',
      paragraphs: [
        'A fully diminished 7th chord stacks minor thirds all the way up (R, ♭3, ♭5, 𝄫7) — every interval is identical, so the whole chord is perfectly symmetrical and can resolve in several directions.',
        'A half-diminished chord (m7♭5) is a diminished triad with a regular flat 7th on top instead — less tense than the fully diminished version, and the chord jazz calls "ii°7" in a minor key.',
      ],
      formula: 'dim7 = R + ♭3 + ♭5 + 𝄫7, m7♭5 = R + ♭3 + ♭5 + ♭7',
    },
    see: { root: 'B', mode: 'chord', formulaId: 'dim7' },
    hear: { label: 'B D F G#', noteNames: notesForFormula('B', dim7ChordFormula), mode: 'harmonic' },
    play: { expectedNotes: notesForFormula('B', dim7ChordFormula) },
    quiz: [
      {
        question: 'What makes a fully diminished 7th chord symmetrical?',
        choices: ['Every interval is a minor third', 'Every interval is a major third', 'It has no fifth'],
        correctLabel: 'Every interval is a minor third',
      },
      {
        question: 'A half-diminished chord is also called...?',
        choices: ['m7♭5', 'dim7', 'sus4'],
        correctLabel: 'm7♭5',
      },
      {
        question: "What's the key difference between dim7 and m7♭5?",
        choices: [
          'dim7 has a double-flat 7th, m7♭5 has a regular flat 7th',
          'dim7 has a raised fifth',
          'm7♭5 has no third',
        ],
        correctLabel: 'dim7 has a double-flat 7th, m7♭5 has a regular flat 7th',
      },
    ],
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
