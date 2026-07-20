/** Lesson content ships with the app, so it is never uploaded or reconciled. */
export const STATIC_STORES = ['units', 'lessons'] as const

export type StaticStoreName = (typeof STATIC_STORES)[number]

/**
 * How a store reconciles when the same account is edited on two devices. The
 * kind, not the store, decides the merge rule, so ST-97's policies stay one
 * implementation per kind rather than one per store.
 *
 * - `singleton` — exactly one row per account, merged field by field.
 * - `keyed`     — a natural key (lesson, skill, date), merged per key.
 * - `log`       — append-only history; both sides' records are unioned by id.
 * - `owned`     — plain records; newest write wins.
 */
export type StoreKind = 'singleton' | 'keyed' | 'log' | 'owned'

interface StoreSpec {
  kind: StoreKind
  /** Property holding the record's primary key, mirroring the IndexedDB keyPath. */
  keyPath: string
}

/**
 * `keyof StringTheoryDB` widens to `string` through `DBSchema`'s index
 * signature, so the synced-store union is declared here and checked against the
 * real object stores at runtime in stores.test.ts instead.
 */
export const SYNCED_STORES = {
  profile: { kind: 'owned', keyPath: 'id' },
  instrumentConfigs: { kind: 'owned', keyPath: 'id' },
  placementResults: { kind: 'owned', keyPath: 'id' },
  lessonProgress: { kind: 'keyed', keyPath: 'lessonId' },
  skillProgress: { kind: 'keyed', keyPath: 'skillKey' },
  achievements: { kind: 'keyed', keyPath: 'key' },
  practiceSessions: { kind: 'keyed', keyPath: 'date' },
  streak: { kind: 'singleton', keyPath: 'id' },
  settings: { kind: 'singleton', keyPath: 'id' },
  tunerStats: { kind: 'singleton', keyPath: 'id' },
  drillResults: { kind: 'log', keyPath: 'id' },
  playRuns: { kind: 'log', keyPath: 'id' },
  riffRuns: { kind: 'log', keyPath: 'id' },
  sightReadingRuns: { kind: 'log', keyPath: 'id' },
} satisfies Record<string, StoreSpec>

export type SyncedStoreName = keyof typeof SYNCED_STORES

export const SYNCED_STORE_NAMES = Object.keys(SYNCED_STORES) as SyncedStoreName[]

export function isSyncedStore(store: string): store is SyncedStoreName {
  return store in SYNCED_STORES
}

export function keyOf(store: SyncedStoreName, record: Record<string, unknown>): string {
  const key = record[SYNCED_STORES[store].keyPath]
  if (typeof key !== 'string') {
    throw new Error(`Record in "${store}" is missing key "${SYNCED_STORES[store].keyPath}"`)
  }
  return key
}
