import { beforeEach, describe, expect, it } from 'vitest'
import { createLocalAdapter } from './localAdapter'
import { AuthError, type SyncAdapter, type SyncRecord } from './types'

function memoryStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
  }
}

let adapter: SyncAdapter

beforeEach(() => {
  adapter = createLocalAdapter({ storage: memoryStorage() })
})

function record(overrides: Partial<SyncRecord> = {}): SyncRecord {
  return {
    store: 'streak',
    key: 'current',
    updatedAt: '2026-07-01T10:00:00.000Z',
    value: { id: 'current', current: 3, longest: 5, lastPracticeDate: '2026-07-01' },
    ...overrides,
  }
}

describe('auth', () => {
  it('signs up and reports the session as current', async () => {
    const session = await adapter.signUp('Robbin@Example.com ', 'longenough1')
    expect(session.email).toBe('robbin@example.com')
    await expect(adapter.currentSession()).resolves.toEqual(session)
  })

  it('rejects a duplicate email with a renderable code', async () => {
    await adapter.signUp('a@example.com', 'longenough1')
    await adapter.signOut()
    await expect(adapter.signUp('a@example.com', 'longenough1')).rejects.toMatchObject({
      name: 'AuthError',
      code: 'email_taken',
    })
  })

  it('rejects a wrong password without revealing whether the email exists', async () => {
    await adapter.signUp('a@example.com', 'longenough1')
    await expect(adapter.signIn('a@example.com', 'wrongpassword')).rejects.toBeInstanceOf(AuthError)
    await expect(adapter.signIn('nobody@example.com', 'longenough1')).rejects.toMatchObject({
      code: 'invalid_credentials',
    })
  })

  it('rejects a short password', async () => {
    await expect(adapter.signUp('a@example.com', 'short')).rejects.toMatchObject({ code: 'weak_password' })
  })

  it('clears the session on sign out and restores it on sign in', async () => {
    await adapter.signUp('a@example.com', 'longenough1')
    await adapter.signOut()
    await expect(adapter.currentSession()).resolves.toBeNull()
    await adapter.signIn('a@example.com', 'longenough1')
    await expect(adapter.currentSession()).resolves.not.toBeNull()
  })

  it('keeps the session across a restart, given the same storage', async () => {
    const storage = memoryStorage()
    const first = createLocalAdapter({ storage })
    const session = await first.signUp('a@example.com', 'longenough1')

    const reopened = createLocalAdapter({ storage })
    await expect(reopened.currentSession()).resolves.toEqual(session)
  })
})

describe('pull and push', () => {
  beforeEach(async () => {
    await adapter.signUp('a@example.com', 'longenough1')
  })

  it('round-trips a pushed record', async () => {
    await adapter.push([record()])
    const { records } = await adapter.pull(null)
    expect(records).toEqual([record()])
  })

  it('returns only records changed after the cursor', async () => {
    await adapter.push([
      record({ store: 'settings', key: 'settings', updatedAt: '2026-07-01T10:00:00.000Z' }),
      record({ store: 'tunerStats', key: 'tuner', updatedAt: '2026-07-05T10:00:00.000Z' }),
    ])
    const { records } = await adapter.pull('2026-07-03T00:00:00.000Z')
    expect(records.map((r) => r.store)).toEqual(['tunerStats'])
  })

  it('rejects a push that is older than what it already holds', async () => {
    await adapter.push([record({ updatedAt: '2026-07-05T10:00:00.000Z' })])
    const { rejected } = await adapter.push([record({ updatedAt: '2026-07-01T10:00:00.000Z' })])

    expect(rejected).toHaveLength(1)
    expect(rejected[0].updatedAt).toBe('2026-07-05T10:00:00.000Z')

    const { records } = await adapter.pull(null)
    expect(records[0].updatedAt).toBe('2026-07-05T10:00:00.000Z')
  })

  it('overwrites in place rather than duplicating a re-pushed key', async () => {
    await adapter.push([record({ updatedAt: '2026-07-01T10:00:00.000Z' })])
    await adapter.push([record({ updatedAt: '2026-07-02T10:00:00.000Z' })])
    const { records } = await adapter.pull(null)
    expect(records).toHaveLength(1)
  })

  it('carries a deletion across as a null value', async () => {
    await adapter.push([record({ value: null, updatedAt: '2026-07-02T10:00:00.000Z' })])
    const { records } = await adapter.pull(null)
    expect(records[0].value).toBeNull()
  })

  it('stamps syncedAt from the injected clock', async () => {
    const clocked = createLocalAdapter({
      storage: memoryStorage(),
      now: () => new Date('2026-07-20T09:00:00.000Z'),
    })
    await clocked.signUp('a@example.com', 'longenough1')
    await expect(clocked.pull(null)).resolves.toMatchObject({ syncedAt: '2026-07-20T09:00:00.000Z' })
  })
})

describe('account isolation', () => {
  it('never returns another account\'s records', async () => {
    const storage = memoryStorage()
    const shared = createLocalAdapter({ storage })

    await shared.signUp('first@example.com', 'longenough1')
    await shared.push([record({ value: { id: 'current', current: 99, longest: 99, lastPracticeDate: '2026-07-01' } })])
    await shared.signOut()

    await shared.signUp('second@example.com', 'longenough1')
    await expect(shared.pull(null)).resolves.toMatchObject({ records: [] })
  })

  it('does not let one account overwrite another\'s record of the same key', async () => {
    const storage = memoryStorage()
    const shared = createLocalAdapter({ storage })

    await shared.signUp('first@example.com', 'longenough1')
    await shared.push([record({ updatedAt: '2026-07-01T10:00:00.000Z' })])
    await shared.signOut()

    await shared.signUp('second@example.com', 'longenough1')
    await shared.push([record({ updatedAt: '2026-07-09T10:00:00.000Z' })])
    await shared.signOut()

    await shared.signIn('first@example.com', 'longenough1')
    const { records } = await shared.pull(null)
    expect(records).toHaveLength(1)
    expect(records[0].updatedAt).toBe('2026-07-01T10:00:00.000Z')
  })

  it('refuses to sync at all when signed out', async () => {
    await expect(adapter.pull(null)).rejects.toBeInstanceOf(AuthError)
    await expect(adapter.push([record()])).rejects.toBeInstanceOf(AuthError)
  })
})
