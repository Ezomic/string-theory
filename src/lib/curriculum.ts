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
