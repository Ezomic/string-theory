import { create } from 'zustand'
import { getOne, putOne } from '../lib/db/db'
import type { UserProfile } from '../lib/db/types'
import { accountsAvailable, getSyncAdapter } from '../lib/sync/adapter'
import { migrateGuestData } from '../lib/sync/migrateGuestData'
import { AuthError, type AuthSession } from '../lib/sync/types'

const LOCAL_USER_ID = 'local-guest'

export type AccountStatus = 'idle' | 'working'

interface AccountState {
  session: AuthSession | null
  status: AccountStatus
  /** Message for the sign-up form to render inline; cleared on the next attempt. */
  error: string | null
  hydrated: boolean
  available: boolean
  hydrate: () => Promise<void>
  signUp: (email: string, password: string) => Promise<boolean>
  signIn: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  clearError: () => void
}

const NO_BACKEND = 'Accounts are not available in this build yet'

/**
 * Points the local profile at the signed-in account. The row keeps its
 * `local-guest` id on purpose: several screens read the profile by that key,
 * and records elsewhere reference it as their owner.
 */
async function linkProfile(session: AuthSession): Promise<void> {
  const existing = await getOne('profile', LOCAL_USER_ID)
  const base: UserProfile = existing ?? {
    id: LOCAL_USER_ID,
    name: 'Guest',
    isGuest: true,
    createdAt: new Date().toISOString(),
    plan: 'free',
  }
  await putOne('profile', {
    ...base,
    email: session.email,
    isGuest: false,
    accountId: session.userId,
  })
}

async function unlinkProfile(): Promise<void> {
  const existing = await getOne('profile', LOCAL_USER_ID)
  if (!existing) return
  const { email: _email, accountId: _accountId, ...rest } = existing
  await putOne('profile', { ...rest, isGuest: true })
}

function messageFor(error: unknown): string {
  if (error instanceof AuthError) return error.message
  return 'Something went wrong. Check your connection and try again.'
}

export const useAccountStore = create<AccountState>((set) => {
  async function authenticate(
    method: 'signUp' | 'signIn',
    email: string,
    password: string,
  ): Promise<boolean> {
    const adapter = getSyncAdapter()
    if (!adapter) {
      set({ error: NO_BACKEND })
      return false
    }

    set({ status: 'working', error: null })
    try {
      const session = await adapter[method](email, password)
      await linkProfile(session)
      // A failed upload must not cost someone the account they just created:
      // the progress marker makes the migration resumable on the next sync.
      await migrateGuestData(adapter, session).catch(() => undefined)
      set({ session, status: 'idle', error: null })
      return true
    } catch (error) {
      set({ status: 'idle', error: messageFor(error) })
      return false
    }
  }

  return {
    session: null,
    status: 'idle',
    error: null,
    hydrated: false,
    available: false,

    hydrate: async () => {
      const adapter = getSyncAdapter()
      if (!adapter) {
        set({ session: null, hydrated: true, available: false })
        return
      }
      const session = await adapter.currentSession().catch(() => null)
      set({ session, hydrated: true, available: accountsAvailable() })
    },

    signUp: (email, password) => authenticate('signUp', email, password),
    signIn: (email, password) => authenticate('signIn', email, password),

    signOut: async () => {
      const adapter = getSyncAdapter()
      if (adapter) await adapter.signOut()
      await unlinkProfile()
      set({ session: null, error: null })
    },

    clearError: () => set({ error: null }),
  }
})
