import { describe, expect, it } from 'vitest'
import { buildDailyMix } from './dailyMix'

describe('buildDailyMix', () => {
  it('returns 4 steps with unique ids', () => {
    const steps = buildDailyMix([])
    expect(steps).toHaveLength(4)
    expect(new Set(steps.map((s) => s.id)).size).toBe(4)
  })

  it('defaults the weak-spot step to fretboard notes with no skill data', () => {
    const steps = buildDailyMix([])
    const weakSpot = steps.find((s) => s.id === 'weakspot')!
    expect(weakSpot.route).toBe('/tools/fretboard/quiz')
    expect(weakSpot.subtitle).toBe('3 min')
  })

  it('picks the lowest-mastery tracked skill as the weak spot', () => {
    const steps = buildDailyMix([
      { skillKey: 'fretboardNotes', masteryPct: 80 },
      { skillKey: 'play', masteryPct: 20 },
    ])
    const weakSpot = steps.find((s) => s.id === 'weakspot')!
    expect(weakSpot.route).toBe('/tools/play')
    expect(weakSpot.subtitle).toBe('Your weak spot · 3 min')
  })

  it('ignores untracked skill keys when picking the weak spot', () => {
    const steps = buildDailyMix([{ skillKey: 'someUnknownSkill', masteryPct: 1 }])
    const weakSpot = steps.find((s) => s.id === 'weakspot')!
    expect(weakSpot.route).toBe('/tools/fretboard/quiz')
  })
})
