import { getAll, getOne, putFromRemote } from '../db/db'
import { SYNCED_STORE_NAMES, keyOf, type SyncedStoreName } from './stores'
import type { SyncAdapter, SyncRecord } from './types'

const STATE_KEY = 'string-theory-sync-state'

export interface SyncState {
  /** Cursor for the next pull. Global, because a pull returns every store at once. */
  pulledAt: string | null
  /** Per store, so an unchanged store is never re-sent. */
  pushedAt: Partial<Record<SyncedStoreName, string>>
}

export interface SyncOutcome {
  pulled: number
  applied: number
  pushed: number
  syncedAt: string
}

export interface SyncOptions {
  storage?: Pick<Storage, 'getItem' | 'setItem'>
}

const emptyState: SyncState = { pulledAt: null, pushedAt: {} }

export function readSyncState(
  storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage,
): SyncState {
  const raw = storage?.getItem(STATE_KEY)
  if (!raw) return structuredClone(emptyState)
  try {
    return { ...structuredClone(emptyState), ...(JSON.parse(raw) as SyncState) }
  } catch {
    return structuredClone(emptyState)
  }
}

function writeSyncState(storage: Pick<Storage, 'setItem'> | undefined, state: SyncState): void {
  storage?.setItem(STATE_KEY, JSON.stringify(state))
}

export function resetSyncState(
  storage: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage,
): void {
  writeSyncState(storage, structuredClone(emptyState))
}

/**
 * Writes a pulled record when it is genuinely newer than the local copy.
 *
 * This is a plain newest-wins comparison. ST-97 replaces it with per-store
 * merge policies, because newest-wins can let a stale device roll back a
 * streak, which is exactly what that ticket is about.
 */
async function applyRemote(record: SyncRecord): Promise<boolean> {
  if (record.value === null) return false

  const local = (await getOne(record.store, record.key)) as { updatedAt?: string } | undefined
  if (local?.updatedAt && record.updatedAt <= local.updatedAt) return false

  await putFromRemote(record.store, record.value as never)
  return true
}

async function localChangesSince(
  store: SyncedStoreName,
  since: string | undefined,
): Promise<SyncRecord[]> {
  const rows = (await getAll(store)) as unknown as Record<string, unknown>[]
  const changed = rows.filter((row) => {
    const updatedAt = row.updatedAt
    if (typeof updatedAt !== 'string') return true
    return since === undefined || updatedAt > since
  })

  const records: SyncRecord[] = []
  for (const row of changed) {
    let value = row
    if (typeof row.updatedAt !== 'string') {
      // A row written before timestamps existed has nothing to compare against,
      // so it would look changed on every sync forever. Give it one now and
      // persist it, otherwise it is re-sent for the lifetime of the install.
      value = { ...row, updatedAt: new Date().toISOString() }
      await putFromRemote(store, value as never)
    }
    records.push({
      store,
      key: keyOf(store, value),
      updatedAt: value.updatedAt as string,
      value,
    })
  }
  return records
}

/**
 * One full reconciliation: take everything the backend has changed since the
 * last pull, then send everything changed locally since the last push.
 */
export async function syncNow(adapter: SyncAdapter, options: SyncOptions = {}): Promise<SyncOutcome> {
  const storage = options.storage ?? globalThis.localStorage
  const state = readSyncState(storage)

  const { records, syncedAt: pulledAt } = await adapter.pull(state.pulledAt)
  let applied = 0
  for (const record of records) {
    if (await applyRemote(record)) applied += 1
  }

  const outgoing: SyncRecord[] = []
  const pushedAt = { ...state.pushedAt }
  for (const store of SYNCED_STORE_NAMES) {
    const changes = await localChangesSince(store, state.pushedAt[store])
    if (changes.length === 0) continue
    outgoing.push(...changes)
    // The cursor is the newest local timestamp actually sent, not the server's
    // clock: this filter compares against local `updatedAt` values, so mixing
    // in a remote clock would drop or re-send changes whenever the two drift.
    pushedAt[store] = changes.reduce((max, r) => (r.updatedAt > max ? r.updatedAt : max), '')
  }

  let syncedAt = pulledAt
  if (outgoing.length > 0) {
    const result = await adapter.push(outgoing)
    syncedAt = result.syncedAt
  }

  writeSyncState(storage, { pulledAt, pushedAt })

  return { pulled: records.length, applied, pushed: outgoing.length, syncedAt }
}
