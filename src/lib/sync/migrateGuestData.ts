import { getAll } from '../db/db'
import { buildExportData } from '../exportData'
import { SYNCED_STORE_NAMES, keyOf, type SyncedStoreName } from './stores'
import type { AuthSession, SyncAdapter, SyncRecord } from './types'

const BACKUP_KEY = 'string-theory-migration-backup'
const PROGRESS_KEY = 'string-theory-migration-progress'

export interface MigrationProgress {
  accountId: string
  startedAt: string
  completedAt: string | null
  /** Stores already uploaded, so an interrupted run resumes instead of restarting. */
  completedStores: SyncedStoreName[]
}

export type MigrationOutcome = 'migrated' | 'resumed' | 'already-done' | 'nothing-to-migrate'

export interface MigrationResult {
  outcome: MigrationOutcome
  uploadedRecords: number
}

export interface MigrateOptions {
  now?: () => Date
  storage?: Pick<Storage, 'getItem' | 'setItem'>
}

function readProgress(storage: Pick<Storage, 'getItem'> | undefined): MigrationProgress | null {
  const raw = storage?.getItem(PROGRESS_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as MigrationProgress
  } catch {
    return null
  }
}

/**
 * A snapshot taken before the first upload. The migration only reads local
 * data, so this is a safety net rather than a rollback source, and a browser
 * that refuses the write (quota) must not block someone from signing up.
 */
async function writeBackup(storage: Pick<Storage, 'setItem'> | undefined, now: Date): Promise<void> {
  if (!storage) return
  try {
    const exported = await buildExportData(now)
    storage.setItem(BACKUP_KEY, JSON.stringify(exported))
  } catch {
    // Quota or serialisation failure; the local data is still intact either way.
  }
}

async function recordsFor(store: SyncedStoreName, fallbackTimestamp: string): Promise<SyncRecord[]> {
  const rows = (await getAll(store)) as unknown as Record<string, unknown>[]
  return rows.map((value) => ({
    store,
    key: keyOf(store, value),
    // Real per-record timestamps arrive with ST-96; until then the migration
    // stamps everything with the moment it ran.
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : fallbackTimestamp,
    value,
  }))
}

/**
 * Uploads a guest's existing local data to their new account, one store at a
 * time so an interrupted run can resume. Pushes are keyed upserts, so re-running
 * overwrites rather than duplicating.
 */
export async function migrateGuestData(
  adapter: SyncAdapter,
  session: AuthSession,
  options: MigrateOptions = {},
): Promise<MigrationResult> {
  const now = options.now ?? (() => new Date())
  const storage = options.storage ?? globalThis.localStorage
  const startedAt = now().toISOString()

  const existing = readProgress(storage)
  const resuming = existing?.accountId === session.userId && existing.completedAt === null

  if (existing?.accountId === session.userId && existing.completedAt !== null) {
    return { outcome: 'already-done', uploadedRecords: 0 }
  }

  let progress: MigrationProgress = resuming
    ? existing
    : { accountId: session.userId, startedAt, completedAt: null, completedStores: [] }

  if (!resuming) await writeBackup(storage, now())

  const save = () => storage?.setItem(PROGRESS_KEY, JSON.stringify(progress))
  save()

  let uploadedRecords = 0
  for (const store of SYNCED_STORE_NAMES) {
    if (progress.completedStores.includes(store)) continue

    const records = await recordsFor(store, startedAt)
    if (records.length > 0) {
      await adapter.push(records)
      uploadedRecords += records.length
    }
    progress = { ...progress, completedStores: [...progress.completedStores, store] }
    save()
  }

  progress = { ...progress, completedAt: now().toISOString() }
  save()

  if (uploadedRecords === 0) return { outcome: 'nothing-to-migrate', uploadedRecords }
  return { outcome: resuming ? 'resumed' : 'migrated', uploadedRecords }
}

export function readMigrationProgress(
  storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage,
): MigrationProgress | null {
  return readProgress(storage)
}
