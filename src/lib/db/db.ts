import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { isSyncedStore } from '../sync/stores'
import type {
  Achievement,
  DrillResult,
  InstrumentConfig,
  Lesson,
  LessonProgress,
  PlacementResult,
  PlayRun,
  PracticeSession,
  RiffRun,
  SightReadingRun,
  Settings,
  SkillProgress,
  Streak,
  TunerStats,
  Unit,
  UserProfile,
} from './types'

interface StringTheoryDB extends DBSchema {
  profile: { key: string; value: UserProfile }
  instrumentConfigs: { key: string; value: InstrumentConfig; indexes: { 'by-user': string } }
  placementResults: { key: string; value: PlacementResult; indexes: { 'by-user': string } }
  units: { key: string; value: Unit }
  lessons: { key: string; value: Lesson; indexes: { 'by-unit': string } }
  lessonProgress: { key: string; value: LessonProgress }
  skillProgress: { key: string; value: SkillProgress }
  streak: { key: string; value: Streak }
  achievements: { key: string; value: Achievement }
  drillResults: { key: string; value: DrillResult }
  playRuns: { key: string; value: PlayRun }
  riffRuns: { key: string; value: RiffRun }
  sightReadingRuns: { key: string; value: SightReadingRun }
  practiceSessions: { key: string; value: PracticeSession }
  settings: { key: string; value: Settings }
  tunerStats: { key: string; value: TunerStats }
}

export type StoreName = keyof StringTheoryDB

const DB_NAME = 'string-theory'
const DB_VERSION = 4

let dbPromise: Promise<IDBPDatabase<StringTheoryDB>> | null = null

export function getDB(): Promise<IDBPDatabase<StringTheoryDB>> {
  if (!dbPromise) {
    dbPromise = openDB<StringTheoryDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('profile', { keyPath: 'id' })

          const instrumentConfigs = db.createObjectStore('instrumentConfigs', {
            keyPath: 'id',
          })
          instrumentConfigs.createIndex('by-user', 'userId')

          const placementResults = db.createObjectStore('placementResults', {
            keyPath: 'id',
          })
          placementResults.createIndex('by-user', 'userId')

          db.createObjectStore('units', { keyPath: 'id' })

          const lessons = db.createObjectStore('lessons', { keyPath: 'id' })
          lessons.createIndex('by-unit', 'unitId')

          db.createObjectStore('lessonProgress', { keyPath: 'lessonId' })
          db.createObjectStore('skillProgress', { keyPath: 'skillKey' })
          db.createObjectStore('streak', { keyPath: 'id' })
          db.createObjectStore('achievements', { keyPath: 'key' })
          db.createObjectStore('drillResults', { keyPath: 'id' })
          db.createObjectStore('playRuns', { keyPath: 'id' })
          db.createObjectStore('practiceSessions', { keyPath: 'date' })
          db.createObjectStore('settings', { keyPath: 'id' })
        }

        if (oldVersion < 2) {
          db.createObjectStore('tunerStats', { keyPath: 'id' })
        }

        if (oldVersion < 3) {
          db.createObjectStore('riffRuns', { keyPath: 'id' })
        }

        if (oldVersion < 4) {
          db.createObjectStore('sightReadingRuns', { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

// idb's store methods are typed as overloads keyed by literal store names, which
// TS can't resolve against an abstract `Store extends StoreName` parameter — the
// casts below are safe because the public signatures here still tie `store` to
// `StringTheoryDB[Store]['value']`, preserving type safety for callers.

export async function getAll<Store extends StoreName>(
  store: Store,
): Promise<StringTheoryDB[Store]['value'][]> {
  const db = await getDB()
  return db.getAll(store as never)
}

export async function getOne<Store extends StoreName>(
  store: Store,
  key: string,
): Promise<StringTheoryDB[Store]['value'] | undefined> {
  const db = await getDB()
  return db.get(store as never, key)
}

type WriteListener = (store: StoreName) => void

const writeListeners = new Set<WriteListener>()

/**
 * Notifies on local writes to a synced store. Kept as a bare callback registry
 * so the data layer stays unaware of the sync engine that consumes it.
 */
export function onLocalWrite(listener: WriteListener): () => void {
  writeListeners.add(listener)
  return () => void writeListeners.delete(listener)
}

/**
 * Every local write stamps `updatedAt`, which is what the sync engine compares
 * to decide whose copy is newer. This is the only write path in the app, so
 * stamping here is what makes that timestamp trustworthy.
 */
export async function putOne<Store extends StoreName>(
  store: Store,
  value: StringTheoryDB[Store]['value'],
): Promise<void> {
  const db = await getDB()
  const synced = isSyncedStore(store as string)
  const stamped = synced ? { ...(value as object), updatedAt: new Date().toISOString() } : value
  await db.put(store as never, stamped as never)
  if (synced) writeListeners.forEach((listener) => listener(store))
}

/**
 * Writes a record that came from the backend, keeping the timestamp it arrived
 * with. Restamping it would make every pulled change look locally modified and
 * bounce straight back on the next push.
 */
export async function putFromRemote<Store extends StoreName>(
  store: Store,
  value: StringTheoryDB[Store]['value'],
): Promise<void> {
  const db = await getDB()
  await db.put(store as never, value as never)
}

export async function deleteOne<Store extends StoreName>(
  store: Store,
  key: string,
): Promise<void> {
  const db = await getDB()
  await db.delete(store as never, key)
}
