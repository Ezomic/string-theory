import { SYNCED_STORES, type SyncedStoreName } from './stores'

type Row = Record<string, unknown>

export interface MergeOutcome {
  value: Row
  /**
   * True when the merge produced something neither side had, so the result has
   * to travel back. A merged value keeps neither side's timestamp in that case:
   * it needs a strictly newer one, or the backend rejects it as stale and the
   * two devices never converge.
   */
  needsPush: boolean
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function maxNumber(a: unknown, b: unknown): number {
  return Math.max(num(a), num(b))
}

/** Later of two ISO strings, tolerating either being absent. */
function latest(a: unknown, b: unknown): string | null {
  const left = typeof a === 'string' ? a : null
  const right = typeof b === 'string' ? b : null
  if (left === null) return right
  if (right === null) return left
  return left > right ? left : right
}

/** Earlier of two ISO strings, ignoring nulls: used where the first time something happened is the truth. */
function earliest(a: unknown, b: unknown): string | null {
  const left = typeof a === 'string' ? a : null
  const right = typeof b === 'string' ? b : null
  if (left === null) return right
  if (right === null) return left
  return left < right ? left : right
}

function union(a: unknown, b: unknown): string[] {
  const left = Array.isArray(a) ? (a as string[]) : []
  const right = Array.isArray(b) ? (b as string[]) : []
  return [...new Set([...left, ...right])]
}

function mergeNumericMap(a: unknown, b: unknown): Record<string, number> | undefined {
  if (!a && !b) return undefined
  const left = (a ?? {}) as Record<string, number>
  const right = (b ?? {}) as Record<string, number>
  const merged: Record<string, number> = { ...left }
  for (const [key, value] of Object.entries(right)) {
    merged[key] = Math.max(num(left[key]), num(value))
  }
  return merged
}

const LESSON_STATUS_ORDER = ['locked', 'available', 'in_progress', 'done']

function furthestStatus(a: unknown, b: unknown): unknown {
  const left = LESSON_STATUS_ORDER.indexOf(String(a))
  const right = LESSON_STATUS_ORDER.indexOf(String(b))
  return right > left ? b : a
}

type MergeFn = (local: Row, remote: Row) => Row

/**
 * Per-store merge rules. The shared principle is that progress only ever moves
 * forward: a device that has been offline holding stale numbers must never be
 * able to walk back something the learner actually earned.
 */
const MERGE_RULES: Partial<Record<SyncedStoreName, MergeFn>> = {
  // A stale device must not be able to reset a streak, so both counts take the
  // higher value and the practice date takes the later one.
  streak: (local, remote) => ({
    ...local,
    ...remote,
    current: maxNumber(local.current, remote.current),
    longest: maxNumber(local.longest, remote.longest),
    lastPracticeDate: latest(local.lastPracticeDate, remote.lastPracticeDate),
  }),

  tunerStats: (local, remote) => ({
    ...local,
    ...remote,
    inTuneCount: maxNumber(local.inTuneCount, remote.inTuneCount),
  }),

  skillProgress: (local, remote) => ({
    ...local,
    ...remote,
    masteryPct: maxNumber(local.masteryPct, remote.masteryPct),
    perStringBreakdown: mergeNumericMap(local.perStringBreakdown, remote.perStringBreakdown),
  }),

  lessonProgress: (local, remote) => ({
    ...local,
    ...remote,
    status: furthestStatus(local.status, remote.status),
    score: maxNumber(local.score, remote.score),
    notesCleanPct: maxNumber(local.notesCleanPct, remote.notesCleanPct),
    mastered: Boolean(local.mastered) || Boolean(remote.mastered),
    // Completing a lesson is a one-time event: keep when it first happened.
    completedAt: earliest(local.completedAt, remote.completedAt),
  }),

  // Once earned, an achievement stays earned, dated from when it was first won.
  achievements: (local, remote) => ({
    ...local,
    ...remote,
    earnedAt: earliest(local.earnedAt, remote.earnedAt),
  }),

  // Same day practised on two devices: take the longer session rather than the
  // sum, so re-merging the same pair can never inflate the total.
  practiceSessions: (local, remote) => ({
    ...local,
    ...remote,
    minutes: maxNumber(local.minutes, remote.minutes),
    activities: union(local.activities, remote.activities),
  }),
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const entries = Object.entries(value as Row)
    .filter(([key]) => key !== 'updatedAt')
    .sort(([a], [b]) => (a < b ? -1 : 1))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`
}

function sameContent(a: Row, b: Row): boolean {
  return stableStringify(a) === stableStringify(b)
}

/**
 * Reconciles one record. `local` absent means the record is new to this device.
 *
 * Append-only logs are never merged field by field: a practice run is an
 * immutable historical fact, so both sides keep every record they have and
 * neither replaces the other's.
 */
export function mergeRecord(
  store: SyncedStoreName,
  local: Row | undefined,
  remote: Row,
  now: () => Date = () => new Date(),
): MergeOutcome {
  if (!local) return { value: remote, needsPush: false }

  if (SYNCED_STORES[store].kind === 'log') {
    // Identical by key means identical history; keep what is already here.
    return { value: local, needsPush: false }
  }

  const rule = MERGE_RULES[store]
  if (!rule) {
    // Settings and other plain records: the most recent write is the truth.
    const localAt = typeof local.updatedAt === 'string' ? local.updatedAt : ''
    const remoteAt = typeof remote.updatedAt === 'string' ? remote.updatedAt : ''
    return { value: remoteAt >= localAt ? remote : local, needsPush: remoteAt < localAt }
  }

  const merged = rule(local, remote)

  if (sameContent(merged, remote)) {
    return { value: { ...merged, updatedAt: remote.updatedAt }, needsPush: false }
  }

  // Anything else has to travel back, including a result identical to the local
  // value: if the remote timestamp is newer, reusing the local one would get the
  // push rejected as stale and the two devices would never converge.
  return { value: { ...merged, updatedAt: now().toISOString() }, needsPush: true }
}
