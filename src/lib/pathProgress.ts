import { ALL_LESSONS_ORDERED, lessonsToAutoComplete, nextLesson, type CurriculumLesson } from './curriculum'
import { getAll, getOne, putOne } from './db/db'
import type { LessonProgress, LessonStatus, PlacementResult, Streak } from './db/types'
import { recordPracticeActivity } from './practiceLog'

const LOCAL_USER_ID = 'local-guest'

function progressRecord(lessonId: string, status: LessonStatus, overrides: Partial<LessonProgress> = {}): LessonProgress {
  return {
    lessonId,
    status,
    score: 0,
    notesCleanPct: 0,
    completedAt: null,
    mastered: false,
    ...overrides,
  }
}

/**
 * Writes the placement result and seeds every lesson's starting status from it.
 *
 * Safe to call again later (Settings > Retake placement check): a lesson already at
 * 'done' or 'in_progress' is never touched, so retaking placement — even scoring lower
 * than before — can never destroy real completed-lesson history. The starting/available
 * lesson is recomputed as the first lesson (by order) that isn't already done, rather
 * than blindly using the placement level's nominal starting lesson, so a learner who
 * already has real progress past that point doesn't lose their available lesson.
 */
export async function seedProgressFromPlacement(
  level: number,
  strengths: PlacementResult['strengths'],
): Promise<void> {
  await putOne('placementResults', {
    id: crypto.randomUUID(),
    userId: LOCAL_USER_ID,
    level,
    strengths,
    takenAt: new Date().toISOString(),
  })

  const existing = await getAllLessonProgress()
  const isPreserved = (lesson: CurriculumLesson): boolean => {
    const status = existing[lesson.id]?.status
    return status === 'done' || status === 'in_progress'
  }

  const autoCompletedIds = new Set(lessonsToAutoComplete(level).map((l) => l.id))
  const isDoneAfterReseed = (lesson: CurriculumLesson): boolean =>
    isPreserved(lesson) || autoCompletedIds.has(lesson.id)
  const start = ALL_LESSONS_ORDERED.find((lesson) => !isDoneAfterReseed(lesson))

  await Promise.all(
    ALL_LESSONS_ORDERED.map((lesson) => {
      if (isPreserved(lesson)) return undefined

      if (autoCompletedIds.has(lesson.id)) {
        const now = new Date().toISOString()
        return putOne('lessonProgress', progressRecord(lesson.id, 'done', { score: 100, notesCleanPct: 100, completedAt: now }))
      }
      if (start && lesson.id === start.id) {
        return putOne('lessonProgress', progressRecord(lesson.id, 'available'))
      }
      return putOne('lessonProgress', progressRecord(lesson.id, 'locked'))
    }),
  )

  const existingStreak = await getOne('streak', 'current')
  if (!existingStreak) {
    await putOne('streak', { id: 'current', current: 0, longest: 0, lastPracticeDate: null })
  }
}

export async function getAllLessonProgress(): Promise<Record<string, LessonProgress>> {
  const all = await getAll('lessonProgress')
  return Object.fromEntries(all.map((p) => [p.lessonId, p]))
}

/**
 * Backfills lessons inserted into the curriculum after a user already had progress —
 * without this, a lesson added earlier in `order` than one the user already unlocked or
 * completed would stay 'locked' forever, since `completeLesson` only ever advances one
 * lesson at a time. Mirrors the same "already past this, count it as known" convention
 * `seedProgressFromPlacement` uses for skipped units. No-op for a never-seeded profile —
 * placement seeds everything from scratch instead.
 */
