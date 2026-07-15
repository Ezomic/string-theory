import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDB, getAll, getOne, putOne } from './db/db'
import type { RiffRun } from './db/types'
import { bestScoresByRiff, lastRiffRun, recordRiffRun } from './riffRuns'

beforeEach(async () => {
  const db = await getDB()
  await Promise.all([...db.objectStoreNames].map((store) => db.clear(store)))
})

const cleanNotes = (names: string[]): RiffRun['notes'] =>
  names.map((name) => ({ name, result: 'clean' as const, cents: 0 }))

describe('recordRiffRun', () => {
  it('persists a run and updates the riffs skill', async () => {
    const run = await recordRiffRun('blues-shuffle', cleanNotes(['E', 'G', 'A']), 100)

    expect(run.riffId).toBe('blues-shuffle')
    expect(run.score).toBeGreaterThan(0)
    expect(await getAll('riffRuns')).toHaveLength(1)

    const skill = await getOne('skillProgress', 'riffs')
    expect(skill?.masteryPct).toBe(run.score)
  })

  it('weights the skill toward the running average across runs', async () => {
    await recordRiffRun('a', cleanNotes(['E', 'G']), 100)
    const second = await recordRiffRun('a', [{ name: 'E', result: 'flat', cents: -20 }], 0)
    const skill = await getOne('skillProgress', 'riffs')
    // Weighted 0.7*prev + 0.3*second, so it sits between the two run scores.
    expect(skill!.masteryPct).toBeLessThan(100)
    expect(skill!.masteryPct).toBeGreaterThan(second.score)
  })

  it('records a practice session', async () => {
    await recordRiffRun('blues-shuffle', cleanNotes(['E']), 100)
    const sessions = await getAll('practiceSessions')
    expect(sessions.some((s) => s.activities.includes('riff'))).toBe(true)
  })
})

describe('bestScoresByRiff', () => {
  it('keeps the highest score per riff', () => {
    const runs: RiffRun[] = [
      { id: '1', riffId: 'a', notes: [], timingPct: 0, score: 40, timestamp: '2026-01-01T00:00:00Z' },
      { id: '2', riffId: 'a', notes: [], timingPct: 0, score: 80, timestamp: '2026-01-02T00:00:00Z' },
      { id: '3', riffId: 'b', notes: [], timingPct: 0, score: 55, timestamp: '2026-01-03T00:00:00Z' },
    ]
    expect(bestScoresByRiff(runs)).toEqual({ a: 80, b: 55 })
  })
})

describe('lastRiffRun', () => {
  it('returns the most recent run for a riff', async () => {
    // Explicit distinct timestamps — two rapid recordRiffRun calls can share a millisecond,
    // making the "most recent" tie-break non-deterministic (flaky on fast CI).
    await putOne('riffRuns', {
      id: 'older',
      riffId: 'blues-shuffle',
      notes: [],
      timingPct: 0,
      score: 50,
      timestamp: '2026-01-01T00:00:00.000Z',
    })
    await putOne('riffRuns', {
      id: 'newer',
      riffId: 'blues-shuffle',
      notes: [],
      timingPct: 0,
      score: 60,
      timestamp: '2026-01-02T00:00:00.000Z',
    })
    expect((await lastRiffRun('blues-shuffle'))?.id).toBe('newer')
    expect(await lastRiffRun('nope')).toBeUndefined()
  })
})
