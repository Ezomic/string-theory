import { describe, expect, it } from 'vitest'
import {
  clearedCount,
  excuse,
  initExercisePhase,
  isComplete,
  nextIndex,
  recordPass,
} from './exercisePhase'

describe('exercisePhase', () => {
  it('serves the first item and is not complete at the start', () => {
    const state = initExercisePhase(2)
    expect(nextIndex(state, -1)).toBe(0)
    expect(isComplete(state)).toBe(false)
    expect(clearedCount(state)).toBe(0)
  })

  it('a confident learner clears every item in one lap', () => {
    let state = initExercisePhase(3)
    let index = nextIndex(state, -1)
    const served: number[] = []
    while (index !== null) {
      served.push(index)
      state = recordPass(state, index)
      index = nextIndex(state, index)
    }
    expect(served).toEqual([0, 1, 2])
    expect(isComplete(state)).toBe(true)
    expect(clearedCount(state)).toBe(3)
  })

  it('re-serves only the failed item until it finally passes', () => {
    let state = initExercisePhase(2)
    // Pass item 0, fail item 1 (no recordPass) — item 1 must come back around.
    state = recordPass(state, 0)
    expect(nextIndex(state, 0)).toBe(1)
    // Failing item 1 leaves state unchanged; item 0 is already drained, so it stays on 1.
    expect(nextIndex(state, 1)).toBe(1)
    // Now pass item 1 → complete.
    state = recordPass(state, 1)
    expect(nextIndex(state, 1)).toBeNull()
    expect(isComplete(state)).toBe(true)
  })

  it('excuse drains an item without a genuine pass', () => {
    let state = initExercisePhase(2)
    state = excuse(state, 0)
    expect(state.passCounts[0]).toBe(1)
    state = recordPass(state, 1)
    expect(isComplete(state)).toBe(true)
  })

  it('requires the configured number of passes per item', () => {
    let state = initExercisePhase(1, 2)
    state = recordPass(state, 0)
    expect(isComplete(state)).toBe(false)
    expect(nextIndex(state, -1)).toBe(0)
    state = recordPass(state, 0)
    expect(isComplete(state)).toBe(true)
    expect(nextIndex(state, -1)).toBeNull()
  })

  it('caps pass counts at required and coerces required to at least 1', () => {
    let state = initExercisePhase(1, 0)
    expect(state.required).toBe(1)
    state = recordPass(state, 0)
    state = recordPass(state, 0)
    expect(state.passCounts[0]).toBe(1)
  })
})
