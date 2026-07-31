import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getDB, getOne, putOne } from '../lib/db/db'
import { setSyncAdapter } from '../lib/sync/adapter'
import { createLocalAdapter } from '../lib/sync/localAdapter'
import { resetSyncState } from '../lib/sync/syncEngine'
import type { SyncAdapter } from '../lib/sync/types'
import { useSyncStore } from './syncStore'

function memoryStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
  }
}

const initial = useSyncStore.getState()
let adapter: SyncAdapter

beforeEach(async () => {
  const db = await getDB()
  await Promise.all([...db.objectStoreNames].map((store) => db.clear(store)))
  resetSyncState(memoryStorage())
  useSyncStore.setState({ status: 'idle', lastSyncedAt: null, enabled: false })
  adapter = createLocalAdapter({ storage: memoryStorage() })
  await adapter.signUp('a@example.com', 'longenough1')
  setSyncAdapter(adapter)
})

afterEach(() => {
  setSyncAdapter(undefined)
  useSyncStore.setState(initial)
})

describe('the sync toggle', () => {
  it('persists on a fresh install that has no settings row yet', async () => {
    expect(await getOne('settings', 'settings')).toBeUndefined()

    await useSyncStore.getState().setEnabled(true)

    await expect(getOne('settings', 'settings')).resolves.toMatchObject({ syncEnabled: true })
    expect(useSyncStore.getState().enabled).toBe(true)
  })

  it('keeps the rest of the settings intact when toggling', async () => {
    await putOne('settings', {
      id: 'settings',
      notationLabels: 'solfege',
      theme: 'dark',
      reminderOn: true,
      micDeviceId: null,
      syncEnabled: false,
      voice: 'pluckBass',
      noInstrument: true,
    })

    await useSyncStore.getState().setEnabled(true)

    await expect(getOne('settings', 'settings')).resolves.toMatchObject({
      syncEnabled: true,
      notationLabels: 'solfege',
      voice: 'pluckBass',
      noInstrument: true,
      reminderOn: true,
    })
  })

  it('stops background syncing when turned off', async () => {
    await useSyncStore.getState().setEnabled(false)
    await putOne('streak', { id: 'current', current: 3, longest: 3, lastPracticeDate: '2026-07-20' })

    const ran = await useSyncStore.getState().sync()
    expect(ran).toBe(false)

    const { records } = await adapter.pull(null)
    expect(records).toHaveLength(0)
  })

  it('resumes syncing when turned back on', async () => {
    await putOne('streak', { id: 'current', current: 3, longest: 3, lastPracticeDate: '2026-07-20' })
    await useSyncStore.getState().setEnabled(false)
    expect(await useSyncStore.getState().sync()).toBe(false)

    await useSyncStore.getState().setEnabled(true)
    expect(await useSyncStore.getState().sync()).toBe(true)

    const { records } = await adapter.pull(null)
    expect(records.some((r) => r.store === 'streak')).toBe(true)
  })
})

describe('status', () => {
  it('records the time of a successful sync', async () => {
    await useSyncStore.getState().setEnabled(true)
    await useSyncStore.getState().sync()

    const state = useSyncStore.getState()
    expect(state.status).toBe('synced')
    expect(state.lastSyncedAt).toBeTruthy()
  })

  it('reports a failure without throwing into the UI', async () => {
    await useSyncStore.getState().setEnabled(true)
    setSyncAdapter({
      ...adapter,
      pull: () => Promise.reject(new Error('server down')),
    })

    await expect(useSyncStore.getState().sync()).resolves.toBe(false)
    expect(useSyncStore.getState().status).toBe('error')
  })

  it('does not move the last-synced time when a sync fails', async () => {
    await useSyncStore.getState().setEnabled(true)
    await useSyncStore.getState().sync()
    const after = useSyncStore.getState().lastSyncedAt

    setSyncAdapter({ ...adapter, pull: () => Promise.reject(new Error('server down')) })
    await useSyncStore.getState().sync()

    expect(useSyncStore.getState().lastSyncedAt).toBe(after)
  })

  it('does not sync while signed out', async () => {
    await useSyncStore.getState().setEnabled(true)
    await adapter.signOut()

    expect(await useSyncStore.getState().sync()).toBe(false)
  })

  it('does not sync when there is no backend at all', async () => {
    await useSyncStore.getState().setEnabled(true)
    setSyncAdapter(null)

    expect(await useSyncStore.getState().sync()).toBe(false)
  })
})
