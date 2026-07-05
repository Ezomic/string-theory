import type { PlaybackKind } from './audio/playbackEngine'
import type { DrillResult } from './db/types'
import { CHORDS, SCALES } from './theory'

export type DrillCategory = 'intervals' | 'chordQuality' | 'scaleRecognition' | 'progressions'

export interface DrillCategoryInfo {
  id: DrillCategory
  label: string
  description: string
  /** Category id + accuracy threshold required to unlock this one, if any. */
  unlockRule?: { category: DrillCategory; level: number }
}

export const DRILL_CATEGORIES: DrillCategoryInfo[] = [
  { id: 'intervals', label: 'Intervals', description: 'Name the interval between two notes' },
  { id: 'chordQuality', label: 'Chord quality', description: 'maj / min / dim / aug' },
  { id: 'scaleRecognition', label: 'Scale recognition', description: 'major vs minor' },
  {
    id: 'progressions',
    label: 'Chord progressions',
    description: 'Unlocks at interval Lv 4',
    unlockRule: { category: 'intervals', level: 4 },
  },
]

interface IntervalDefinition {
  semitones: number
  label: string
  hint: string
}

const INTERVALS: IntervalDefinition[] = [
  { semitones: 1, label: 'Minor 2nd', hint: 'A tense half-step — think the Jaws theme.' },
  { semitones: 2, label: 'Major 2nd', hint: 'A whole step — the first two notes of "Happy Birthday".' },
  { semitones: 3, label: 'Minor 3rd', hint: 'The dark, sad-sounding third — think a minor chord\'s core.' },
  { semitones: 4, label: 'Major 3rd', hint: 'The bright third — think a major chord\'s core.' },
  { semitones: 5, label: 'Perfect 4th', hint: 'Open and stable — the start of "Here Comes the Bride".' },
  { semitones: 6, label: 'Tritone', hint: 'The unsettled "devil\'s interval" — think The Simpsons theme opener.' },
  { semitones: 7, label: 'Perfect 5th', hint: 'Very open and consonant — think the Star Wars theme leap.' },
  { semitones: 8, label: 'Minor 6th', hint: 'A wistful leap — wider and darker than a fifth.' },
  { semitones: 9, label: 'Major 6th', hint: 'A bright, wide leap — think "My Bonnie Lies Over the Ocean".' },
  { semitones: 10, label: 'Minor 7th', hint: 'Bluesy and unresolved — wants to fall to the octave.' },
  { semitones: 11, label: 'Major 7th', hint: 'Sharp and dissonant, right under the octave.' },
  { semitones: 12, label: 'Octave', hint: 'Same note, higher — the two notes almost fuse together.' },
]

interface ChordQualityDefinition {
  id: string
  label: string
  formula: number[]
  hint: string
}

const CHORD_QUALITIES: ChordQualityDefinition[] = CHORDS.filter((c) =>
  ['major', 'minor', 'diminished', 'augmented', 'dom7', 'maj7', 'min7'].includes(c.id),
).map((c) => ({
  ...c,
  hint: {
    major: 'Bright and resolved — the major 3rd on top gives it that happy colour.',
    minor: 'Darker and sadder — the minor 3rd on top is what does it.',
    diminished: 'Tense and unstable — two stacked minor 3rds, wants to resolve.',
    augmented: 'Ambiguous and floating — two stacked major 3rds blur the sense of key.',
    dom7: 'Bluesy tension — a major triad plus a minor 7th that wants to resolve down.',
    maj7: 'Dreamy and jazzy — a major triad plus a major 7th sitting right under the root.',
    min7: 'Mellow and moody — a minor triad plus a minor 7th.',
  }[c.id]!,
}))

interface ScaleQualityDefinition {
  id: 'major' | 'naturalMinor'
  label: string
  formula: number[]
  hint: string
}

const SCALE_QUALITIES: ScaleQualityDefinition[] = [
  {
    id: 'major',
    label: 'Major',
    formula: SCALES.find((s) => s.id === 'major')!.formula,
    hint: 'Bright and resolved-sounding — the "happy" scale.',
  },
  {
    id: 'naturalMinor',
    label: 'Minor',
    formula: SCALES.find((s) => s.id === 'naturalMinor')!.formula,
    hint: 'Darker and more melancholic — the "sad" scale.',
  },
]

export interface DrillQuestion {
  category: DrillCategory
  rootHz: number
  correctLabel: string
  hint: string
  choices: string[]
  frequencies: number[]
  playbackKind: PlaybackKind
}

const MIN_ROOT_HZ = 220
const MAX_ROOT_HZ = 415

function randomRootHz(): number {
  return MIN_ROOT_HZ * 2 ** (Math.random() * Math.log2(MAX_ROOT_HZ / MIN_ROOT_HZ))
}

