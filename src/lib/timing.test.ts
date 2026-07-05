import { describe, expect, it } from 'vitest'
import { timingPercentage } from './timing'

describe('timingPercentage', () => {
  it('is 100% when every gap sits close to the beat length', () => {
    // 80bpm -> 750ms/beat
    const gaps = [750, 700, 800, 720, 780, 760, 740]
    expect(timingPercentage(gaps, 80, 8)).toBe(100)
  })

  it('penalizes gaps that are wildly off-tempo', () => {
    const gaps = [750, 750, 750, 5000, 5000, 5000, 5000]
    // first note always counts + 3 on-time gaps out of 7 -> 4/8
    expect(timingPercentage(gaps, 80, 8)).toBe(50)
  })

  it('returns 0 for an empty run', () => {
    expect(timingPercentage([], 80, 0)).toBe(0)
  })

  it('always counts the first note even with zero gaps recorded', () => {
    expect(timingPercentage([], 80, 1)).toBe(100)
  })
})
