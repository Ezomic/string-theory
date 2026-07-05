import { describe, expect, it } from 'vitest'
import {
  levelFromExperience,
  levelFromScore,
  scoreFromAnswers,
  strengthFromCount,
  THEORY_QUESTIONS,
} from './placement'

describe('THEORY_QUESTIONS', () => {
  it('has every correct choice present among its own choices', () => {
    THEORY_QUESTIONS.forEach((q) => {
      expect(q.choices).toContain(q.correctChoice)
    })
  })

  it('has unique ids', () => {
    expect(new Set(THEORY_QUESTIONS.map((q) => q.id)).size).toBe(THEORY_QUESTIONS.length)
  })
})

describe('levelFromScore', () => {
  it('is level 1 for a low score', () => {
    expect(levelFromScore(0, 6)).toBe(1)
    expect(levelFromScore(2, 6)).toBe(1)
  })

  it('is level 2 for a mid score', () => {
    expect(levelFromScore(3, 6)).toBe(2)
    expect(levelFromScore(4, 6)).toBe(2)
  })

  it('is level 3 for a high score', () => {
    expect(levelFromScore(5, 6)).toBe(3)
    expect(levelFromScore(6, 6)).toBe(3)
  })

  it('handles zero questions without dividing by zero', () => {
    expect(levelFromScore(0, 0)).toBe(1)
  })
})

describe('strengthFromCount', () => {
  it('is strong at a perfect score', () => {
    expect(strengthFromCount(2, 2)).toBe('strong')
  })

  it('is good at half or more', () => {
    expect(strengthFromCount(1, 2)).toBe('good')
  })

  it('is weak below half', () => {
    expect(strengthFromCount(0, 2)).toBe('weak')
  })

  it('is weak with zero total (nothing answered)', () => {
    expect(strengthFromCount(0, 0)).toBe('weak')
  })
})

describe('levelFromExperience', () => {
  it('maps experience index directly to level, clamped 1-3', () => {
    expect(levelFromExperience(0)).toBe(1)
    expect(levelFromExperience(1)).toBe(2)
    expect(levelFromExperience(2)).toBe(3)
    expect(levelFromExperience(5)).toBe(3)
    expect(levelFromExperience(-1)).toBe(1)
  })
})

describe('scoreFromAnswers', () => {
  it('combines theory and ear answers into one score', () => {
    const score = scoreFromAnswers([true, true, false, true], [true, false])
    expect(score).toEqual({
      level: levelFromScore(4, 6),
      theoryCorrect: 3,
      theoryTotal: 4,
      earCorrect: 1,
      earTotal: 2,
    })
  })
})
