import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteOne, getAll, getDB, getOne, putFromRemote, putOne } from './db'
import type { Settings, UserProfile } from './types'

beforeEach(async () => {
  const db = await getDB()
  await Promise.all([...db.objectStoreNames].map((store) => db.clear(store)))
})

describe('IndexedDB data layer', () => {
  it('opens the database and creates all entity stores', async () => {
    const db = await getDB()
    expect([...db.objectStoreNames].sort()).toEqual(
      [
        'achievements',
        'drillResults',
        'instrumentConfigs',
        'lessonProgress',
        'lessons',
        'placementResults',
        'playRuns',
        'riffRuns',
        'sightReadingRuns',
        'practiceSessions',
        'profile',
        'settings',
        'skillProgress',
        'streak',
        'tunerStats',
        'units',
      ].sort(),
    )
  })

  it('round-trips a value through put/get/getAll/delete', async () => {
    const profile: UserProfile = {
      id: 'user-1',
      name: 'Robbin',
      isGuest: true,
      createdAt: new Date().toISOString(),
      plan: 'free',
    }

    await putOne('profile', profile)
    expect(await getOne('profile', 'user-1')).toMatchObject(profile)
    expect(await getAll('profile')).toMatchObject([profile])

    await deleteOne('profile', 'user-1')
    expect(await getOne('profile', 'user-1')).toBeUndefined()
  })

  it('stores settings under a singleton key', async () => {
    const settings: Settings = {
      id: 'settings',
      notationLabels: 'names',
      theme: 'dark',
      reminderOn: false,
      micDeviceId: null,
      syncEnabled: false,
      voice: 'pluckGuitar',
      noInstrument: false,
    }

    await putOne('settings', settings)
    expect(await getOne('settings', 'settings')).toMatchObject(settings)
  })
})

describe('updatedAt stamping', () => {
  it('stamps every write to a user-owned store', async () => {
    await putOne('streak', { id: 'current', current: 1, longest: 1, lastPracticeDate: '2026-07-20' })
    const streak = await getOne('streak', 'current')
    expect(streak?.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('moves the stamp forward on a later write', async () => {
    await putOne('tunerStats', { id: 'tuner', inTuneCount: 1 })
    const first = (await getOne('tunerStats', 'tuner'))?.updatedAt

    vi.setSystemTime(new Date('2026-08-01T00:00:00.000Z'))
    await putOne('tunerStats', { id: 'tuner', inTuneCount: 2 })
    const second = (await getOne('tunerStats', 'tuner'))?.updatedAt

    expect(second).not.toBe(first)
    expect(second! > first!).toBe(true)
    vi.useRealTimers()
  })

  it('leaves static lesson content unstamped, since it never syncs', async () => {
    await putOne('units', { id: 'u-1', title: 'Unit 1', order: 1, level: 1 })
    expect(await getOne('units', 'u-1')).not.toHaveProperty('updatedAt')
  })

  it('keeps the timestamp a pulled record arrived with', async () => {
    await putFromRemote('streak', {
      id: 'current',
      current: 9,
      longest: 9,
      lastPracticeDate: '2026-07-19',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    expect((await getOne('streak', 'current'))?.updatedAt).toBe('2026-01-01T00:00:00.000Z')
  })
})
