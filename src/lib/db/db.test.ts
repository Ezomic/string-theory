import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { deleteOne, getAll, getDB, getOne, putOne } from './db'
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
    expect(await getOne('profile', 'user-1')).toEqual(profile)
    expect(await getAll('profile')).toEqual([profile])

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
    }

    await putOne('settings', settings)
    expect(await getOne('settings', 'settings')).toEqual(settings)
  })
})
