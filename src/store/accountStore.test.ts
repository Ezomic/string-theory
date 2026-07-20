import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getDB, getOne, putOne } from '../lib/db/db'
import { setSyncAdapter } from '../lib/sync/adapter'
import { createLocalAdapter } from '../lib/sync/localAdapter'
import { AuthError, type SyncAdapter } from '../lib/sync/types'
import { useAccountStore } from './accountStore'

function memoryStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
  }
}

const initial = useAccountStore.getState()

beforeEach(async () => {
  const db = await getDB()
  await Promise.all([...db.objectStoreNames].map((store) => db.clear(store)))
  useAccountStore.setState({ session: null, status: 'idle', error: null, hydrated: false, available: false })
  setSyncAdapter(createLocalAdapter({ storage: memoryStorage() }))
})

afterEach(() => {
  setSyncAdapter(undefined)
  useAccountStore.setState(initial)
})

async function seedGuest() {
  await putOne('profile', {
    id: 'local-guest',
    name: 'Robbin',
    isGuest: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    plan: 'free',
  })
}

describe('signUp', () => {
  it('links the local profile to the account without changing its id', async () => {
    await seedGuest()
    const ok = await useAccountStore.getState().signUp('a@example.com', 'longenough1')

    expect(ok).toBe(true)
    const profile = await getOne('profile', 'local-guest')
    expect(profile).toMatchObject({
      id: 'local-guest',
      name: 'Robbin',
      email: 'a@example.com',
      isGuest: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    expect(profile?.accountId).toBeTruthy()
  })

  it('creates a profile when signing up before any guest profile exists', async () => {
    await useAccountStore.getState().signUp('a@example.com', 'longenough1')
    await expect(getOne('profile', 'local-guest')).resolves.toMatchObject({ isGuest: false })
  })

  it('surfaces a duplicate email as an inline error, not a rejection', async () => {
    await useAccountStore.getState().signUp('a@example.com', 'longenough1')
    await useAccountStore.getState().signOut()

    const ok = await useAccountStore.getState().signUp('a@example.com', 'longenough1')
    expect(ok).toBe(false)
    expect(useAccountStore.getState().error).toMatch(/already has an account/i)
    expect(useAccountStore.getState().status).toBe('idle')
  })

  it('leaves the profile a guest when sign-up fails', async () => {
    await seedGuest()
    await useAccountStore.getState().signUp('not-an-email', 'longenough1')
    await expect(getOne('profile', 'local-guest')).resolves.toMatchObject({ isGuest: true })
  })
})

describe('signIn', () => {
  it('reports a wrong password inline', async () => {
    await useAccountStore.getState().signUp('a@example.com', 'longenough1')
    await useAccountStore.getState().signOut()

    const ok = await useAccountStore.getState().signIn('a@example.com', 'wrongpassword')
    expect(ok).toBe(false)
    expect(useAccountStore.getState().error).toMatch(/do not match/i)
  })

  it('clears a previous error on the next attempt', async () => {
    await useAccountStore.getState().signIn('a@example.com', 'wrongpassword')
    expect(useAccountStore.getState().error).toBeTruthy()

    await useAccountStore.getState().signUp('a@example.com', 'longenough1')
    expect(useAccountStore.getState().error).toBeNull()
  })

  it('turns an unexpected transport failure into a readable message', async () => {
    setSyncAdapter({
      signIn: () => Promise.reject(new Error('network down')),
    } as unknown as SyncAdapter)

    const ok = await useAccountStore.getState().signIn('a@example.com', 'longenough1')
    expect(ok).toBe(false)
    expect(useAccountStore.getState().error).toMatch(/check your connection/i)
  })
})

describe('hydrate', () => {
  it('restores the session after a restart', async () => {
    const storage = memoryStorage()
    setSyncAdapter(createLocalAdapter({ storage }))
    await useAccountStore.getState().signUp('a@example.com', 'longenough1')

    useAccountStore.setState({ session: null, hydrated: false })
    setSyncAdapter(createLocalAdapter({ storage }))
    await useAccountStore.getState().hydrate()

    expect(useAccountStore.getState().session?.email).toBe('a@example.com')
    expect(useAccountStore.getState().hydrated).toBe(true)
  })

  it('reports no session and no accounts when there is no backend', async () => {
    setSyncAdapter(null)
    await useAccountStore.getState().hydrate()

    const state = useAccountStore.getState()
    expect(state.session).toBeNull()
    expect(state.available).toBe(false)
    expect(state.hydrated).toBe(true)
  })
})

describe('signOut', () => {
  it('returns the profile to guest and keeps its progress-bearing fields', async () => {
    await seedGuest()
    await useAccountStore.getState().signUp('a@example.com', 'longenough1')
    await useAccountStore.getState().signOut()

    const profile = await getOne('profile', 'local-guest')
    expect(profile).toMatchObject({ id: 'local-guest', name: 'Robbin', isGuest: true })
    expect(profile?.email).toBeUndefined()
    expect(profile?.accountId).toBeUndefined()
    expect(useAccountStore.getState().session).toBeNull()
  })

  it('is safe with no profile and no backend', async () => {
    setSyncAdapter(null)
    await expect(useAccountStore.getState().signOut()).resolves.toBeUndefined()
  })
})

describe('without a backend', () => {
  it('refuses to sign up and says so', async () => {
    setSyncAdapter(null)
    const ok = await useAccountStore.getState().signUp('a@example.com', 'longenough1')

    expect(ok).toBe(false)
    expect(useAccountStore.getState().error).toMatch(/not available/i)
  })

  it('does not touch the profile', async () => {
    setSyncAdapter(null)
    await seedGuest()
    await useAccountStore.getState().signUp('a@example.com', 'longenough1')
    await expect(getOne('profile', 'local-guest')).resolves.toMatchObject({ isGuest: true })
  })
})

describe('AuthError', () => {
  it('carries a code the form can branch on', () => {
    const error = new AuthError('email_taken', 'taken')
    expect(error).toBeInstanceOf(Error)
    expect(error.code).toBe('email_taken')
  })
})
