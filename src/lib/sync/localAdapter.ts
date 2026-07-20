import { AuthError, type AuthSession, type PullResult, type PushResult, type SyncAdapter, type SyncRecord } from './types'

/**
 * A stand-in backend that keeps accounts and records in this browser, so the
 * sync engine, migration and settings UI can be built and tested before a
 * hosted backend is chosen (ST-93 is still open on that choice).
 *
 * This is NOT authentication. Passwords are held in plain text and every
 * account is readable by anyone with devtools open. It exists to exercise the
 * `SyncAdapter` seam, and the guard below makes shipping it a build-time
 * failure rather than a silent security hole.
 */
const STORAGE_KEY = 'string-theory-local-adapter'
const MIN_PASSWORD_LENGTH = 8

interface LocalAccount {
  userId: string
  email: string
  password: string
}

interface LocalState {
  accounts: LocalAccount[]
  session: AuthSession | null
  records: (SyncRecord & { userId: string })[]
}

const emptyState: LocalState = { accounts: [], session: null, records: [] }

export interface LocalAdapterOptions {
  /** Injectable so tests can drive the clock that stamps `syncedAt`. */
  now?: () => Date
  storage?: Pick<Storage, 'getItem' | 'setItem'>
}

export function createLocalAdapter(options: LocalAdapterOptions = {}): SyncAdapter {
  if (import.meta.env.PROD) {
    throw new Error('createLocalAdapter is a development stand-in and must not run in a production build')
  }

  const now = options.now ?? (() => new Date())
  const storage = options.storage ?? globalThis.localStorage

  function read(): LocalState {
    const raw = storage?.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(emptyState)
    try {
      return JSON.parse(raw) as LocalState
    } catch {
      return structuredClone(emptyState)
    }
  }

  function write(state: LocalState): void {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state))
  }

  function requireSession(state: LocalState): AuthSession {
    if (!state.session) throw new AuthError('invalid_credentials', 'Not signed in')
    return state.session
  }

  function sessionFor(account: LocalAccount): AuthSession {
    return { userId: account.userId, email: account.email, token: `local-${account.userId}` }
  }

  return {
    async signUp(email, password) {
      const state = read()
      const normalised = email.trim().toLowerCase()
      if (!normalised.includes('@')) {
        throw new AuthError('invalid_email', 'Enter a valid email address')
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        throw new AuthError('weak_password', `Use at least ${MIN_PASSWORD_LENGTH} characters`)
      }
      if (state.accounts.some((a) => a.email === normalised)) {
        throw new AuthError('email_taken', 'That email already has an account')
      }
      const account: LocalAccount = {
        userId: crypto.randomUUID(),
        email: normalised,
        password,
      }
      state.accounts.push(account)
      state.session = sessionFor(account)
      write(state)
      return state.session
    },

    async signIn(email, password) {
      const state = read()
      const normalised = email.trim().toLowerCase()
      const account = state.accounts.find((a) => a.email === normalised && a.password === password)
      if (!account) {
        throw new AuthError('invalid_credentials', 'That email and password do not match')
      }
      state.session = sessionFor(account)
      write(state)
      return state.session
    },

    async signOut() {
      const state = read()
      state.session = null
      write(state)
    },

    async currentSession() {
      return read().session
    },

    async pull(since): Promise<PullResult> {
      const state = read()
      const session = requireSession(state)
      const records = state.records
        .filter((r) => r.userId === session.userId)
        .filter((r) => since === null || r.updatedAt > since)
        .map(({ userId: _userId, ...record }) => record)
      return { records, syncedAt: now().toISOString() }
    },

    async push(records): Promise<PushResult> {
      const state = read()
      const session = requireSession(state)
      const rejected: SyncRecord[] = []

      for (const record of records) {
        const index = state.records.findIndex(
          (r) => r.userId === session.userId && r.store === record.store && r.key === record.key,
        )
        const existing = index === -1 ? null : state.records[index]
        if (existing && existing.updatedAt >= record.updatedAt) {
          const { userId: _userId, ...bare } = existing
          rejected.push(bare)
          continue
        }
        const stored = { ...record, userId: session.userId }
        if (index === -1) state.records.push(stored)
        else state.records[index] = stored
      }

      write(state)
      return { rejected, syncedAt: now().toISOString() }
    },
  }
}