export async function reconcileLessonProgress(): Promise<void> {
  const progressMap = await getAllLessonProgress()
  if (Object.keys(progressMap).length === 0) return

  const hasUnlockedLessonAfter = (fromIndex: number): boolean =>
    ALL_LESSONS_ORDERED.slice(fromIndex).some((lesson) => {
      const status = progressMap[lesson.id]?.status
      return status !== undefined && status !== 'locked'
    })

  await Promise.all(
    ALL_LESSONS_ORDERED.map((lesson, index) => {
      if (progressMap[lesson.id]) return undefined
      if (!hasUnlockedLessonAfter(index + 1)) return undefined

      const now = new Date().toISOString()
      return putOne(
        'lessonProgress',
        progressRecord(lesson.id, 'done', { score: 100, notesCleanPct: 100, completedAt: now }),
      )
    }),
  )
}

/** False if the user has a profile but never finished (or skipped) placement, so nothing is unlocked yet. */
export async function hasSeededProgress(): Promise<boolean> {
  const all = await getAll('lessonProgress')
  return all.length > 0
}

export function statusFor(progressMap: Record<string, LessonProgress>, lesson: CurriculumLesson): LessonStatus {
  return progressMap[lesson.id]?.status ?? 'locked'
}

/** The lesson to feature on Home / resume from: in-progress first, else the next available one. */
export function findCurrentLesson(progressMap: Record<string, LessonProgress>): CurriculumLesson | undefined {
  const inProgress = ALL_LESSONS_ORDERED.find((l) => statusFor(progressMap, l) === 'in_progress')
  if (inProgress) return inProgress
  return ALL_LESSONS_ORDERED.find((l) => statusFor(progressMap, l) === 'available')
}

export async function markLessonInProgress(lessonId: string): Promise<void> {
  const existing = await getOne('lessonProgress', lessonId)
  if (existing?.status === 'done') return
  await putOne(
    'lessonProgress',
    progressRecord(lessonId, 'in_progress', {
      score: existing?.score ?? 0,
      notesCleanPct: existing?.notesCleanPct ?? 0,
    }),
  )
}

/** Records that the lesson's Master test was passed, preserving the existing completion record. */
export async function markLessonMastered(lessonId: string): Promise<void> {
  const existing = await getOne('lessonProgress', lessonId)
  await putOne(
    'lessonProgress',
    progressRecord(lessonId, existing?.status ?? 'done', {
      score: existing?.score ?? 0,
      notesCleanPct: existing?.notesCleanPct ?? 0,
      completedAt: existing?.completedAt ?? new Date().toISOString(),
      mastered: true,
    }),
  )
}

/** `now` is injectable so tests don't have to fake system time (which fights fake-indexeddb's internal async timers). */
export async function bumpStreak(now: Date = new Date()): Promise<Streak> {
  const existing: Streak = (await getOne('streak', 'current')) ?? {
    id: 'current',
    current: 0,
    longest: 0,
    lastPracticeDate: null,
  }
  const today = now.toISOString().slice(0, 10)
  if (existing.lastPracticeDate === today) {
    return existing
  }

  const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10)
  const current = existing.lastPracticeDate === yesterday ? existing.current + 1 : 1
  const updated: Streak = {
    id: 'current',
    current,
    longest: Math.max(existing.longest, current),
    lastPracticeDate: today,
  }
  await putOne('streak', updated)
  return updated
}

/** Marks a lesson done, unlocks the next one (if it isn't already further along), and bumps the streak. */
export async function completeLesson(
  lesson: CurriculumLesson,
  notesCleanPct: number,
): Promise<CurriculumLesson | undefined> {
  await putOne(
    'lessonProgress',
    progressRecord(lesson.id, 'done', {
      score: notesCleanPct,
      notesCleanPct,
      completedAt: new Date().toISOString(),
    }),
  )

  const next = nextLesson(lesson)
  if (next) {
    const nextProgress = await getOne('lessonProgress', next.id)
    if (!nextProgress || nextProgress.status === 'locked') {
      await putOne('lessonProgress', progressRecord(next.id, 'available'))
    }
  }

  await bumpStreak()
  await recordPracticeActivity('lesson', lesson.timeEstimateMin)
  return next
}