function hzForSemitones(rootHz: number, semitones: number): number {
  return rootHz * 2 ** (semitones / 12)
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5)
}

function pickChoices<T extends { label: string }>(pool: T[], correct: T, count: number): string[] {
  const distractors = shuffle(pool.filter((item) => item !== correct)).slice(0, count - 1)
  return shuffle([correct, ...distractors]).map((item) => item.label)
}

function intervalsForLevel(level: number): IntervalDefinition[] {
  if (level <= 1) return INTERVALS.filter((i) => [4, 5, 7, 12].includes(i.semitones))
  if (level === 2) return INTERVALS.filter((i) => [2, 3, 4, 5, 7, 9, 12].includes(i.semitones))
  return INTERVALS
}

function chordQualitiesForLevel(level: number): ChordQualityDefinition[] {
  if (level <= 1) return CHORD_QUALITIES.filter((c) => ['major', 'minor'].includes(c.id))
  if (level === 2) return CHORD_QUALITIES.filter((c) =>
    ['major', 'minor', 'diminished', 'augmented'].includes(c.id),
  )
  return CHORD_QUALITIES
}

export function generateQuestion(category: DrillCategory, level: number): DrillQuestion {
  const rootHz = randomRootHz()

  if (category === 'chordQuality') {
    const pool = chordQualitiesForLevel(level)
    const chord = pickRandom(pool)
    return {
      category,
      rootHz,
      correctLabel: chord.label,
      hint: chord.hint,
      choices: pickChoices(pool, chord, Math.min(4, pool.length)),
      frequencies: chord.formula.map((s) => hzForSemitones(rootHz, s)),
      playbackKind: 'harmonic',
    }
  }

  if (category === 'scaleRecognition') {
    const scale = pickRandom(SCALE_QUALITIES)
    return {
      category,
      rootHz,
      correctLabel: scale.label,
      hint: scale.hint,
      choices: pickChoices(SCALE_QUALITIES, scale, 2),
      frequencies: scale.formula.map((s) => hzForSemitones(rootHz, s)),
      playbackKind: 'melodic',
    }
  }

  // intervals (and progressions, until it has its own generator)
  const pool = intervalsForLevel(level)
  const interval = pickRandom(pool)
  return {
    category: 'intervals',
    rootHz,
    correctLabel: interval.label,
    hint: interval.hint,
    choices: pickChoices(pool, interval, Math.min(4, pool.length)),
    frequencies: [rootHz, hzForSemitones(rootHz, interval.semitones)],
    // Melodic first (hear each note), then harmonic (hear them stacked) — the standard way to ear-train an interval.
    playbackKind: 'melodicThenHarmonic',
  }
}

/** Correct-answer count required to reach level 1, 2, 3, 4 (the max level). */
export const LEVEL_THRESHOLDS = [0, 5, 10, 15]
export const XP_PER_CORRECT_ANSWER = 10

export function levelFromCorrectCount(correctCount: number): number {
  let level = 1
  LEVEL_THRESHOLDS.forEach((threshold, index) => {
    if (correctCount >= threshold) level = index + 1
  })
  return level
}

export interface LevelProgress {
  level: number
  xp: number
  correctCount: number
  /** Correct answers still needed to reach the next level; null once at the max level. */
  correctToNextLevel: number | null
  /** 0-100, for a level-progress bar; 100 once at the max level. */
  progressPct: number
}

export function levelProgressFromCorrectCount(correctCount: number): LevelProgress {
  const level = levelFromCorrectCount(correctCount)
  const currentThreshold = LEVEL_THRESHOLDS[level - 1]
  const nextThreshold = LEVEL_THRESHOLDS[level] as number | undefined

  return {
    level,
    xp: correctCount * XP_PER_CORRECT_ANSWER,
    correctCount,
    correctToNextLevel: nextThreshold === undefined ? null : nextThreshold - correctCount,
    progressPct:
      nextThreshold === undefined
        ? 100
        : Math.round(
            ((correctCount - currentThreshold) / (nextThreshold - currentThreshold)) * 100,
          ),
  }
}

export interface CategoryStats {
  level: number
  accuracyPct: number
  attempts: number
  correctCount: number
}

export function statsForCategory(results: DrillResult[], category: DrillCategory): CategoryStats {
  const relevant = results.filter((r) => r.type === category)
  const attempts = relevant.reduce((sum, r) => sum + r.total, 0)
  const correct = relevant.reduce((sum, r) => sum + r.correct, 0)
  const accuracyPct = attempts > 0 ? Math.round((correct / attempts) * 100) : 0
  return { level: levelFromCorrectCount(correct), accuracyPct, attempts, correctCount: correct }
}
