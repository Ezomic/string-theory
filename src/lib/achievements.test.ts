import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, computeEarnedAchievements, type AchievementInput } from './achievements'

function baseInput(overrides: Partial<AchievementInput> = {}): AchievementInput {
  return {
    streak: undefined,
    lessonsDoneCount: 0,
    totalLessonsCount: 5,
    bestEarLevel: 0,
    hasPerfectPlayRun: false,
    fretboardMasteryPct: 0,
    hasNightOwlActivity: false,
    tunerInTuneCount: 0,
    hasCompletedAnyUnit: false,
    masteredLessonCount: 0,
    ...overrides,
  }
}

describe('ACHIEVEMENTS', () => {
  it('has unique keys', () => {
    const keys = ACHIEVEMENTS.map((a) => a.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('computeEarnedAchievements', () => {
  it('earns nothing from a fresh, empty state', () => {
    expect(computeEarnedAchievements(baseInput()).size).toBe(0)
  })

  it('earns the 7-day streak badge but not 30-day at longest=7', () => {
    const earned = computeEarnedAchievements(baseInput({ streak: { id: 'current', current: 7, longest: 7, lastPracticeDate: null } }))
    expect(earned.has('streak7')).toBe(true)
    expect(earned.has('streak30')).toBe(false)
  })

  it('earns both streak badges at longest=30', () => {
    const earned = computeEarnedAchievements(baseInput({ streak: { id: 'current', current: 30, longest: 30, lastPracticeDate: null } }))
    expect(earned.has('streak7')).toBe(true)
    expect(earned.has('streak30')).toBe(true)
  })

  it('earns first lesson at 1 done, curriculum complete only once all are done', () => {
    const partial = computeEarnedAchievements(baseInput({ lessonsDoneCount: 1, totalLessonsCount: 5 }))
    expect(partial.has('firstLesson')).toBe(true)
    expect(partial.has('curriculumComplete')).toBe(false)

    const complete = computeEarnedAchievements(baseInput({ lessonsDoneCount: 5, totalLessonsCount: 5 }))
    expect(complete.has('curriculumComplete')).toBe(true)
  })

  it('earns ear level 3 at bestEarLevel >= 3', () => {
    expect(computeEarnedAchievements(baseInput({ bestEarLevel: 2 })).has('earLevel3')).toBe(false)
    expect(computeEarnedAchievements(baseInput({ bestEarLevel: 3 })).has('earLevel3')).toBe(true)
  })

  it('earns firstMastered once a lesson is mastered', () => {
    expect(computeEarnedAchievements(baseInput({ masteredLessonCount: 0 })).has('firstMastered')).toBe(false)
    expect(computeEarnedAchievements(baseInput({ masteredLessonCount: 1 })).has('firstMastered')).toBe(true)
  })

  it('earns perfect run only when flagged', () => {
    expect(computeEarnedAchievements(baseInput({ hasPerfectPlayRun: true })).has('perfectRun')).toBe(true)
  })

  it('earns fretboard novice at 50% and master at 100%', () => {
    const novice = computeEarnedAchievements(baseInput({ fretboardMasteryPct: 60 }))
    expect(novice.has('fretboardNovice')).toBe(true)
    expect(novice.has('fretboardMaster')).toBe(false)

    const master = computeEarnedAchievements(baseInput({ fretboardMasteryPct: 100 }))
    expect(master.has('fretboardNovice')).toBe(true)
    expect(master.has('fretboardMaster')).toBe(true)
  })

  it('earns night owl only when flagged', () => {
    expect(computeEarnedAchievements(baseInput({ hasNightOwlActivity: true })).has('nightOwl')).toBe(true)
  })

  it('earns tuned 50x at 50 in-tune events but not before', () => {
    expect(computeEarnedAchievements(baseInput({ tunerInTuneCount: 49 })).has('tuned50')).toBe(false)
    expect(computeEarnedAchievements(baseInput({ tunerInTuneCount: 50 })).has('tuned50')).toBe(true)
  })

  it('earns full unit only when a whole unit is flagged complete', () => {
    expect(computeEarnedAchievements(baseInput({ hasCompletedAnyUnit: false })).has('fullUnit')).toBe(false)
    expect(computeEarnedAchievements(baseInput({ hasCompletedAnyUnit: true })).has('fullUnit')).toBe(true)
  })
})
