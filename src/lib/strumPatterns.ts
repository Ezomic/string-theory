export type Stroke = 'down' | 'up' | 'rest' | 'mute'

export const STROKE_GLYPHS: Record<Stroke, string> = {
  down: '↓',
  up: '↑',
  mute: '✕',
  rest: '·',
}

/** Slots per beat: 2 straight eighths, 3 triplets (the shuffle), 4 sixteenths. */
export type Subdivision = 2 | 3 | 4

export type StrumDifficulty = 'easy' | 'medium' | 'hard'

export const STRUM_DIFFICULTIES: StrumDifficulty[] = ['easy', 'medium', 'hard']

export interface StrumPattern {
  id: string
  name: string
  difficulty: StrumDifficulty
  /** Starting tempo for the pattern drill, in beats per minute. */
  tempo: number
  beatsPerBar: number
  subdivision: Subdivision
  /** One stroke per slot for a whole bar, `beatsPerBar × subdivision` long. */
  slots: Stroke[]
}

/** A pattern drill strums one easy chord so all the attention goes to the right hand. */
export const PATTERN_DRILL_VOICING_ID = 'e-minor-open'
export const PATTERN_DRILL_BARS = 4

const D = 'down'
const U = 'up'
const R = 'rest'
const X = 'mute'

export const STRUM_PATTERNS: StrumPattern[] = [
  {
    id: 'quarters',
    name: 'Quarter-note downs',
    difficulty: 'easy',
    tempo: 70,
    beatsPerBar: 4,
    subdivision: 2,
    slots: [D, R, D, R, D, R, D, R],
  },
  {
    id: 'eighths',
    name: 'Straight eighths',
    difficulty: 'easy',
    tempo: 70,
    beatsPerBar: 4,
    subdivision: 2,
    slots: [D, U, D, U, D, U, D, U],
  },
  {
    id: 'down-down-up',
    name: 'Down, down-up',
    difficulty: 'easy',
    tempo: 80,
    beatsPerBar: 4,
    subdivision: 2,
    slots: [D, R, D, U, D, R, D, U],
  },
  {
    id: 'island',
    name: 'Island strum',
    difficulty: 'medium',
    tempo: 80,
    beatsPerBar: 4,
    subdivision: 2,
    slots: [D, R, D, U, R, U, D, U],
  },
  {
    id: 'waltz',
    name: 'Waltz in 3/4',
    difficulty: 'medium',
    tempo: 90,
    beatsPerBar: 3,
    subdivision: 2,
    slots: [D, R, D, U, D, U],
  },
  {
    id: 'shuffle',
    name: 'Shuffle triplets',
    difficulty: 'medium',
    tempo: 80,
    beatsPerBar: 4,
    subdivision: 3,
    slots: [D, R, U, D, R, U, D, R, U, D, R, U],
  },
  {
    id: 'sixteenths',
    name: 'Straight sixteenths',
    difficulty: 'medium',
    tempo: 60,
    beatsPerBar: 4,
    subdivision: 4,
    slots: [D, U, D, U, D, U, D, U, D, U, D, U, D, U, D, U],
  },
  {
    id: 'funk-mutes',
    name: '16th funk with mutes',
    difficulty: 'hard',
    tempo: 70,
    beatsPerBar: 4,
    subdivision: 4,
    slots: [D, R, D, U, X, R, D, U, R, U, D, U, X, R, D, R],
  },
]

const SUBDIVISION_COUNTS: Record<Subdivision, string[]> = {
  2: ['&'],
  3: ['&', 'a'],
  4: ['e', '&', 'a'],
}

export function patternById(id: string): StrumPattern | undefined {
  return STRUM_PATTERNS.find((p) => p.id === id)
}

export function slotCount(pattern: Pick<StrumPattern, 'beatsPerBar' | 'subdivision'>): number {
  return pattern.beatsPerBar * pattern.subdivision
}

/** What to say out loud for each slot of a bar: 1 & 2 &, 1 & a, or 1 e & a. */
export function countLabels(subdivision: Subdivision, beatsPerBar: number): string[] {
  return Array.from({ length: beatsPerBar }, (_, beat) => [String(beat + 1), ...SUBDIVISION_COUNTS[subdivision]]).flat()
}

/**
 * In straight time the strumming hand swings down on the beat and up between beats, so a
 * down-stroke on an odd slot or an up-stroke on an even one is a typo in the grid. Triplets
 * alternate across beats, and a muted chuck can land on either swing, so neither is checked.
 */
function followsPendulum(pattern: StrumPattern): boolean {
  if (pattern.subdivision === 3) return true
  return pattern.slots.every(
    (stroke, slot) => (stroke !== 'down' || slot % 2 === 0) && (stroke !== 'up' || slot % 2 === 1),
  )
}

export function isValidPattern(pattern: StrumPattern): boolean {
  return (
    Number.isInteger(pattern.beatsPerBar) &&
    pattern.beatsPerBar > 0 &&
    pattern.subdivision in SUBDIVISION_COUNTS &&
    pattern.slots.length === slotCount(pattern) &&
    pattern.slots.some((stroke) => stroke !== 'rest') &&
    followsPendulum(pattern)
  )
}
