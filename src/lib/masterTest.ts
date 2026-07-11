/**
 * Master test (A5): a per-lesson final exam. A fixed, seeded sequence of items built from the
 * lesson's own exercises (varied so keys/choice-order differ). It's a linear run scored by
 * strikes — MAX_STRIKES misses fail the test and restart it. The item count scales with how many
 * exercises the lesson has, growing toward ~25 as pools expand (B1).
 */

import type { LessonExercise } from './curriculum'
import { varyExercise } from './exerciseVariation'
import { mulberry32, shuffle } from './shuffle'

export const MAX_STRIKES = 3
/** A Play item passes the test at this cleanliness (stricter than the Practice phase's 70). */
export const MASTER_PLAY_PASS_PCT = 80

const PLAY_VARIANTS = 4
const QUIZ_VARIANTS = 2

/** Build a deterministic, varied item list from a lesson's exercises for the given seed. */
export function buildMasterTest(exercises: LessonExercise[], seed: number): LessonExercise[] {
  const items: LessonExercise[] = []
  let counter = 1
  for (const base of exercises) {
    const variants = base.kind === 'quiz' ? QUIZ_VARIANTS : PLAY_VARIANTS
    for (let i = 0; i < variants; i++) {
      items.push(varyExercise(base, mulberry32(seed + counter)))
      counter++
    }
  }
  return shuffle(items, mulberry32(seed))
}

export type MasterItemOutcome = 'pass' | 'strike' | 'skip'

export interface MasterTestState {
  index: number
  strikes: number
  total: number
}

export function initMasterTest(total: number): MasterTestState {
  return { index: 0, strikes: 0, total }
}

/** Advance past the current item; only a `strike` outcome costs a strike (`skip` never does). */
export function recordItem(state: MasterTestState, outcome: MasterItemOutcome): MasterTestState {
  return {
    ...state,
    index: state.index + 1,
    strikes: state.strikes + (outcome === 'strike' ? 1 : 0),
  }
}

export function isFailed(state: MasterTestState): boolean {
  return state.strikes >= MAX_STRIKES
}

export function isPassed(state: MasterTestState): boolean {
  return state.index >= state.total && state.strikes < MAX_STRIKES
}

export function strikesLeft(state: MasterTestState): number {
  return Math.max(0, MAX_STRIKES - state.strikes)
}
