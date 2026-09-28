import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDB } from './db/db'
import { focusTipFor, lastRunFor, recordPlayRun, scoreForRun } from './playRuns'

beforeEach(async () => {
  const db = await getDB()
  await Promise.all([...db.objectStoreNames].map((store) => db.clear(store)))
})

describe('scoreForRun', () => {
  it('blends clean ratio and timing into a single score', () => {
    // 7/8 clean (0.875) and 92% timing -> round(0.875*70 + 92*0.3)
    const results = [
      'clean',
      'clean',
      'clean',
      'clean',
      'clean',
      'clean',
      'clean',
      'sharp',
    ] as const
    expect(scoreForRun([...results], 92)).toBe(Math.round(0.875 * 70 + 92 * 0.3))
  })

  it('is 0 for an empty run', () => {
    expect(scoreForRun([], 100)).toBe(0)
  })
})

describe('focusTipFor', () => {
  it('returns null when every note was clean', () => {
    expect(focusTipFor([{ name: 'C', result: 'clean', cents: 2 }])).toBeNull()
  })

  it('calls out the note with the largest cents deviation', () => {
    const tip = focusTipFor([
      { name: 'C', result: 'clean', cents: 0 },
      { name: 'E', result: 'sharp', cents: 12 },
      { name: 'G', result: 'flat', cents: -6 },
    ])
    expect(tip).toContain('E')
    expect(tip).toContain('sharp')
    expect(tip).toContain('+12')
  })
})

describe('recordPlayRun', () => {
  it('writes a PlayRun and creates skill progress from the score', async () => {
    const run = await recordPlayRun(
      'c-major-scale',
      [
        { name: 'C', result: 'clean', cents: 0 },
        { name: 'D', result: 'clean', cents: 0 },
      ],
      100,
    )
    expect(run.exerciseId).toBe('c-major-scale')
    expect(run.score).toBe(100)

    const db = await getDB()
    expect(await db.get('skillProgress', 'play')).toMatchObject({ skillKey: 'play', masteryPct: 100 })
  })

  it('blends subsequent runs into existing skill progress rather than overwriting it', async () => {
    await recordPlayRun('c-major-scale', [{ name: 'C', result: 'clean', cents: 0 }], 100)
    await recordPlayRun('c-major-scale', [{ name: 'C', result: 'flat', cents: -20 }], 0)

    const db = await getDB()
    const progress = await db.get('skillProgress', 'play')
    // first run scores 100, second scores round(0*70 + 0*0.3) = 0
    // blended: round(100*0.7 + 0*0.3) = 70
    expect(progress?.masteryPct).toBe(70)
  })
})

describe('lastRunFor', () => {
  it('returns the most recent run for an exercise', async () => {
    await recordPlayRun('c-major-scale', [{ name: 'C', result: 'clean', cents: 0 }], 100)
    await new Promise((resolve) => setTimeout(resolve, 5))
    const second = await recordPlayRun('c-major-scale', [{ name: 'C', result: 'flat', cents: -5 }], 50)

    const last = await lastRunFor('c-major-scale')
    expect(last?.id).toBe(second.id)
  })

  it('returns undefined when no run exists for that exercise', async () => {
    expect(await lastRunFor('g-major-scale')).toBeUndefined()
  })
})
