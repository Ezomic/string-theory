import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAll, getDB, getOne } from './db/db'
import type { StrumRun } from './db/types'
import { bestByItem, recordStrumRun, scoreForRating } from './strumRuns'

beforeEach(async () => {
  const db = await getDB()
  await Promise.all([...db.objectStoreNames].map((store) => db.clear(store)))
})

afterEach(() => {
  vi.useRealTimers()
})

function run(overrides: Partial<StrumRun>): StrumRun {
  return {
    id: crypto.randomUUID(),
    kind: 'progression',
    itemId: 'pop-g',
    tempo: 80,
    rating: 'shaky',
    score: 60,
    timestamp: '2026-09-30T10:00:00.000Z',
    ...overrides,
  }
}

describe('scoreForRating', () => {
  it('scores Nailed it 100, Shaky 60 and Lost it 20', () => {
    expect(scoreForRating('nailed')).toBe(100)
    expect(scoreForRating('shaky')).toBe(60)
    expect(scoreForRating('lost')).toBe(20)
  })
})

describe('recordStrumRun', () => {
  it('stores the run with its rating, score and the tempo it was played at', async () => {
    const recorded = await recordStrumRun('progression', 'pop-g', 85, 'shaky')

    expect(recorded).toMatchObject({ kind: 'progression', itemId: 'pop-g', tempo: 85, rating: 'shaky', score: 60 })
    const stored = await getAll('strumRuns')
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({ id: recorded.id, tempo: 85, score: 60 })
  })

  it('does not let the tempo change the score', async () => {
    const slow = await recordStrumRun('pattern', 'eighths', 50, 'nailed')
    const fast = await recordStrumRun('pattern', 'eighths', 150, 'nailed')
    expect(slow.score).toBe(fast.score)
  })

  it('starts the strumming skill at the first run score', async () => {
    await recordStrumRun('pattern', 'eighths', 70, 'shaky')
    expect((await getOne('skillProgress', 'strumming'))?.masteryPct).toBe(60)
  })

  it('blends mastery 0.7 old and 0.3 new, like riffs', async () => {
    await recordStrumRun('progression', 'pop-g', 80, 'nailed')
    await recordStrumRun('progression', 'pop-g', 80, 'lost')
    expect((await getOne('skillProgress', 'strumming'))?.masteryPct).toBe(Math.round(100 * 0.7 + 20 * 0.3))
  })

  it('bumps the streak and logs strumming practice for today', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-30T12:00:00.000Z'))

    await recordStrumRun('progression', 'pop-g', 80, 'nailed')

    expect(await getOne('streak', 'current')).toMatchObject({ current: 1, lastPracticeDate: '2026-09-30' })
    const session = await getOne('practiceSessions', '2026-09-30')
    expect(session?.activities).toContain('strumming')
    expect(session?.minutes).toBeGreaterThan(0)
  })
})

describe('bestByItem', () => {
  it('keeps the best score per item with the tempo it was set at', () => {
    const best = bestByItem(
      [
        run({ itemId: 'pop-g', score: 60, tempo: 100 }),
        run({ itemId: 'pop-g', score: 100, tempo: 70 }),
        run({ itemId: 'blues-a', score: 20, tempo: 90 }),
      ],
      'progression',
    )
    expect(best).toEqual({ 'pop-g': { score: 100, tempo: 70 }, 'blues-a': { score: 20, tempo: 90 } })
  })

  it('prefers the faster run when two runs score the same', () => {
    const best = bestByItem(
      [run({ score: 100, tempo: 80 }), run({ score: 100, tempo: 95 }), run({ score: 100, tempo: 90 })],
      'progression',
    )
    expect(best['pop-g']).toEqual({ score: 100, tempo: 95 })
  })

  it('keeps progressions and patterns apart even when their ids match', () => {
    const runs = [
      run({ kind: 'progression', itemId: 'same', score: 20, tempo: 60 }),
      run({ kind: 'pattern', itemId: 'same', score: 100, tempo: 120 }),
    ]
    expect(bestByItem(runs, 'progression')).toEqual({ same: { score: 20, tempo: 60 } })
    expect(bestByItem(runs, 'pattern')).toEqual({ same: { score: 100, tempo: 120 } })
  })
})
