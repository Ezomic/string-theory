/**
 * Drain logic for a lesson's adaptive Exercise phase (A2): keep serving items until every one
 * has been passed `required` times. A wrong answer records no pass, so the item stays in
 * rotation and the learner gets more reps; a confident learner clears everything in one lap.
 */

export interface ExercisePhaseState {
  passCounts: number[]
  required: number
}

export function initExercisePhase(count: number, required = 1): ExercisePhaseState {
  return { passCounts: Array(count).fill(0), required: Math.max(1, required) }
}

export function recordPass(state: ExercisePhaseState, index: number): ExercisePhaseState {
  const passCounts = state.passCounts.slice()
  passCounts[index] = Math.min(state.required, passCounts[index] + 1)
  return { ...state, passCounts }
}

/** Marks an item fully drained without a genuine pass — used when a Play item is skipped / no mic. */
export function excuse(state: ExercisePhaseState, index: number): ExercisePhaseState {
  const passCounts = state.passCounts.slice()
  passCounts[index] = state.required
  return { ...state, passCounts }
}

/** The next not-yet-drained item after `after` (cyclic), or null when every item is drained. */
export function nextIndex(state: ExercisePhaseState, after: number): number | null {
  const n = state.passCounts.length
  for (let step = 1; step <= n; step++) {
    const index = (after + step) % n
    if (state.passCounts[index] < state.required) return index
  }
  return null
}

export function isComplete(state: ExercisePhaseState): boolean {
  return state.passCounts.every((count) => count >= state.required)
}

export function clearedCount(state: ExercisePhaseState): number {
  return state.passCounts.filter((count) => count >= state.required).length
}
