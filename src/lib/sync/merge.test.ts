import { describe, expect, it } from 'vitest'
import { mergeRecord } from './merge'

const at = (iso: string) => ({ updatedAt: iso })
const OLD = '2026-07-01T10:00:00.000Z'
const NEW = '2026-07-20T10:00:00.000Z'

describe('streak', () => {
  it('never lets a stale device reset an active streak', () => {
    const local = { id: 'current', current: 12, longest: 20, lastPracticeDate: '2026-07-20', ...at(OLD) }
    const stale = { id: 'current', current: 0, longest: 3, lastPracticeDate: '2026-01-01', ...at(NEW) }

    const { value, needsPush } = mergeRecord('streak', local, stale)
    expect(value).toMatchObject({ current: 12, longest: 20, lastPracticeDate: '2026-07-20' })
    expect(needsPush).toBe(true)
  })

  it('takes the higher count from either side', () => {
    const local = { id: 'current', current: 3, longest: 30, lastPracticeDate: '2026-07-10', ...at(OLD) }
    const remote = { id: 'current', current: 9, longest: 12, lastPracticeDate: '2026-07-19', ...at(NEW) }

    expect(mergeRecord('streak', local, remote).value).toMatchObject({
      current: 9,
      longest: 30,
      lastPracticeDate: '2026-07-19',
    })
  })

  it('gives a pushed merge a newer timestamp than the remote it beat', () => {
    const local = { id: 'current', current: 12, longest: 20, lastPracticeDate: '2026-07-20', ...at(OLD) }
    const remote = { id: 'current', current: 1, longest: 1, lastPracticeDate: '2026-01-01', ...at(NEW) }

    const { value } = mergeRecord('streak', local, remote, () => new Date('2026-07-21T00:00:00.000Z'))
    expect(value.updatedAt! > NEW).toBe(true)
  })

  it('is idempotent, so re-merging the same pair changes nothing', () => {
    const local = { id: 'current', current: 12, longest: 20, lastPracticeDate: '2026-07-20', ...at(OLD) }
    const remote = { id: 'current', current: 4, longest: 9, lastPracticeDate: '2026-07-11', ...at(NEW) }

    const once = mergeRecord('streak', local, remote).value
    const twice = mergeRecord('streak', once, remote).value
    expect(twice).toMatchObject({ current: 12, longest: 20, lastPracticeDate: '2026-07-20' })
  })

  it('does not push when the remote already reflects the merged result', () => {
    const local = { id: 'current', current: 2, longest: 2, lastPracticeDate: '2026-07-01', ...at(OLD) }
    const remote = { id: 'current', current: 9, longest: 9, lastPracticeDate: '2026-07-19', ...at(NEW) }

    const { needsPush, value } = mergeRecord('streak', local, remote)
    expect(needsPush).toBe(false)
    expect(value.updatedAt).toBe(NEW)
  })
})

describe('counters and mastery', () => {
  it('keeps the higher tuner count rather than overwriting it', () => {
    const local = { id: 'tuner', inTuneCount: 80, ...at(OLD) }
    const remote = { id: 'tuner', inTuneCount: 12, ...at(NEW) }
    expect(mergeRecord('tunerStats', local, remote).value).toMatchObject({ inTuneCount: 80 })
  })

  it('keeps the higher mastery percentage', () => {
    const local = { skillKey: 'ear', masteryPct: 90, ...at(OLD) }
    const remote = { skillKey: 'ear', masteryPct: 40, ...at(NEW) }
    expect(mergeRecord('skillProgress', local, remote).value).toMatchObject({ masteryPct: 90 })
  })

  it('merges per-string breakdowns key by key', () => {
    const local = { skillKey: 'fretboard', masteryPct: 50, perStringBreakdown: { E: 90, A: 10 }, ...at(OLD) }
    const remote = { skillKey: 'fretboard', masteryPct: 50, perStringBreakdown: { E: 20, D: 70 }, ...at(NEW) }

    expect(mergeRecord('skillProgress', local, remote).value.perStringBreakdown).toEqual({
      E: 90,
      A: 10,
      D: 70,
    })
  })
})

