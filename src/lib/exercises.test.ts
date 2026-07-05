import { describe, expect, it } from 'vitest'
import { EXERCISES, exerciseById, exercisesInCategory } from './exercises'

describe('EXERCISES', () => {
  it('has unique ids', () => {
    const ids = EXERCISES.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every exercise at least two expected notes', () => {
    EXERCISES.forEach((exercise) => {
      expect(exercise.expectedNotes.length).toBeGreaterThan(1)
    })
  })

  it('covers all three categories', () => {
    expect(exercisesInCategory('scale').length).toBeGreaterThan(0)
    expect(exercisesInCategory('arpeggio').length).toBeGreaterThan(0)
    expect(exercisesInCategory('exercise').length).toBeGreaterThan(0)
  })
})

describe('exerciseById', () => {
  it('finds a known exercise', () => {
    expect(exerciseById('c-major-scale')?.title).toBe('C major scale')
  })

  it('returns undefined for an unknown id', () => {
    expect(exerciseById('nope')).toBeUndefined()
  })
})
