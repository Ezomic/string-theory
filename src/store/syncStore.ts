import { create } from 'zustand'
import { getOne, onLocalWrite, putOne } from '../lib/db/db'
import { getSyncAdapter } from '../lib/sync/adapter'
import { syncNow, readSyncState } from '../lib/sync/syncEngine'
import { DEFAULT_SETTINGS } from './audioSettingsStore'

/** How long to wait after a local change before syncing, so a burst of writes costs one sync. */
const DEBOUNCE_MS = 3000

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error'

interface SyncStoreState {
  status: SyncStatus
  lastSyncedAt: string | null
  enabled: boolean
  hydrate: () => Promise<void>
  setEnabled: (enabled: boolean) => Promise<void>
  /** Runs a sync now, regardless of debounce. Returns false if it could not run. */
  sync: () => Promise<boolean>
  /** Asks for a sync soon, collapsing repeated calls into one. */
  requestSync: () => void
  registerTriggers: () => () => void
}

async function syncEnabledSetting(): Promise<boolean> {
  const settings = await getOne('settings', 'settings')
  return settings?.syncEnabled ?? false
}

export const useSyncStore = create<SyncStoreState>((set, get) => {
  let timer: ReturnType<typeof setTimeout> | null = null
  let inFlight: Promise<boolean> | null = null

  async function runSync(): Promise<boolean> {
    const adapter = getSyncAdapter()
    if (!adapter) return false
    if (!(await syncEnabledSetting())) return false
    if (!(await adapter.currentSession())) return false

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      set({ status: 'offline' })
      return false
    }

    set({ status: 'syncing' })
    try {
      const outcome = await syncNow(adapter)
      set({ status: 'synced', lastSyncedAt: outcome.syncedAt })
      return true
    } catch {
      // A sync failure must never interrupt practice, so it only marks status.
      set({ status: 'error' })
      return false
    }
  }

  return {
    status: 'idle',
    lastSyncedAt: null,
    enabled: false,

    hydrate: async () => {
      set({ enabled: await syncEnabledSetting(), lastSyncedAt: readSyncState().pulledAt })
    },

    setEnabled: async (enabled) => {
      // A fresh install has no settings row yet, so writing only when one
      // exists would leave the toggle looking on while nothing was persisted.
      const settings = (await getOne('settings', 'settings')) ?? DEFAULT_SETTINGS
      await putOne('settings', { ...settings, syncEnabled: enabled })
      set({ enabled })
      // Awaited rather than fired off, so "turned it on" and "has synced" are
      // not two racing states. The UI never blocks on this: status shows
      // 'syncing' meanwhile and the toggle has already flipped.
      if (enabled) await get().sync()
    },

    sync: () => {
      // Collapse concurrent calls so a focus event during a sync cannot start a second one.
      inFlight ??= runSync().finally(() => {
        inFlight = null
      })
      return inFlight
    },

    requestSync: () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        void get().sync()
      }, DEBOUNCE_MS)
    },

    registerTriggers: () => {
      const unsubscribeWrite = onLocalWrite(() => get().requestSync())

      const onFocus = () => void get().sync()
      const onVisible = () => {
        if (document.visibilityState === 'visible') void get().sync()
      }
      const onOnline = () => void get().sync()

      window.addEventListener('focus', onFocus)
      document.addEventListener('visibilitychange', onVisible)
      window.addEventListener('online', onOnline)

      void get().sync()

      return () => {
        unsubscribeWrite()
        window.removeEventListener('focus', onFocus)
        document.removeEventListener('visibilitychange', onVisible)
        window.removeEventListener('online', onOnline)
        if (timer) clearTimeout(timer)
      }
    },
  }
})
