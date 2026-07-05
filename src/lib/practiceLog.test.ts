import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDB } from './db/db'
import { getAllPracticeSessions, last28DaysHeatmap, recordPracticeActivity, totalPracticeMinutes } from './practiceLog'

beforeEach(async () => {
  const db = await getDB()
  await Promise.all([...db.objectStoreNames].map((store) => db.clear(store)))
})

describe('recordPracticeActivity', () => {
  it('creates a new session for a fresh day', async () => {
    const session = await recordPracticeActivity('lesson', 5, new Date('2026-01-10T12:00:00.000Z'))
    expect(session).toEqual({ date: '2026-01-10', minutes: 5, activities: ['lesson'] })
  })

  it('accumulates minutes across multiple activities on the same day', async () => {
    await recordPracticeActivity('lesson', 5, new Date('2026-01-10T09:00:00.000Z'))
    const session = await recordPracticeActivity('ear', 2, new Date('2026-01-10T18:00:00.000Z'))
    expect(session.minutes).toBe(7)
    expect(session.activities).toEqual(['lesson', 'ear'])
  })

  it('does not duplicate the same activity tag twice', async () => {
    await recordPracticeActivity('ear', 1, new Date('2026-01-10T09:00:00.000Z'))
    const session = await recordPracticeActivity('ear', 1, new Date('2026-01-10T10:00:00.000Z'))
    expect(session.activities).toEqual(['ear'])
    expect(session.minutes).toBe(2)
  })
})

describe('totalPracticeMinutes', () => {
  it('sums minutes across sessions', () => {
    expect(
      totalPracticeMinutes([
        { date: '2026-01-01', minutes: 5, activities: [] },
        { date: '2026-01-02', minutes: 10, activities: [] },
      ]),
    ).toBe(15)
  })
})

describe('last28DaysHeatmap', () => {
  it('returns 28 entries ending today, with correct intensities', () => {
    const now = new Date('2026-01-28T12:00:00.000Z')
    const sessions = [
      { date: '2026-01-28', minutes: 0, activities: [] },
      { date: '2026-01-27', minutes: 3, activities: [] },
      { date: '2026-01-26', minutes: 10, activities: [] },
      { date: '2026-01-25', minutes: 20, activities: [] },
    ]
    const days = last28DaysHeatmap(sessions, now)
    expect(days).toHaveLength(28)
    expect(days[27]).toBe(0) // today, no minutes
    expect(days[26]).toBe(1) // yesterday, <5min
    expect(days[25]).toBe(2) // <15min
    expect(days[24]).toBe(3) // >=15min
  })

  it('is all zeros with no sessions', () => {
    const days = last28DaysHeatmap([], new Date('2026-01-28T12:00:00.000Z'))
    expect(days.every((d) => d === 0)).toBe(true)
  })
})

describe('getAllPracticeSessions', () => {
  it('reads back what was recorded', async () => {
    await recordPracticeActivity('play', 3, new Date('2026-01-10T12:00:00.000Z'))
    const sessions = await getAllPracticeSessions()
    expect(sessions).toHaveLength(1)
  })
})
