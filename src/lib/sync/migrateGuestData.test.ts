import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDB, putOne } from '../db/db'
import { createLocalAdapter } from './localAdapter'
import { migrateGuestData, readMigrationProgress } from './migrateGuestData'
import type { AuthSession, SyncAdapter } from './types'

function memoryStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
  }
}

let adapter: SyncAdapter
let session: AuthSession
let storage: Pick<Storage, 'getItem' | 'setItem'>

beforeEach(async () => {
  const db = await getDB()
  await Promise.all([...db.objectStoreNames].map((store) => db.clear(store)))
  storage = memoryStorage()
  adapter = createLocalAdapter({ storage: memoryStorage() })
  session = await adapter.signUp('a@example.com', 'longenough1')
})

async function seedGuestProgress() {
  await putOne('profile', {
    id: 'local-guest',
    name: 'Robbin',
    isGuest: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    plan: 'free',
  })
  await putOne('streak', { id: 'current', current: 12, longest: 20, lastPracticeDate: '2026-07-19' })
  await putOne('lessonProgress', {
    lessonId: 'l-1',
    status: 'done',
    score: 90,
    notesCleanPct: 80,
    completedAt: '2026-07-18T10:00:00.000Z',
  })
  await putOne('playRuns', {
    id: 'run-1',
    exerciseId: 'e-1',
    notes: [],
    timingPct: 90,
    score: 88,
    timestamp: '2026-07-18T10:00:00.000Z',
  })
}

describe('migrateGuestData', () => {
  it('uploads the guest streak and lessons so they survive the sign-up', async () => {
    await seedGuestProgress()
    const result = await migrateGuestData(adapter, session, { storage })

    expect(result.outcome).toBe('migrated')
    const { records } = await adapter.pull(null)
    const streak = records.find((r) => r.store === 'streak')
    expect(streak?.value).toMatchObject({ current: 12, longest: 20 })
    expect(records.find((r) => r.store === 'lessonProgress')?.value).toMatchObject({ lessonId: 'l-1' })
    expect(records.find((r) => r.store === 'playRuns')?.value).toMatchObject({ id: 'run-1' })
  })

  it('never uploads static lesson content', async () => {
    await putOne('units', { id: 'u-1', title: 'Unit 1', order: 1, level: 1 })
    await seedGuestProgress()
    await migrateGuestData(adapter, session, { storage })

    const { records } = await adapter.pull(null)
    const uploaded: string[] = records.map((r) => r.store)
    expect(uploaded).not.toContain('units')
    expect(uploaded).not.toContain('lessons')
    expect(uploaded.length).toBeGreaterThan(0)
  })

  it('does not duplicate data when run a second time', async () => {
    await seedGuestProgress()
    await migrateGuestData(adapter, session, { storage })
    const first = await adapter.pull(null)

    const second = await migrateGuestData(adapter, session, { storage })
    expect(second.outcome).toBe('already-done')

    const after = await adapter.pull(null)
    expect(after.records).toHaveLength(first.records.length)
  })

  it('leaves local data untouched', async () => {
    await seedGuestProgress()
    await migrateGuestData(adapter, session, { storage })

    const db = await getDB()
    await expect(db.get('streak', 'current')).resolves.toMatchObject({ current: 12 })
    await expect(db.get('profile', 'local-guest')).resolves.toMatchObject({ name: 'Robbin' })
  })

  it('takes a local backup before uploading anything', async () => {
    await seedGuestProgress()
    await migrateGuestData(adapter, session, { storage })

    const backup = JSON.parse(storage.getItem('string-theory-migration-backup') ?? 'null')
    expect(backup.data.streak).toHaveLength(1)
    expect(backup.data.profile).toHaveLength(1)
  })

  it('still signs the user up when the backup cannot be written', async () => {
    await seedGuestProgress()
    const refusing = {
      getItem: storage.getItem,
      setItem: vi.fn((key: string, value: string) => {
        if (key.includes('backup')) throw new Error('QuotaExceededError')
        storage.setItem(key, value)
      }),
    }

    await expect(migrateGuestData(adapter, session, { storage: refusing })).resolves.toMatchObject({
      outcome: 'migrated',
    })
  })

  it('reports nothing to migrate for a brand new install', async () => {
    const result = await migrateGuestData(adapter, session, { storage })
    expect(result.outcome).toBe('nothing-to-migrate')
  })
})

describe('interrupted migrations', () => {
  it('resumes from where it stopped rather than restarting', async () => {
    await seedGuestProgress()

    let pushes = 0
    const failing: SyncAdapter = {
      ...adapter,
      push: async (records) => {
        pushes += 1
        if (pushes === 2) throw new Error('connection lost')
        return adapter.push(records)
      },
    }

    await expect(migrateGuestData(failing, session, { storage })).rejects.toThrow('connection lost')

    const halfway = readMigrationProgress(storage)
    expect(halfway?.completedAt).toBeNull()
    expect(halfway!.completedStores.length).toBeGreaterThan(0)

    const resumed = await migrateGuestData(adapter, session, { storage })
    expect(resumed.outcome).toBe('resumed')
    expect(readMigrationProgress(storage)?.completedAt).not.toBeNull()
  })

  it('does not re-upload stores that already completed', async () => {
    await seedGuestProgress()

    let pushes = 0
    const failing: SyncAdapter = {
      ...adapter,
      push: async (records) => {
        pushes += 1
        if (pushes === 3) throw new Error('connection lost')
        return adapter.push(records)
      },
    }
    await expect(migrateGuestData(failing, session, { storage })).rejects.toThrow()
    const completedBefore = readMigrationProgress(storage)!.completedStores

    const pushed: string[] = []
    const counting: SyncAdapter = {
      ...adapter,
      push: async (records) => {
        pushed.push(...records.map((r) => r.store))
        return adapter.push(records)
      },
    }
    await migrateGuestData(counting, session, { storage })

    for (const store of completedBefore) {
      expect(pushed).not.toContain(store)
    }
  })

  it('starts fresh for a different account', async () => {
    await seedGuestProgress()
    await migrateGuestData(adapter, session, { storage })

    const other: AuthSession = { userId: 'other-user', email: 'b@example.com', token: 't' }
    const result = await migrateGuestData(adapter, other, { storage })
    expect(result.outcome).toBe('migrated')
    expect(readMigrationProgress(storage)?.accountId).toBe('other-user')
  })
})
