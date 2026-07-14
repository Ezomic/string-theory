import { describe, expect, it } from 'vitest'
import {
  ALL_LESSONS_ORDERED,
  LESSONS,
  UNITS,
  lessonById,
  lessonsInUnit,
  lessonsToAutoComplete,
  nextLesson,
  unitFor,
} from './curriculum'
import { CHORDS, SCALES } from './theory'

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

  it('has 5 lessons in each of the 5 units — enough that a learner won’t exhaust it in one sitting', () => {
    expect(UNITS.length).toBe(5)
    UNITS.forEach((unit) => {
      expect(lessonsInUnit(unit.id).length).toBe(5)
    })
    expect(LESSONS.length).toBe(25)
  })

  it('has sequential global order with no gaps or duplicates', () => {
    expect(ALL_LESSONS_ORDERED.map((l) => l.order)).toEqual(
      Array.from({ length: LESSONS.length }, (_, i) => i + 1),
    )
  })

  it('gives every lesson a populated Learn phase referencing a real scale/chord catalog entry', () => {
    LESSONS.forEach((lesson) => {
      expect(lesson.learn.read.paragraphs.length).toBeGreaterThan(0)
      expect(lesson.learn.hear.noteNames.length).toBeGreaterThan(0)
      const catalog = lesson.learn.see.mode === 'chord' ? CHORDS : SCALES
      expect(catalog.some((entry) => entry.id === lesson.learn.see.formulaId)).toBe(true)
    })
  })

  it('defaults every lesson to one required pass per exercise', () => {
    LESSONS.forEach((lesson) => {
      expect(lesson.requiredPasses).toBe(1)
    })
  })

  it('gives every lesson a rich exercise pool of valid item kinds', () => {
    LESSONS.forEach((lesson) => {
      expect(lesson.exercises.length).toBeGreaterThanOrEqual(3)
      lesson.exercises.forEach((exercise) => {
        expect(['play', 'quiz', 'hear']).toContain(exercise.kind)
      })
    })
  })

  it('gives every hear exercise notes to play and a valid, unique-choice answer', () => {
    LESSONS.forEach((lesson) => {
      lesson.exercises
        .filter((e) => e.kind === 'hear')
        .forEach((hear) => {
          if (hear.kind !== 'hear') return
          expect(hear.noteNames.length).toBeGreaterThan(0)
          expect(hear.choices.length).toBeGreaterThanOrEqual(2)
          expect(new Set(hear.choices).size).toBe(hear.choices.length)
          expect(hear.choices).toContain(hear.correctLabel)
        })
    })
  })

  it('migrated each lesson into a play exercise and a valid quiz exercise', () => {
    LESSONS.forEach((lesson) => {
      const play = lesson.exercises.find((e) => e.kind === 'play')
      const quiz = lesson.exercises.find((e) => e.kind === 'quiz')
      expect(play?.kind === 'play' && play.expectedNotes.length).toBeGreaterThan(0)
      if (quiz?.kind !== 'quiz') throw new Error('expected a quiz exercise')
      expect(quiz.question.length).toBeGreaterThan(0)
      expect(quiz.choices.length).toBeGreaterThanOrEqual(2)
      expect(new Set(quiz.choices).size).toBe(quiz.choices.length)
      expect(quiz.choices).toContain(quiz.correctLabel)
    })
  })

  it('preserves prior authored content through the migration (spot check)', () => {
    const lesson = lessonById('lesson-1-1')!
    const play = lesson.exercises.find((e) => e.kind === 'play')
    expect(play?.kind === 'play' && play.expectedNotes).toEqual(['E', 'F#', 'G#'])
    expect(lesson.learn.hear.noteNames).toEqual(['E', 'F#', 'G#'])
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

  it('auto-completes units 1 and 2 at level 3, leaving units 3, 4 and 5 (all level 3) untouched', () => {
    const autoCompleted = lessonsToAutoComplete(3)
    expect(autoCompleted.every((l) => ['unit-1', 'unit-2'].includes(l.unitId))).toBe(true)
    expect(UNITS.find((u) => u.id === 'unit-5')?.level).toBe(3)
  })
})

