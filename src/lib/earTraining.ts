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
  { id: 'scaleRecognition', label: 'Scale recognition', description: 'major / minor / pentatonic' },
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

const CHORD_QUALITY_HINTS: Record<string, string> = {
  major: 'Bright and resolved — the major 3rd on top gives it that happy colour.',
  minor: 'Darker and sadder — the minor 3rd on top is what does it.',
  diminished: 'Tense and unstable — two stacked minor 3rds, wants to resolve.',
  augmented: 'Ambiguous and floating — two stacked major 3rds blur the sense of key.',
  dom7: 'Bluesy tension — a major triad plus a minor 7th that wants to resolve down.',
  maj7: 'Dreamy and jazzy — a major triad plus a major 7th sitting right under the root.',
  min7: 'Mellow and moody — a minor triad plus a minor 7th.',
  m7b5: 'Half-diminished — a diminished triad softened by a flat 7th; the "ii" of a minor key.',
  dim7: 'Fully diminished — stacked minor 3rds all the way up, symmetrical and very tense.',
  sus4: 'Suspended — the 3rd is swapped for a 4th, so it sounds open and unresolved.',
}

const CHORD_QUALITIES: ChordQualityDefinition[] = CHORDS.filter((c) => c.id in CHORD_QUALITY_HINTS).map((c) => ({
  ...c,
  hint: CHORD_QUALITY_HINTS[c.id],
}))

interface ScaleQualityDefinition {
  id: string
  label: string
  formula: number[]
  hint: string
}

function scaleFormula(id: string): number[] {
  return SCALES.find((s) => s.id === id)!.formula
}

const SCALE_QUALITIES: ScaleQualityDefinition[] = [
  { id: 'major', label: 'Major', formula: scaleFormula('major'), hint: 'Bright and resolved-sounding — the "happy" scale.' },
  { id: 'naturalMinor', label: 'Minor', formula: scaleFormula('naturalMinor'), hint: 'Darker and more melancholic — the "sad" scale.' },
  {
    id: 'majorPentatonic',
    label: 'Major pentatonic',
    formula: scaleFormula('majorPentatonic'),
    hint: 'Bright like major, but with no 4th or 7th — nothing ever sounds "wrong".',
  },
  {
    id: 'minorPentatonic',
    label: 'Minor pentatonic',
    formula: scaleFormula('minorPentatonic'),
    hint: 'Dark like minor, but with no 2nd or 6th — the classic blues/rock lead scale.',
  },
  { id: 'dorian', label: 'Dorian', formula: scaleFormula('dorian'), hint: 'Minor with a bright raised 6th — the modal/funk sound.' },
  { id: 'mixolydian', label: 'Mixolydian', formula: scaleFormula('mixolydian'), hint: 'Major with a flat 7th — the bluesy dominant sound.' },
  {
    id: 'harmonicMinor',
    label: 'Harmonic minor',
    formula: scaleFormula('harmonicMinor'),
    hint: 'Minor with a raised 7th — an exotic, classical/flamenco flavour.',
  },
  { id: 'minorBlues', label: 'Minor blues', formula: scaleFormula('minorBlues'), hint: 'Minor pentatonic plus the flat-5 "blue note" — gritty and vocal.' },
  { id: 'wholeTone', label: 'Whole tone', formula: scaleFormula('wholeTone'), hint: 'All whole steps — dreamlike and unresolved, with no leading tone.' },
]

function scaleQualitiesForLevel(level: number): ScaleQualityDefinition[] {
  const ids =
    level <= 1
      ? ['major', 'naturalMinor']
      : level === 2
        ? ['major', 'naturalMinor', 'majorPentatonic', 'minorPentatonic']
        : level === 3
          ? ['major', 'naturalMinor', 'majorPentatonic', 'minorPentatonic', 'dorian', 'mixolydian']
          : SCALE_QUALITIES.map((s) => s.id)
  return SCALE_QUALITIES.filter((s) => ids.includes(s.id))
}

const MAJOR_TRIAD = CHORDS.find((c) => c.id === 'major')!.formula
const MINOR_TRIAD = CHORDS.find((c) => c.id === 'minor')!.formula

interface ProgressionDefinition {
  id: string
  label: string
  hint: string
  /** Each chord's root as a scale-degree semitone offset from the tonic, plus its triad formula. */
  chords: { rootOffset: number; formula: number[] }[]
}

