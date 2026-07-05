import { describe, expect, it } from 'vitest'
import { generateQuestion, levelFromCorrectCount, statsForCategory } from './earTraining'
import type { DrillResult } from './db/types'

describe('generateQuestion', () => {
  it('always includes the correct answer among the choices', () => {
    for (let i = 0; i < 50; i += 1) {
      const question = generateQuestion('intervals', 3)
      expect(question.choices).toContain(question.correctLabel)
    }
  })

  it('never repeats a choice label', () => {
    for (let i = 0; i < 50; i += 1) {
      const question = generateQuestion('chordQuality', 3)
      expect(new Set(question.choices).size).toBe(question.choices.length)
    }
  })

  it('generates exactly two frequencies for an interval question', () => {
    const question = generateQuestion('intervals', 2)
    expect(question.frequencies).toHaveLength(2)
    expect(question.frequencies[1]).toBeGreaterThan(question.frequencies[0])
  })

  it('generates three or more frequencies for a chord question', () => {
    const question = generateQuestion('chordQuality', 3)
    expect(question.frequencies.length).toBeGreaterThanOrEqual(3)
  })

  it('generates seven frequencies for a scale-recognition question', () => {
    const question = generateQuestion('scaleRecognition', 1)
    expect(question.frequencies).toHaveLength(7)
  })

  it('offers only two choices for scale recognition (major vs minor)', () => {
    const question = generateQuestion('scaleRecognition', 1)
    expect(question.choices).toHaveLength(2)
    expect(question.choices.sort()).toEqual(['Major', 'Minor'])
  })

  it('restricts chord quality to major/minor at level 1', () => {
    for (let i = 0; i < 30; i += 1) {
      const question = generateQuestion('chordQuality', 1)
      expect(['Major', 'Minor']).toContain(question.correctLabel)
    }
  })

  it('defaults intervals to melodic playback and chords to harmonic', () => {
    expect(generateQuestion('intervals', 1).defaultMode).toBe('melodic')
    expect(generateQuestion('chordQuality', 1).defaultMode).toBe('harmonic')
  })
})

describe('statsForCategory', () => {
  function result(overrides: Partial<DrillResult>): DrillResult {
    return {
      id: 'x',
      type: 'intervals',
      level: 1,
      correct: 1,
      total: 1,
      streak: 0,
      timestamp: '2026-01-01T00:00:00.000Z',
      ...overrides,
    }
  }

  it('returns zero accuracy and level 1 with no attempts', () => {
    expect(statsForCategory([], 'intervals')).toEqual({ level: 1, accuracyPct: 0, attempts: 0 })
  })

  it('only counts results matching the category', () => {
    const results = [
      result({ type: 'intervals', correct: 1, total: 1 }),
      result({ type: 'chordQuality', correct: 0, total: 1 }),
    ]
    expect(statsForCategory(results, 'intervals')).toEqual({
      level: 1,
      accuracyPct: 100,
      attempts: 1,
    })
  })

  it('computes accuracy percentage and derives level from correct count', () => {
    const results = Array.from({ length: 10 }, () => result({ correct: 1, total: 1 }))
    expect(statsForCategory(results, 'intervals')).toEqual({
      level: 3,
      accuracyPct: 100,
      attempts: 10,
    })
  })
})

describe('levelFromCorrectCount', () => {
  it('starts at level 1', () => {
    expect(levelFromCorrectCount(0)).toBe(1)
    expect(levelFromCorrectCount(4)).toBe(1)
  })

  it('steps up every 5 correct answers, capped at 4', () => {
    expect(levelFromCorrectCount(5)).toBe(2)
    expect(levelFromCorrectCount(10)).toBe(3)
    expect(levelFromCorrectCount(15)).toBe(4)
    expect(levelFromCorrectCount(100)).toBe(4)
  })
})
