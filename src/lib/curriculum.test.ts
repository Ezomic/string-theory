import { describe, expect, it } from 'vitest'
import {
  ALL_LESSONS_ORDERED,
  LESSONS,
  UNITS,
  lessonById,
  lessonsInUnit,
  lessonsToAutoComplete,
  nextLesson,
  startingLesson,
  unitFor,
} from './curriculum'

describe('curriculum data', () => {
  it('has every lesson referencing a real unit', () => {
    LESSONS.forEach((lesson) => {
      expect(UNITS.some((u) => u.id === lesson.unitId)).toBe(true)
    })
  })

  it('has unique lesson and unit ids', () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length)
    expect(new Set(UNITS.map((u) => u.id)).size).toBe(UNITS.length)
  })

  it('orders lessons within a unit', () => {
    const lessons = lessonsInUnit('unit-2')
    expect(lessons.map((l) => l.order)).toEqual([...lessons.map((l) => l.order)].sort((a, b) => a - b))
  })

  it('looks up a lesson by id', () => {
    expect(lessonById('lesson-2-1')?.title).toBe('Building the Major Scale')
    expect(lessonById('nope')).toBeUndefined()
  })

  it('finds the next lesson by global order', () => {
    const first = ALL_LESSONS_ORDERED[0]
    const second = nextLesson(first)
    expect(second?.order).toBe(first.order + 1)
  })

  it('returns undefined for the next lesson after the last one', () => {
    const last = ALL_LESSONS_ORDERED[ALL_LESSONS_ORDERED.length - 1]
    expect(nextLesson(last)).toBeUndefined()
  })

  it('resolves a lesson’s unit', () => {
    const lesson = lessonById('lesson-3-1')!
    expect(unitFor(lesson).id).toBe('unit-3')
  })
})

describe('lessonsToAutoComplete', () => {
  it('auto-completes nothing at level 1', () => {
    expect(lessonsToAutoComplete(1)).toEqual([])
  })

  it('auto-completes unit 1 lessons at level 2', () => {
    const autoCompleted = lessonsToAutoComplete(2)
    expect(autoCompleted.every((l) => l.unitId === 'unit-1')).toBe(true)
    expect(autoCompleted.length).toBe(lessonsInUnit('unit-1').length)
  })

  it('auto-completes units 1 and 2 at level 3', () => {
    const autoCompleted = lessonsToAutoComplete(3)
    expect(autoCompleted.every((l) => ['unit-1', 'unit-2'].includes(l.unitId))).toBe(true)
  })
})

describe('startingLesson', () => {
  it('starts at the very first lesson for level 1', () => {
    expect(startingLesson(1).id).toBe(ALL_LESSONS_ORDERED[0].id)
  })

  it('starts at unit 2’s first lesson for level 2', () => {
    expect(startingLesson(2).id).toBe('lesson-2-1')
  })

  it('starts at unit 3’s first lesson for level 3', () => {
    expect(startingLesson(3).id).toBe('lesson-3-1')
  })
})
