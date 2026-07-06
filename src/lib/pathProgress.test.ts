import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { ALL_LESSONS_ORDERED, lessonById } from './curriculum'
import { getDB } from './db/db'
import {
  bumpStreak,
  completeLesson,
  findCurrentLesson,
  getAllLessonProgress,
  markLessonInProgress,
  seedProgressFromPlacement,
  statusFor,
} from './pathProgress'

beforeEach(async () => {
  const db = await getDB()
  await Promise.all([...db.objectStoreNames].map((store) => db.clear(store)))
})

describe('seedProgressFromPlacement', () => {
  it('marks only the starting lesson available at level 1, the rest locked', async () => {
    await seedProgressFromPlacement(1, { ear: 1, theory: 1, fretboard: 0, chords: 1 })
    const progress = await getAllLessonProgress()

    expect(statusFor(progress, ALL_LESSONS_ORDERED[0])).toBe('available')
    ALL_LESSONS_ORDERED.slice(1).forEach((lesson) => {
      expect(statusFor(progress, lesson)).toBe('locked')
    })
  })

  it('auto-completes unit 1 and starts unit 2 at level 2', async () => {
    await seedProgressFromPlacement(2, { ear: 1, theory: 1, fretboard: 0, chords: 1 })
    const progress = await getAllLessonProgress()

    expect(statusFor(progress, lessonById('lesson-1-1')!)).toBe('done')
    expect(statusFor(progress, lessonById('lesson-1-2')!)).toBe('done')
    expect(statusFor(progress, lessonById('lesson-2-1')!)).toBe('available')
    expect(statusFor(progress, lessonById('lesson-2-2')!)).toBe('locked')
    expect(statusFor(progress, lessonById('lesson-3-1')!)).toBe('locked')
  })

  it('creates a fresh streak only if one does not already exist', async () => {
    await seedProgressFromPlacement(1, { ear: 0, theory: 0, fretboard: 0, chords: 0 })
    const db = await getDB()
    expect(await db.get('streak', 'current')).toEqual({
      id: 'current',
      current: 0,
      longest: 0,
      lastPracticeDate: null,
    })
  })

  it('retaking placement never destroys a lesson already genuinely completed', async () => {
    await seedProgressFromPlacement(1, { ear: 0, theory: 0, fretboard: 0, chords: 0 })
    // Real progress: actually played through and completed the first three lessons.
    await completeLesson(ALL_LESSONS_ORDERED[0], 92)
    await completeLesson(ALL_LESSONS_ORDERED[1], 78)
    await markLessonInProgress(ALL_LESSONS_ORDERED[2].id)

    // Retaking placement and scoring the same (or even lower) must not wipe that history.
    await seedProgressFromPlacement(1, { ear: 0, theory: 0, fretboard: 0, chords: 0 })
    const progress = await getAllLessonProgress()

    expect(progress[ALL_LESSONS_ORDERED[0].id]).toMatchObject({ status: 'done', score: 92 })
    expect(progress[ALL_LESSONS_ORDERED[1].id]).toMatchObject({ status: 'done', score: 78 })
    expect(progress[ALL_LESSONS_ORDERED[2].id].status).toBe('in_progress')
  })

  it('still provides an available lesson when every lesson up to the nominal start is already done', async () => {
    await seedProgressFromPlacement(1, { ear: 0, theory: 0, fretboard: 0, chords: 0 })
    await completeLesson(ALL_LESSONS_ORDERED[0], 90)
    await completeLesson(ALL_LESSONS_ORDERED[1], 90)

    // Retaking at level 1 again would nominally point back at lesson 0 (already done) —
    // the learner must still have something real to do next, not get stuck.
    await seedProgressFromPlacement(1, { ear: 0, theory: 0, fretboard: 0, chords: 0 })
    const progress = await getAllLessonProgress()

    expect(progress[ALL_LESSONS_ORDERED[2].id].status).toBe('available')
  })

  it('retaking at a higher level still auto-completes lessons that were never actually done', async () => {
    await seedProgressFromPlacement(1, { ear: 0, theory: 0, fretboard: 0, chords: 0 })
    await seedProgressFromPlacement(2, { ear: 1, theory: 1, fretboard: 0, chords: 1 })
    const progress = await getAllLessonProgress()

    expect(statusFor(progress, lessonById('lesson-1-1')!)).toBe('done')
    expect(statusFor(progress, lessonById('lesson-2-1')!)).toBe('available')
  })
})

describe('findCurrentLesson', () => {
  it('prefers an in-progress lesson over merely available ones', async () => {
    await seedProgressFromPlacement(1, { ear: 0, theory: 0, fretboard: 0, chords: 0 })
    await markLessonInProgress(ALL_LESSONS_ORDERED[0].id)
    const progress = await getAllLessonProgress()
    expect(findCurrentLesson(progress)?.id).toBe(ALL_LESSONS_ORDERED[0].id)
  })

  it('falls back to the available lesson when nothing is in progress', async () => {
    await seedProgressFromPlacement(2, { ear: 0, theory: 0, fretboard: 0, chords: 0 })
    const progress = await getAllLessonProgress()
    expect(findCurrentLesson(progress)?.id).toBe('lesson-2-1')
  })
})

describe('markLessonInProgress', () => {
  it('does not downgrade an already-completed lesson', async () => {
    await seedProgressFromPlacement(2, { ear: 0, theory: 0, fretboard: 0, chords: 0 })
    await markLessonInProgress('lesson-1-1')
    const progress = await getAllLessonProgress()
    expect(progress['lesson-1-1'].status).toBe('done')
  })
})

describe('completeLesson', () => {
  it('marks the lesson done and unlocks the next one', async () => {
    await seedProgressFromPlacement(1, { ear: 0, theory: 0, fretboard: 0, chords: 0 })
    const first = ALL_LESSONS_ORDERED[0]
    const next = await completeLesson(first, 87)

    const progress = await getAllLessonProgress()
    expect(progress[first.id]).toMatchObject({ status: 'done', score: 87, notesCleanPct: 87 })
    expect(next?.id).toBe(ALL_LESSONS_ORDERED[1].id)
    expect(progress[ALL_LESSONS_ORDERED[1].id].status).toBe('available')
  })

  it('does not re-lock a next lesson that is already further along', async () => {
    await seedProgressFromPlacement(1, { ear: 0, theory: 0, fretboard: 0, chords: 0 })
    const [first, second] = ALL_LESSONS_ORDERED
    await markLessonInProgress(second.id)
    await completeLesson(first, 90)

    const progress = await getAllLessonProgress()
    expect(progress[second.id].status).toBe('in_progress')
  })
})

describe('bumpStreak', () => {
  it('starts a streak at 1 on first practice', async () => {
    const streak = await bumpStreak(new Date('2026-01-10T12:00:00.000Z'))
    expect(streak).toEqual({ id: 'current', current: 1, longest: 1, lastPracticeDate: '2026-01-10' })
  })

  it('does not double-count practicing twice in the same day', async () => {
    await bumpStreak(new Date('2026-01-10T09:00:00.000Z'))
    const streak = await bumpStreak(new Date('2026-01-10T21:00:00.000Z'))
    expect(streak.current).toBe(1)
  })

  it('increments on consecutive days and resets after a gap', async () => {
    await bumpStreak(new Date('2026-01-10T12:00:00.000Z'))
    const day2 = await bumpStreak(new Date('2026-01-11T12:00:00.000Z'))
    expect(day2.current).toBe(2)

    const day4 = await bumpStreak(new Date('2026-01-13T12:00:00.000Z'))
    expect(day4.current).toBe(1)
    expect(day4.longest).toBe(2)
  })
})
