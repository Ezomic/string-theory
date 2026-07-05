import { describe, expect, it } from 'vitest'
import {
  applyReading,
  cleanPercentage,
  initialPlayMatchState,
  isComplete,
  type PlayMatchState,
} from './playMatcher'

const EXPECTED: ('C' | 'D' | 'E')[] = ['C', 'D', 'E']

describe('applyReading', () => {
  it('ignores a null reading', () => {
    const state = applyReading(initialPlayMatchState(), EXPECTED, null)
    expect(state).toEqual(initialPlayMatchState())
  })

  it('ignores a reading that does not match the next expected note', () => {
    const state = applyReading(initialPlayMatchState(), EXPECTED, { note: 'D', cents: 0 })
    expect(state.matchedCount).toBe(0)
  })

  it('advances on a match and records a clean result within tolerance', () => {
    const state = applyReading(initialPlayMatchState(), EXPECTED, { note: 'C', cents: 3 })
    expect(state).toEqual({ matchedCount: 1, results: ['clean'] })
  })

  it('records sharp for a positive-cents match outside tolerance', () => {
    const state = applyReading(initialPlayMatchState(), EXPECTED, { note: 'C', cents: 20 })
    expect(state.results).toEqual(['sharp'])
  })

  it('records flat for a negative-cents match outside tolerance', () => {
    const state = applyReading(initialPlayMatchState(), EXPECTED, { note: 'C', cents: -20 })
    expect(state.results).toEqual(['flat'])
  })

  it('advances through the sequence in order across multiple readings', () => {
    let state = initialPlayMatchState()
    state = applyReading(state, EXPECTED, { note: 'C', cents: 0 })
    state = applyReading(state, EXPECTED, { note: 'D', cents: 0 })
    state = applyReading(state, EXPECTED, { note: 'E', cents: 0 })
    expect(state).toEqual({ matchedCount: 3, results: ['clean', 'clean', 'clean'] })
  })

  it('does not advance further once the sequence is already complete', () => {
    const complete: PlayMatchState = { matchedCount: 3, results: ['clean', 'clean', 'clean'] }
    const state = applyReading(complete, EXPECTED, { note: 'C', cents: 0 })
    expect(state).toBe(complete)
  })

  it('does not skip ahead if the wrong note is played mid-sequence', () => {
    let state = applyReading(initialPlayMatchState(), EXPECTED, { note: 'C', cents: 0 })
    state = applyReading(state, EXPECTED, { note: 'E', cents: 0 }) // wrong — expects D next
    expect(state.matchedCount).toBe(1)
  })
})

describe('isComplete', () => {
  it('is false until every expected note is matched', () => {
    expect(isComplete({ matchedCount: 2, results: [] }, EXPECTED)).toBe(false)
  })

  it('is true once matchedCount reaches the expected length', () => {
    expect(isComplete({ matchedCount: 3, results: [] }, EXPECTED)).toBe(true)
  })
})

describe('cleanPercentage', () => {
  it('is 0 with no results yet', () => {
    expect(cleanPercentage(initialPlayMatchState())).toBe(0)
  })

  it('computes the percentage of clean hits', () => {
    expect(cleanPercentage({ matchedCount: 4, results: ['clean', 'clean', 'sharp', 'flat'] })).toBe(50)
  })

  it('is 100 when every hit was clean', () => {
    expect(cleanPercentage({ matchedCount: 2, results: ['clean', 'clean'] })).toBe(100)
  })
})
