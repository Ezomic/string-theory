/**
 * Retry-queue logic for a lesson's adaptive Exercise phase (A2 + A3). Items are served from a
 * FIFO queue seeded with the whole set. Passing an item clears it; missing it sends it to the
 * back, so mistakes are redone at the end and the phase only completes once the queue is empty.
 * `required` (A2) lets a lesson demand more than one clean pass per item.
 */

import { shuffle } from './shuffle'

export interface ExercisePhaseState {
  /** Item indices still to clear, in serve order; the front is the current item. */
  pending: number[]
  passCounts: number[]
  /** Whether an item has been missed at least once — drives the "redo" hint. */
  everFailed: boolean[]
  required: number
}

export function initExercisePhase(count: number, required = 1, rng?: () => number): ExercisePhaseState {
  const order = Array.from({ length: count }, (_, i) => i)
  return {
    pending: rng ? shuffle(order, rng) : order,
    passCounts: Array(count).fill(0),
    everFailed: Array(count).fill(false),
    required: Math.max(1, required),
  }
}

/** The item currently being served (front of the queue), or null when the phase is done. */
export function currentIndex(state: ExercisePhaseState): number | null {
  return state.pending.length > 0 ? state.pending[0] : null
}

/** Records a successful attempt on the current item: clear it, or requeue if it needs more passes. */
export function pass(state: ExercisePhaseState): ExercisePhaseState {
  const [index, ...rest] = state.pending
  if (index === undefined) return state
  const passCounts = state.passCounts.slice()
  passCounts[index] = Math.min(state.required, passCounts[index] + 1)
  const pending = passCounts[index] >= state.required ? rest : [...rest, index]
  return { ...state, pending, passCounts }
}

/** Records a miss on the current item: send it to the back of the queue to redo later. */
export function fail(state: ExercisePhaseState): ExercisePhaseState {
  const [index, ...rest] = state.pending
  if (index === undefined) return state
  const everFailed = state.everFailed.slice()
  everFailed[index] = true
  return { ...state, pending: [...rest, index], everFailed }
}

/** Clears the current item without a genuine pass — used when a Play item is skipped / no mic. */
export function excuse(state: ExercisePhaseState): ExercisePhaseState {
  const [index, ...rest] = state.pending
  if (index === undefined) return state
  const passCounts = state.passCounts.slice()
  passCounts[index] = state.required
  return { ...state, pending: rest, passCounts }
}

export function isComplete(state: ExercisePhaseState): boolean {
  return state.pending.length === 0
}

export function clearedCount(state: ExercisePhaseState): number {
  return state.passCounts.filter((count) => count >= state.required).length
}

/** True when the current item is one the learner has already missed (a redo). */
export function isRetry(state: ExercisePhaseState): boolean {
  const index = currentIndex(state)
  return index !== null && state.everFailed[index]
}
