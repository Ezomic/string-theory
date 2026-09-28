import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDB, getOne, putOne } from '../db/db'
import { createLocalAdapter } from './localAdapter'
import { readSyncState, syncNow } from './syncEngine'
import type { SyncAdapter } from './types'

function memoryStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
  }
}

/** Two devices sharing one account: same backing store, separate sync cursors. */
function deviceFor(backend: Pick<Storage, 'getItem' | 'setItem'>) {
  return { adapter: createLocalAdapter({ storage: backend }), storage: memoryStorage() }
}

let backend: Pick<Storage, 'getItem' | 'setItem'>
let adapter: SyncAdapter
let storage: Pick<Storage, 'getItem' | 'setItem'>

beforeEach(async () => {
  const db = await getDB()
  await Promise.all([...db.objectStoreNames].map((store) => db.clear(store)))
  backend = memoryStorage()
  storage = memoryStorage()
  adapter = createLocalAdapter({ storage: backend })
  await adapter.signUp('a@example.com', 'longenough1')
})

describe('pushing local changes', () => {
  it('sends local records to the backend', async () => {
    await putOne('streak', { id: 'current', current: 4, longest: 6, lastPracticeDate: '2026-07-20' })
    const outcome = await syncNow(adapter, { storage })

    expect(outcome.pushed).toBeGreaterThan(0)
    const { records } = await adapter.pull(null)
    expect(records.find((r) => r.store === 'streak')?.value).toMatchObject({ current: 4 })
  })

  it('does not re-send unchanged records on the next sync', async () => {
    await putOne('streak', { id: 'current', current: 4, longest: 6, lastPracticeDate: '2026-07-20' })
    await syncNow(adapter, { storage })

    const second = await syncNow(adapter, { storage })
    expect(second.pushed).toBe(0)
  })

  it('sends only what changed since the last sync', async () => {
    await putOne('streak', { id: 'current', current: 4, longest: 6, lastPracticeDate: '2026-07-20' })
    await syncNow(adapter, { storage })

    await putOne('tunerStats', { id: 'tuner', inTuneCount: 3 })
    const second = await syncNow(adapter, { storage })
    expect(second.pushed).toBe(1)
  })

  it('records a per-store cursor so stores advance independently', async () => {
    await putOne('streak', { id: 'current', current: 1, longest: 1, lastPracticeDate: '2026-07-20' })
    await syncNow(adapter, { storage })

    const state = readSyncState(storage)
    expect(state.pushedAt.streak).toBeTruthy()
    expect(state.pushedAt.tunerStats).toBeUndefined()
  })

  it('uploads legacy records written before timestamps existed', async () => {
    const db = await getDB()
    await db.put('streak', { id: 'current', current: 2, longest: 2, lastPracticeDate: '2026-07-01' })

    const outcome = await syncNow(adapter, { storage })
    expect(outcome.pushed).toBe(1)
  })

  it('backfills a legacy record so it is not re-sent on every sync forever', async () => {
    const db = await getDB()
    await db.put('streak', { id: 'current', current: 2, longest: 2, lastPracticeDate: '2026-07-01' })

    await syncNow(adapter, { storage })
    await expect(getOne('streak', 'current')).resolves.toHaveProperty('updatedAt')

    const second = await syncNow(adapter, { storage })
    expect(second.pushed).toBe(0)

    const third = await syncNow(adapter, { storage })
    expect(third.pushed).toBe(0)
  })
})

