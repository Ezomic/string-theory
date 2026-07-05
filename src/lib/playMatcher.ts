import type { NoteName } from './pitch/noteMath'
import type { PlayNoteResult } from './db/types'

export interface PlayMatchState {
  matchedCount: number
  results: PlayNoteResult[]
}

export function initialPlayMatchState(): PlayMatchState {
  return { matchedCount: 0, results: [] }
}

export interface PitchReadingLike {
  note: NoteName
  cents: number
}

/**
 * Advances the match state if `reading` hits the next expected note in order
 * (by name only — octave-agnostic, since a lesson doesn't care which octave
 * you played it in). Off-pitch hits still advance the sequence but are scored
 * sharp/flat rather than clean.
 */
export function applyReading(
  state: PlayMatchState,
  expectedNotes: NoteName[],
  reading: PitchReadingLike | null,
  tolerance = 5,
): PlayMatchState {
  if (!reading || state.matchedCount >= expectedNotes.length) {
    return state
  }
  const expected = expectedNotes[state.matchedCount]
  if (reading.note !== expected) {
    return state
  }

  const result: PlayNoteResult =
    Math.abs(reading.cents) <= tolerance ? 'clean' : reading.cents > 0 ? 'sharp' : 'flat'

  return {
    matchedCount: state.matchedCount + 1,
    results: [...state.results, result],
  }
}

export function isComplete(state: PlayMatchState, expectedNotes: NoteName[]): boolean {
  return state.matchedCount >= expectedNotes.length
}

export function cleanPercentage(state: PlayMatchState): number {
  if (state.results.length === 0) return 0
  const clean = state.results.filter((r) => r === 'clean').length
  return Math.round((clean / state.results.length) * 100)
}
