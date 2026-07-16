import { getAll, getOne, putOne } from './db/db'
import type { SightReadingRun } from './db/types'
import { levelProgressFromCorrectCount, type LevelProgress } from './earTraining'
import { bumpStreak } from './pathProgress'
import { recordPracticeActivity } from './practiceLog'
import type { NoteName } from './pitch/noteMath'
import { shuffle } from './shuffle'
import type { StaffNote } from './staff'

export const SIGHT_READING_SKILL_KEY = 'sightReading'

export type SightReadingMode = 'name' | 'play'

export const SIGHT_READING_MODES: { id: SightReadingMode; label: string }[] = [
  { id: 'name', label: 'Name it' },
  { id: 'play', label: 'Play it' },
]

interface Pitch {
  note: NoteName
  octave: number
}

/** The on-staff naturals, E4 (bottom line) up to F5 (top line). */
const NATURAL_STAFF: Pitch[] = [
  { note: 'E', octave: 4 },
  { note: 'F', octave: 4 },
  { note: 'G', octave: 4 },
  { note: 'A', octave: 4 },
  { note: 'B', octave: 4 },
  { note: 'C', octave: 5 },
  { note: 'D', octave: 5 },
  { note: 'E', octave: 5 },
  { note: 'F', octave: 5 },
]
const NEAR_LEDGER: Pitch[] = [
  { note: 'C', octave: 4 },
  { note: 'D', octave: 4 },
  { note: 'G', octave: 5 },
  { note: 'A', octave: 5 },
]
const WIDE_RANGE: Pitch[] = [
  { note: 'A', octave: 3 },
  { note: 'B', octave: 3 },
  { note: 'B', octave: 5 },
  { note: 'C', octave: 6 },
]
const SHARPS: Pitch[] = [
  { note: 'F#', octave: 4 },
  { note: 'G#', octave: 4 },
  { note: 'C#', octave: 5 },
  { note: 'D#', octave: 5 },
  { note: 'F#', octave: 5 },
]

/** Cumulative note pool: higher levels add ledger notes, a wider range, then accidentals. */
export function pitchPoolForLevel(level: number): Pitch[] {
  const pool = [...NATURAL_STAFF]
  if (level >= 2) pool.push(...NEAR_LEDGER)
  if (level >= 3) pool.push(...WIDE_RANGE)
  if (level >= 4) pool.push(...SHARPS)
  return pool
}

/** Name mode always shows a single note; Play mode grows to a short phrase at higher levels. */
export function phraseLength(mode: SightReadingMode, level: number): number {
  return mode === 'name' ? 1 : Math.min(level, 3)
}

export interface SightReadingQuestion {
  notes: StaffNote[]
  choices: string[]
  correctLabel: string
  expectedNotes: NoteName[]
}

export function generateSightReadingQuestion(
  mode: SightReadingMode,
  level: number,
  rng: () => number = Math.random,
): SightReadingQuestion {
  const pool = pitchPoolForLevel(level)
  const count = phraseLength(mode, level)
  const picks = Array.from({ length: count }, () => pool[Math.floor(rng() * pool.length)])
  const notes: StaffNote[] = picks.map((p) => ({ note: p.note, octave: p.octave, duration: 'quarter' }))
  const expectedNotes = notes.map((n) => n.note)

  const correctLabel = notes[0].note
  const distractors = shuffle(
    [...new Set(pool.map((p) => p.note))].filter((n) => n !== correctLabel),
    rng,
  ).slice(0, 3)
  const choices = shuffle([correctLabel, ...distractors], rng)

  return { notes, choices, correctLabel, expectedNotes }
}

export function correctCountFromRuns(runs: SightReadingRun[]): number {
  return runs.reduce((sum, run) => sum + run.correct, 0)
}

export function sightReadingProgress(runs: SightReadingRun[]): LevelProgress {
  return levelProgressFromCorrectCount(correctCountFromRuns(runs))
}

export async function getSightReadingRuns(): Promise<SightReadingRun[]> {
  return getAll('sightReadingRuns')
}

export async function recordSightReadingRun(
  mode: SightReadingMode,
  level: number,
  correct: boolean,
): Promise<SightReadingRun> {
  const run: SightReadingRun = {
    id: crypto.randomUUID(),
    mode,
    level,
    correct: correct ? 1 : 0,
    total: 1,
    timestamp: new Date().toISOString(),
  }
  await putOne('sightReadingRuns', run)

  const existing = await getOne('skillProgress', SIGHT_READING_SKILL_KEY)
  const runScore = correct ? 100 : 0
  const masteryPct = existing ? Math.round(existing.masteryPct * 0.7 + runScore * 0.3) : runScore
  await putOne('skillProgress', { skillKey: SIGHT_READING_SKILL_KEY, masteryPct })

  await bumpStreak()
  await recordPracticeActivity('sightReading', 0.5)
  return run
}