describe('pulling remote changes', () => {
  it('applies a record from another device', async () => {
    const other = deviceFor(backend)
    await other.adapter.signIn('a@example.com', 'longenough1')
    await other.adapter.push([
      {
        store: 'streak',
        key: 'current',
        updatedAt: '2026-07-21T10:00:00.000Z',
        value: { id: 'current', current: 9, longest: 9, lastPracticeDate: '2026-07-21' },
      },
    ])

    const outcome = await syncNow(adapter, { storage })
    expect(outcome.applied).toBe(1)
    await expect(getOne('streak', 'current')).resolves.toMatchObject({ current: 9 })
  })

  it('does not overwrite a newer local record with an older remote one', async () => {
    await putOne('streak', { id: 'current', current: 15, longest: 15, lastPracticeDate: '2026-07-22' })
    await adapter.push([
      {
        store: 'streak',
        key: 'current',
        updatedAt: '2020-01-01T00:00:00.000Z',
        value: { id: 'current', current: 1, longest: 1, lastPracticeDate: '2020-01-01' },
      },
    ])

    await syncNow(adapter, { storage })
    await expect(getOne('streak', 'current')).resolves.toMatchObject({ current: 15 })
  })

  it('does not bounce a pulled record straight back on the next push', async () => {
    const other = deviceFor(backend)
    await other.adapter.signIn('a@example.com', 'longenough1')
    await other.adapter.push([
      {
        store: 'tunerStats',
        key: 'tuner',
        updatedAt: '2026-07-21T10:00:00.000Z',
        value: { id: 'tuner', inTuneCount: 50, updatedAt: '2026-07-21T10:00:00.000Z' },
      },
    ])

    await syncNow(adapter, { storage })
    const second = await syncNow(adapter, { storage })
    expect(second.pushed).toBe(0)
  })

  it('advances the pull cursor so the same records are not fetched twice', async () => {
    await putOne('streak', { id: 'current', current: 3, longest: 3, lastPracticeDate: '2026-07-20' })
    await syncNow(adapter, { storage })
    expect(readSyncState(storage).pulledAt).toBeTruthy()

    const second = await syncNow(adapter, { storage })
    expect(second.pulled).toBe(0)
  })
})

describe('two devices', () => {
  it('carries practice from one device to the other', async () => {
    // Device A practises and syncs.
    await putOne('practiceSessions', { date: '2026-07-20', minutes: 25, activities: ['lesson'] })
    await syncNow(adapter, { storage })

    // Device B starts empty, then syncs the same account.
    const db = await getDB()
    await db.clear('practiceSessions')
    const deviceB = deviceFor(backend)
    await deviceB.adapter.signIn('a@example.com', 'longenough1')

    const outcome = await syncNow(deviceB.adapter, { storage: deviceB.storage })
    expect(outcome.applied).toBe(1)
    await expect(getOne('practiceSessions', '2026-07-20')).resolves.toMatchObject({ minutes: 25 })
  })

  it('does not duplicate records that both devices already have', async () => {
    await putOne('playRuns', {
      id: 'run-1',
      exerciseId: 'e-1',
      notes: [],
      timingPct: 90,
      score: 88,
      timestamp: '2026-07-20T10:00:00.000Z',
    })
    await syncNow(adapter, { storage })

    const deviceB = deviceFor(backend)
    await deviceB.adapter.signIn('a@example.com', 'longenough1')
    await syncNow(deviceB.adapter, { storage: deviceB.storage })

    const db = await getDB()
    expect(await db.getAll('playRuns')).toHaveLength(1)
  })
})

describe('failures', () => {
  it('leaves the cursor untouched when the push fails, so nothing is skipped', async () => {
    await putOne('streak', { id: 'current', current: 4, longest: 4, lastPracticeDate: '2026-07-20' })

    const failing: SyncAdapter = { ...adapter, push: () => Promise.reject(new Error('offline')) }
    await expect(syncNow(failing, { storage })).rejects.toThrow('offline')
    expect(readSyncState(storage).pushedAt.streak).toBeUndefined()

    const retry = await syncNow(adapter, { storage })
    expect(retry.pushed).toBe(1)
  })

  it('surfaces a pull failure rather than silently reporting success', async () => {
    const failing: SyncAdapter = { ...adapter, pull: () => Promise.reject(new Error('offline')) }
    await expect(syncNow(failing, { storage })).rejects.toThrow('offline')
  })
})
