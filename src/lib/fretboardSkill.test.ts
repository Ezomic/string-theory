import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDB } from './db/db'
import { blendStringBreakdown, recordQuizRound, stringLabel, type StringTapStats } from './fretboardSkill'

const GUITAR_TUNING = ['E', 'A', 'D', 'G', 'B', 'E']

beforeEach(async () => {
  const db = await getDB()
  await Promise.all([...db.objectStoreNames].map((store) => db.clear(store)))
})

describe('stringLabel', () => {
  it('labels a string with its number and open-string note', () => {
    expect(stringLabel(GUITAR_TUNING, 1)).toBe('String 1 · E')
    expect(stringLabel(GUITAR_TUNING, 6)).toBe('String 6 · E')
  })
})

describe('blendStringBreakdown', () => {
  it('seeds a fresh entry for a string with no prior data', () => {
    const roundStats = new Map<number, StringTapStats>([[1, { correct: 3, wrong: 1 }]])
    const result = blendStringBreakdown(undefined, roundStats, GUITAR_TUNING)
    expect(result[stringLabel(GUITAR_TUNING, 1)]).toBe(75)
  })

  it('blends into an existing pct with a 70/30 weighting favoring history', () => {
    const label = stringLabel(GUITAR_TUNING, 1)
    const roundStats = new Map<number, StringTapStats>([[1, { correct: 1, wrong: 1 }]])
    const result = blendStringBreakdown({ [label]: 90 }, roundStats, GUITAR_TUNING)
    // round(90*0.7 + 50*0.3) = round(63+15) = 78
    expect(result[label]).toBe(78)
  })

  it('leaves strings with no attempts this round untouched', () => {
    const label = stringLabel(GUITAR_TUNING, 2)
    const roundStats = new Map<number, StringTapStats>([[1, { correct: 1, wrong: 0 }]])
    const result = blendStringBreakdown({ [label]: 60 }, roundStats, GUITAR_TUNING)
    expect(result[label]).toBe(60)
  })

  it('ignores an entry with zero correct and zero wrong taps', () => {
    const roundStats = new Map<number, StringTapStats>([[3, { correct: 0, wrong: 0 }]])
    const result = blendStringBreakdown(undefined, roundStats, GUITAR_TUNING)
    expect(Object.keys(result)).toHaveLength(0)
  })
})

describe('recordQuizRound', () => {
  it('persists a blended per-string breakdown onto the fretboardNotes skill', async () => {
    const roundStats = new Map<number, StringTapStats>([
      [1, { correct: 1, wrong: 0 }],
      [6, { correct: 1, wrong: 2 }],
    ])
    await recordQuizRound(1, 2, roundStats, GUITAR_TUNING)

    const db = await getDB()
    const skill = await db.get('skillProgress', 'fretboardNotes')
    expect(skill?.masteryPct).toBe(2)
    expect(skill?.perStringBreakdown?.[stringLabel(GUITAR_TUNING, 1)]).toBe(100)
    expect(skill?.perStringBreakdown?.[stringLabel(GUITAR_TUNING, 6)]).toBe(33)
  })

  it('accumulates across rounds instead of overwriting prior strings', async () => {
    await recordQuizRound(1, 1, new Map([[1, { correct: 1, wrong: 0 }]]), GUITAR_TUNING)
    await recordQuizRound(2, 1, new Map([[2, { correct: 1, wrong: 0 }]]), GUITAR_TUNING)

    const db = await getDB()
    const skill = await db.get('skillProgress', 'fretboardNotes')
    expect(skill?.perStringBreakdown?.[stringLabel(GUITAR_TUNING, 1)]).toBe(100)
    expect(skill?.perStringBreakdown?.[stringLabel(GUITAR_TUNING, 2)]).toBe(100)
  })
})