describe('lesson progress', () => {
  it('keeps the furthest status rather than the most recent one', () => {
    const local = { lessonId: 'l-1', status: 'done', score: 95, notesCleanPct: 90, completedAt: OLD, ...at(OLD) }
    const remote = {
      lessonId: 'l-1',
      status: 'in_progress',
      score: 10,
      notesCleanPct: 5,
      completedAt: null,
      ...at(NEW),
    }

    expect(mergeRecord('lessonProgress', local, remote).value).toMatchObject({
      status: 'done',
      score: 95,
      notesCleanPct: 90,
      completedAt: OLD,
    })
  })

  it('keeps mastery once either side has it', () => {
    const local = { lessonId: 'l-1', status: 'done', score: 1, notesCleanPct: 1, completedAt: null, mastered: true, ...at(OLD) }
    const remote = { lessonId: 'l-1', status: 'done', score: 1, notesCleanPct: 1, completedAt: null, mastered: false, ...at(NEW) }

    expect(mergeRecord('lessonProgress', local, remote).value).toMatchObject({ mastered: true })
  })

  it('dates completion from when it first happened', () => {
    const local = { lessonId: 'l-1', status: 'done', score: 5, notesCleanPct: 5, completedAt: NEW, ...at(NEW) }
    const remote = { lessonId: 'l-1', status: 'done', score: 5, notesCleanPct: 5, completedAt: OLD, ...at(OLD) }

    expect(mergeRecord('lessonProgress', local, remote).value).toMatchObject({ completedAt: OLD })
  })
})

describe('achievements', () => {
  it('stays earned even if the other side never saw it', () => {
    const local = { key: 'streak7', earnedAt: OLD, ...at(OLD) }
    const remote = { key: 'streak7', earnedAt: null, ...at(NEW) }
    expect(mergeRecord('achievements', local, remote).value).toMatchObject({ earnedAt: OLD })
  })

  it('keeps the earliest earned date', () => {
    const local = { key: 'streak7', earnedAt: NEW, ...at(NEW) }
    const remote = { key: 'streak7', earnedAt: OLD, ...at(OLD) }
    expect(mergeRecord('achievements', local, remote).value).toMatchObject({ earnedAt: OLD })
  })
})

describe('practice sessions', () => {
  it('unions the activities from both devices', () => {
    const local = { date: '2026-07-20', minutes: 20, activities: ['lesson', 'tuner'], ...at(OLD) }
    const remote = { date: '2026-07-20', minutes: 35, activities: ['riff'], ...at(NEW) }

    expect(mergeRecord('practiceSessions', local, remote).value).toMatchObject({
      minutes: 35,
      activities: ['lesson', 'tuner', 'riff'],
    })
  })

  it('takes the longer session rather than summing, so re-merging cannot inflate it', () => {
    const local = { date: '2026-07-20', minutes: 20, activities: [], ...at(OLD) }
    const remote = { date: '2026-07-20', minutes: 30, activities: [], ...at(NEW) }

    const once = mergeRecord('practiceSessions', local, remote).value
    const twice = mergeRecord('practiceSessions', once, remote).value
    expect(twice).toMatchObject({ minutes: 30 })
  })
})

describe('append-only logs', () => {
  it('keeps the local copy rather than replacing history', () => {
    const local = { id: 'run-1', score: 88, timestamp: OLD, ...at(OLD) }
    const remote = { id: 'run-1', score: 10, timestamp: OLD, ...at(NEW) }

    const { value, needsPush } = mergeRecord('playRuns', local, remote)
    expect(value).toMatchObject({ score: 88 })
    expect(needsPush).toBe(false)
  })

  it('accepts a run this device has never seen', () => {
    const remote = { id: 'run-2', score: 70, timestamp: NEW, ...at(NEW) }
    expect(mergeRecord('riffRuns', undefined, remote).value).toMatchObject({ id: 'run-2' })
  })
})

describe('plain records', () => {
  it('takes the most recent write for settings', () => {
    const local = { id: 'settings', theme: 'dark', ...at(OLD) }
    const remote = { id: 'settings', theme: 'light', ...at(NEW) }
    expect(mergeRecord('settings', local, remote).value).toMatchObject({ theme: 'light' })
  })

  it('keeps a newer local setting and sends it back', () => {
    const local = { id: 'settings', theme: 'light', ...at(NEW) }
    const remote = { id: 'settings', theme: 'dark', ...at(OLD) }

    const { value, needsPush } = mergeRecord('settings', local, remote)
    expect(value).toMatchObject({ theme: 'light' })
    expect(needsPush).toBe(true)
  })
})

describe('records new to this device', () => {
  it('takes the remote copy as-is', () => {
    const remote = { id: 'current', current: 5, longest: 5, lastPracticeDate: '2026-07-19', ...at(NEW) }
    const { value, needsPush } = mergeRecord('streak', undefined, remote)
    expect(value).toBe(remote)
    expect(needsPush).toBe(false)
  })
})
