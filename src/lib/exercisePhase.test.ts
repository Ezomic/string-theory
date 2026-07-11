import { describe, expect, it } from 'vitest'
import {
  clearedCount,
  currentIndex,
  excuse,
  fail,
  initExercisePhase,
  isComplete,
  isRetry,
  pass,
} from './exercisePhase'

describe('exercisePhase', () => {
  it('serves items in order from the front of the queue', () => {
    const state = initExercisePhase(2)
    expect(currentIndex(state)).toBe(0)
    expect(isComplete(state)).toBe(false)
    expect(clearedCount(state)).toBe(0)
  })

  it('a confident learner clears every item in one lap', () => {
    let state = initExercisePhase(3)
    const served: number[] = []
    while (currentIndex(state) !== null) {
      served.push(currentIndex(state)!)
      state = pass(state)
    }
    expect(served).toEqual([0, 1, 2])
    expect(isComplete(state)).toBe(true)
    expect(clearedCount(state)).toBe(3)
  })

  it('sends a missed item to the back of the queue, redone at the end', () => {
    let state = initExercisePhase(3)
    // Miss item 0 → it goes to the back; 1 and 2 are served first.
    state = fail(state)
    expect(currentIndex(state)).toBe(1)
    state = pass(state)
    expect(currentIndex(state)).toBe(2)
    state = pass(state)
    // Only the missed item remains, now at the end.
    expect(currentIndex(state)).toBe(0)
    expect(isRetry(state)).toBe(true)
    expect(isComplete(state)).toBe(false)
    state = pass(state)
    expect(isComplete(state)).toBe(true)
  })

  it('keeps requeueing an item until it is finally passed', () => {
    let state = initExercisePhase(1)
    state = fail(state)
    expect(currentIndex(state)).toBe(0)
    state = fail(state)
    expect(currentIndex(state)).toBe(0)
    expect(isComplete(state)).toBe(false)
    state = pass(state)
    expect(isComplete(state)).toBe(true)
  })

  it('excuse clears the current item without a genuine pass', () => {
    let state = initExercisePhase(2)
    state = excuse(state)
    expect(currentIndex(state)).toBe(1)
    expect(state.passCounts[0]).toBe(1)
    state = pass(state)
    expect(isComplete(state)).toBe(true)
  })

  it('requires the configured number of passes, requeueing between them', () => {
    let state = initExercisePhase(2, 2)
    // Pass item 0 once → not cleared, moves to the back behind item 1.
    state = pass(state)
    expect(currentIndex(state)).toBe(1)
    expect(clearedCount(state)).toBe(0)
    state = pass(state) // item 1, first pass → back
    expect(currentIndex(state)).toBe(0)
    state = pass(state) // item 0, second pass → cleared
    expect(clearedCount(state)).toBe(1)
    state = pass(state) // item 1, second pass → cleared
    expect(isComplete(state)).toBe(true)
  })

  it('coerces required to at least 1 and caps pass counts', () => {
    let state = initExercisePhase(1, 0)
    expect(state.required).toBe(1)
    state = pass(state)
    expect(state.passCounts[0]).toBe(1)
    expect(isComplete(state)).toBe(true)
  })
})