const PROGRESSIONS: ProgressionDefinition[] = [
  {
    id: 'I-IV-V-I',
    label: 'I – IV – V – I',
    hint: 'The most common cadence in pop and rock — home, up a 4th, up a 5th, back home.',
    chords: [
      { rootOffset: 0, formula: MAJOR_TRIAD },
      { rootOffset: 5, formula: MAJOR_TRIAD },
      { rootOffset: 7, formula: MAJOR_TRIAD },
      { rootOffset: 0, formula: MAJOR_TRIAD },
    ],
  },
  {
    id: 'I-V-vi-IV',
    label: 'I – V – vi – IV',
    hint: 'The "four chords" pop progression — used in hundreds of hit songs.',
    chords: [
      { rootOffset: 0, formula: MAJOR_TRIAD },
      { rootOffset: 7, formula: MAJOR_TRIAD },
      { rootOffset: 9, formula: MINOR_TRIAD },
      { rootOffset: 5, formula: MAJOR_TRIAD },
    ],
  },
  {
    id: 'ii-V-I',
    label: 'ii – V – I',
    hint: 'The foundational jazz cadence — a minor chord falling to the dominant, then resolving home.',
    chords: [
      { rootOffset: 2, formula: MINOR_TRIAD },
      { rootOffset: 7, formula: MAJOR_TRIAD },
      { rootOffset: 0, formula: MAJOR_TRIAD },
    ],
  },
  {
    id: 'vi-IV-I-V',
    label: 'vi – IV – I – V',
    hint: 'Starts on the relative minor before resolving — a moodier spin on the same four chords.',
    chords: [
      { rootOffset: 9, formula: MINOR_TRIAD },
      { rootOffset: 5, formula: MAJOR_TRIAD },
      { rootOffset: 0, formula: MAJOR_TRIAD },
      { rootOffset: 7, formula: MAJOR_TRIAD },
    ],
  },
  {
    id: 'I-vi-IV-V',
    label: 'I – vi – IV – V',
    hint: 'The 1950s doo-wop progression — "Stand By Me", "Earth Angel".',
    chords: [
      { rootOffset: 0, formula: MAJOR_TRIAD },
      { rootOffset: 9, formula: MINOR_TRIAD },
      { rootOffset: 5, formula: MAJOR_TRIAD },
      { rootOffset: 7, formula: MAJOR_TRIAD },
    ],
  },
  {
    id: 'I-bVII-IV',
    label: 'I – ♭VII – IV',
    hint: 'A Mixolydian rock move — the flat-7 chord gives it that "Sweet Home Alabama" swagger.',
    chords: [
      { rootOffset: 0, formula: MAJOR_TRIAD },
      { rootOffset: 10, formula: MAJOR_TRIAD },
      { rootOffset: 5, formula: MAJOR_TRIAD },
    ],
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
  /** Only set for 'progressions' questions — one frequency group per chord, played in sequence. */
  chordFrequencyGroups?: number[][]
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
  const ids =
    level <= 1
      ? ['major', 'minor']
      : level === 2
        ? ['major', 'minor', 'diminished', 'augmented']
        : level === 3
          ? ['major', 'minor', 'diminished', 'augmented', 'dom7', 'maj7', 'min7']
          : CHORD_QUALITIES.map((c) => c.id)
  return CHORD_QUALITIES.filter((c) => ids.includes(c.id))
}

function progressionsForLevel(level: number): ProgressionDefinition[] {
  const ids =
    level <= 2
      ? ['I-IV-V-I', 'I-V-vi-IV']
      : level === 3
        ? ['I-IV-V-I', 'I-V-vi-IV', 'ii-V-I', 'vi-IV-I-V']
        : PROGRESSIONS.map((p) => p.id)
  return PROGRESSIONS.filter((p) => ids.includes(p.id))
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
    const pool = scaleQualitiesForLevel(level)
    const scale = pickRandom(pool)
    return {
      category,
      rootHz,
      correctLabel: scale.label,
      hint: scale.hint,
      choices: pickChoices(pool, scale, Math.min(4, pool.length)),
      frequencies: scale.formula.map((s) => hzForSemitones(rootHz, s)),
      playbackKind: 'melodic',
    }
  }

  if (category === 'progressions') {
    const pool = progressionsForLevel(level)
    const progression = pickRandom(pool)
    const chordFrequencyGroups = progression.chords.map((chord) =>
      chord.formula.map((s) => hzForSemitones(rootHz, chord.rootOffset + s)),
    )
    return {
      category,
      rootHz,
      correctLabel: progression.label,
      hint: progression.hint,
      choices: pickChoices(pool, progression, Math.min(4, pool.length)),
      frequencies: chordFrequencyGroups.flat(),
      chordFrequencyGroups,
      playbackKind: 'progression',
    }
  }

  // intervals
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
