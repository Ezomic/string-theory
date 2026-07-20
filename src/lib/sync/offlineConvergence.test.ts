import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDB, getOne, putOne } from '../db/db'
import { createLocalAdapter } from './localAdapter'
import { syncNow } from './syncEngine'
import type { SyncAdapter } from './types'

function memoryStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
  }
}

/**
 * Both devices share one IndexedDB here, so a device is simulated by swapping
 * the local rows in and out around each sync. `cursors` is what actually makes
 * them distinct: each device tracks its own sync position.
 */
let backend: Pick<Storage, 'getItem' | 'setItem'>
let adapter: SyncAdapter

beforeEach(async () => {
  const db = await getDB()
  await Promise.all([...db.objectStoreNames].map((store) => db.clear(store)))
  backend = memoryStorage()
  adapter = createLocalAdapter({ storage: backend })
  await adapter.signUp('a@example.com', 'longenough1')
})

describe('two devices, one of them offline', () => {
  it('converges on reconnect with no lost streak', async () => {
    const deviceA = memoryStorage()
    const deviceB = memoryStorage()

    // Device A practises up to a 12-day streak and syncs.
    await putOne('streak', { id: 'current', current: 12, longest: 20, lastPracticeDate: '2026-07-20' })
    await syncNow(adapter, { storage: deviceA })

    // Device B has been offline holding a much older streak, and only now
    // reconnects. Its stale copy must not roll A's progress back.
    await putOne('streak', { id: 'current', current: 1, longest: 3, lastPracticeDate: '2026-01-02' })
    await syncNow(adapter, { storage: deviceB })

    await expect(getOne('streak', 'current')).resolves.toMatchObject({
      current: 12,
      longest: 20,
      lastPracticeDate: '2026-07-20',
    })

    // The merged result must reach the backend, or A would pull B's stale copy back.
    await syncNow(adapter, { storage: deviceA })
    await expect(getOne('streak', 'current')).resolves.toMatchObject({ current: 12, longest: 20 })

    const { records } = await adapter.pull(null)
    expect(records.find((r) => r.store === 'streak')?.value).toMatchObject({ current: 12, longest: 20 })
  })

  it('keeps every practice run from both devices without duplicating any', async () => {
    const deviceA = memoryStorage()
    const deviceB = memoryStorage()
    const run = (id: string, score: number) => ({
      id,
      exerciseId: 'e-1',
      notes: [],
      timingPct: 90,
      score,
      timestamp: '2026-07-20T10:00:00.000Z',
    })

    await putOne('playRuns', run('run-a', 88))
    await syncNow(adapter, { storage: deviceA })

    // Device B was offline and recorded a different run of its own.
    const db = await getDB()
    await db.clear('playRuns')
    await putOne('playRuns', run('run-b', 71))
    await syncNow(adapter, { storage: deviceB })

    const afterB = await db.getAll('playRuns')
    expect(afterB.map((r) => r.id).sort()).toEqual(['run-a', 'run-b'])

    // Syncing repeatedly must not multiply the history.
    await syncNow(adapter, { storage: deviceA })
    await syncNow(adapter, { storage: deviceB })
    expect(await db.getAll('playRuns')).toHaveLength(2)
  })

  it('keeps an achievement earned offline on the device that never saw it', async () => {
    const deviceA = memoryStorage()
    const deviceB = memoryStorage()

    await putOne('achievements', { key: 'streak7', earnedAt: '2026-07-19T10:00:00.000Z' })
    await syncNow(adapter, { storage: deviceA })

    await putOne('achievements', { key: 'streak7', earnedAt: null })
    await syncNow(adapter, { storage: deviceB })

    await expect(getOne('achievements', 'streak7')).resolves.toMatchObject({
      earnedAt: '2026-07-19T10:00:00.000Z',
    })
  })

  it('sends unsynced offline writes once a sync finally succeeds', async () => {
    const storage = memoryStorage()
    await putOne('tunerStats', { id: 'tuner', inTuneCount: 40 })

    const offline: SyncAdapter = { ...adapter, pull: () => Promise.reject(new Error('offline')) }
    await expect(syncNow(offline, { storage })).rejects.toThrow('offline')
    await expect(syncNow(offline, { storage })).rejects.toThrow('offline')

    // Local writes keep accumulating while the connection is down.
    await putOne('tunerStats', { id: 'tuner', inTuneCount: 55 })

    const outcome = await syncNow(adapter, { storage })
    expect(outcome.pushed).toBeGreaterThan(0)
    const { records } = await adapter.pull(null)
    expect(records.find((r) => r.store === 'tunerStats')?.value).toMatchObject({ inTuneCount: 55 })
  })
})

describe('interrupted syncs', () => {
  it('leaves local data untouched when applying pulled records fails partway', async () => {
    const storage = memoryStorage()
    await putOne('streak', { id: 'current', current: 7, longest: 7, lastPracticeDate: '2026-07-20' })

    const corrupting: SyncAdapter = {
      ...adapter,
      pull: async () => ({
        records: [
          {
            store: 'streak',
            key: 'current',
            updatedAt: '2026-07-21T10:00:00.000Z',
            value: { id: 'current', current: 99, longest: 99, lastPracticeDate: '2026-07-21' },
          },
          // No key for its store, so writing this record throws mid-batch.
          {
            store: 'playRuns',
            key: 'broken',
            updatedAt: '2026-07-21T10:00:00.000Z',
            value: { nothing: 'here' },
          },
        ],
        syncedAt: '2026-07-21T10:00:00.000Z',
      }),
    }

    await expect(syncNow(corrupting, { storage })).rejects.toThrow()

    // The streak write shared the aborted transaction, so it must have rolled back.
    await expect(getOne('streak', 'current')).resolves.toMatchObject({ current: 7 })
    const db = await getDB()
    expect(await db.getAll('playRuns')).toHaveLength(0)
  })

  it('does not advance the sync cursor when a sync fails', async () => {
    const storage = memoryStorage()
    await putOne('streak', { id: 'current', current: 5, longest: 5, lastPracticeDate: '2026-07-20' })

    const failing: SyncAdapter = { ...adapter, push: () => Promise.reject(new Error('dropped')) }
    await expect(syncNow(failing, { storage })).rejects.toThrow('dropped')

    const retry = await syncNow(adapter, { storage })
    expect(retry.pushed).toBe(1)
  })
})
