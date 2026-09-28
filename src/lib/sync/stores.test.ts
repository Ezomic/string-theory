import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { getDB } from '../db/db'
import { STATIC_STORES, SYNCED_STORES, SYNCED_STORE_NAMES, isSyncedStore, keyOf } from './stores'

describe('store classification', () => {
  it('covers every object store exactly once', async () => {
    const db = await getDB()
    const classified = [...SYNCED_STORE_NAMES, ...STATIC_STORES].sort()
    expect(classified).toEqual([...db.objectStoreNames].sort())
  })

  it('uses the same key path IndexedDB does, so keys cannot drift', async () => {
    const db = await getDB()
    const tx = db.transaction([...db.objectStoreNames])
    for (const store of SYNCED_STORE_NAMES) {
      expect(tx.objectStore(store).keyPath).toBe(SYNCED_STORES[store].keyPath)
    }
  })

  it('excludes lesson content from syncing', () => {
    expect(isSyncedStore('units')).toBe(false)
    expect(isSyncedStore('lessons')).toBe(false)
    expect(isSyncedStore('streak')).toBe(true)
  })

  it('reads a record key by its store-specific key path', () => {
    expect(keyOf('lessonProgress', { lessonId: 'l-1' })).toBe('l-1')
    expect(keyOf('skillProgress', { skillKey: 'ear' })).toBe('ear')
    expect(keyOf('practiceSessions', { date: '2026-07-20' })).toBe('2026-07-20')
    expect(keyOf('achievements', { key: 'first-lesson' })).toBe('first-lesson')
  })

  it('throws rather than syncing a record with no key', () => {
    expect(() => keyOf('playRuns', { exerciseId: 'e-1' })).toThrow(/missing key "id"/)
  })
})
