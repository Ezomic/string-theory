import { getAll, getDB, getOne, putFromRemote } from '../db/db'
import { mergeRecord } from './merge'
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
 * Applies every pulled record in a single IndexedDB transaction, so a sync that
 * dies partway through leaves local data exactly as it was rather than half
 * updated. Reads and merges happen inside the same transaction as the writes.
 */
async function applyRemoteBatch(records: SyncRecord[]): Promise<SyncRecord[]> {
  const incoming = records.filter((record) => record.value !== null)
  if (incoming.length === 0) return []

  // Merge first, outside the write transaction. An IndexedDB transaction
  // auto-commits as soon as it yields with no pending request, so awaiting a
  // read between writes would quietly end it and destroy the atomicity below.
  const merges = []
  for (const record of incoming) {
    const local = (await getOne(record.store, record.key)) as Record<string, unknown> | undefined
    const { value, needsPush } = mergeRecord(
      record.store,
      local,
      record.value as Record<string, unknown>,
    )
    merges.push({ record, value, needsPush })
  }

  // Then one transaction whose puts are all issued before anything is awaited,
  // so a single bad record aborts the batch and leaves local data as it was.
  const db = await getDB()
  const stores = [...new Set(incoming.map((record) => record.store))]
  const tx = db.transaction(stores as never, 'readwrite')

  // Once a transaction aborts, every outstanding request rejects too. Promise.all
  // only reports the first, so each promise gets a no-op handler and the rest
  // would otherwise surface as unhandled rejections.
  const pending: Promise<unknown>[] = []
  const track = <T>(promise: Promise<T>): Promise<T> => {
    promise.catch(() => undefined)
    pending.push(promise)
    return promise
  }

  track(tx.done)
  try {
    for (const merge of merges) {
      const store = tx.objectStore(merge.record.store as never) as unknown as {
        put: (value: unknown) => Promise<unknown>
      }
      track(store.put(merge.value))
    }
    await Promise.all(pending)
  } catch (error) {
    // A malformed record throws synchronously as its put is issued, which on
    // its own would leave the earlier puts to commit. Abort explicitly so the
    // batch is genuinely all-or-nothing.
    try {
      tx.abort()
    } catch {
      // Already aborted by the failing request.
    }
    throw error
  }

  return merges
    .filter((merge) => merge.needsPush)
    .map((merge) => ({
      ...merge.record,
      updatedAt: merge.value.updatedAt as string,
      value: merge.value,
    }))
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
  const mergedBack = await applyRemoteBatch(records)
  const applied = records.filter((record) => record.value !== null).length

  // Merge results have to reach the backend too, or the other device keeps its
  // own version and the two never agree.
  const outgoing: SyncRecord[] = [...mergedBack]
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
