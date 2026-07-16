import { describe, expect, it } from 'vitest'
import { buildDailyMix } from './dailyMix'
import type { SkillDisplay } from './progress'

function skill(overrides: Partial<SkillDisplay>): SkillDisplay {
  return { key: 'fretboardNotes', label: 'Fretboard notes', masteryPct: 50, route: '/tools/fretboard/quiz', ...overrides }
}

describe('buildDailyMix', () => {
  it('returns 5 steps with unique ids', () => {
    const steps = buildDailyMix([])
    expect(steps).toHaveLength(5)
    expect(new Set(steps.map((s) => s.id)).size).toBe(5)
  })

  it('includes a routine step pointing at the runner', () => {
    const steps = buildDailyMix([])
    const routine = steps.find((s) => s.id === 'routine')!
    expect(routine.route).toBe('/tools/routines/warm-up-flow')
  })

  it('defaults the weak-spot step to fretboard notes with no skill data', () => {
    const steps = buildDailyMix([])
    const weakSpot = steps.find((s) => s.id === 'weakspot')!
    expect(weakSpot.route).toBe('/tools/fretboard/quiz')
    expect(weakSpot.subtitle).toBe('3 min')
  })

  it('picks the lowest-mastery tracked skill as the weak spot', () => {
    const steps = buildDailyMix([
      skill({ key: 'fretboardNotes', label: 'Fretboard notes', masteryPct: 80, route: '/tools/fretboard/quiz' }),
      skill({ key: 'play', label: 'Play & feedback', masteryPct: 20, route: '/tools/play' }),
    ])
    const weakSpot = steps.find((s) => s.id === 'weakspot')!
    expect(weakSpot.route).toBe('/tools/play')
    expect(weakSpot.subtitle).toBe('Your weak spot · 3 min')
  })

  it('can pick an ear-training category as the weak spot, not just fretboard/play', () => {
    const steps = buildDailyMix([
      skill({ key: 'fretboardNotes', label: 'Fretboard notes', masteryPct: 90, route: '/tools/fretboard/quiz' }),
      skill({
        key: 'chordQuality',
        label: 'Chord quality (ear)',
        masteryPct: 10,
        route: '/tools/ear/drill?category=chordQuality',
      }),
    ])
    const weakSpot = steps.find((s) => s.id === 'weakspot')!
    expect(weakSpot.route).toBe('/tools/ear/drill?category=chordQuality')
    expect(weakSpot.title).toBe('Chord quality drill')
  })

  it('gives the chord-progressions ear-drill category the ear-training icon, not the generic fallback', () => {
    const steps = buildDailyMix([
      skill({ key: 'fretboardNotes', label: 'Fretboard notes', masteryPct: 90, route: '/tools/fretboard/quiz' }),
      skill({
        key: 'progressions',
        label: 'Chord progressions (ear)',
        masteryPct: 10,
        route: '/tools/ear/drill?category=progressions',
      }),
    ])
    const weakSpot = steps.find((s) => s.id === 'weakspot')!
    expect(weakSpot.route).toBe('/tools/ear/drill?category=progressions')
    expect(weakSpot.icon).toBe('👂')
  })

  it('never picks the same route as the fixed ear-training step, to avoid repeating it', () => {
    const steps = buildDailyMix([
      skill({
        key: 'intervals',
        label: 'Intervals (ear)',
        masteryPct: 1,
        route: '/tools/ear/drill?category=intervals',
      }),
      skill({ key: 'play', label: 'Play & feedback', masteryPct: 50, route: '/tools/play' }),
    ])
    const weakSpot = steps.find((s) => s.id === 'weakspot')!
    const earStep = steps.find((s) => s.id === 'ear')!
    expect(weakSpot.route).not.toBe(earStep.route)
    expect(weakSpot.route).toBe('/tools/play')
  })
})
