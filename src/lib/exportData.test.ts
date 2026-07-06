import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDB } from './db/db'
import type { UserProfile } from './db/types'
import { buildExportData, exportFileName } from './exportData'

beforeEach(async () => {
  const db = await getDB()
  await Promise.all([...db.objectStoreNames].map((store) => db.clear(store)))
})

describe('exportFileName', () => {
  it('includes the date so repeated exports do not overwrite each other', () => {
    expect(exportFileName(new Date('2026-01-10T12:00:00.000Z'))).toBe('string-theory-export-2026-01-10.json')
  })
})

describe('buildExportData', () => {
  it('includes every object store, even empty ones', async () => {
    const exported = await buildExportData(new Date('2026-01-10T12:00:00.000Z'))
    const db = await getDB()
    expect(Object.keys(exported.data).sort()).toEqual([...db.objectStoreNames].sort())
    expect(exported.exportedAt).toBe('2026-01-10T12:00:00.000Z')
  })

  it('includes real records that were written to IndexedDB', async () => {
    const db = await getDB()
    const profile: UserProfile = {
      id: 'local-guest',
      name: 'Robbin',
      isGuest: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      plan: 'free',
    }
    await db.put('profile', profile)

    const exported = await buildExportData()
    expect(exported.data.profile).toEqual([profile])
  })
})
